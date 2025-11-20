/**
 * Send Newsletter Cloud Function
 * HTTP Callable function triggered by "Send Now" button
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { Newsletter, Recipient, NewsletterStatus, SendResult } from './types';
import { sendNewsletterEmails, verifyEmailConfiguration } from './emailService';
import {
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
  const seenEmails = new Set<string>(); // Deduplicate by email

  for (const groupId of groupIds) {
    const groupDoc = await db.collection('recipientGroups').doc(groupId).get();

    if (!groupDoc.exists) {
      console.warn(`⚠️  Group ${groupId} not found`);
      continue;
    }

    // Fetch recipients subcollection
    const recipientsSnapshot = await db
      .collection('recipientGroups')
      .doc(groupId)
      .collection('recipients')
      .get();

    recipientsSnapshot.forEach((doc) => {
      const recipient = { id: doc.id, ...doc.data() } as Recipient;

      // Deduplicate by email
      if (!seenEmails.has(recipient.email)) {
        seenEmails.add(recipient.email);
        allRecipients.push(recipient);
      }
    });
  }

  console.log(`📋 Fetched ${allRecipients.length} unique recipients from ${groupIds.length} groups`);
  return allRecipients;
}

/**
 * Update newsletter status and stats in Firestore
 */
async function updateNewsletterStatus(
  newsletterId: string,
  status: NewsletterStatus,
  stats?: { sent: number; opened: number; clicked: number; bounced: number }
): Promise<void> {
  const updates: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (status === NewsletterStatus.SENT) {
    updates.sentAt = admin.firestore.FieldValue.serverTimestamp();
  }

  if (stats) {
    updates.stats = stats;
  }

  await db.collection('newsletters').doc(newsletterId).update(updates);
  console.log(`✅ Newsletter ${newsletterId} status updated to ${status}`);
}

/**
 * Main Cloud Function - Send Newsletter
 */
export const sendNewsletterFunction = functions
  .region('us-central1')
  .runWith({
    timeoutSeconds: 540, // 9 minutes (max for HTTP functions)
    memory: '512MB',
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to send newsletters'
      );
    }

    const { newsletterId } = data;

    if (!newsletterId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Newsletter ID is required'
      );
    }

    try {
      const startTime = Date.now();
      console.log(`🚀 Starting newsletter send process for ${newsletterId}`);

      // Verify email configuration
      const emailConfigValid = await verifyEmailConfiguration();
      if (!emailConfigValid) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Email configuration is invalid. Please check SMTP settings.'
        );
      }

      // Fetch newsletter
      const newsletterDoc = await db.collection('newsletters').doc(newsletterId).get();

      if (!newsletterDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          `Newsletter ${newsletterId} not found`
        );
      }

      const newsletter = { id: newsletterDoc.id, ...newsletterDoc.data() } as Newsletter;

      // Validate newsletter can be sent
      if (newsletter.status === NewsletterStatus.SENT) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Newsletter has already been sent'
        );
      }

      // Fetch recipients
      const recipients = await fetchRecipients(newsletter.recipientGroupIds);

      if (recipients.length === 0) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'No recipients found in selected groups'
        );
      }

      // Update status to "Sending"
      await updateNewsletterStatus(newsletterId, NewsletterStatus.SENDING);

      // Log send started
      await logNewsletterSendStarted({
        userId: context.auth.uid,
        userName: context.auth.token.name || context.auth.token.email || 'Unknown',
        userEmail: context.auth.token.email,
        newsletterId,
        subject: newsletter.subject,
        recipientCount: recipients.length,
      });

      // Send emails
      const sendResult: SendResult = await sendNewsletterEmails(newsletter, recipients);

      // Log individual email deliveries and bounces
      for (const error of sendResult.errors) {
        await logEmailBounced({
          newsletterId,
          recipientEmail: error.recipientEmail,
          errorMessage: error.error,
        });
      }

      // Calculate duration
      const duration = Math.round((Date.now() - startTime) / 1000); // seconds

      // Update newsletter with final status and stats
      await updateNewsletterStatus(newsletterId, NewsletterStatus.SENT, {
        sent: sendResult.successCount,
        opened: 0, // Will be updated by tracking
        clicked: 0, // Will be updated by tracking
        bounced: sendResult.failureCount,
      });

      // Log send completed
      await logNewsletterSendCompleted({
        userId: context.auth.uid,
        userName: context.auth.token.name || context.auth.token.email || 'Unknown',
        userEmail: context.auth.token.email,
        newsletterId,
        subject: newsletter.subject,
        successCount: sendResult.successCount,
        failureCount: sendResult.failureCount,
        duration,
      });

      console.log(`🎉 Newsletter ${newsletterId} sent successfully!`);

      // Return results to frontend
      return {
        success: sendResult.success,
        message: `Newsletter sent to ${sendResult.successCount} of ${sendResult.totalRecipients} recipients`,
        stats: {
          total: sendResult.totalRecipients,
          sent: sendResult.successCount,
          failed: sendResult.failureCount,
        },
        errors: sendResult.errors.length > 0 ? sendResult.errors : undefined,
      };
    } catch (error: any) {
      console.error(`❌ Error sending newsletter:`, error);

      // Log send failure
      if (context.auth) {
        await logNewsletterSendFailed({
          userId: context.auth.uid,
          userName: context.auth.token.name || context.auth.token.email || 'Unknown',
          userEmail: context.auth.token.email,
          newsletterId,
          subject: 'Unknown',
          errorMessage: error.message || 'Unknown error',
        });
      }

      // Update status back to draft if sending failed
      try {
        await updateNewsletterStatus(newsletterId, NewsletterStatus.DRAFT);
      } catch (updateError) {
        console.error(`❌ Failed to update newsletter status:`, updateError);
      }

      // Re-throw as HttpsError for proper client handling
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to send newsletter: ${error.message}`
      );
    }
  });
