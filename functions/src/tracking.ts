/**
 * Email Tracking Functions
 * HTTP endpoints for tracking opens and clicks
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logEmailOpened, logEmailClicked } from './auditLogger';

const db = admin.firestore();

// 1x1 transparent GIF in base64
const TRACKING_PIXEL = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Track Email Opens
 * GET /trackOpen?nid={newsletterId}&rid={recipientId}
 */
export const trackOpenFunction = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    const { nid: newsletterId, rid: recipientId } = req.query;

    if (!newsletterId || !recipientId) {
      res.status(400).send('Missing parameters');
      return;
    }

    try {
      // Extract metadata
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';

      // Log tracking event
      await db.collection('tracking').add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: '', // Would need to fetch from recipient doc
        eventType: 'open',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
      });

      // Increment newsletter open count
      await db
        .collection('newsletters')
        .doc(String(newsletterId))
        .update({
          'stats.opened': admin.firestore.FieldValue.increment(1),
        });

      // Log audit event with metadata
      await logEmailOpened({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        userAgent,
        ip,
      });

      console.log(`📊 Tracked open: newsletter=${newsletterId}, recipient=${recipientId}`);

      // Return tracking pixel
      res.set('Content-Type', 'image/gif');
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.send(TRACKING_PIXEL);
    } catch (error) {
      console.error('Error tracking open:', error);
      // Still return pixel even if tracking fails
      res.set('Content-Type', 'image/gif');
      res.send(TRACKING_PIXEL);
    }
  });

/**
 * Track Link Clicks
 * GET /trackClick?nid={newsletterId}&rid={recipientId}&url={originalUrl}
 */
export const trackClickFunction = functions
  .region('us-central1')
  .https.onRequest(async (req, res) => {
    const { nid: newsletterId, rid: recipientId, url: originalUrl } = req.query;

    if (!newsletterId || !recipientId || !originalUrl) {
      res.status(400).send('Missing parameters');
      return;
    }

    try {
      // Extract metadata
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';
      const decodedUrl = decodeURIComponent(String(originalUrl));

      // Log tracking event
      await db.collection('tracking').add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: '', // Would need to fetch from recipient doc
        eventType: 'click',
        linkUrl: decodedUrl,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
      });

      // Increment newsletter click count
      await db
        .collection('newsletters')
        .doc(String(newsletterId))
        .update({
          'stats.clicked': admin.firestore.FieldValue.increment(1),
        });

      // Log audit event with metadata
      await logEmailClicked({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        linkUrl: decodedUrl,
        userAgent,
        ip,
      });

      console.log(`🖱️  Tracked click: newsletter=${newsletterId}, recipient=${recipientId}, url=${originalUrl}`);

      // Redirect to original URL
      res.redirect(302, decodeURIComponent(String(originalUrl)));
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still redirect even if tracking fails
      res.redirect(302, decodeURIComponent(String(originalUrl)));
    }
  });
