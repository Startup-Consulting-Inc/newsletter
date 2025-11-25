/**
 * Firebase Cloud Functions for InNews Newsletter Platform
 *
 * Functions:
 * - sendNewsletter: HTTP callable function to send newsletter emails
 * - scheduledNewsletters: Scheduled function to process scheduled newsletters
 * - trackOpen: HTTP endpoint for tracking email opens
 * - trackClick: HTTP endpoint for tracking link clicks
 * - unsubscribe: HTTP endpoint for handling email unsubscribe requests
 * - generateNewsletter: HTTP callable function to generate newsletter HTML using AI
 *
 * Environment variables are provided by Google Cloud Secret Manager
 * via firebase.json secretEnvironment configuration
 */

import * as dotenv from 'dotenv';
dotenv.config();

import * as admin from 'firebase-admin';

// Initialize Firebase Admin
admin.initializeApp();

// Export Cloud Functions
export { sendNewsletterFunction } from './sendNewsletter';
export { scheduledNewslettersFunction } from './scheduledNewsletters';
export { trackOpenFunction, trackClickFunction } from './tracking';
export { unsubscribeFunction as unsubscribe } from './unsubscribe';
export { processBounces, triggerBounceCheck } from './bounceHandler';
export { submitContactForm } from './contact';
export { generateNewsletter } from './generateNewsletter';
