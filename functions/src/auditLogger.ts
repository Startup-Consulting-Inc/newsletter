/**
 * Audit Logging Helper for Cloud Functions
 * Provides simple audit logging functionality for backend operations
 */

import * as admin from 'firebase-admin';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditLogEntry,
  RequestMetadata,
} from './types';

const db = admin.firestore();

/**
 * Helper to remove undefined values from an object
 */
function removeUndefined<T extends Record<string, any>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined)
  ) as Partial<T>;
}

/**
 * Core audit logging function
 */
export async function logAuditEvent(params: {
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: string;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
  requestMetadata?: RequestMetadata;
}): Promise<void> {
  try {
    const auditLog: Omit<AuditLogEntry, 'id'> = {
      // Actor Information
      userId: params.userId,
      userName: params.userName,
      userEmail: params.userEmail,
      userRole: params.userRole,

      // Action Details
      action: params.action,
      category: params.category,
      severity: params.severity,

      // Target Information
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,

      // Legacy field for backward compatibility
      target: params.targetName
        ? `${params.targetType}: ${params.targetName}`
        : params.targetType,

      // Context & Metadata
      details: params.details,

      // Request Information
      requestMetadata: params.requestMetadata,

      // Timestamp
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Remove undefined values before saving to Firestore
    const cleanedLog = removeUndefined(auditLog);
    await db.collection('auditLogs').add(cleanedLog);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should never break the app
  }
}

// ============================================================================
// NEWSLETTER LOGGING HELPERS
// ============================================================================

export async function logNewsletterSendStarted(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  newsletterId: string;
  subject: string;
  recipientCount: number;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_SEND_STARTED,
    category: AuditCategory.NEWSLETTER,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      recipientCount: params.recipientCount,
    },
  });
}

export async function logNewsletterSendCompleted(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  newsletterId: string;
  subject: string;
  successCount: number;
  failureCount: number;
  duration?: number;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_SEND_COMPLETED,
    category: AuditCategory.NEWSLETTER,
    severity: params.failureCount > 0 ? 'WARNING' : 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      successCount: params.successCount,
      failureCount: params.failureCount,
      duration: params.duration,
    },
  });
}

export async function logNewsletterSendFailed(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  newsletterId: string;
  subject: string;
  errorMessage: string;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_SEND_FAILED,
    category: AuditCategory.NEWSLETTER,
    severity: 'ERROR',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      errorMessage: params.errorMessage,
    },
  });
}

// ============================================================================
// SYSTEM LOGGING HELPERS
// ============================================================================

export async function logScheduledCheckRun(params: {
  newslettersFound: number;
  newslettersSent: number;
  errors?: number;
}) {
  await logAuditEvent({
    action: AuditAction.SCHEDULED_CHECK_RUN,
    category: AuditCategory.SYSTEM,
    severity: 'INFO',
    userId: 'SYSTEM',
    userName: 'Scheduled Newsletter Function',
    targetType: 'System',
    targetName: 'Scheduled Newsletter Check',
    details: {
      newslettersFound: params.newslettersFound,
      newslettersSent: params.newslettersSent,
      errors: params.errors || 0,
    },
  });
}

export async function logEmailDelivered(params: {
  newsletterId: string;
  recipientEmail: string;
  recipientId?: string;
}) {
  await logAuditEvent({
    action: AuditAction.EMAIL_DELIVERED,
    category: AuditCategory.SYSTEM,
    severity: 'INFO',
    userId: 'SYSTEM',
    userName: 'Email Delivery System',
    targetType: 'Email',
    targetId: params.recipientId,
    targetName: params.recipientEmail,
    details: {
      newsletterId: params.newsletterId,
      recipientEmail: params.recipientEmail,
    },
  });
}

export async function logEmailBounced(params: {
  newsletterId: string;
  recipientEmail: string;
  recipientId?: string;
  errorMessage: string;
}) {
  await logAuditEvent({
    action: AuditAction.EMAIL_BOUNCED,
    category: AuditCategory.SYSTEM,
    severity: 'WARNING',
    userId: 'SYSTEM',
    userName: 'Email Delivery System',
    targetType: 'Email',
    targetId: params.recipientId,
    targetName: params.recipientEmail,
    details: {
      newsletterId: params.newsletterId,
      recipientEmail: params.recipientEmail,
      errorMessage: params.errorMessage,
    },
  });
}

export async function logEmailOpened(params: {
  newsletterId: string;
  recipientEmail: string;
  recipientId?: string;
  userAgent?: string;
  ip?: string;
}) {
  await logAuditEvent({
    action: AuditAction.EMAIL_OPENED,
    category: AuditCategory.SYSTEM,
    severity: 'INFO',
    userId: 'SYSTEM',
    userName: 'Email Tracking System',
    targetType: 'Email',
    targetId: params.recipientId,
    targetName: params.recipientEmail,
    details: {
      newsletterId: params.newsletterId,
      recipientEmail: params.recipientEmail,
    },
    requestMetadata: {
      userAgent: params.userAgent,
      ip: params.ip,
    },
  });
}

export async function logEmailClicked(params: {
  newsletterId: string;
  recipientEmail: string;
  recipientId?: string;
  linkUrl: string;
  userAgent?: string;
  ip?: string;
}) {
  await logAuditEvent({
    action: AuditAction.EMAIL_CLICKED,
    category: AuditCategory.SYSTEM,
    severity: 'INFO',
    userId: 'SYSTEM',
    userName: 'Email Tracking System',
    targetType: 'Email',
    targetId: params.recipientId,
    targetName: params.recipientEmail,
    details: {
      newsletterId: params.newsletterId,
      recipientEmail: params.recipientEmail,
      linkUrl: params.linkUrl,
    },
    requestMetadata: {
      userAgent: params.userAgent,
      ip: params.ip,
    },
  });
}
