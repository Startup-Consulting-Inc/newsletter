export enum UserRole {
  SITE_ADMIN = 'Site Admin',
  NEWSLETTER_ADMIN = 'Newsletter Admin',
  NEWSLETTER_CREATOR = 'Newsletter Creator'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  description?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
}

export enum NewsletterStatus {
  DRAFT = 'Draft',
  SCHEDULED = 'Scheduled',
  SENDING = 'Sending',
  SENT = 'Sent',
  PAUSED = 'Paused'
}

export interface Category {
  id: string;
  name: string;
  count: number;
}

export interface Recipient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface RecipientGroup {
  id: string;
  name: string;
  recipientCount: number;
  recipients?: Recipient[]; // Optional for list view, populated in detail view
}

export interface Newsletter {
  id: string;
  subject: string;
  status: NewsletterStatus;
  categoryId: string;
  recipientGroupIds: string[];
  htmlContent: string;
  scheduledAt?: string;
  sentAt?: string;
  stats?: {
    sent: number;
    opened: number;
    uniqueOpened?: number;
    clicked: number;
    uniqueClicked?: number;
    bounced: number;
  };
  updatedAt: string;
}

// ============================================================================
// AUDIT LOGGING TYPES
// ============================================================================

export enum AuditAction {
  // Authentication & Session
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',
  USER_REGISTERED = 'USER_REGISTERED',
  USER_SESSION_EXPIRED = 'USER_SESSION_EXPIRED',
  USER_PASSWORD_RESET = 'USER_PASSWORD_RESET',

  // User Management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',

  // Newsletter Operations
  NEWSLETTER_CREATED = 'NEWSLETTER_CREATED',
  NEWSLETTER_UPDATED = 'NEWSLETTER_UPDATED',
  NEWSLETTER_DELETED = 'NEWSLETTER_DELETED',
  NEWSLETTER_SCHEDULED = 'NEWSLETTER_SCHEDULED',
  NEWSLETTER_SCHEDULE_CANCELLED = 'NEWSLETTER_SCHEDULE_CANCELLED',
  NEWSLETTER_PAUSED = 'NEWSLETTER_PAUSED',
  NEWSLETTER_RESUMED = 'NEWSLETTER_RESUMED',
  NEWSLETTER_SEND_STARTED = 'NEWSLETTER_SEND_STARTED',
  NEWSLETTER_SEND_COMPLETED = 'NEWSLETTER_SEND_COMPLETED',
  NEWSLETTER_SEND_FAILED = 'NEWSLETTER_SEND_FAILED',
  NEWSLETTER_SENT = 'NEWSLETTER_SENT',

  // Category Management
  CATEGORY_CREATED = 'CATEGORY_CREATED',
  CATEGORY_DELETED = 'CATEGORY_DELETED',

  // Group & Recipient Management
  GROUP_CREATED = 'GROUP_CREATED',
  GROUP_DELETED = 'GROUP_DELETED',
  RECIPIENT_ADDED = 'RECIPIENT_ADDED',
  RECIPIENT_IMPORTED = 'RECIPIENT_IMPORTED',
  RECIPIENT_REMOVED = 'RECIPIENT_REMOVED',
  RECIPIENT_UNSUBSCRIBED = 'RECIPIENT_UNSUBSCRIBED',

  // Media Management
  MEDIA_UPLOADED = 'MEDIA_UPLOADED',
  MEDIA_DELETED = 'MEDIA_DELETED',

  // System Operations
  SCHEDULED_CHECK_RUN = 'SCHEDULED_CHECK_RUN',
  EMAIL_DELIVERED = 'EMAIL_DELIVERED',
  EMAIL_BOUNCED = 'EMAIL_BOUNCED',
  EMAIL_OPENED = 'EMAIL_OPENED',
  EMAIL_CLICKED = 'EMAIL_CLICKED',

  // Security & Compliance
  UNAUTHORIZED_ACCESS_ATTEMPT = 'UNAUTHORIZED_ACCESS_ATTEMPT',
  DATA_EXPORT = 'DATA_EXPORT',
  RULE_VIOLATION = 'RULE_VIOLATION',
}

export enum AuditCategory {
  AUTHENTICATION = 'AUTHENTICATION',
  USER = 'USER',
  NEWSLETTER = 'NEWSLETTER',
  CATEGORY = 'CATEGORY',
  GROUP = 'GROUP',
  RECIPIENT = 'RECIPIENT',
  MEDIA = 'MEDIA',
  SYSTEM = 'SYSTEM',
  SECURITY = 'SECURITY',
}

export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface RequestMetadata {
  ip?: string;
  userAgent?: string;
  method?: string;
  endpoint?: string;
  duration?: number;
}

export interface AuditLogEntry {
  // Core Identification
  id: string;
  timestamp: string;

  // Actor Information
  userId: string;
  userName: string;
  userEmail?: string;
  userRole?: UserRole;

  // Action Details
  action: AuditAction;
  category: AuditCategory;
  severity: AuditSeverity;

  // Target Information
  targetType?: string;
  targetId?: string;
  targetName?: string;

  // Legacy field for backward compatibility
  target?: string;

  // Context & Metadata
  details?: {
    // Action-specific data
    [key: string]: any;

    // Common fields
    previousValue?: any;
    newValue?: any;
    changes?: string[];
    errorMessage?: string;
    duration?: number;

    // Counts & stats
    affectedCount?: number;
    successCount?: number;
    failureCount?: number;
  };

  // Request Information
  requestMetadata?: RequestMetadata;

  // Compliance & Tracking
  sessionId?: string;
  correlationId?: string;
  geolocation?: {
    country?: string;
    region?: string;
    city?: string;
  };
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: string;
  dimensions: string;
}

export interface TrackingLog {
  id: string;
  newsletterId: string;
  recipientId: string;
  recipientEmail: string; // Resolved from recipientId
  eventType: 'open' | 'click';
  linkUrl?: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}