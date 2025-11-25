import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { z } from 'zod';

// Initialize Firestore
const db = admin.firestore();

// Validation Schema
const submitContactSchema = z.object({
    inquiryType: z.enum(['GENERAL', 'SALES', 'SUPPORT', 'PARTNERSHIP', 'PRESS', 'QUESTION', 'BUG_REPORT', 'DEMO', 'FEATURE_REQUEST', 'OTHER']),
    name: z.string().min(2).max(100),
    email: z.string().email(),
    company: z.string().max(200).optional(),
    role: z.string().max(100).optional(),
    teamSize: z.string().max(50).optional(),
    subject: z.string().max(200).optional(),
    message: z.string().max(2000).optional(),
    attachments: z.array(z.object({
        url: z.string().url(),
        filename: z.string(),
        mimetype: z.string(),
        size: z.number(),
        path: z.string()
    })).optional(),
});

// Email Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});

export const submitContactForm = functions.https.onCall(async (data, context) => {
    try {
        // 1. Validate Input
        const validatedData = submitContactSchema.parse(data);

        // 2. Save to Firestore
        const docRef = await db.collection('contactRequests').add({
            ...validatedData,
            status: 'PENDING',
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Contact request saved with ID: ${docRef.id}`);

        // 3. Send Email Notification to Admin
        const adminEmail = process.env.ADMIN_EMAIL;
        if (adminEmail) {
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: adminEmail,
                subject: `[New Contact Request] ${validatedData.inquiryType}: ${validatedData.subject || 'No Subject'}`,
                html: `
                    <h2>New Contact Request</h2>
                    <p><strong>Type:</strong> ${validatedData.inquiryType}</p>
                    <p><strong>Name:</strong> ${validatedData.name}</p>
                    <p><strong>Email:</strong> ${validatedData.email}</p>
                    <p><strong>Company:</strong> ${validatedData.company || 'N/A'}</p>
                    <p><strong>Role:</strong> ${validatedData.role || 'N/A'}</p>
                    <p><strong>Message:</strong></p>
                    <blockquote style="background: #f9f9f9; padding: 10px; border-left: 5px solid #ccc;">
                        ${validatedData.message?.replace(/\n/g, '<br>') || 'No message'}
                    </blockquote>
                    ${validatedData.attachments && validatedData.attachments.length > 0 ? `
                        <p><strong>Attachments:</strong></p>
                        <ul>
                            ${validatedData.attachments.map(att => `<li><a href="${att.url}">${att.filename}</a></li>`).join('')}
                        </ul>
                    ` : ''}
                    <p><a href="https://console.firebase.google.com/project/${process.env.GCLOUD_PROJECT}/firestore/data/~2FcontactRequests~2F${docRef.id}">View in Firestore</a></p>
                `,
            };

            await transporter.sendMail(mailOptions);
            console.log('📧 Admin notification email sent');
        } else {
            console.warn('⚠️ ADMIN_EMAIL not set, skipping notification email');
        }

        return { success: true, id: docRef.id };

    } catch (error: any) {
        console.error('❌ Error submitting contact form:', error);
        if (error instanceof z.ZodError) {
            throw new functions.https.HttpsError('invalid-argument', 'Validation failed', error.issues);
        }
        throw new functions.https.HttpsError('internal', 'Failed to submit contact form');
    }
});
