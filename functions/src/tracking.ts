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
 * Detect if request is likely from a bot/email scanner
 * Email clients like Gmail, Outlook, Apple Mail often pre-fetch images
 * for security scanning which artificially inflates open rates
 */
function isLikelyBot(userAgent: string): boolean {
  const botPatterns = [
    // Email service scanners
    /googleimageproxy/i,
    /google.*image/i,
    /yahoo.*slurp/i,
    /outlook.*image/i,
    /microsoft.*image/i,
    /ms.*image/i,
    
    // Common bot patterns
    /bot/i,
    /crawler/i,
    /spider/i,
    /crawling/i,
    /preview/i,
    /preload/i,
    /prefetch/i,
    /slurp/i,
    /mediapartners/i,
    /facebookexternalhit/i,
    /linkedinbot/i,
    /twitterbot/i,
    /whatsapp/i,
    /telegram/i,
    /slackbot/i,
    
    // Security scanners
    /barracuda/i,
    /proofpoint/i,
    /mimecast/i,
    /fortigate/i,
    /fireeyemailsecurity/i,
    /ironport/i,
    /barracuda/i,
    /messagelabs/i,
    /symantec/i,
    /mcafee/i,
    /sophos/i,
    /trend.*micro/i,
    /bitdefender/i,
    /avast/i,
    /avg/i,
    /norton/i,
    /kaspersky/i,
    /websense/i,
    /bluecoat/i,
    
    // Link scanners
    /safelink/i,
    /urlscan/i,
    /safebrowsing/i,
    /phishtank/i,
    
    // Generic patterns
    /headless/i,
    /phantom/i,
    /curl/i,
    /wget/i,
    /python-requests/i,
    /libwww/i,
    /apache-httpclient/i,
    /java\//i,
    /okhttp/i,
    /axios/i,
    /node-fetch/i,
  ];

  if (!userAgent || userAgent.trim() === '') {
    return true; // Empty user-agent is suspicious
  }

  return botPatterns.some(pattern => pattern.test(userAgent));
}

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

      // Check if this is likely a bot/email scanner
      const isBotRequest = isLikelyBot(userAgent);
      
      if (isBotRequest) {
        console.log(`🤖 Bot detected, skipping tracking: newsletter=${newsletterId}, ua=${userAgent.substring(0, 50)}`);
        // Still return the pixel but don't count it
        res.set('Content-Type', 'image/gif');
        res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(TRACKING_PIXEL);
        return;
      }

      // Try to resolve recipient email from newsletter's recipient groups
      let recipientEmail = '';
      try {
        const newsletterDoc = await db.collection('newsletters').doc(String(newsletterId)).get();
        if (newsletterDoc.exists) {
          const newsletter = newsletterDoc.data();
          const recipientGroupIds = newsletter?.recipientGroupIds || [];
          
          // Search for recipient in all groups
          for (const groupId of recipientGroupIds) {
            const recipientDoc = await db
              .collection('recipientGroups')
              .doc(groupId)
              .collection('recipients')
              .doc(String(recipientId))
              .get();
            
            if (recipientDoc.exists) {
              recipientEmail = recipientDoc.data()?.email || '';
              break;
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to resolve recipient email for ${recipientId}:`, error);
      }

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
      const trackingDoc = await trackingRef.add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: recipientEmail || 'Unknown',
        eventType: 'open',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
        isBot: false,
      });

      console.log(`📊 Created tracking record: id=${trackingDoc.id}, newsletter=${newsletterId}, recipient=${recipientId}, email=${recipientEmail || 'unknown'}`);

      // Increment newsletter open count
      const updateData: Record<string, admin.firestore.FieldValue> = {
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

    const decodedUrl = decodeURIComponent(String(originalUrl));

    try {
      // Extract metadata
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.ip || (req.headers['x-forwarded-for'] as string) || '';

      // Check if this is likely a bot/email scanner
      // Note: For clicks, we still redirect but don't count bot traffic
      const isBotRequest = isLikelyBot(userAgent);
      
      if (isBotRequest) {
        console.log(`🤖 Bot detected, skipping click tracking: newsletter=${newsletterId}, ua=${userAgent.substring(0, 50)}`);
        // Still redirect to the URL but don't count it
        res.redirect(302, decodedUrl);
        return;
      }

      // Try to resolve recipient email from newsletter's recipient groups
      let recipientEmail = '';
      try {
        const newsletterDoc = await db.collection('newsletters').doc(String(newsletterId)).get();
        if (newsletterDoc.exists) {
          const newsletter = newsletterDoc.data();
          const recipientGroupIds = newsletter?.recipientGroupIds || [];
          
          // Search for recipient in all groups
          for (const groupId of recipientGroupIds) {
            const recipientDoc = await db
              .collection('recipientGroups')
              .doc(groupId)
              .collection('recipients')
              .doc(String(recipientId))
              .get();
            
            if (recipientDoc.exists) {
              recipientEmail = recipientDoc.data()?.email || '';
              break;
            }
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to resolve recipient email for ${recipientId}:`, error);
      }

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
      const trackingDoc = await trackingRef.add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: recipientEmail || 'Unknown',
        eventType: 'click',
        linkUrl: decodedUrl,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
        isBot: false,
      });

      console.log(`🖱️ Created tracking record: id=${trackingDoc.id}, newsletter=${newsletterId}, recipient=${recipientId}, email=${recipientEmail || 'unknown'}`);

      // Increment newsletter click count
      const updateData: Record<string, admin.firestore.FieldValue> = {
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
      res.redirect(302, decodedUrl);
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still redirect even if tracking fails
      res.redirect(302, decodedUrl);
    }
  });
