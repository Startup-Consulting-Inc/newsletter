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

      // Check if already tracked
      const trackingRef = db.collection('tracking');
      const q = trackingRef
        .where('newsletterId', '==', String(newsletterId))
        .where('recipientId', '==', String(recipientId))
        .where('eventType', '==', 'open')
        .limit(1);

      const snapshot = await q.get();
      const isUnique = snapshot.empty;

      // Log tracking event
      await trackingRef.add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: '', // Would need to fetch from recipient doc
        eventType: 'open',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
      });

      // Increment newsletter open count
      const updateData: any = {
        'stats.opened': admin.firestore.FieldValue.increment(1),
      };

      if (isUnique) {
        updateData['stats.uniqueOpened'] = admin.firestore.FieldValue.increment(1);
      }

      await db
        .collection('newsletters')
        .doc(String(newsletterId))
        .update(updateData);

      // Log audit event with metadata
      await logEmailOpened({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        userAgent,
        ip,
      });

      console.log(`📊 Tracked open: newsletter=${newsletterId}, recipient=${recipientId}, unique=${isUnique}`);

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

      // Check if already tracked
      const trackingRef = db.collection('tracking');
      const q = trackingRef
        .where('newsletterId', '==', String(newsletterId))
        .where('recipientId', '==', String(recipientId))
        .where('eventType', '==', 'click')
        .limit(1);

      const snapshot = await q.get();
      const isUnique = snapshot.empty;

      // Log tracking event
      await trackingRef.add({
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
      const updateData: any = {
        'stats.clicked': admin.firestore.FieldValue.increment(1),
      };

      if (isUnique) {
        updateData['stats.uniqueClicked'] = admin.firestore.FieldValue.increment(1);
      }

      await db
        .collection('newsletters')
        .doc(String(newsletterId))
        .update(updateData);

      // Log audit event with metadata
      await logEmailClicked({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        linkUrl: decodedUrl,
        userAgent,
        ip,
      });

      console.log(`🖱️  Tracked click: newsletter=${newsletterId}, recipient=${recipientId}, url=${originalUrl}, unique=${isUnique}`);

      // Redirect to original URL
      res.redirect(302, decodeURIComponent(String(originalUrl)));
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still redirect even if tracking fails
      res.redirect(302, decodeURIComponent(String(originalUrl)));
    }
  });
