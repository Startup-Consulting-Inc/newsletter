/**
 * Scheduled Newsletters Function
 * Runs every 5 minutes to check for newsletters that need to be sent
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Newsletter, Recipient, NewsletterStatus, SendResult } from './types';
import { sendNewsletterEmails } from './emailService';
import {
  logScheduledCheckRun,
  logNewsletterSendStarted,
  logNewsletterSendCompleted,
  logNewsletterSendFailed,
  logEmailBounced,
} from './auditLogger';

const db = admin.firestore();

/**
 * Fetch all recipients from selected groups
 */
async function fetchRecipients(groupIds: string[]): Promise<Recipient[]> {
  const allRecipients: Recipient[] = [];
  const seenEmails = new Set<string>();

  for (const groupId of groupIds) {
    const groupDoc = await db.collection('recipientGroups').doc(groupId).get();

    if (!groupDoc.exists) {
      console.warn(`⚠️  Group ${groupId} not found`);
      continue;
    }

    const recipientsSnapshot = await db
      .collection('recipientGroups')
      .doc(groupId)
      .collection('recipients')
      .get();

    recipientsSnapshot.forEach((doc) => {
      const recipient = { id: doc.id, ...doc.data() } as Recipient;

      if (!seenEmails.has(recipient.email)) {
        seenEmails.add(recipient.email);
        allRecipients.push(recipient);
      }
    });
  }

  return allRecipients;
}

/**
 * Scheduled Function - Check and Send Due Newsletters
 * Runs every 5 minutes
 */
export const scheduledNewslettersFunction = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540,
    memory: '1GB',
  })
  .pubsub.schedule('every 5 minutes')
  .onRun(async (context) => {
    console.log('⏰ Running scheduled newsletters check...');

    const now = admin.firestore.Timestamp.now();
    let successCount = 0;
    let errorCount = 0;

    try {
      // Query for scheduled newsletters that are due
      const dueNewslettersSnapshot = await db
        .collection('newsletters')
        .where('status', '==', NewsletterStatus.SCHEDULED)
        .where('scheduledAt', '<=', now)
        .get();

      if (dueNewslettersSnapshot.empty) {
        console.log('✅ No newsletters due for sending');

        // Log scheduled check run
        await logScheduledCheckRun({
          newslettersFound: 0,
          newslettersSent: 0,
          errors: 0,
        });

        return null;
      }

      console.log(`📬 Found ${dueNewslettersSnapshot.size} newsletters due for sending`);

      // Process each newsletter
      for (const doc of dueNewslettersSnapshot.docs) {
        const newsletter = { id: doc.id, ...doc.data() } as Newsletter;
        const startTime = Date.now();

        try {
          console.log(`📧 Processing newsletter: ${newsletter.subject}`);

          // Fetch recipients
          const recipients = await fetchRecipients(newsletter.recipientGroupIds);

          if (recipients.length === 0) {
            console.warn(`⚠️  No recipients for newsletter ${newsletter.id}`);
            continue;
          }

          // Update status to "Sending" and set sentAt now (not after send completes)
          // so the tracking proxy-detection timing heuristic has an anchor point.
          await doc.ref.update({
            status: NewsletterStatus.SENDING,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Log send started
          await logNewsletterSendStarted({
            userId: 'SYSTEM',
            userName: 'Scheduled Newsletter System',
            newsletterId: newsletter.id,
            subject: newsletter.subject,
            recipientCount: recipients.length,
          });

          // Send emails
          const sendResult: SendResult = await sendNewsletterEmails(newsletter, recipients);

          // Log individual email bounces
          for (const error of sendResult.errors) {
            await logEmailBounced({
              newsletterId: newsletter.id,
              recipientEmail: error.recipientEmail,
              errorMessage: error.error,
            });
          }

          // Calculate duration
          const duration = Math.round((Date.now() - startTime) / 1000);

          // Update to "Sent" with stats (sentAt already set during SENDING)
          await doc.ref.update({
            status: NewsletterStatus.SENT,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            stats: {
              sent: sendResult.successCount,
              opened: 0,
              clicked: 0,
              bounced: sendResult.failureCount,
            },
          });

          // Log send completed
          await logNewsletterSendCompleted({
            userId: 'SYSTEM',
            userName: 'Scheduled Newsletter System',
            newsletterId: newsletter.id,
            subject: newsletter.subject,
            successCount: sendResult.successCount,
            failureCount: sendResult.failureCount,
            duration,
          });

          console.log(`✅ Newsletter ${newsletter.id} sent successfully via scheduler`);
          successCount++;
        } catch (error: any) {
          console.error(`❌ Failed to send scheduled newsletter ${newsletter.id}:`, error);
          errorCount++;

          // Log send failure
          await logNewsletterSendFailed({
            userId: 'SYSTEM',
            userName: 'Scheduled Newsletter System',
            newsletterId: newsletter.id,
            subject: newsletter.subject,
            errorMessage: error.message || 'Unknown error',
          });

          // Update status back to scheduled for retry
          await doc.ref.update({
            status: NewsletterStatus.SCHEDULED,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      // Log scheduled check run results
      await logScheduledCheckRun({
        newslettersFound: dueNewslettersSnapshot.size,
        newslettersSent: successCount,
        errors: errorCount,
      });

      console.log('✅ Scheduled newsletters processing complete');
      return null;
    } catch (error) {
      console.error('❌ Error in scheduled newsletters function:', error);

      // Log scheduled check run with error
      await logScheduledCheckRun({
        newslettersFound: 0,
        newslettersSent: successCount,
        errors: errorCount + 1,
      });

      return null;
    }
  });
