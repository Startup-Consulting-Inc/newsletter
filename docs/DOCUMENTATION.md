# InNews - Internal Newsletter Platform

## Table of Contents
- [Overview](#overview)
- [Project Structure](#project-structure)
- [Technology Stack](#technology-stack)
- [Core Features](#core-features)
- [Architecture](#architecture)
- [User Roles](#user-roles)
- [Components](#components)
- [Services](#services)
- [Data Models](#data-models)
- [Getting Started](#getting-started)
- [Development Guide](#development-guide)

---

## Overview

**InNews** is a comprehensive internal newsletter platform designed for creating, managing, and analyzing company newsletters with role-based access control. The platform supports multiple user roles, rich content editing, scheduling, and analytics.

**Key Capabilities:**
- Role-based access control (Site Admin, Newsletter Admin, Newsletter Creator)
- Rich HTML newsletter editor with media library
- Recipient group management
- Newsletter scheduling and tracking
- Analytics and engagement metrics
- Audit logging for compliance

---

## Project Structure

```
newsletter/
├── components/              # React components
│   ├── AdminPanel.tsx      # Admin user & category management
│   ├── AuthPage.tsx        # Firebase authentication UI
│   ├── Layout.tsx          # Main app layout wrapper
│   ├── NewsletterEditor.tsx # Newsletter creation/editing
│   └── ProfilePage.tsx     # User profile management
├── services/               # Business logic & API
│   ├── firebase.ts         # Firebase auth configuration
│   └── mockApi.ts          # Mock API service layer
├── App.tsx                 # Main application component
├── index.tsx               # Application entry point
├── types.ts                # TypeScript type definitions
├── metadata.json           # Project metadata
├── package.json            # Dependencies & scripts
├── tsconfig.json           # TypeScript configuration
├── vite.config.ts          # Vite build configuration
└── index.html              # HTML entry point
```

---

## Technology Stack

### Frontend
- **React 19.2.0** - UI framework with modern hooks
- **TypeScript 5.8.2** - Type-safe development
- **Vite 6.2.0** - Fast build tooling
- **Lucide React 0.554.0** - Icon library
- **Tailwind CSS** - Utility-first styling (via classes)

### Backend/Services
- **Firebase 12.6.0** - Authentication & potential cloud services
- **Mock API Service** - In-memory data management (development)

### Development Tools
- **@vitejs/plugin-react** - React integration for Vite
- **@types/node** - Node.js type definitions

---

## Core Features

### 1. **Authentication**
- Firebase Google OAuth integration
- Automatic user provisioning on first login
- Session persistence across reloads

### 2. **Newsletter Management**
- Create/edit newsletters with HTML editor
- Draft, schedule, or send immediately
- Status tracking (Draft, Scheduled, Sent, Paused)
- Category assignment for organization
- Recipient group targeting

### 3. **Media Library**
- Upload and manage images
- Insert images into newsletter content
- Replace existing images in HTML
- Image validation and detection

### 4. **User Administration** (Admin Only)
- User creation and role assignment
- User profile management
- Activity audit logging

### 5. **Analytics**
- Email open rates
- Click-through rates
- Bounce tracking
- Engagement metrics dashboard

---

## Architecture

### Component Hierarchy

```
App
├── AuthPage (when logged out)
└── Layout (when logged in)
    ├── Dashboard (default view)
    ├── Newsletters (newsletter list)
    │   └── NewsletterEditor (create/edit)
    ├── Analytics (metrics dashboard)
    ├── AdminPanel (user & category mgmt)
    └── ProfilePage (user profile)
```

### Data Flow

```
Component → Service Layer → Mock API → In-Memory Store
    ↓           ↓              ↓
Firebase Auth → syncFirebaseUser() → User Object
```

### State Management
- React hooks (useState, useEffect) for local state
- Firebase onAuthStateChanged for auth state
- Props-based data passing
- Service layer for centralized data operations

---

## User Roles

### 1. **Site Admin**
- Full platform access
- User management (create, edit, delete)
- Category management
- Recipient group management
- Access to audit logs
- All newsletter operations

### 2. **Newsletter Admin**
- Newsletter creation and management
- Category management
- Recipient group management
- Analytics access
- Cannot manage users

### 3. **Newsletter Creator**
- Newsletter creation and editing (own newsletters)
- View analytics
- Limited administrative capabilities
- Cannot manage users or categories

---

## Components

### **App.tsx**
Main application component managing global state and routing.

**Key Responsibilities:**
- Firebase authentication state management
- User session synchronization with mock API
- Tab navigation (dashboard, newsletters, analytics, admin, profile)
- Newsletter editor modal control
- Data fetching orchestration

**State:**
- `user`: Current authenticated user
- `activeTab`: Current navigation tab
- `isEditorOpen`: Newsletter editor visibility
- `newsletters`: List of all newsletters

### **AuthPage.tsx**
Firebase Google authentication interface.

**Features:**
- Google Sign-In button
- Error handling for auth failures
- Responsive design
- Brand imagery and welcome messaging

### **Layout.tsx**
Application shell providing navigation and layout structure.

**Props:**
- `currentUser`: Active user object
- `onLogout`: Sign-out handler
- `activeTab`: Current tab identifier
- `onNavigate`: Tab change handler
- `onOpenSettings`: Settings panel trigger

**Features:**
- Top navigation bar with user profile
- Sidebar navigation menu
- Role-based menu visibility
- Responsive layout

### **NewsletterEditor.tsx**
Rich HTML editor for creating and editing newsletters.

**Props:**
- `newsletter?`: Optional newsletter to edit
- `onSave`: Save callback
- `onCancel`: Cancel callback

**Features:**
- HTML content editing
- Live preview mode
- Image management (insert, replace, detect)
- Media library integration
- Category selection
- Recipient group multi-select
- Status control (Draft, Schedule, Send)
- HTML file import

**Tabs:**
- `edit`: HTML code editor
- `preview`: Live preview rendering
- `fix-images`: Image detection and replacement

### **AdminPanel.tsx**
Administrative interface for user and category management.

**Props:**
- `currentUser`: Current user (for permission checks)

**Features:**
- User CRUD operations
- Role assignment
- Category management
- Audit log viewer
- Permission-based access control

### **ProfilePage.tsx**
User profile management and settings.

**Props:**
- `user`: Current user object
- `onUpdateUser`: Update callback

**Features:**
- Profile information editing
- LinkedIn profile link
- Description/bio editing
- Avatar display (from Google auth)

---

## Services

### **firebase.ts**
Firebase configuration and initialization.

**Exports:**
- `auth`: Firebase Auth instance
- `googleProvider`: Google OAuth provider
- `firebaseConfig`: Firebase project configuration

**Configuration:**
```javascript
{
  apiKey: "AIzaSyCNkMUK_m6icManclvMfJBpEo7JWzq46IY",
  authDomain: "newsletter-b104f.firebaseapp.com",
  projectId: "newsletter-b104f",
  // ... other config
}
```

### **mockApi.ts**
In-memory API service layer for development/testing.

**Key Methods:**

**Authentication:**
- `login(role: UserRole): Promise<User>` - Mock login by role
- `syncFirebaseUser(email, name, photoUrl): Promise<User>` - Sync Firebase user

**User Management:**
- `getUsers(): Promise<User[]>` - Fetch all users
- `addUser(user): Promise<User>` - Create new user
- `updateUser(id, data): Promise<User>` - Update user
- `deleteUser(id): Promise<void>` - Delete user

**Newsletter Operations:**
- `getNewsletters(): Promise<Newsletter[]>` - Fetch all newsletters
- `getNewsletter(id): Promise<Newsletter>` - Fetch single newsletter
- `saveNewsletter(newsletter): Promise<Newsletter>` - Save/update newsletter
- `deleteNewsletter(id): Promise<void>` - Delete newsletter

**Category & Groups:**
- `getCategories(): Promise<Category[]>` - Fetch categories
- `addCategory(name): Promise<Category>` - Create category
- `deleteCategory(id): Promise<void>` - Delete category
- `getGroups(): Promise<RecipientGroup[]>` - Fetch recipient groups
- `addGroup(name): Promise<RecipientGroup>` - Create group
- `deleteGroup(id): Promise<void>` - Delete group
- `addRecipient(groupId, recipient): Promise<RecipientGroup>` - Add recipient to group

**Media Library:**
- `getMedia(): Promise<MediaItem[]>` - Fetch media items
- `uploadMedia(file): Promise<MediaItem>` - Upload new media

**Audit Logging:**
- `getAuditLogs(): Promise<AuditLogEntry[]>` - Fetch audit logs
- `logAction(userId, userName, action, target)` - Internal logging method

---

## Data Models

### **User**
```typescript
{
  id: string;
  name: string;
  email: string;
  role: UserRole; // SITE_ADMIN | NEWSLETTER_ADMIN | NEWSLETTER_CREATOR
  description?: string;
  linkedinUrl?: string;
  avatarUrl?: string;
}
```

### **Newsletter**
```typescript
{
  id: string;
  subject: string;
  status: NewsletterStatus; // DRAFT | SCHEDULED | SENT | PAUSED
  categoryId: string;
  recipientGroupIds: string[];
  htmlContent: string;
  scheduledAt?: string; // ISO timestamp
  sentAt?: string; // ISO timestamp
  stats?: {
    sent: number;
    opened: number;
    clicked: number;
    bounced: number;
  };
  updatedAt: string; // ISO timestamp
}
```

### **Category**
```typescript
{
  id: string;
  name: string;
  count: number; // Number of newsletters in category
}
```

### **RecipientGroup**
```typescript
{
  id: string;
  name: string;
  recipientCount: number;
  recipients?: Recipient[]; // Optional, populated on demand
}
```

### **Recipient**
```typescript
{
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
```

### **MediaItem**
```typescript
{
  id: string;
  url: string;
  name: string;
  size: string; // e.g., "1.2 MB"
  dimensions: string; // e.g., "1200x800"
}
```

### **AuditLogEntry**
```typescript
{
  id: string;
  userId: string;
  userName: string;
  action: string; // e.g., "USER_CREATED", "NEWSLETTER_SENT"
  target: string; // Description of what was affected
  timestamp: string; // ISO timestamp
}
```

---

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm or yarn package manager
- Firebase project (for authentication)

### Installation

1. **Clone the repository** (if applicable)
   ```bash
   cd /Users/jaeheesong/projects/node/newsletter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Firebase**
   - Update `services/firebase.ts` with your Firebase project credentials
   - Get credentials from [Firebase Console](https://console.firebase.google.com/)
   - Enable Google Sign-In in Firebase Authentication settings

4. **Run development server**
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:5173`

5. **Build for production**
   ```bash
   npm run build
   ```

6. **Preview production build**
   ```bash
   npm run preview
   ```

---

## Development Guide

### Adding New User Roles

1. Update `UserRole` enum in `types.ts`
2. Add role to mock users in `services/mockApi.ts`
3. Update permission checks in components
4. Update navigation visibility in `Layout.tsx`

### Adding New Newsletter Status

1. Update `NewsletterStatus` enum in `types.ts`
2. Add status handling in `NewsletterEditor.tsx`
3. Update UI indicators in newsletter list view
4. Add status badge styling

### Extending Mock API

1. Add new data structure to `types.ts`
2. Initialize mock data in `mockApi.ts`
3. Add CRUD methods to `MockApiService` class
4. Update audit logging if needed

### Component Development Best Practices

- Use TypeScript strict mode for type safety
- Implement proper error handling with try/catch
- Add loading states for async operations
- Use React hooks (useState, useEffect) appropriately
- Follow existing naming conventions
- Add proper prop typing with interfaces

### Firebase Integration

Current implementation uses Firebase for authentication only. To extend:

1. **Firestore for Data Persistence:**
   - Replace mock API with Firestore collections
   - Implement real-time listeners for updates
   - Add proper security rules

2. **Cloud Storage for Media:**
   - Replace local media handling with Cloud Storage
   - Implement upload progress tracking
   - Add image optimization

3. **Cloud Functions:**
   - Newsletter sending automation
   - Analytics aggregation
   - Email tracking pixel implementation

### Security Considerations

⚠️ **Important Security Notes:**

1. **Firebase API Key in Code:**
   - Current implementation has API key in source
   - For production, use environment variables
   - Consider Firebase App Check for additional security

2. **Role-Based Access:**
   - Implement server-side permission checks
   - Don't rely solely on UI-level restrictions
   - Add Firestore security rules

3. **Input Validation:**
   - Sanitize HTML content before rendering
   - Validate email addresses
   - Implement CSRF protection

4. **Audit Logging:**
   - Log all sensitive operations
   - Include user context in logs
   - Implement log retention policies

---

## API Reference

### Mock API Endpoints

All API calls return Promises and simulate network delay.

#### Authentication
```typescript
api.login(role: UserRole): Promise<User>
api.syncFirebaseUser(email: string, name: string, photoUrl: string | null): Promise<User>
```

#### Users
```typescript
api.getUsers(): Promise<User[]>
api.addUser(user: Omit<User, 'id'>): Promise<User>
api.updateUser(id: string, data: Partial<User>): Promise<User>
api.deleteUser(id: string): Promise<void>
```

#### Newsletters
```typescript
api.getNewsletters(): Promise<Newsletter[]>
api.getNewsletter(id: string): Promise<Newsletter | undefined>
api.saveNewsletter(newsletter: Newsletter): Promise<Newsletter>
api.deleteNewsletter(id: string): Promise<void>
```

#### Categories
```typescript
api.getCategories(): Promise<Category[]>
api.addCategory(name: string): Promise<Category>
api.deleteCategory(id: string): Promise<void>
```

#### Recipient Groups
```typescript
api.getGroups(): Promise<RecipientGroup[]>
api.addGroup(name: string): Promise<RecipientGroup>
api.deleteGroup(id: string): Promise<void>
api.addRecipient(groupId: string, recipient: Omit<Recipient, 'id'>): Promise<RecipientGroup>
```

#### Media
```typescript
api.getMedia(): Promise<MediaItem[]>
api.uploadMedia(file: File): Promise<MediaItem>
```

#### Audit Logs
```typescript
api.getAuditLogs(): Promise<AuditLogEntry[]>
```

---

## Troubleshooting

### Firebase Authentication Issues

**Problem:** "Auth not initialized" error
- **Solution:** Check Firebase configuration in `services/firebase.ts`
- Verify API key and project credentials
- Ensure Firebase Authentication is enabled in console

**Problem:** Google Sign-In doesn't work
- **Solution:** Enable Google provider in Firebase Authentication
- Add authorized domains in Firebase console
- Check browser console for specific errors

### Build Issues

**Problem:** TypeScript errors during build
- **Solution:** Run `npm install` to ensure all dependencies are installed
- Check TypeScript version compatibility
- Verify `tsconfig.json` configuration

**Problem:** Vite dev server not starting
- **Solution:** Check port 5173 availability
- Clear Vite cache: `rm -rf node_modules/.vite`
- Verify Vite configuration in `vite.config.ts`

---

## Future Enhancements

### Planned Features
- [ ] Real-time collaboration on newsletter editing
- [ ] Email template library
- [ ] A/B testing capabilities
- [ ] Advanced analytics with charts
- [ ] Email client preview (Gmail, Outlook, etc.)
- [ ] Scheduled newsletter automation
- [ ] Recipient import from CSV
- [ ] Newsletter cloning
- [ ] Dark mode support
- [ ] Mobile app companion

### Technical Debt
- [ ] Replace mock API with Firestore
- [ ] Implement proper state management (Redux/Zustand)
- [ ] Add comprehensive unit tests
- [ ] Add E2E tests with Playwright
- [ ] Implement proper error boundaries
- [ ] Add accessibility improvements (WCAG 2.1)
- [ ] Optimize bundle size
- [ ] Add service worker for offline support

---

## License & Support

**Project:** InNews - Internal Newsletter Platform
**Version:** 0.0.0 (Development)
**Privacy:** Private (internal use)

For issues or feature requests, contact the development team or create an issue in the project repository.

---

**Last Updated:** 2025-11-19
**Documentation Version:** 1.0.0
