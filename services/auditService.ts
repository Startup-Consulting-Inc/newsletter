/**
 * Centralized Audit Logging Service
 * Provides helper methods for logging all user and system activities
 */

import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
  AuditAction,
  AuditCategory,
  AuditSeverity,
  AuditLogEntry,
  RequestMetadata,
  UserRole,
} from '../types';

/**
 * Get client IP address (browser limitation - will be undefined in browser)
 * For Cloud Functions, this should be extracted from request headers
 */
function getClientIP(): string | undefined {
  return undefined; // Browser cannot access real IP
}

/**
 * Get user agent string
 */
function getUserAgent(): string {
  return typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
}

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
  userRole?: UserRole;
  targetType?: string;
  targetId?: string;
  targetName?: string;
  details?: Record<string, any>;
  requestMetadata?: RequestMetadata;
}): Promise<void> {
  if (!db) {
    console.warn('Firestore not initialized, skipping audit log');
    return;
  }

  try {
    const auditLog: Omit<AuditLogEntry, 'id' | 'timestamp'> = {
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
      requestMetadata: params.requestMetadata || {
        userAgent: getUserAgent(),
        ip: getClientIP(),
      },
    };

    // Remove undefined values before saving to Firestore
    const cleanedLog = removeUndefined(auditLog);

    const auditLogsRef = collection(db, 'auditLogs');
    await addDoc(auditLogsRef, {
      ...cleanedLog,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging should never break the app
  }
}

// ============================================================================
// AUTHENTICATION & SESSION LOGGING
// ============================================================================

export async function logUserLogin(params: {
  userId: string;
  userName: string;
  userEmail: string;
  userRole: UserRole;
  method: string;
}) {
  await logAuditEvent({
    action: AuditAction.USER_LOGIN,
    category: AuditCategory.AUTHENTICATION,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    details: {
      method: params.method,
    },
  });
}

export async function logUserLogout(params: {
  userId: string;
  userName: string;
  userEmail: string;
  sessionDuration?: number;
}) {
  await logAuditEvent({
    action: AuditAction.USER_LOGOUT,
    category: AuditCategory.AUTHENTICATION,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    details: {
      sessionDuration: params.sessionDuration,
    },
  });
}

// ============================================================================
// NEWSLETTER LOGGING
// ============================================================================

export async function logNewsletterCreated(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
  newsletterId: string;
  subject: string;
  categoryId: string;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_CREATED,
    category: AuditCategory.NEWSLETTER,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      categoryId: params.categoryId,
    },
  });
}

export async function logNewsletterUpdated(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
  newsletterId: string;
  subject: string;
  changes?: string[];
  previousStatus?: string;
  newStatus?: string;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_UPDATED,
    category: AuditCategory.NEWSLETTER,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      changes: params.changes,
      previousStatus: params.previousStatus,
      newStatus: params.newStatus,
    },
  });
}

export async function logNewsletterDeleted(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
  newsletterId: string;
  subject: string;
  status: string;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_DELETED,
    category: AuditCategory.NEWSLETTER,
    severity: 'WARNING',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      status: params.status,
    },
  });
}

export async function logNewsletterScheduled(params: {
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;
  newsletterId: string;
  subject: string;
  scheduledAt: string;
}) {
  await logAuditEvent({
    action: AuditAction.NEWSLETTER_SCHEDULED,
    category: AuditCategory.NEWSLETTER,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    userEmail: params.userEmail,
    userRole: params.userRole,
    targetType: 'Newsletter',
    targetId: params.newsletterId,
    targetName: params.subject,
    details: {
      scheduledAt: params.scheduledAt,
    },
  });
}

export async function logNewsletterSendStarted(params: {
  userId: string;
  userName: string;
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

// ============================================================================
// CATEGORY LOGGING
// ============================================================================

export async function logCategoryCreated(params: {
  userId: string;
  userName: string;
  categoryId: string;
  categoryName: string;
}) {
  await logAuditEvent({
    action: AuditAction.CATEGORY_CREATED,
    category: AuditCategory.CATEGORY,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Category',
    targetId: params.categoryId,
    targetName: params.categoryName,
  });
}

export async function logCategoryDeleted(params: {
  userId: string;
  userName: string;
  categoryId: string;
  categoryName: string;
}) {
  await logAuditEvent({
    action: AuditAction.CATEGORY_DELETED,
    category: AuditCategory.CATEGORY,
    severity: 'WARNING',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Category',
    targetId: params.categoryId,
    targetName: params.categoryName,
  });
}

// ============================================================================
// GROUP & RECIPIENT LOGGING
// ============================================================================

export async function logGroupCreated(params: {
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
}) {
  await logAuditEvent({
    action: AuditAction.GROUP_CREATED,
    category: AuditCategory.GROUP,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Group',
    targetId: params.groupId,
    targetName: params.groupName,
  });
}

export async function logGroupDeleted(params: {
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  recipientCount: number;
}) {
  await logAuditEvent({
    action: AuditAction.GROUP_DELETED,
    category: AuditCategory.GROUP,
    severity: 'WARNING',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Group',
    targetId: params.groupId,
    targetName: params.groupName,
    details: {
      recipientCount: params.recipientCount,
    },
  });
}

export async function logRecipientAdded(params: {
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  recipientEmail: string;
}) {
  await logAuditEvent({
    action: AuditAction.RECIPIENT_ADDED,
    category: AuditCategory.RECIPIENT,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Recipient',
    targetName: params.recipientEmail,
    details: {
      groupId: params.groupId,
      groupName: params.groupName,
    },
  });
}

export async function logRecipientImported(params: {
  userId: string;
  userName: string;
  groupId: string;
  groupName: string;
  successCount: number;
  failureCount: number;
}) {
  await logAuditEvent({
    action: AuditAction.RECIPIENT_IMPORTED,
    category: AuditCategory.RECIPIENT,
    severity: params.failureCount > 0 ? 'WARNING' : 'INFO',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Group',
    targetId: params.groupId,
    targetName: params.groupName,
    details: {
      successCount: params.successCount,
      failureCount: params.failureCount,
    },
  });
}

// ============================================================================
// MEDIA LOGGING
// ============================================================================

export async function logMediaUploaded(params: {
  userId: string;
  userName: string;
  mediaId: string;
  fileName: string;
  fileSize: string;
}) {
  await logAuditEvent({
    action: AuditAction.MEDIA_UPLOADED,
    category: AuditCategory.MEDIA,
    severity: 'INFO',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Media',
    targetId: params.mediaId,
    targetName: params.fileName,
    details: {
      fileSize: params.fileSize,
    },
  });
}

export async function logMediaDeleted(params: {
  userId: string;
  userName: string;
  mediaId: string;
  fileName: string;
}) {
  await logAuditEvent({
    action: AuditAction.MEDIA_DELETED,
    category: AuditCategory.MEDIA,
    severity: 'WARNING',
    userId: params.userId,
    userName: params.userName,
    targetType: 'Media',
    targetId: params.mediaId,
    targetName: params.fileName,
  });
}
