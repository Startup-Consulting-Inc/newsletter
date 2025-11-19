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
    clicked: number;
    bounced: number;
  };
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: string;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  size: string;
  dimensions: string;
}