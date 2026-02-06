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
 * Known email proxy IP prefixes (e.g., Gmail Image Proxy, Google infrastructure)
 * These proxies pre-fetch images immediately after delivery, inflating open rates.
 */
const KNOWN_PROXY_IP_PREFIXES = [
  '66.249.', '66.102.', '72.14.',    // Google
  '209.85.', '108.177.', '172.217.', // Google
  '74.125.',                          // Google
];

function isKnownProxyIP(ip: string): boolean {
  if (!ip) return false;
  return KNOWN_PROXY_IP_PREFIXES.some(prefix => ip.startsWith(prefix));
}

/**
 * Check if an open/click event is likely from an email proxy pre-fetch.
 * Returns true if the event happened within PROXY_THRESHOLD_SECONDS of the newsletter being sent
 * OR if the IP matches a known email proxy range.
 */
const PROXY_THRESHOLD_SECONDS = 60;

function isPossibleProxyRequest(ip: string, sentAt: Date | null): boolean {
  if (isKnownProxyIP(ip)) return true;
  // If sentAt is null, newsletter is still in SENDING state — treat as proxy
  if (!sentAt) return true;
  const timeSinceSentSeconds = (Date.now() - sentAt.getTime()) / 1000;
  return timeSinceSentSeconds < PROXY_THRESHOLD_SECONDS;
}

/**
 * Detect email client bulk prefetching across multiple accounts.
 * If the same IP has already triggered a tracking event for a DIFFERENT recipient
 * of the same newsletter within a short window, it's likely an email client
 * loading all images across all managed accounts at once.
 */
const BULK_OPEN_WINDOW_SECONDS = 5;

async function isBulkClientOpen(
  newsletterId: string,
  recipientId: string,
  ip: string,
  eventType: 'open' | 'click'
): Promise<boolean> {
  if (!ip) return false;

  const windowStart = new Date(Date.now() - BULK_OPEN_WINDOW_SECONDS * 1000);

  const recentFromSameIP = await db.collection('tracking')
    .where('newsletterId', '==', newsletterId)
    .where('ipAddress', '==', ip)
    .where('eventType', '==', eventType)
    .where('timestamp', '>=', admin.firestore.Timestamp.fromDate(windowStart))
    .limit(1)
    .get();

  return !recentFromSameIP.empty;
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

      // Fetch newsletter doc to resolve recipient email and get sentAt for proxy detection
      let recipientEmail = '';
      let sentAt: Date | null = null;
      try {
        const newsletterDoc = await db.collection('newsletters').doc(String(newsletterId)).get();
        if (newsletterDoc.exists) {
          const newsletter = newsletterDoc.data();
          sentAt = newsletter?.sentAt?.toDate?.() || null;
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

      // Detect email proxy pre-fetching (e.g., Gmail Image Proxy)
      let possibleProxy = isPossibleProxyRequest(ip, sentAt);
      if (possibleProxy) {
        console.log(`📧 Possible proxy open detected: newsletter=${newsletterId}, recipient=${recipientId}, ip=${ip}, sentAt=${sentAt?.toISOString()}`);
      }

      // Detect email client bulk prefetching (same IP, multiple recipients, short window)
      if (!possibleProxy) {
        const bulkOpen = await isBulkClientOpen(String(newsletterId), String(recipientId), ip, 'open');
        if (bulkOpen) {
          possibleProxy = true;
          console.log(`📧 Bulk client open detected: same IP ${ip} opened multiple recipients within ${BULK_OPEN_WINDOW_SECONDS}s`);
        }
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

      // Log tracking event (always store for audit, but flag proxy events)
      const trackingDoc = await trackingRef.add({
        newsletterId: String(newsletterId),
        recipientId: String(recipientId),
        recipientEmail: recipientEmail || 'Unknown',
        eventType: 'open',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userAgent,
        ipAddress: ip,
        isBot: false,
        possibleProxy,
      });

      console.log(`📊 Created tracking record: id=${trackingDoc.id}, newsletter=${newsletterId}, recipient=${recipientId}, email=${recipientEmail || 'unknown'}, possibleProxy=${possibleProxy}`);

      // Only increment stats for non-proxy opens
      if (!possibleProxy) {
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
      }

      // Log audit event with metadata
      await logEmailOpened({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        userAgent,
        ip,
      });

      console.log(`📊 Tracked open: newsletter=${newsletterId}, recipient=${recipientId}, unique=${isUnique}, possibleProxy=${possibleProxy}`);

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

      // Fetch newsletter doc to resolve recipient email and get sentAt for proxy detection
      let recipientEmail = '';
      let sentAt: Date | null = null;
      try {
        const newsletterDoc = await db.collection('newsletters').doc(String(newsletterId)).get();
        if (newsletterDoc.exists) {
          const newsletter = newsletterDoc.data();
          sentAt = newsletter?.sentAt?.toDate?.() || null;
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

      // Detect email proxy pre-fetching
      let possibleProxy = isPossibleProxyRequest(ip, sentAt);
      if (possibleProxy) {
        console.log(`📧 Possible proxy click detected: newsletter=${newsletterId}, recipient=${recipientId}, ip=${ip}, sentAt=${sentAt?.toISOString()}`);
      }

      // Detect email client bulk prefetching (same IP, multiple recipients, short window)
      if (!possibleProxy) {
        const bulkClick = await isBulkClientOpen(String(newsletterId), String(recipientId), ip, 'click');
        if (bulkClick) {
          possibleProxy = true;
          console.log(`📧 Bulk client click detected: same IP ${ip} clicked multiple recipients within ${BULK_OPEN_WINDOW_SECONDS}s`);
        }
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

      // Log tracking event (always store for audit, but flag proxy events)
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
        possibleProxy,
      });

      console.log(`🖱️ Created tracking record: id=${trackingDoc.id}, newsletter=${newsletterId}, recipient=${recipientId}, email=${recipientEmail || 'unknown'}, possibleProxy=${possibleProxy}`);

      // Only increment stats for non-proxy clicks
      if (!possibleProxy) {
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
      }

      // Log audit event with metadata
      await logEmailClicked({
        newsletterId: String(newsletterId),
        recipientEmail: String(recipientId), // Using recipientId as placeholder
        recipientId: String(recipientId),
        linkUrl: decodedUrl,
        userAgent,
        ip,
      });

      console.log(`🖱️  Tracked click: newsletter=${newsletterId}, recipient=${recipientId}, url=${originalUrl}, unique=${isUnique}, possibleProxy=${possibleProxy}`);

      // Redirect to original URL
      res.redirect(302, decodedUrl);
    } catch (error) {
      console.error('Error tracking click:', error);
      // Still redirect even if tracking fails
      res.redirect(302, decodedUrl);
    }
  });
