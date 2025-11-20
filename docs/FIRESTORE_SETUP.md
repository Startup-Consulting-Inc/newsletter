# Firestore Backend Setup Guide

Complete guide for setting up and using the Firestore backend for the InNews Newsletter Platform.

---

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Step 1: Enable Firestore](#step-1-enable-firestore)
- [Step 2: Deploy Security Rules](#step-2-deploy-security-rules)
- [Step 3: Seed Initial Data](#step-3-seed-initial-data)
- [Step 4: Verify Setup](#step-4-verify-setup)
- [Switching Between Implementations](#switching-between-implementations)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

---

## Overview

The InNews platform now uses **Firebase Firestore** as its production database, replacing the in-memory mock API. This provides:

✅ **Data Persistence** - Data survives page reloads and server restarts
✅ **Real-time Updates** - Potential for live collaboration features
✅ **Scalability** - Cloud-native database that scales automatically
✅ **Security** - Role-based access control with Firestore rules
✅ **Production Ready** - Battle-tested infrastructure from Google

---

## Prerequisites

Before you begin, ensure you have:

1. **Firebase Project** - Created in [Firebase Console](https://console.firebase.google.com/)
2. **Firebase CLI** - Installed globally: `npm install -g firebase-tools`
3. **Environment Variables** - `.env` file configured with Firebase credentials
4. **Authentication** - Firebase Auth with Google Sign-In enabled

---

## Step 1: Enable Firestore

### 1.1 Create Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (`newsletter-b104f` or your project name)
3. Click **"Firestore Database"** in the left sidebar
4. Click **"Create database"**

### 1.2 Choose Starting Mode

**Select "Test mode"** for development:
- Allows read/write access for 30 days
- Perfect for initial setup and testing
- We'll deploy proper rules later

**Or select "Production mode"** if deploying immediately:
- Requires security rules before any access
- More secure but needs rules deployment first

### 1.3 Select Location

Choose a location closest to your users:
- **US:** `us-central1` (Iowa)
- **Europe:** `europe-west1` (Belgium)
- **Asia:** `asia-southeast1` (Singapore)

**Note:** Location cannot be changed later!

Click **"Enable"** to create the database.

### 1.4 Enable Firebase Storage (for Media Uploads)

1. In Firebase Console, go to **"Storage"**
2. Click **"Get Started"**
3. Keep default security rules
4. Select same location as Firestore
5. Click **"Done"**

---

## Step 2: Deploy Security Rules

### 2.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

### 2.2 Login to Firebase

```bash
firebase login
```

### 2.3 Initialize Firebase in Project

```bash
cd /Users/jaeheesong/projects/node/newsletter
firebase init
```

**Select:**
- ✅ Firestore (configure security rules)
- ✅ Storage (configure security rules)

**Configuration:**
- Firestore rules file: `firestore.rules` (already created)
- Firestore indexes file: `firestore.indexes.json` (press Enter for default)
- Storage rules file: `storage.rules` (will be extracted from firestore.rules)

### 2.4 Deploy Rules

```bash
firebase deploy --only firestore:rules,storage:rules
```

**Expected output:**
```
✔  Deploy complete!

Project Console: https://console.firebase.google.com/project/newsletter-b104f/overview
```

---

## Step 3: Seed Initial Data

### Overview

The platform includes a **standalone seeding script** that populates the database with test data. This script runs independently from the application and requires temporary permission adjustments.

### 3.1 Enable Development Mode in Firestore Rules

**IMPORTANT:** The seeding script needs write access without authentication. You must temporarily enable development mode in your security rules.

1. **Edit `firestore.rules`** and uncomment lines 25-27:

   ```javascript
   // Change from:
   // match /{document=**} {
   //   allow read, write: if true;
   // }

   // To:
   match /{document=**} {
     allow read, write: if true;
   }
   ```

   ⚠️ **WARNING:** This allows ALL read/write operations without authentication!

2. **Deploy the updated rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

### 3.2 Run the Seeding Script

Choose one of the following commands:

**Option A: Seed if database is empty (Safe)**
```bash
npm run seed
```

This checks if data exists first and only seeds if the database is empty.

**Option B: Force reset and reseed (Destructive)**
```bash
npm run seed:reset
```

⚠️ **WARNING:** This **deletes ALL existing data** and reseeds from scratch!

**Expected output:**
```
🔥 Firebase Database Seeding Tool

🔍 Checking database status...

🌱 Database is empty. Seeding initial data...
🌱 Starting Firestore data seeding...
👥 Seeding users...
   ✓ Added 3 users
📁 Seeding categories...
   ✓ Added 4 categories
👨‍👩‍👧‍👦 Seeding recipient groups...
   ✓ Added 4 recipient groups
📧 Seeding newsletters...
   ✓ Added 3 newsletters
🖼️  Seeding media items...
   ✓ Added 3 media items
📋 Seeding audit logs...
   ✓ Added 3 audit logs
✅ Firestore seeding completed successfully!

📊 Final Database Stats:
   Users: 3
   Categories: 4
   Recipient Groups: 4
   Newsletters: 3
   Media Items: 3
   Audit Logs: 3

🎉 Done! You can now use the application with test data.
```

### 3.3 Restore Security Rules (CRITICAL!)

**IMMEDIATELY** after seeding, restore the production security rules:

1. **Edit `firestore.rules`** and re-comment lines 25-27:

   ```javascript
   // 🔓 DEVELOPMENT: Uncomment to allow seeding (REMOVE BEFORE PRODUCTION!)
   // match /{document=**} {
   //   allow read, write: if true;
   // }
   ```

2. **Deploy the restored rules:**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Verify rules are secure:**
   - Go to Firebase Console → Firestore → Rules tab
   - Ensure the development rule is commented out

### 3.4 Automatic Seeding (Browser)

The application also includes automatic seeding when you first load it in the browser:

1. **Run the application:**
   ```bash
   npm run dev
   ```

2. **Open browser** to http://localhost:5173

3. **Sign in with Google** - The app will automatically seed if the database is empty

**Note:** Automatic seeding only works if:
- Database is completely empty
- Your Google account has the necessary permissions
- Firestore rules allow authenticated write access

---

## Step 4: Verify Setup

### 4.1 Check Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Navigate to **Firestore Database**
3. You should see collections:
   - `users` (3 documents)
   - `categories` (4 documents)
   - `recipientGroups` (4 documents)
   - `newsletters` (3 documents)
   - `media` (3 documents)
   - `auditLogs` (3 documents)

### 4.2 Test Application Features

**Test User Management:**
1. Sign in with Google
2. Navigate to **Admin Panel** (if you're a Site Admin)
3. View users, add a test user
4. Check Firestore Console - new user should appear

**Test Newsletter Creation:**
1. Click **"Create New"** on dashboard
2. Fill in newsletter details
3. Save as Draft
4. Check Firestore Console - newsletter should be saved

**Test Data Persistence:**
1. Reload the page (Ctrl/Cmd + R)
2. All data should remain
3. No loss of newsletters or users

---

## Switching Between Implementations

The application supports both Firestore and Mock API.

### Use Firestore (Production - Default)

**File:** `services/index.ts`
```typescript
// PRODUCTION: Use Firestore API
export { api } from './firestoreApi';  // ✅ Active

// DEVELOPMENT: Use Mock API
// export { api } from './mockApi';    // Commented out
```

### Use Mock API (Testing)

**File:** `services/index.ts`
```typescript
// PRODUCTION: Use Firestore API
// export { api } from './firestoreApi';  // Commented out

// DEVELOPMENT: Use Mock API
export { api } from './mockApi';          // ✅ Active
```

**When to use Mock API:**
- Running unit tests
- Offline development
- Quick prototyping without database
- Performance testing

---

## Database Schema

### Collections Structure

```
/users/{userId}
  - name: string
  - email: string
  - role: "Site Admin" | "Newsletter Admin" | "Newsletter Creator"
  - description?: string
  - linkedinUrl?: string
  - avatarUrl?: string
  - createdAt: timestamp
  - updatedAt: timestamp

/categories/{categoryId}
  - name: string
  - count: number
  - createdAt: timestamp

/recipientGroups/{groupId}
  - name: string
  - recipientCount: number
  - createdAt: timestamp
  /recipients/{recipientId}  [subcollection]
    - email: string
    - firstName?: string
    - lastName?: string
    - addedAt: timestamp

/newsletters/{newsletterId}
  - subject: string
  - status: "Draft" | "Scheduled" | "Sent" | "Paused"
  - categoryId: string
  - recipientGroupIds: string[]
  - htmlContent: string
  - scheduledAt?: timestamp
  - sentAt?: timestamp
  - stats: { sent, opened, clicked, bounced }
  - createdAt: timestamp
  - updatedAt: timestamp

/media/{mediaId}
  - url: string
  - name: string
  - size: string
  - dimensions: string
  - uploadedAt: timestamp

/auditLogs/{logId}
  - userId: string
  - userName: string
  - action: string
  - target: string
  - timestamp: timestamp
```

### Initial Seed Data

#### Test Users (Database Records)

The seeding script creates 3 test user records in Firestore:

| Name | Email | Role | Description |
|------|-------|------|-------------|
| **Alice Admin** | alice@company.com | Site Admin | Head of Internal IT |
| **Bob Editor** | bob@company.com | Newsletter Admin | Communications Director |
| **Charlie Creator** | charlie@company.com | Newsletter Creator | Content Specialist |

**⚠️ IMPORTANT: Authentication vs Database Records**

These users are **database records only** - they represent user profiles stored in Firestore. To actually log in to the application:

1. **You must use Google Sign-In** - The platform uses Firebase Authentication with Google OAuth
2. **No passwords exist** - Authentication is handled entirely through Google accounts
3. **Test users cannot log in** - Unless they have actual Google accounts with matching emails

**How to Use Test User Roles:**

**Option A: Manually Upgrade Your Role (Recommended)**
1. Sign in with your Google account
2. Your profile will be auto-created with "Newsletter Creator" role
3. Go to Firebase Console → Firestore Database → `users` collection
4. Find your user document (by your email)
5. Edit the `role` field to "Site Admin" or "Newsletter Admin"
6. Refresh the application to see admin features

**Option B: Use Matching Google Accounts**
- If you have Google accounts with emails `alice@company.com`, `bob@company.com`, or `charlie@company.com`
- Sign in with those accounts to match the seeded user records
- The app will sync with the existing Firestore records

#### Other Seed Data

**Categories:**
- Weekly Updates, HR Announcements, Engineering Tech Talk, Social Events

**Recipient Groups:**
- All Employees (450 recipients)
- Engineering Dept (120 recipients)
- Marketing Team (45 recipients)
- Leadership (25 recipients)

**Newsletters:**
- Q3 Company All-Hands Recap (Sent - 450 sent, 380 opened, 150 clicked)
- New Health Benefits Overview (Draft)
- Engineering Demo Day (Scheduled for 2023-11-01)

**Media Items:**
- 3 placeholder images from picsum.photos

**Audit Logs:**
- 3 sample activity logs tracking user creation, category addition, and newsletter creation

---

## Troubleshooting

### Issue: "Firestore not initialized"

**Cause:** Firebase configuration is missing or incorrect

**Solution:**
1. Check `.env` file has all required variables
2. Verify Firebase config in `services/firebase.ts`
3. Ensure Firestore is enabled in Firebase Console
4. Check browser console for Firebase errors

---

### Issue: "Permission denied" errors

**Cause:** Security rules not deployed or user lacks permissions

**Solution:**
1. Deploy rules: `firebase deploy --only firestore:rules`
2. Check user role in Firestore Console
3. Verify rules in Firebase Console → Firestore → Rules tab
4. For testing, temporarily use test mode rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

---

### Issue: Seed data not appearing

**Cause:** Auto-seed might have failed silently

**Solution:**
1. Check browser console for errors
2. Manually trigger seed:
   ```typescript
   import { resetAndSeedData } from './services';
   await resetAndSeedData();
   ```
3. Verify Firestore is enabled in Firebase Console
4. Check internet connectivity

---

### Issue: Media upload fails

**Cause:** Firebase Storage not enabled or rules not deployed

**Solution:**
1. Enable Storage in Firebase Console
2. Deploy storage rules: `firebase deploy --only storage:rules`
3. Check file size (max 10MB per our rules)
4. Verify file type is an image

---

### Issue: Data not persisting

**Cause:** Using mock API instead of Firestore

**Solution:**
1. Check `services/index.ts` - ensure Firestore API is exported
2. Verify `.env` variables are loaded (check `import.meta.env`)
3. Clear browser cache and reload
4. Check Network tab for Firestore API calls

---

## Advanced Usage

### Manual Database Operations

```typescript
import { db } from './services/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';

// Get all users
const usersRef = collection(db!, 'users');
const snapshot = await getDocs(usersRef);
snapshot.forEach(doc => console.log(doc.data()));

// Add custom document
await addDoc(collection(db!, 'newsletters'), {
  subject: 'Test Newsletter',
  // ... other fields
});
```

### Database Statistics

```typescript
import { getDatabaseStats } from './services';

const stats = await getDatabaseStats();
console.log(stats);
// {
//   users: 3,
//   categories: 4,
//   recipientGroups: 4,
//   newsletters: 3,
//   media: 3,
//   auditLogs: 3
// }
```

### Clear All Data

⚠️ **WARNING: This deletes all data permanently!**

```typescript
import { resetAndSeedData } from './services';

// Clears all collections and reseeds with fresh data
await resetAndSeedData();
```

---

## Next Steps

After successful Firestore setup:

1. **Enable Real-time Listeners** - Update components to use Firestore's `onSnapshot`
2. **Add Cloud Functions** - Implement server-side logic for emails, aggregations
3. **Optimize Queries** - Add composite indexes for complex queries
4. **Implement Caching** - Use React Query or SWR for client-side caching
5. **Add Offline Support** - Enable Firestore offline persistence
6. **Monitor Usage** - Set up Firebase Performance Monitoring

---

## Support & Resources

- **Firebase Docs:** https://firebase.google.com/docs/firestore
- **Firestore Rules:** https://firebase.google.com/docs/firestore/security/get-started
- **Firebase CLI:** https://firebase.google.com/docs/cli
- **Project Docs:** See `DOCUMENTATION.md`, `API_REFERENCE.md`

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
