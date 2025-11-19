# API Reference - InNews Platform

## Overview

This document provides detailed API documentation for the InNews Internal Newsletter Platform. Currently, the platform uses an in-memory mock API service for development. This reference will be useful for implementing a production backend.

---

## Table of Contents

- [Authentication API](#authentication-api)
- [User Management API](#user-management-api)
- [Newsletter API](#newsletter-api)
- [Category API](#category-api)
- [Recipient Group API](#recipient-group-api)
- [Media API](#media-api)
- [Audit Log API](#audit-log-api)
- [Error Handling](#error-handling)

---

## Authentication API

### Login (Mock)

**Purpose:** Authenticate user by role (development only)

```typescript
api.login(role: UserRole): Promise<User>
```

**Parameters:**
- `role` (UserRole): One of `SITE_ADMIN`, `NEWSLETTER_ADMIN`, `NEWSLETTER_CREATOR`

**Returns:** Promise<User>

**Example:**
```typescript
const user = await api.login(UserRole.SITE_ADMIN);
console.log(user.name); // "Alice Admin"
```

---

### Sync Firebase User

**Purpose:** Synchronize Firebase authenticated user with app user database

```typescript
api.syncFirebaseUser(
  email: string,
  name: string,
  photoUrl: string | null
): Promise<User>
```

**Parameters:**
- `email` (string): User's email from Firebase Auth
- `name` (string): User's display name from Firebase Auth
- `photoUrl` (string | null): User's photo URL from Google profile

**Returns:** Promise<User>

**Behavior:**
- If user exists by email: Returns existing user
- If user doesn't exist: Creates new user with default role `NEWSLETTER_CREATOR`
- Logs `USER_REGISTERED` action for new users

**Example:**
```typescript
const user = await api.syncFirebaseUser(
  'john@company.com',
  'John Doe',
  'https://lh3.googleusercontent.com/...'
);
```

---

## User Management API

### Get All Users

**Purpose:** Retrieve list of all users

```typescript
api.getUsers(): Promise<User[]>
```

**Returns:** Promise<User[]>

**Example:**
```typescript
const users = await api.getUsers();
console.log(`Total users: ${users.length}`);
```

---

### Add User

**Purpose:** Create a new user

```typescript
api.addUser(user: Omit<User, 'id'>): Promise<User>
```

**Parameters:**
- `user` (Omit<User, 'id'>): User object without ID
  - `name` (string): User's full name
  - `email` (string): User's email address
  - `role` (UserRole): User's role
  - `description?` (string): Optional bio/description
  - `linkedinUrl?` (string): Optional LinkedIn profile URL

**Returns:** Promise<User> - Created user with generated ID

**Side Effects:**
- Generates unique user ID
- Auto-generates avatar URL using ui-avatars.com
- Logs `USER_CREATED` audit action

**Example:**
```typescript
const newUser = await api.addUser({
  name: 'Jane Smith',
  email: 'jane@company.com',
  role: UserRole.NEWSLETTER_CREATOR,
  description: 'Marketing Team Lead'
});
```

---

### Update User

**Purpose:** Update existing user information

```typescript
api.updateUser(id: string, data: Partial<User>): Promise<User>
```

**Parameters:**
- `id` (string): User ID to update
- `data` (Partial<User>): Partial user object with fields to update

**Returns:** Promise<User> - Updated user object

**Throws:** Error if user not found

**Side Effects:**
- Logs `USER_UPDATED` audit action

**Example:**
```typescript
const updated = await api.updateUser('u123', {
  role: UserRole.NEWSLETTER_ADMIN,
  description: 'Promoted to admin'
});
```

---

### Delete User

**Purpose:** Remove user from system

```typescript
api.deleteUser(id: string): Promise<void>
```

**Parameters:**
- `id` (string): User ID to delete

**Returns:** Promise<void>

**Side Effects:**
- Logs `USER_DELETED` audit action

**Example:**
```typescript
await api.deleteUser('u123');
```

---

## Newsletter API

### Get All Newsletters

**Purpose:** Retrieve list of all newsletters

```typescript
api.getNewsletters(): Promise<Newsletter[]>
```

**Returns:** Promise<Newsletter[]>

**Example:**
```typescript
const newsletters = await api.getNewsletters();
const drafts = newsletters.filter(n => n.status === NewsletterStatus.DRAFT);
```

---

### Get Newsletter by ID

**Purpose:** Retrieve single newsletter

```typescript
api.getNewsletter(id: string): Promise<Newsletter | undefined>
```

**Parameters:**
- `id` (string): Newsletter ID

**Returns:** Promise<Newsletter | undefined>

**Example:**
```typescript
const newsletter = await api.getNewsletter('n123');
if (newsletter) {
  console.log(newsletter.subject);
}
```

---

### Save Newsletter

**Purpose:** Create new or update existing newsletter

```typescript
api.saveNewsletter(newsletter: Newsletter): Promise<Newsletter>
```

**Parameters:**
- `newsletter` (Newsletter): Complete newsletter object
  - For new: Use generated ID like `n${Date.now()}`
  - For update: Use existing ID

**Returns:** Promise<Newsletter> - Saved newsletter with updated timestamp

**Behavior:**
- If ID exists: Updates existing newsletter
- If ID doesn't exist: Creates new newsletter
- Auto-updates `updatedAt` timestamp

**Example:**
```typescript
const newsletter = await api.saveNewsletter({
  id: `n${Date.now()}`,
  subject: 'Q4 Company Update',
  htmlContent: '<h1>Quarterly Update</h1><p>...</p>',
  categoryId: 'c1',
  recipientGroupIds: ['g1', 'g2'],
  status: NewsletterStatus.DRAFT,
  updatedAt: new Date().toISOString(),
  stats: { sent: 0, opened: 0, clicked: 0, bounced: 0 }
});
```

---

### Delete Newsletter

**Purpose:** Remove newsletter from system

```typescript
api.deleteNewsletter(id: string): Promise<void>
```

**Parameters:**
- `id` (string): Newsletter ID to delete

**Returns:** Promise<void>

**Example:**
```typescript
await api.deleteNewsletter('n123');
```

---

## Category API

### Get All Categories

**Purpose:** Retrieve list of all newsletter categories

```typescript
api.getCategories(): Promise<Category[]>
```

**Returns:** Promise<Category[]>

**Example:**
```typescript
const categories = await api.getCategories();
// [{ id: 'c1', name: 'Weekly Updates', count: 12 }, ...]
```

---

### Add Category

**Purpose:** Create new newsletter category

```typescript
api.addCategory(name: string): Promise<Category>
```

**Parameters:**
- `name` (string): Category name

**Returns:** Promise<Category> - Created category with ID and initial count of 0

**Example:**
```typescript
const category = await api.addCategory('Product Announcements');
// { id: 'c1699123456789', name: 'Product Announcements', count: 0 }
```

---

### Delete Category

**Purpose:** Remove category from system

```typescript
api.deleteCategory(id: string): Promise<void>
```

**Parameters:**
- `id` (string): Category ID to delete

**Returns:** Promise<void>

**Note:** Does not check if newsletters are using this category

**Example:**
```typescript
await api.deleteCategory('c123');
```

---

## Recipient Group API

### Get All Groups

**Purpose:** Retrieve list of all recipient groups

```typescript
api.getGroups(): Promise<RecipientGroup[]>
```

**Returns:** Promise<RecipientGroup[]>

**Example:**
```typescript
const groups = await api.getGroups();
// [{ id: 'g1', name: 'All Employees', recipientCount: 450, recipients: [] }, ...]
```

---

### Add Group

**Purpose:** Create new recipient group

```typescript
api.addGroup(name: string): Promise<RecipientGroup>
```

**Parameters:**
- `name` (string): Group name

**Returns:** Promise<RecipientGroup> - Created group with empty recipients array

**Example:**
```typescript
const group = await api.addGroup('Sales Team');
// { id: 'g1699123456789', name: 'Sales Team', recipientCount: 0, recipients: [] }
```

---

### Delete Group

**Purpose:** Remove recipient group from system

```typescript
api.deleteGroup(id: string): Promise<void>
```

**Parameters:**
- `id` (string): Group ID to delete

**Returns:** Promise<void>

**Example:**
```typescript
await api.deleteGroup('g123');
```

---

### Add Recipient to Group

**Purpose:** Add email recipient to a group

```typescript
api.addRecipient(
  groupId: string,
  recipient: Omit<Recipient, 'id'>
): Promise<RecipientGroup>
```

**Parameters:**
- `groupId` (string): Target group ID
- `recipient` (Omit<Recipient, 'id'>): Recipient without ID
  - `email` (string): Email address
  - `firstName?` (string): Optional first name
  - `lastName?` (string): Optional last name

**Returns:** Promise<RecipientGroup> - Updated group with new recipient

**Throws:** Error if group not found

**Behavior:**
- Generates unique recipient ID using timestamp + random string
- Auto-updates `recipientCount`

**Example:**
```typescript
const group = await api.addRecipient('g1', {
  email: 'employee@company.com',
  firstName: 'John',
  lastName: 'Doe'
});
```

---

## Media API

### Get All Media

**Purpose:** Retrieve list of all media items

```typescript
api.getMedia(): Promise<MediaItem[]>
```

**Returns:** Promise<MediaItem[]>

**Example:**
```typescript
const media = await api.getMedia();
// [{ id: 'm1', url: '...', name: 'logo.png', size: '1.2 MB', dimensions: '800x600' }]
```

---

### Upload Media

**Purpose:** Upload new media file

```typescript
api.uploadMedia(file: File): Promise<MediaItem>
```

**Parameters:**
- `file` (File): File object from input[type="file"]

**Returns:** Promise<MediaItem> - Uploaded media item

**Behavior:**
- Creates local preview URL using `URL.createObjectURL()`
- Simulates 800ms upload delay
- Auto-calculates file size in MB
- Mocks dimensions as '800x600'
- Adds to beginning of media list

**Note:** Production implementation should:
- Upload to cloud storage (Firebase Storage, S3, etc.)
- Extract actual image dimensions
- Implement upload progress tracking
- Handle file validation and errors

**Example:**
```typescript
const fileInput = document.querySelector('input[type="file"]');
const file = fileInput.files[0];
const mediaItem = await api.uploadMedia(file);
console.log(`Uploaded: ${mediaItem.name} (${mediaItem.size})`);
```

---

## Audit Log API

### Get Audit Logs

**Purpose:** Retrieve audit log entries

```typescript
api.getAuditLogs(): Promise<AuditLogEntry[]>
```

**Returns:** Promise<AuditLogEntry[]> - Sorted newest first

**Example:**
```typescript
const logs = await api.getAuditLogs();
logs.forEach(log => {
  console.log(`${log.timestamp}: ${log.userName} - ${log.action} - ${log.target}`);
});
```

**Log Actions:**
- `USER_CREATED` - New user added
- `USER_UPDATED` - User information changed
- `USER_DELETED` - User removed
- `USER_REGISTERED` - New user auto-created from Firebase
- `CATEGORY_ADDED` - New category created
- `NEWSLETTER_CREATED` - New newsletter created
- Custom actions can be added as needed

---

## Error Handling

### Error Patterns

All API methods return Promises that can reject with errors:

```typescript
try {
  const user = await api.updateUser('invalid-id', { name: 'Test' });
} catch (error) {
  console.error('Update failed:', error.message);
  // Error: "User not found"
}
```

### Common Errors

**User Not Found**
```typescript
throw new Error("User not found");
```
- Occurs when: Invalid user ID in updateUser()

**Group Not Found**
```typescript
throw new Error("Group not found");
```
- Occurs when: Invalid group ID in addRecipient()

---

## Production Implementation Notes

### Database Schema Recommendations

**Users Collection (Firestore)**
```typescript
/users/{userId}
{
  email: string;
  name: string;
  role: string;
  description?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Newsletters Collection**
```typescript
/newsletters/{newsletterId}
{
  subject: string;
  htmlContent: string;
  status: string;
  categoryId: string;
  recipientGroupIds: string[];
  scheduledAt?: Timestamp;
  sentAt?: Timestamp;
  stats: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Categories Collection**
```typescript
/categories/{categoryId}
{
  name: string;
  count: number; // Denormalized for performance
  createdAt: Timestamp;
}
```

**Recipient Groups Collection**
```typescript
/recipientGroups/{groupId}
{
  name: string;
  recipientCount: number;
  createdAt: Timestamp;
}

/recipientGroups/{groupId}/recipients/{recipientId}
{
  email: string;
  firstName?: string;
  lastName?: string;
  addedAt: Timestamp;
}
```

**Media Collection**
```typescript
/media/{mediaId}
{
  url: string;
  name: string;
  size: number; // bytes
  mimeType: string;
  width: number;
  height: number;
  uploadedBy: string; // userId
  uploadedAt: Timestamp;
}
```

**Audit Logs Collection**
```typescript
/auditLogs/{logId}
{
  userId: string;
  userName: string;
  action: string;
  target: string;
  timestamp: Timestamp;
  metadata?: object;
}
```

---

## Rate Limiting Recommendations

For production API implementation:

- **Authentication:** 10 requests/minute per IP
- **Read Operations:** 100 requests/minute per user
- **Write Operations:** 20 requests/minute per user
- **Media Upload:** 10 uploads/hour per user
- **Bulk Import:** 1 request/5 minutes per user

---

## API Versioning

Recommended versioning strategy for production:

```
/api/v1/users
/api/v1/newsletters
/api/v1/categories
...
```

Include version in all API responses:
```json
{
  "apiVersion": "1.0.0",
  "data": { ... }
}
```

---

**Last Updated:** 2025-11-19
**API Version:** 1.0.0 (Mock Implementation)
