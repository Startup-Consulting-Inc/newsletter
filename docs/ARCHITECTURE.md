# Architecture Documentation - InNews Platform

Comprehensive architecture overview of the InNews Internal Newsletter Platform.

---

## Table of Contents

- [System Architecture](#system-architecture)
- [Component Architecture](#component-architecture)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Authentication Flow](#authentication-flow)
- [Service Layer](#service-layer)
- [Deployment Architecture](#deployment-architecture)
- [Security Architecture](#security-architecture)
- [Scalability Considerations](#scalability-considerations)

---

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐    │
│  │  React UI  │  │  TypeScript  │  │  Tailwind CSS    │    │
│  └────────────┘  └──────────────┘  └──────────────────┘    │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│                    Service Layer (Client)                    │
│  ┌──────────────────┐         ┌──────────────────────┐     │
│  │  Mock API        │         │  Firebase Auth       │     │
│  │  (Development)   │         │  (Google OAuth)      │     │
│  └──────────────────┘         └──────────────────────┘     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────┴─────────────────────────────────┐
│              Backend (Production - To Implement)             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Firestore │  │ Storage  │  │Functions │  │  Email   │   │
│  │   DB     │  │  Media   │  │  API     │  │ Service  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack Layers

| Layer | Technologies | Purpose |
|-------|-------------|---------|
| **Presentation** | React 19, TypeScript 5.8, Tailwind CSS | UI rendering & user interaction |
| **State Management** | React Hooks (useState, useEffect) | Client-side state |
| **Authentication** | Firebase Auth, Google OAuth | User identity & access control |
| **Data Layer** | Mock API (dev), Firestore (prod) | Data persistence & retrieval |
| **Media Storage** | Local URLs (dev), Cloud Storage (prod) | Image & file management |
| **Build Tool** | Vite 6.2 | Development server & bundling |
| **Email Delivery** | Not implemented | SendGrid/Mailgun (future) |

---

## Component Architecture

### Component Hierarchy

```
App (Root Component)
│
├─ [Not Authenticated]
│  └─ AuthPage
│     └─ Google Sign-In Button
│
└─ [Authenticated]
   └─ Layout (Shell)
      ├─ Navigation Header
      │  ├─ Logo
      │  ├─ User Avatar
      │  └─ Logout Button
      │
      ├─ Sidebar Navigation
      │  ├─ Dashboard Link
      │  ├─ Newsletters Link
      │  ├─ Analytics Link
      │  ├─ Admin Link (conditional)
      │  └─ Profile Link
      │
      └─ Content Area (Router)
         │
         ├─ Dashboard View
         │  ├─ Welcome Banner
         │  ├─ Quick Stats Widget
         │  └─ Create Newsletter CTA
         │
         ├─ Newsletters View
         │  ├─ Newsletter List
         │  └─ NewsletterEditor (modal)
         │     ├─ Subject Input
         │     ├─ HTML Editor
         │     ├─ Category Selector
         │     ├─ Recipient Group Selector
         │     ├─ Media Library
         │     ├─ Preview Tab
         │     ├─ Fix Images Tab
         │     └─ Action Buttons
         │
         ├─ Analytics View
         │  ├─ Metrics Cards
         │  └─ Chart Placeholder
         │
         ├─ AdminPanel View (Site Admin Only)
         │  ├─ User Management
         │  │  ├─ User List
         │  │  └─ Add User Form
         │  ├─ Category Management
         │  │  ├─ Category List
         │  │  └─ Add Category Form
         │  └─ Audit Log
         │     └─ Log Entry List
         │
         └─ ProfilePage View
            ├─ Avatar Display
            ├─ Profile Form
            │  ├─ Name Input
            │  ├─ Description Textarea
            │  └─ LinkedIn URL Input
            └─ Save Button
```

### Component Responsibilities

#### App.tsx (Root Container)
**Purpose:** Application entry point and global state orchestration

**Responsibilities:**
- Firebase authentication state monitoring
- User session synchronization
- Global navigation state management
- Newsletter data fetching
- Route/view rendering logic

**State:**
- `user: User | null` - Current authenticated user
- `isLoading: boolean` - Initial auth check
- `activeTab: string` - Current navigation tab
- `isEditorOpen: boolean` - Newsletter editor visibility
- `editingNewsletter: Newsletter | undefined` - Newsletter being edited
- `newsletters: Newsletter[]` - All newsletters

**Key Methods:**
- `handleSignOut()` - Firebase sign-out and state reset
- `handleEditNewsletter(newsletter?)` - Open editor with optional newsletter
- `handleSaveNewsletter()` - Close editor and refresh data
- `handleUpdateUser(user)` - Update user state after profile changes
- `renderContent()` - Conditional rendering based on activeTab

---

#### Layout.tsx (Shell Component)
**Purpose:** Application shell providing navigation and consistent UI structure

**Props:**
```typescript
{
  currentUser: User;
  onLogout: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
  onOpenSettings: () => void;
}
```

**Features:**
- Top navigation bar with branding
- User profile dropdown
- Sidebar navigation with role-based visibility
- Responsive layout container
- Children rendering area

---

#### AuthPage.tsx (Authentication)
**Purpose:** User authentication interface

**Features:**
- Google Sign-In button with Firebase integration
- Error state handling
- Loading state during authentication
- Responsive design
- Brand imagery and messaging

**Firebase Integration:**
```typescript
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';

const handleSignIn = async () => {
  await signInWithPopup(auth, googleProvider);
};
```

---

#### NewsletterEditor.tsx (Content Editor)
**Purpose:** Rich HTML newsletter creation and editing interface

**Props:**
```typescript
{
  newsletter?: Newsletter;  // Undefined for new, Newsletter for edit
  onSave: () => void;
  onCancel: () => void;
}
```

**State:**
- `subject: string` - Newsletter subject line
- `htmlContent: string` - Raw HTML content
- `categoryId: string` - Selected category
- `selectedGroups: string[]` - Selected recipient group IDs
- `activeTab: 'edit' | 'preview' | 'fix-images'` - Current tab
- `isMediaModalOpen: boolean` - Media library modal visibility
- `imageToReplace: string | null` - Image URL being replaced
- `isSaving: boolean` - Save operation state
- `detectedImages: string[]` - Images found in HTML

**Key Features:**
1. **HTML Editor Tab:**
   - Raw HTML textarea
   - Syntax highlighting (potential enhancement)
   - File upload for HTML import

2. **Preview Tab:**
   - Live HTML rendering
   - Iframe sandbox for security

3. **Fix Images Tab:**
   - Automatic image detection from HTML
   - Image replacement interface
   - Media library integration

4. **Media Library:**
   - Media list display
   - Upload new media
   - Insert/replace functionality

5. **Status Actions:**
   - Save as Draft
   - Schedule (future implementation)
   - Send Now

---

#### AdminPanel.tsx (Administration)
**Purpose:** User and system administration interface

**Props:**
```typescript
{
  currentUser: User;  // For permission validation
}
```

**Sections:**
1. **User Management:**
   - User list with roles
   - Add new user form
   - Role assignment
   - User deletion

2. **Category Management:**
   - Category list with counts
   - Add new category
   - Delete category

3. **Audit Log:**
   - Activity log entries
   - Timestamp display
   - Action type indicators

**Permission Checks:**
```typescript
if (currentUser.role !== UserRole.SITE_ADMIN) {
  return <PermissionDenied />;
}
```

---

#### ProfilePage.tsx (User Profile)
**Purpose:** User profile editing and settings

**Props:**
```typescript
{
  user: User;
  onUpdateUser: (user: User) => void;
}
```

**Features:**
- Editable profile fields (name, description, LinkedIn)
- Avatar display (from Google)
- Save changes with API call
- Form validation

---

## Data Flow

### Newsletter Creation Flow

```
1. User clicks "Create New"
   ↓
2. App.tsx sets isEditorOpen = true
   ↓
3. NewsletterEditor.tsx renders with empty state
   ↓
4. User fills in:
   - Subject
   - HTML content
   - Category
   - Recipient groups
   ↓
5. User clicks "Save Draft"
   ↓
6. NewsletterEditor calls api.saveNewsletter()
   ↓
7. MockApi creates new newsletter with ID
   ↓
8. NewsletterEditor calls onSave()
   ↓
9. App.tsx closes editor, refreshes newsletter list
   ↓
10. Dashboard updates with new newsletter
```

### Authentication Flow

```
1. User loads app
   ↓
2. App.tsx shows loading spinner
   ↓
3. Firebase onAuthStateChanged() fires
   ↓
4. [Not authenticated] → Show AuthPage
   ↓
5. User clicks "Sign in with Google"
   ↓
6. Firebase signInWithPopup() opens OAuth
   ↓
7. User authorizes with Google
   ↓
8. Firebase returns user object
   ↓
9. App.tsx calls api.syncFirebaseUser()
   ↓
10. MockApi creates/fetches user with role
   ↓
11. App.tsx sets user state
   ↓
12. [Authenticated] → Show Layout with content
```

### Data Update Flow

```
User Action
   ↓
Component Handler
   ↓
API Service Method
   ↓
In-Memory Store Update
   ↓
Promise Resolution
   ↓
Component State Update
   ↓
UI Re-render
```

---

## State Management

### Current Approach: Local Component State

**Pattern:** React Hooks (useState, useEffect)

**Advantages:**
- Simple and straightforward
- No additional dependencies
- Easy to understand and debug
- Suitable for small/medium apps

**Limitations:**
- Prop drilling for deep components
- No global state sharing
- Manual synchronization needed
- Difficult to debug complex flows

### Production Recommendation: Context + Reducer

For scaling, consider implementing:

```typescript
// contexts/AppContext.tsx
interface AppState {
  user: User | null;
  newsletters: Newsletter[];
  categories: Category[];
  groups: RecipientGroup[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}
```

**Benefits:**
- Centralized state management
- Predictable state updates
- Easier testing
- Better developer tools integration

---

## Authentication Flow

### Firebase Authentication Integration

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ 1. User clicks "Sign in with Google"
       ↓
┌─────────────────┐
│   AuthPage.tsx  │
└──────┬──────────┘
       │
       │ 2. signInWithPopup(auth, googleProvider)
       ↓
┌──────────────────┐
│  Firebase Auth   │
└──────┬───────────┘
       │
       │ 3. Google OAuth flow
       ↓
┌──────────────────┐
│  Google OAuth    │
└──────┬───────────┘
       │
       │ 4. Returns auth token + user info
       ↓
┌──────────────────┐
│  Firebase Auth   │
└──────┬───────────┘
       │
       │ 5. onAuthStateChanged() fires
       ↓
┌─────────────┐
│   App.tsx   │
└──────┬──────┘
       │
       │ 6. api.syncFirebaseUser(email, name, photo)
       ↓
┌──────────────────┐
│  mockApi.ts      │
└──────┬───────────┘
       │
       │ 7. Find or create user with role
       ↓
┌──────────────────┐
│  In-Memory Store │
└──────┬───────────┘
       │
       │ 8. Return User object
       ↓
┌─────────────┐
│   App.tsx   │ → setUser(user)
└─────────────┘
```

### Session Persistence

Firebase Auth automatically handles session persistence:

```typescript
// Automatic on page load
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in, restore session
      syncAndSetUser(firebaseUser);
    } else {
      // User is signed out
      setUser(null);
    }
  });

  return () => unsubscribe();
}, []);
```

---

## Service Layer

### Mock API Architecture

**Purpose:** Simulate backend API during development

**Implementation Pattern:** Class-based service with private state

```typescript
class MockApiService {
  private users: User[] = MOCK_USERS;
  private newsletters: Newsletter[] = MOCK_NEWSLETTERS;
  // ... other collections

  async getUsers(): Promise<User[]> {
    return Promise.resolve([...this.users]);
  }

  // ... other methods
}

export const api = new MockApiService();
```

**Features:**
- Singleton pattern for shared state
- Promise-based API (async/await compatible)
- Simulated network delay
- Automatic audit logging
- Type-safe with TypeScript

### Production API Design

**Recommended Approach:** REST API with Firestore

```
GET    /api/v1/users              → List users
POST   /api/v1/users              → Create user
GET    /api/v1/users/:id          → Get user
PUT    /api/v1/users/:id          → Update user
DELETE /api/v1/users/:id          → Delete user

GET    /api/v1/newsletters        → List newsletters
POST   /api/v1/newsletters        → Create newsletter
GET    /api/v1/newsletters/:id    → Get newsletter
PUT    /api/v1/newsletters/:id    → Update newsletter
DELETE /api/v1/newsletters/:id    → Delete newsletter
POST   /api/v1/newsletters/:id/send → Send newsletter

// ... similar for categories, groups, media
```

---

## Deployment Architecture

### Development Environment

```
Local Machine
├─ Vite Dev Server (port 5173)
├─ Firebase Auth (cloud)
└─ Mock API (in-memory)
```

### Production Architecture (Recommended)

```
┌──────────────────────────────────────────────┐
│              CDN / Edge Network               │
│  (Cloudflare, Firebase Hosting, Vercel)      │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────┴─────────────────────────────┐
│          Static React App (SPA)               │
│  - Optimized JS bundles                       │
│  - CSS assets                                 │
│  - Images & media                             │
└────────────────┬─────────────────────────────┘
                 │
┌────────────────┴─────────────────────────────┐
│         Firebase Services                     │
│  ┌─────────────┐  ┌──────────────┐          │
│  │  Firestore  │  │  Functions   │          │
│  │  Database   │  │  (API Layer) │          │
│  └─────────────┘  └──────────────┘          │
│  ┌─────────────┐  ┌──────────────┐          │
│  │   Storage   │  │     Auth     │          │
│  │   (Media)   │  │   (Google)   │          │
│  └─────────────┘  └──────────────┘          │
└──────────────────────────────────────────────┘
                 │
┌────────────────┴─────────────────────────────┐
│          External Services                    │
│  ┌─────────────┐  ┌──────────────┐          │
│  │  SendGrid   │  │  Analytics   │          │
│  │  (Email)    │  │  (Tracking)  │          │
│  └─────────────┘  └──────────────┘          │
└──────────────────────────────────────────────┘
```

---

## Security Architecture

### Current Security Measures

1. **Authentication:**
   - Firebase Auth with Google OAuth
   - Automatic session management
   - Secure token handling

2. **Authorization:**
   - Role-based access control (RBAC)
   - UI-level permission checks
   - Role validation in components

3. **Data Validation:**
   - TypeScript type checking
   - Form validation in components
   - Email format validation

### Production Security Recommendations

#### 1. Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isSiteAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'Site Admin';
    }

    function isNewsletterAdmin() {
      return isAuthenticated() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['Site Admin', 'Newsletter Admin'];
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow create, update, delete: if isSiteAdmin();
    }

    // Newsletters collection
    match /newsletters/{newsletterId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isNewsletterAdmin();
    }

    // Categories collection
    match /categories/{categoryId} {
      allow read: if isAuthenticated();
      allow write: if isNewsletterAdmin();
    }
  }
}
```

#### 2. Cloud Function Security

```typescript
// functions/src/index.ts
import * as admin from 'firebase-admin';
import { https } from 'firebase-functions';

export const sendNewsletter = https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new https.HttpsError('unauthenticated', 'Must be authenticated');
  }

  // Verify authorization
  const userDoc = await admin.firestore()
    .collection('users')
    .doc(context.auth.uid)
    .get();

  const role = userDoc.data()?.role;
  if (!['Site Admin', 'Newsletter Admin'].includes(role)) {
    throw new https.HttpsError('permission-denied', 'Insufficient permissions');
  }

  // Process newsletter sending
  // ...
});
```

#### 3. Content Security Policy

```html
<!-- index.html -->
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://*.googleapis.com https://*.firebaseio.com;
">
```

#### 4. HTML Sanitization

```typescript
import DOMPurify from 'dompurify';

// Sanitize HTML before rendering
const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'p', 'a', 'img', 'strong', 'em', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'style']
  });
};
```

---

## Scalability Considerations

### Current Limitations

1. **In-Memory Storage:**
   - Data lost on page reload
   - No multi-user synchronization
   - Limited to single instance

2. **Client-Side State:**
   - All data loaded at once
   - No pagination
   - No lazy loading

3. **No Caching:**
   - API calls on every navigation
   - Repeated data fetching

### Scalability Improvements

#### 1. Database Optimization

```typescript
// Implement pagination
const getNewsletters = async (
  limit: number = 20,
  startAfter?: DocumentSnapshot
) => {
  let query = db.collection('newsletters')
    .orderBy('updatedAt', 'desc')
    .limit(limit);

  if (startAfter) {
    query = query.startAfter(startAfter);
  }

  return query.get();
};
```

#### 2. Caching Strategy

```typescript
// Implement React Query for caching
import { useQuery } from '@tanstack/react-query';

const useNewsletters = () => {
  return useQuery({
    queryKey: ['newsletters'],
    queryFn: () => api.getNewsletters(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000  // 10 minutes
  });
};
```

#### 3. Real-time Updates

```typescript
// Firestore real-time listener
useEffect(() => {
  const unsubscribe = db.collection('newsletters')
    .onSnapshot((snapshot) => {
      const newsletters = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNewsletters(newsletters);
    });

  return () => unsubscribe();
}, []);
```

#### 4. Code Splitting

```typescript
// Lazy load components
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const NewsletterEditor = lazy(() => import('./components/NewsletterEditor'));

// Use with Suspense
<Suspense fallback={<Loading />}>
  <AdminPanel />
</Suspense>
```

---

## Performance Monitoring

### Recommended Metrics

1. **Load Time:**
   - Time to First Byte (TTFB)
   - First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)

2. **Interactivity:**
   - Time to Interactive (TTI)
   - First Input Delay (FID)
   - Total Blocking Time (TBT)

3. **Visual Stability:**
   - Cumulative Layout Shift (CLS)

### Implementation

```typescript
// Firebase Performance Monitoring
import { getPerformance } from 'firebase/performance';

const perf = getPerformance();

// Track custom metrics
const trace = perf.trace('newsletter_load');
trace.start();
// ... load newsletter data
trace.stop();
```

---

**Last Updated:** 2025-11-19
**Architecture Version:** 1.0.0

