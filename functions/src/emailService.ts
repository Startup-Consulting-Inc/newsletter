/**
 * Email Service - SMTP email sending with Gmail
 * Handles email composition, tracking injection, and delivery
 */

import * as nodemailer from 'nodemailer';
import juice from 'juice';
import { convert } from 'html-to-text';
import { Newsletter, Recipient, SendResult } from './types';

// Configuration from environment variables
const GMAIL_USER = process.env.GMAIL_USER || '';
const GMAIL_APP_PASSWORD = process.env.GMAIL_APP_PASSWORD || '';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || GMAIL_USER;
const TRACKING_BASE_URL = process.env.TRACKING_BASE_URL || 'https://us-central1-newsletter-b104f.cloudfunctions.net';

// Create reusable SMTP transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: GMAIL_USER,
    pass: GMAIL_APP_PASSWORD,
  },
  pool: true, // Use connection pooling
  maxConnections: 5, // Max concurrent connections
  maxMessages: 100, // Max messages per connection
});

/**
 * Prepare email HTML with tracking pixels and personalization
 */
export function prepareEmailHTML(
  htmlContent: string,
  newsletterId: string,
  recipientId: string,
  recipient: Recipient
): string {
  let processedHTML = htmlContent;

  // Personalize content
  processedHTML = personalizeContent(processedHTML, recipient);

  // Wrap all links with click tracking
  processedHTML = wrapLinksWithTracking(processedHTML, newsletterId, recipientId);

  // Add tracking pixel at the end
  const trackingPixel = `<img src="${TRACKING_BASE_URL}/trackOpenFunction?nid=${newsletterId}&rid=${recipientId}" width="1" height="1" alt="" style="display:block;" />`;
  processedHTML += trackingPixel;

  // Add unsubscribe link (legal requirement)
  const unsubscribeLink = `<p style="font-size: 12px; color: #666; margin-top: 40px; text-align: center;">
    <a href="${TRACKING_BASE_URL}/unsubscribe?rid=${recipientId}" style="color: #666;">Unsubscribe</a> |
    ${ADMIN_EMAIL}
  </p>`;
  processedHTML += unsubscribeLink;

  // Inline CSS for email client compatibility
  try {
    processedHTML = juice(processedHTML);
  } catch (error) {
    console.warn('Failed to inline CSS:', error);
  }

  return processedHTML;
}

/**
 * Personalize content with recipient data
 */
function personalizeContent(html: string, recipient: Recipient): string {
  let personalized = html;

  // Replace common tokens
  personalized = personalized.replace(/\{\{firstName\}\}/g, recipient.firstName || '');
  personalized = personalized.replace(/\{\{lastName\}\}/g, recipient.lastName || '');
  personalized = personalized.replace(/\{\{email\}\}/g, recipient.email);
  personalized = personalized.replace(/\{\{fullName\}\}/g,
    `${recipient.firstName || ''} ${recipient.lastName || ''}`.trim() || recipient.email
  );

  return personalized;
}

/**
 * Wrap all links with click tracking
 */
function wrapLinksWithTracking(html: string, newsletterId: string, recipientId: string): string {
  return html.replace(
    /href="([^"]+)"/g,
    (match, url) => {
      // Don't track unsubscribe links or tracking URLs
      if (url.includes('unsubscribe') || url.includes('track')) {
        return match;
      }

      const encodedUrl = encodeURIComponent(url);
      const trackingUrl = `${TRACKING_BASE_URL}/trackClickFunction?nid=${newsletterId}&rid=${recipientId}&url=${encodedUrl}`;
      return `href="${trackingUrl}"`;
    }
  );
}

/**
 * Generate plain text version from HTML
 */
function generatePlainText(html: string): string {
  return convert(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'a', options: { ignoreHref: false } },
      { selector: 'img', format: 'skip' },
    ],
  });
}

/**
 * Send email to a single recipient
 */
async function sendSingleEmail(
  newsletter: Newsletter,
  recipient: Recipient
): Promise<{ success: boolean; error?: string }> {
  try {
    const htmlContent = prepareEmailHTML(
      newsletter.htmlContent,
      newsletter.id,
      recipient.id,
      recipient
    );

    const plainTextContent = generatePlainText(newsletter.htmlContent);

    const mailOptions = {
      from: `"InNews Newsletter" <${GMAIL_USER}>`,
      to: recipient.email,
      subject: newsletter.subject,
      html: htmlContent,
      text: plainTextContent,
      headers: {
        'X-Newsletter-ID': newsletter.id,
        'X-Recipient-ID': recipient.id,
      },
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Email sent to ${recipient.email}`);
    return { success: true };
  } catch (error: any) {
    console.error(`❌ Failed to send to ${recipient.email}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send newsletter to all recipients with rate limiting
 */
export async function sendNewsletterEmails(
  newsletter: Newsletter,
  recipients: Recipient[]
): Promise<SendResult> {
  console.log(`📧 Starting to send newsletter ${newsletter.id} to ${recipients.length} recipients...`);

  const results: SendResult = {
    success: true,
    newsletterId: newsletter.id,
    totalRecipients: recipients.length,
    successCount: 0,
    failureCount: 0,
    errors: [],
  };

  // Send emails in batches to respect rate limits
  const BATCH_SIZE = 10; // Send 10 emails at a time
  const BATCH_DELAY = 1000; // 1 second delay between batches

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(recipients.length / BATCH_SIZE)}...`);

    // Send batch in parallel
    const batchPromises = batch.map((recipient) =>
      sendSingleEmail(newsletter, recipient)
    );

    const batchResults = await Promise.all(batchPromises);

    // Aggregate results
    batchResults.forEach((result, index) => {
      if (result.success) {
        results.successCount++;
      } else {
        results.failureCount++;
        results.errors.push({
          recipientEmail: batch[index].email,
          error: result.error || 'Unknown error',
        });
      }
    });

    // Delay between batches (except for the last one)
    if (i + BATCH_SIZE < recipients.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
    }
  }

  results.success = results.failureCount === 0;

  console.log(`✅ Newsletter sending complete: ${results.successCount} sent, ${results.failureCount} failed`);

  return results;
}

/**
 * Verify SMTP configuration
 */
export async function verifyEmailConfiguration(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('✅ SMTP configuration verified');
    return true;
  } catch (error: any) {
    console.error('❌ SMTP configuration error:', error.message);
    return false;
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(toEmail: string): Promise<boolean> {
  try {
    await transporter.sendMail({
      from: `"InNews Newsletter" <${GMAIL_USER}>`,
      to: toEmail,
      subject: 'Test Email from InNews',
      html: '<h1>Test Email</h1><p>If you receive this, your email configuration is working!</p>',
      text: 'Test Email\n\nIf you receive this, your email configuration is working!',
    });
    console.log(`✅ Test email sent to ${toEmail}`);
    return true;
  } catch (error: any) {
    console.error(`❌ Test email failed:`, error.message);
    return false;
  }
}
