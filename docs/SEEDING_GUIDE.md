# Database Seeding Guide - Quick Reference

Fast reference for seeding the InNews Newsletter Platform Firestore database.

---

## TL;DR - Quick Steps

```bash
# 1. Enable dev mode in firestore.rules (uncomment lines 25-27)
# 2. Deploy rules
firebase deploy --only firestore:rules

# 3. Run seed script
npm run seed:reset

# 4. Disable dev mode in firestore.rules (re-comment lines 25-27)
# 5. Deploy secure rules
firebase deploy --only firestore:rules
```

---

## Detailed Steps

### Step 1: Enable Development Mode

**Edit `firestore.rules`** and uncomment the development rule (lines 25-27):

```javascript
// Change from commented:
// match /{document=**} {
//   allow read, write: if true;
// }

// To uncommented:
match /{document=**} {
  allow read, write: if true;
}
```

### Step 2: Deploy Development Rules

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  Deploy complete!
```

### Step 3: Run Seed Script

**Option A: Seed if empty (Safe)**
```bash
npm run seed
```

**Option B: Force reset and reseed (Destructive)**
```bash
npm run seed:reset
```

**Expected output:**
```
🔥 Firebase Database Seeding Tool
🌱 Starting Firestore data seeding...
✅ Firestore seeding completed successfully!
📊 Final Database Stats:
   Users: 3
   Categories: 4
   Recipient Groups: 4
   Newsletters: 3
   Media Items: 3
   Audit Logs: 3
🎉 Done!
```

### Step 4: Restore Security (CRITICAL!)

**Edit `firestore.rules`** and re-comment the development rule:

```javascript
// 🔓 DEVELOPMENT: Uncomment to allow seeding (REMOVE BEFORE PRODUCTION!)
// match /{document=**} {
//   allow read, write: if true;
// }
```

### Step 5: Deploy Secure Rules

```bash
firebase deploy --only firestore:rules
```

---

## What Gets Seeded?

### Users (3 records)
| Name | Email | Role |
|------|-------|------|
| Alice Admin | alice@company.com | Site Admin |
| Bob Editor | bob@company.com | Newsletter Admin |
| Charlie Creator | charlie@company.com | Newsletter Creator |

**⚠️ IMPORTANT:** These are **database records only**
- Cannot log in without actual Google accounts
- Use Google Sign-In for authentication
- No passwords exist

### Other Data
- **4 Categories**: Weekly Updates, HR Announcements, Engineering Tech Talk, Social Events
- **4 Recipient Groups**: All Employees, Engineering Dept, Marketing Team, Leadership
- **3 Newsletters**: Q3 Recap (Sent), Health Benefits (Draft), Demo Day (Scheduled)
- **3 Media Items**: Placeholder images
- **3 Audit Logs**: Sample activity entries

---

## Using Test User Roles

Since test users can't log in (Google OAuth only), here's how to test admin features:

### Method 1: Upgrade Your Own Account (Recommended)

1. Sign in with your Google account
2. Go to **Firebase Console** → **Firestore Database** → `users` collection
3. Find your user document (search by your email)
4. Click to edit
5. Change `role` field from `"Newsletter Creator"` to:
   - `"Site Admin"` (full access)
   - `"Newsletter Admin"` (admin features)
6. Refresh the application
7. Access admin panel and test features

### Method 2: Use Matching Google Accounts

If you control Google accounts with these emails:
- alice@company.com
- bob@company.com
- charlie@company.com

Sign in with those accounts to automatically sync with seeded records.

---

## Troubleshooting

### Issue: Permission Denied Error

**Cause:** Development mode not enabled in Firestore rules

**Solution:**
1. Verify `firestore.rules` lines 25-27 are uncommented
2. Deploy rules: `firebase deploy --only firestore:rules`
3. Wait 30 seconds for rules to propagate
4. Run seed script again

---

### Issue: "Database already contains data"

**Cause:** Running `npm run seed` when data exists

**Solution:**
- Use `npm run seed:reset` to force reset and reseed
- ⚠️ WARNING: This deletes ALL data permanently!

---

### Issue: Seed Script Shows "Firestore not initialized"

**Cause:** Missing or incorrect `.env` configuration

**Solution:**
1. Verify `.env` file exists in project root
2. Check all Firebase variables are set:
   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
3. Restart terminal and run seed script again

---

### Issue: Environment Variable Not Loading

**Cause:** Vite environment variables only work in browser context

**Solution:**
The seed script now uses `dotenv` to load variables in Node.js. This is already configured - no action needed.

---

## Security Checklist

Before deploying to production:

- [ ] Development rule in `firestore.rules` is commented out
- [ ] Deployed secure rules: `firebase deploy --only firestore:rules`
- [ ] Verified rules in Firebase Console → Firestore → Rules tab
- [ ] Tested that unauthorized users cannot write to database
- [ ] Removed or secured any test accounts with admin roles

---

## Script Help

View script help message:

```bash
npm run seed -- --help
```

Or directly:

```bash
tsx scripts/seedDatabase.ts --help
```

---

## Advanced: Direct Script Execution

Run the script directly with `tsx`:

```bash
# Seed if empty
tsx scripts/seedDatabase.ts

# Force reset
tsx scripts/seedDatabase.ts --reset

# Show help
tsx scripts/seedDatabase.ts --help
```

---

## Related Documentation

- **Full Setup Guide**: [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md)
- **Quick Start**: [QUICK_START.md](./QUICK_START.md)
- **API Reference**: [API_REFERENCE.md](./API_REFERENCE.md)

---

**Last Updated:** 2025-11-19
**Version:** 1.0.0
