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
        authTimeout: 10000,  // Increased timeout for Cloud Functions
        tlsOptions: {
            servername: 'imap.gmail.com',  // SNI support
            rejectUnauthorized: true,       // Validate certificates
        },
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

        // Allow test mode via query parameter to process already-read bounces
        const testMode = req.query.testMode === 'true';
        if (testMode) {
            console.log('🧪 Test mode enabled - will process already-read bounces');
        }

        try {
            await checkBounces(testMode);
            res.send('✅ Bounce check completed successfully. Check logs for details.');
        } catch (error: any) {
            console.error('❌ Bounce check failed:', error);
            res.status(500).send(`Bounce check failed: ${error.message}`);
        }
    });

/**
 * Extract newsletter ID from original message attachment in bounce email
 */
async function extractNewsletterIdFromAttachment(parsed: any): Promise<string> {
    try {
        // Look for the original message as an attachment (RFC822)
        if (parsed.attachments && parsed.attachments.length > 0) {
            for (const attachment of parsed.attachments) {
                // The original message is typically attached as message/rfc822
                if (attachment.contentType.includes('message/rfc822') ||
                    attachment.contentType.includes('text/rfc822-headers')) {
                    const originalMessage = await simpleParser(attachment.content);
                    const newsletterId = originalMessage.headers.get('x-newsletter-id');

                    if (newsletterId) {
                        console.log(`✅ Extracted newsletter ID: ${newsletterId}`);
                        return newsletterId as string;
                    }
                }
            }
        }

        // Fallback: Try to extract from headers in the bounce message itself
        const newsletterId = parsed.headers.get('x-newsletter-id');
        if (newsletterId) {
            console.log(`✅ Found newsletter ID in bounce headers: ${newsletterId}`);
            return newsletterId as string;
        }
    } catch (error) {
        console.warn('⚠️ Could not extract newsletter ID from attachments:', error);
    }

    return 'unknown';
}

/**
 * Extract SMTP error message from bounce body
 */
function extractErrorMessage(bodyText: string): string {
    // Try to extract the actual SMTP error (e.g., "550 5.1.1 The email account...")
    const errorPatterns = [
        /(\d{3}\s+\d\.\d\.\d\s+[^\n]+)/i,  // SMTP error code format
        /The response was:\s*([^\n]+)/i,    // Gmail format
        /Technical details.*?:\s*([^\n]+)/i, // Technical details format
    ];

    for (const pattern of errorPatterns) {
        const match = bodyText.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }

    // Fallback: Extract reason from main text
    const reasonMatch = bodyText.match(/because\s+([^.]+)\./i);
    if (reasonMatch && reasonMatch[1]) {
        return reasonMatch[1].trim();
    }

    return 'Delivery Status Notification (Async Bounce)';
}

/**
 * Main logic to check and process bounce emails
 */
export async function checkBounces(testMode: boolean = false) {
    if (!GMAIL_USER || !GMAIL_APP_PASSWORD) {
        console.error('❌ Missing Gmail credentials. Skipping bounce check.');
        return;
    }

    let connection;
    let processedCount = 0;
    let failedCount = 0;

    try {
        console.log('🔌 Connecting to Gmail IMAP...');
        connection = await imaps.connect(IMAP_CONFIG);
        await connection.openBox('INBOX');
        console.log('✅ Connected to Gmail INBOX');

        // Search for emails with "Delivery Status Notification" in subject
        // In test mode, search ALL bounces (including already read)
        // In production mode, only search UNSEEN bounces
        const searchCriteria = testMode
            ? [['SUBJECT', 'Delivery Status Notification']]
            : ['UNSEEN', ['SUBJECT', 'Delivery Status Notification']];

        const fetchOptions = {
            bodies: ['HEADER', 'TEXT', ''],  // Include full message for attachment parsing
            markSeen: false, // We'll mark as seen after processing
        };

        const messages = await connection.search(searchCriteria, fetchOptions);

        console.log(`📬 Found ${messages.length} potential bounce messages`);

        for (const message of messages) {
            try {
                const all = message.parts.find((part) => part.which === 'TEXT' || part.which === '');
                const id = message.attributes.uid;
                const idHeader = 'Imap-Id: ' + id + '\r\n';

                if (!all) {
                    console.log(`⚠️ Message ${id} has no body, skipping`);
                    continue;
                }

                console.log(`\n📧 Processing bounce message ID: ${id}`);
                const parsed = await simpleParser(idHeader + all.body);

                // Extract failed email with improved patterns
                const bodyText = parsed.text || '';
                const bodyHtml = parsed.html || '';
                const searchText = bodyText + ' ' + bodyHtml;  // Search both text and HTML

                console.log(`📝 Bounce body preview: ${bodyText.substring(0, 200)}...`);

                // Multiple regex patterns to handle different bounce formats
                const emailPatterns = [
                    // Pattern 1: "Your message wasn't delivered to EMAIL"
                    /Your message wasn'?t delivered to\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
                    // Pattern 2: "Address not found... Your message wasn't delivered to EMAIL"
                    /Address not found.*?Your message wasn'?t delivered to\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
                    // Pattern 3: "failed permanently for EMAIL"
                    /(?:failed permanently|permanently failed).*?(?:for|to)\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
                    // Pattern 4: "Delivery to EMAIL failed"
                    /Delivery to\s+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\s+failed/i,
                    // Pattern 5: Generic email extraction
                    /(?:recipient|address|email|to|user)[:\s]+([a-zA-Z0-9._+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
                ];

                let failedEmail: string | null = null;
                let matchedPattern = -1;

                for (let i = 0; i < emailPatterns.length; i++) {
                    const match = searchText.match(emailPatterns[i]);
                    if (match && match[1]) {
                        failedEmail = match[1].toLowerCase();
                        matchedPattern = i + 1;
                        break;
                    }
                }

                if (failedEmail) {
                    console.log(`📉 Found bounce for: ${failedEmail} (pattern ${matchedPattern})`);

                    // Extract newsletter ID from original message attachment
                    const newsletterId = await extractNewsletterIdFromAttachment(parsed);
                    console.log(`📰 Newsletter ID: ${newsletterId}`);

                    // Extract detailed error message
                    const errorMessage = extractErrorMessage(searchText);
                    console.log(`❌ Error: ${errorMessage}`);

                    // Log the bounce to audit logs
                    await logEmailBounced({
                        newsletterId,
                        recipientEmail: failedEmail,
                        errorMessage,
                    });

                    // Mark as seen/processed (skip in test mode to allow re-testing)
                    if (!testMode) {
                        await connection.addFlags(id, '\\Seen');
                        console.log(`✅ Bounce logged and marked as seen`);
                    } else {
                        console.log(`✅ Bounce logged (not marked as seen - test mode)`);
                    }
                    processedCount++;
                } else {
                    console.log('⚠️ Could not extract email from bounce message');
                    console.log(`🔍 Debug - Body text: ${bodyText.substring(0, 500)}`);
                    failedCount++;
                }

            } catch (err) {
                console.error('❌ Error processing individual message:', err);
                failedCount++;
            }
        }

        console.log(`\n📊 Bounce check summary:`);
        console.log(`   - Total messages: ${messages.length}`);
        console.log(`   - Successfully processed: ${processedCount}`);
        console.log(`   - Failed to process: ${failedCount}`);

    } catch (error) {
        console.error('❌ Error connecting to IMAP:', error);
        throw error;
    } finally {
        if (connection) {
            connection.end();
            console.log('🔌 IMAP connection closed');
        }
    }
}
