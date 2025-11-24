import * as functions from 'firebase-functions';
// import * as admin from 'firebase-admin';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';
import { logEmailBounced } from './auditLogger';

// const db = admin.firestore();

// Configuration
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';

const IMAP_CONFIG = {
    imap: {
        user: GMAIL_USER,
        password: GMAIL_APP_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000,
    },
};

/**
 * Scheduled function to check for bounce emails
 */
export const processBounces = functions
    .region('us-central1')
    .runWith({
        timeoutSeconds: 300,
        memory: '512MB',
    })
    .pubsub.schedule('every 60 minutes') // Run every hour
    .onRun(async (context) => {
        console.log('🔄 Starting scheduled bounce check...');
        await checkBounces();
        console.log('✅ Bounce check completed');
    });

/**
 * HTTP Trigger for manual bounce check
 */
export const triggerBounceCheck = functions
    .region('us-central1')
    .https.onRequest(async (req, res) => {
        console.log('🔄 Starting manual bounce check...');
        try {
            await checkBounces();
            res.send('✅ Bounce check completed successfully. Check logs for details.');
        } catch (error: any) {
            console.error('❌ Bounce check failed:', error);
            res.status(500).send(`Bounce check failed: ${error.message}`);
        }
    });

/**
 * Main logic to check and process bounce emails
 */
export async function checkBounces() {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('❌ Missing Gmail credentials. Skipping bounce check.');
        return;
    }

    let connection;

    try {
        connection = await imaps.connect(IMAP_CONFIG);
        await connection.openBox('INBOX');

        // Search for unread emails with "Delivery Status Notification" in subject
        const searchCriteria = [
            'UNSEEN',
            ['SUBJECT', 'Delivery Status Notification'],
        ];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT'],
            markSeen: false, // We'll mark as seen after processing
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        console.log(`found ${messages.length} potential bounce messages`);

        for (const message of messages) {
            try {
                const all = message.parts.find((part) => part.which === 'TEXT');
                const id = message.attributes.uid;
                const idHeader = 'Imap-Id: ' + id + '\r\n';

                if (!all) continue;

                const parsed = await simpleParser(idHeader + all.body);

                // Extract failed email and reason
                // This is a heuristic - bounce formats vary, but Gmail's are consistent
                const bodyText = parsed.text || '';
                const failedEmailMatch = bodyText.match(/Address not found\s+Your message wasn't delivered to\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i) ||
                    bodyText.match(/failed permanently\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6})/i);

                const failedEmail = failedEmailMatch ? failedEmailMatch[1] : null;

                if (failedEmail) {
                    console.log(`📉 Found bounce for: ${failedEmail}`);

                    // Find the newsletter this bounce belongs to
                    // We look for the X-Newsletter-ID header in the original message attached to the bounce
                    // But parsing that is complex. For now, we'll log it as a system bounce
                    // or try to find a recent newsletter sent to this person.

                    // Simple approach: Log the bounce generically
                    await logEmailBounced({
                        newsletterId: 'unknown', // Hard to extract without deep parsing of attachments
                        recipientEmail: failedEmail,
                        errorMessage: 'Delivery Status Notification (Async Bounce)',
                    });

                    // Mark as seen/processed
                    await connection.addFlags(id, '\\Seen');
                } else {
                    console.log('⚠️ Could not extract email from bounce message');
                }

            } catch (err) {
                console.error('Error processing message:', err);
            }
        }

    } catch (error) {
        console.error('❌ Error connecting to IMAP:', error);
    } finally {
        if (connection) {
            connection.end();
        }
    }
}
