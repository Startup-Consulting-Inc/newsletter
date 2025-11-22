import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { AuditAction } from './types';

const db = admin.firestore();

/**
 * Unsubscribe Function
 * HTTP endpoint to handle email unsubscribe requests
 * URL: /unsubscribe?rid={recipientId}
 */
export const unsubscribeFunction = functions.https.onRequest(async (req, res) => {
  try {
    // Get recipientId from query parameter
    const recipientId = req.query.rid as string;

    if (!recipientId) {
      res.status(400).send(renderErrorPage('Missing recipient ID'));
      return;
    }

    // Find recipient email by searching all groups
    let recipientEmail: string | null = null;
    let affectedGroupIds: string[] = [];

    const groupsSnapshot = await db.collection('recipientGroups').get();

    // Search through all groups to find the recipient
    for (const groupDoc of groupsSnapshot.docs) {
      const recipientDoc = await db
        .collection('recipientGroups')
        .doc(groupDoc.id)
        .collection('recipients')
        .doc(recipientId)
        .get();

      if (recipientDoc.exists) {
        const recipientData = recipientDoc.data();
        if (recipientData && recipientData.email) {
          recipientEmail = recipientData.email;
          affectedGroupIds.push(groupDoc.id);
        }
      }
    }

    if (!recipientEmail) {
      res.status(404).send(renderErrorPage('Recipient not found'));
      return;
    }

    // Check if already unsubscribed
    const unsubscribeDoc = await db.collection('unsubscribes').doc(recipientEmail).get();
    if (unsubscribeDoc.exists) {
      res.status(200).send(renderSuccessPage(recipientEmail, true));
      return;
    }

    // Create unsubscribe record
    await db.collection('unsubscribes').doc(recipientEmail).set({
      email: recipientEmail,
      recipientId: recipientId,
      unsubscribedAt: new Date().toISOString(),
      groupIds: affectedGroupIds,
      userAgent: req.headers['user-agent'] || null,
      ipAddress: req.ip || null,
    });

    // Remove from all recipient groups
    const batch = db.batch();
    let removedCount = 0;

    for (const groupId of affectedGroupIds) {
      const groupRef = db.collection('recipientGroups').doc(groupId);
      const recipientRef = groupRef.collection('recipients').doc(recipientId);

      // Delete recipient document
      batch.delete(recipientRef);

      // Get current group data to update count
      const groupSnap = await groupRef.get();
      if (groupSnap.exists) {
        const groupData = groupSnap.data();
        const currentCount = groupData?.recipientCount || 0;
        const newCount = Math.max(0, currentCount - 1);

        // Update group recipient count
        batch.update(groupRef, {
          recipientCount: newCount,
        });

        removedCount++;
      }
    }

    // Commit batch operations
    await batch.commit();

    // Log audit event
    try {
      await db.collection('auditLogs').add({
        action: AuditAction.RECIPIENT_UNSUBSCRIBED,
        category: 'RECIPIENT',
        severity: 'INFO',
        userId: 'system',
        userName: 'System',
        userEmail: null,
        userRole: null,
        targetType: 'Recipient',
        targetName: recipientEmail,
        details: {
          recipientId: recipientId,
          groupsRemoved: affectedGroupIds.length,
          groupIds: affectedGroupIds,
        },
        timestamp: new Date().toISOString(),
        requestMetadata: {
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          method: req.method,
          endpoint: req.url,
        },
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
      // Don't fail the request if audit logging fails
    }

    // Return success page
    res.status(200).send(renderSuccessPage(recipientEmail, false));

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send(renderErrorPage('An error occurred. Please try again later.'));
  }
});

/**
 * Render success page HTML
 */
function renderSuccessPage(email: string, alreadyUnsubscribed: boolean): string {
  const message = alreadyUnsubscribed
    ? `You've already unsubscribed from our mailing list.`
    : `You've been successfully unsubscribed from our mailing list.`;

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Unsubscribed</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #2d3748;
          margin: 0 0 16px 0;
          font-size: 28px;
        }
        p {
          color: #4a5568;
          line-height: 1.6;
          margin: 0 0 12px 0;
        }
        .email {
          color: #667eea;
          font-weight: 600;
          word-break: break-all;
        }
        .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e2e8f0;
          color: #718096;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">✓</div>
        <h1>${alreadyUnsubscribed ? 'Already Unsubscribed' : 'Unsubscribe Successful'}</h1>
        <p>${message}</p>
        <p class="email">${email}</p>
        <div class="footer">
          <p>You will no longer receive newsletters from us.</p>
          <p>If this was a mistake, please contact us to resubscribe.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Render error page HTML
 */
function renderErrorPage(message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Error</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          margin: 0;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        .container {
          background: white;
          border-radius: 12px;
          padding: 40px;
          max-width: 500px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        .icon {
          font-size: 64px;
          margin-bottom: 20px;
        }
        h1 {
          color: #2d3748;
          margin: 0 0 16px 0;
          font-size: 28px;
        }
        p {
          color: #4a5568;
          line-height: 1.6;
          margin: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">⚠️</div>
        <h1>Unsubscribe Error</h1>
        <p>${message}</p>
      </div>
    </body>
    </html>
  `;
}
