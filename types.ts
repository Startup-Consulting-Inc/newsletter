export enum UserRole {
  SITE_ADMIN = 'Site Admin',
  COMPANY_ADMIN = 'Company Admin',
  NEWSLETTER_ADMIN = 'Newsletter Admin'
}

export interface Company {
  id: string;
  name: string;
  logoUrl?: string;
  description?: string;
  website?: string;
  linkedinUrl?: string;
  industry?: string;
  size?: string;
  location?: string;
  phone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  companyId?: string; // Optional for Site Admin, required for others
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
  companyId?: string; // Optional for backward compatibility
  name: string;
  count: number;
  // Template configuration (optional)
  defaultTemplate?: NewsletterTemplate;
  defaultTone?: NewsletterTone;
  defaultIncludeImages?: boolean;
  defaultTargetAudience?: string;
}

export interface Recipient {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface RecipientGroup {
  id: string;
  companyId?: string; // Optional for backward compatibility
  name: string;
  recipientCount: number;
  recipients?: Recipient[]; // Optional for list view, populated in detail view
}

export interface UnsubscribedUser {
  email: string;
  recipientId: string;
  unsubscribedAt: string;
  groupIds: string[];
  userAgent?: string;
  ipAddress?: string;
}

export interface Newsletter {
  id: string;
  companyId?: string; // Optional for backward compatibility
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
  GROUP_DUPLICATED = 'GROUP_DUPLICATED',
  RECIPIENT_ADDED = 'RECIPIENT_ADDED',
  RECIPIENT_IMPORTED = 'RECIPIENT_IMPORTED',
  RECIPIENT_UPDATED = 'RECIPIENT_UPDATED',
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
  companyId?: string; // Optional for system/site-admin logs

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
  companyId: string;
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

// ============================================================================
// CONTACT REQUEST TYPES
// ============================================================================

export enum InquiryType {
  GENERAL = 'GENERAL',
  SALES = 'SALES',
  SUPPORT = 'SUPPORT',
  PARTNERSHIP = 'PARTNERSHIP',
  PRESS = 'PRESS',
  QUESTION = 'QUESTION',
  BUG_REPORT = 'BUG_REPORT',
  DEMO = 'DEMO',
  FEATURE_REQUEST = 'FEATURE_REQUEST',
  OTHER = 'OTHER'
}

export type ContactRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';

export interface Attachment {
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  path: string; // Storage path
}

export interface ContactRequest {
  id: string;              // Auto-generated ID
  inquiryType: InquiryType;
  name: string;
  email: string;
  company?: string;
  role?: string;
  teamSize?: string;
  subject?: string;
  message?: string;
  attachments?: Attachment[];
  status: ContactRequestStatus;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// AI NEWSLETTER GENERATION TYPES
// ============================================================================

export enum NewsletterTemplate {
  PROFESSIONAL = 'Professional',
  CREATIVE = 'Creative',
  NEWSLETTER = 'Newsletter',
  PROMOTIONAL = 'Promotional',
  MINIMALIST = 'Minimalist'
}

export enum NewsletterTone {
  FORMAL = 'Formal',
  CASUAL = 'Casual',
  FRIENDLY = 'Friendly',
  PROFESSIONAL = 'Professional',
  FUN = 'Fun'
}

export interface GenerateOptions {
  template?: NewsletterTemplate; // Optional when htmlTemplate is provided
  description: string;
  tone?: NewsletterTone;
  includeImages?: boolean;
  targetAudience?: string;
  htmlTemplate?: string; // User-uploaded HTML template (overrides template/tone)
  customPromptAdditions?: string; // Additional AI instructions
}

export interface GenerateResponse {
  success: boolean;
  htmlContent?: string;
  error?: string;
}

// ============================================================================
// NEWSLETTER TEMPLATE LIBRARY TYPES
// ============================================================================

export interface NewsletterTemplateConfig {
  id: string;
  companyId: string;
  name: string; // e.g., "Company Announcements Template"
  description?: string;
  htmlTemplate: string; // User-uploaded HTML template content
  includeImages: boolean;
  targetAudience?: string;
  customPromptAdditions?: string; // Advanced: custom AI instructions
  categoryIds?: string[]; // Linked categories
  isDefault?: boolean; // Default template for the company
  createdAt: string;
  updatedAt: string;
}