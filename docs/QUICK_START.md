# Quick Start Guide - InNews Platform

Get up and running with the InNews Internal Newsletter Platform in under 5 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
- ✅ **npm** (comes with Node.js)
- ✅ **Firebase Account** - [Create free account](https://firebase.google.com/)
- ✅ **Code Editor** (VS Code recommended)

---

## Step 1: Install Dependencies

Navigate to the project directory and install dependencies:

```bash
cd /Users/jaeheesong/projects/node/newsletter
npm install
```

**Expected output:**
```
added 123 packages in 15s
```

---

## Step 2: Configure Firebase Authentication

### 2.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Name your project: `newsletter-platform`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

### 2.2 Enable Google Sign-In

1. In Firebase Console, go to **Authentication**
2. Click **"Get started"**
3. Select **"Google"** as sign-in provider
4. Toggle **"Enable"**
5. Set support email
6. Click **"Save"**

### 2.3 Get Firebase Configuration

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"** section
3. Click **"Web"** icon (</> symbol)
4. Register app name: `InNews Web`
5. Copy the `firebaseConfig` object

### 2.4 Update Configuration File

Open `services/firebase.ts` and replace the config:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY_HERE",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

**⚠️ Important:** Replace ALL values with your actual Firebase credentials.

---

## Step 3: Start Development Server

```bash
npm run dev
```

**Expected output:**
```
  VITE v6.2.0  ready in 523 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Step 4: Access the Application

1. Open your browser to: **http://localhost:5173**
2. You should see the InNews login page
3. Click **"Sign in with Google"**
4. Authorize with your Google account
5. You'll be automatically logged in!

---

## Step 5: Explore the Platform

### Your First Login

Upon first login:
- You'll be assigned the **Newsletter Creator** role (default)
- Your profile will be auto-created from Google account
- You'll land on the Dashboard

### Try These Features:

#### 1. Create Your First Newsletter

1. Click **"Create New"** on the dashboard
2. Enter a subject: `Welcome to InNews!`
3. Add HTML content:
   ```html
   <h1>Welcome to Our Newsletter Platform!</h1>
   <p>This is your first newsletter.</p>
   ```
4. Select a category
5. Choose recipient groups
6. Click **"Save Draft"**

#### 2. View Your Profile

1. Click your avatar in top-right
2. Select **"Profile"**
3. Update your description
4. Add your LinkedIn URL (optional)
5. Click **"Save Changes"**

#### 3. Browse Analytics

1. Click **"Analytics"** in sidebar
2. View engagement metrics:
   - Total emails sent
   - Average open rate
   - Average click rate

#### 4. Admin Features (Site Admin Only)

To test admin features, you need to manually upgrade your role:

1. Open browser console (F12)
2. Stop the dev server (Ctrl+C)
3. Open `services/mockApi.ts`
4. Add your email to `MOCK_USERS` with `SITE_ADMIN` role
5. Restart server: `npm run dev`
6. Sign in again

---

## Seeding Test Data

### Understanding Test Data vs Authentication

The platform includes a seeding script that populates Firestore with test data. However, **important distinction:**

- **Seed data** = Database records (users, newsletters, categories, etc.)
- **Authentication** = Google Sign-In only (no passwords)
- **Test users cannot log in** unless they have actual Google accounts

### Quick Seed Command

**Option 1: Seed if database is empty (Safe)**
```bash
npm run seed
```

**Option 2: Force reset and reseed (Destructive - deletes all data)**
```bash
npm run seed:reset
```

**⚠️ IMPORTANT:** Seeding requires temporarily enabling development mode in Firestore rules. See [FIRESTORE_SETUP.md](./FIRESTORE_SETUP.md#step-3-seed-initial-data) for detailed instructions.

### Seed Data Includes:

#### Test Users (Database Records Only)
| Name | Email | Role | Can Login? |
|------|-------|------|------------|
| **Alice Admin** | alice@company.com | Site Admin | ❌ Only if you own this Google account |
| **Bob Editor** | bob@company.com | Newsletter Admin | ❌ Only if you own this Google account |
| **Charlie Creator** | charlie@company.com | Newsletter Creator | ❌ Only if you own this Google account |

**To test admin features:**
1. Sign in with **your own Google account**
2. Go to Firebase Console → Firestore → `users` collection
3. Find your user document and change `role` to "Site Admin"
4. Refresh the app to access admin panel

#### Categories
- Weekly Updates, HR Announcements, Engineering Tech Talk, Social Events

#### Recipient Groups
- All Employees (450), Engineering Dept (120), Marketing Team (45), Leadership (25)

#### Sample Newsletters
- Q3 Company All-Hands Recap (Sent)
- New Health Benefits Overview (Draft)
- Engineering Demo Day (Scheduled)

---

## Common Issues & Solutions

### Issue: "Auth not initialized" Error

**Cause:** Firebase configuration is incorrect

**Solution:**
1. Verify `services/firebase.ts` has correct credentials
2. Check Firebase console for API key
3. Ensure Authentication is enabled in Firebase

---

### Issue: Google Sign-In Button Not Working

**Cause:** Authorized domains not configured

**Solution:**
1. Go to Firebase Console → Authentication → Settings
2. Add `localhost` to authorized domains
3. Refresh the page

---

### Issue: Build Errors

**Cause:** Missing dependencies or outdated packages

**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Issue: Port 5173 Already in Use

**Cause:** Another Vite app is running

**Solution:**
```bash
# Kill existing process
lsof -ti:5173 | xargs kill -9

# Or use a different port
npm run dev -- --port 3000
```

---

## Development Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Clean build artifacts
rm -rf dist node_modules/.vite
```

---

## Project Structure Overview

```
newsletter/
├── components/           # React UI components
│   ├── AdminPanel.tsx   # User management
│   ├── AuthPage.tsx     # Login page
│   ├── Layout.tsx       # App shell
│   ├── NewsletterEditor.tsx  # Content editor
│   └── ProfilePage.tsx  # User profile
├── services/            # Business logic
│   ├── firebase.ts      # Auth config
│   └── mockApi.ts       # Mock API
├── App.tsx              # Main app
├── types.ts             # TypeScript types
└── package.json         # Dependencies
```

---

## Next Steps

### For Developers

1. **Read Full Documentation**: See `DOCUMENTATION.md`
2. **Review API Reference**: See `API_REFERENCE.md`
3. **Explore Components**: Browse `components/` directory
4. **Customize Styling**: Modify Tailwind classes

### For Product Owners

1. **Define User Roles**: Customize roles in `types.ts`
2. **Create Email Templates**: Build reusable templates
3. **Configure Categories**: Add your organization's categories
4. **Import Recipients**: Bulk import email lists

### For Production Deployment

1. **Replace Mock API**: Implement Firestore backend
2. **Add Cloud Storage**: Integrate Firebase Storage for media
3. **Implement Email Sending**: Use SendGrid, Mailgun, or similar
4. **Add Analytics Tracking**: Implement pixel tracking
5. **Deploy to Hosting**: Use Firebase Hosting, Vercel, Netlify, or Docker

---

## Docker Deployment

### Prerequisites

Before deploying with Docker, ensure you have:

- ✅ **Docker** (v20.10+) - [Install Docker](https://docs.docker.com/get-docker/)
- ✅ **Docker Compose** (v2.0+) - Usually included with Docker Desktop
- ✅ **Environment variables** configured in `.env` file

### Step 1: Prepare Environment Variables

Ensure your `.env` file contains all required Firebase configuration:

```bash
# Copy example file if you haven't already
cp .env.example .env

# Edit .env with your Firebase credentials
nano .env  # or use your preferred editor
```

**Required variables:**
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

### Step 2: Build Docker Image

Build the production-optimized Docker image. **Important:** You must pass environment variables as build arguments since Vite embeds them at build time.

**Quick build (using Docker Compose - recommended):**
```bash
docker-compose build
```

**Manual build with environment variables:**
```bash
# Source .env file first
source .env

# Build with all required build arguments
docker build \
  --build-arg VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
  --build-arg VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
  -t newsletter-platform:latest .
```

**Expected output:**
```
[+] Building 45.2s (15/15) FINISHED
 => [builder 1/6] FROM docker.io/library/node:20-alpine
 => ...
 => [stage-1 3/3] COPY --from=builder /app/dist /usr/share/nginx/html
 => exporting to image
 => => exporting layers
 => => writing image sha256:...
 => => naming to docker.io/library/newsletter-platform:latest
```

### Step 3: Run with Docker

#### Option A: Using Docker Run

Build with environment variables from `.env`:

```bash
# Build with environment variables
docker build \
  --build-arg VITE_FIREBASE_API_KEY=$(grep VITE_FIREBASE_API_KEY .env | cut -d '=' -f2) \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=$(grep VITE_FIREBASE_AUTH_DOMAIN .env | cut -d '=' -f2) \
  --build-arg VITE_FIREBASE_PROJECT_ID=$(grep VITE_FIREBASE_PROJECT_ID .env | cut -d '=' -f2) \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=$(grep VITE_FIREBASE_STORAGE_BUCKET .env | cut -d '=' -f2) \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=$(grep VITE_FIREBASE_MESSAGING_SENDER_ID .env | cut -d '=' -f2) \
  --build-arg VITE_FIREBASE_APP_ID=$(grep VITE_FIREBASE_APP_ID .env | cut -d '=' -f2) \
  -t newsletter-platform:latest .

# Run the container
docker run -d \
  --name newsletter-app \
  -p 3000:80 \
  newsletter-platform:latest
```

**Access the app:** http://localhost:3000

#### Option B: Using Docker Compose (Recommended)

Docker Compose automatically reads `.env` file and passes variables as build arguments:

```bash
# Build and start the container
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

**Access the app:** http://localhost:3000

**Note:** Docker Compose automatically uses variables from `.env` file for build arguments.

### Step 4: Verify Deployment

1. Open browser to **http://localhost:3000**
2. Verify the login page loads
3. Test Google Sign-In functionality
4. Check browser console for any errors

### Docker Commands Reference

```bash
# Build image
docker build -t newsletter-platform:latest .

# Run container
docker run -d -p 3000:80 --name newsletter-app newsletter-platform:latest

# View logs
docker logs newsletter-app
docker logs -f newsletter-app  # Follow logs

# Stop container
docker stop newsletter-app

# Remove container
docker rm newsletter-app

# Remove image
docker rmi newsletter-platform:latest

# Using Docker Compose
docker-compose up -d          # Start in background
docker-compose up              # Start with logs
docker-compose down            # Stop and remove
docker-compose logs -f         # View logs
docker-compose restart         # Restart services
docker-compose ps              # List running containers
```

### Production Docker Considerations

#### 1. Environment Variables at Build Time

**Important:** Vite environment variables are embedded at build time, not runtime. For production:

**Option 1: Build with environment variables (Recommended)**
```bash
# Source .env file and build
source .env
docker build \
  --build-arg VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN \
  --build-arg VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID \
  -t newsletter-platform:latest .
```

Or use Docker Compose which handles this automatically:
```bash
docker-compose build
```

**Option 2: Use runtime configuration script**
Create a script that injects environment variables into the built HTML at container startup.

#### 2. Multi-Stage Build Optimization

The Dockerfile uses multi-stage builds:
- **Builder stage**: Installs dependencies and builds the app
- **Production stage**: Only includes the built static files with nginx

This results in a smaller final image (~25MB vs ~500MB).

#### 3. Nginx Configuration

The included `nginx.conf` provides:
- SPA routing support (all routes serve `index.html`)
- Gzip compression
- Static asset caching
- Security headers

To use custom nginx config, uncomment in Dockerfile:
```dockerfile
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

#### 4. SSL/TLS Setup

For production HTTPS:

**Option 1: Reverse Proxy (Recommended)**
- Use Traefik, Caddy, or nginx-proxy
- Handle SSL certificates externally
- Route to Docker container on port 80

**Option 2: Nginx with SSL**
- Modify Dockerfile to include certbot
- Mount SSL certificates as volumes
- Update nginx.conf for HTTPS

#### 5. Container Orchestration

For production scaling, consider:

- **Docker Swarm**: Built-in orchestration
- **Kubernetes**: Full-featured orchestration
- **Docker Compose**: Simple multi-container setup

### Docker Troubleshooting

#### Issue: Build fails with "Cannot find module"

**Solution:**
```bash
# Clean build
docker build --no-cache -t newsletter-platform:latest .
```

#### Issue: Environment variables not working

**Cause:** Vite embeds env vars at build time

**Solution:**
- Ensure `.env` file exists before building
- Use `--build-arg` for build-time variables
- Or implement runtime configuration injection

#### Issue: Port already in use

**Solution:**
```bash
# Change port in docker-compose.yml or docker run
docker run -p 8080:80 newsletter-platform:latest
```

#### Issue: Container exits immediately

**Solution:**
```bash
# Check logs
docker logs newsletter-app

# Run interactively to debug
docker run -it --rm newsletter-platform:latest sh
```

### Docker Production Checklist

- [ ] Build optimized production image
- [ ] Configure environment variables
- [ ] Set up SSL/TLS certificates
- [ ] Configure reverse proxy (if needed)
- [ ] Set up container orchestration
- [ ] Configure health checks
- [ ] Set up logging and monitoring
- [ ] Configure backup strategy
- [ ] Test container restart behavior
- [ ] Set resource limits (CPU/memory)
- [ ] Configure auto-scaling (if needed)
- [ ] Set up CI/CD pipeline for Docker builds

---

## Production Checklist

Before going live:

- [ ] Replace mock API with real database
- [ ] Configure Firebase environment variables in `.env`
- [ ] Implement server-side security rules
- [ ] Add proper error handling and logging
- [ ] Set up email sending service
- [ ] Implement analytics tracking pixels
- [ ] Add user authentication flow improvements
- [ ] Configure production Firebase project
- [ ] Set up monitoring and alerts
- [ ] Implement backup and recovery procedures
- [ ] Add rate limiting
- [ ] Conduct security audit
- [ ] Test email deliverability
- [ ] Configure SPF/DKIM/DMARC records
- [ ] Set up SSL certificate
- [ ] Optimize bundle size
- [ ] Add accessibility improvements
- [ ] Test across browsers and devices

---

## Getting Help

### Resources

- 📖 **Full Documentation**: `DOCUMENTATION.md`
- 🔌 **API Reference**: `API_REFERENCE.md`
- 🔥 **Firebase Docs**: [firebase.google.com/docs](https://firebase.google.com/docs)
- ⚛️ **React Docs**: [react.dev](https://react.dev)
- ⚡ **Vite Docs**: [vitejs.dev](https://vitejs.dev)

### Troubleshooting Steps

1. Check browser console for errors (F12)
2. Verify Firebase configuration
3. Review network tab for failed requests
4. Check Firebase Console for auth status
5. Restart development server
6. Clear browser cache and cookies

---

## Success Indicators

You're all set when you can:

✅ Sign in with Google account
✅ Create a draft newsletter
✅ View dashboard with analytics
✅ Access your profile page
✅ See sample newsletters in list
✅ Browse media library
✅ Navigate all sections without errors

---

**Congratulations! You're ready to start building with InNews! 🎉**

For detailed feature documentation, see `DOCUMENTATION.md`.

---

**Last Updated:** 2025-11-19
**Guide Version:** 1.1.0
