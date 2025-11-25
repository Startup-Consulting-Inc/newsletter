# Internal Newsletter Platform

A comprehensive internal newsletter management system built with React, Vite, and Firebase. This platform allows teams to create, manage, and track internal communications with detailed analytics and user management.

## 🚀 Features

### Newsletter Management
- **Create & Edit**: Rich text editor with image support, placeholders, and real-time preview.
- **Status Tracking**: Manage newsletters through Draft, Scheduled, Sending, Sent, and Paused states.
- **Smart Scheduling**: Schedule newsletters with timezone-aware date picker supporting same-day scheduling for future times.
- **Reliable Operations**: Fixed save/schedule/send workflow ensuring all operations complete before closing the editor.
- **Duplication**: Easily duplicate existing newsletters to use as templates.
- **Category Organization**: Organize newsletters with categories and auto-updating usage counts.
- **Global Delete**: Delete newsletters at any stage (Draft, Scheduled, Sent) to maintain a clean workspace.
- **Download**: Export newsletters as HTML or PDF files for offline viewing or archiving.
- **Multi-Tenant Filtering**: Site Admins can filter and view newsletters by company with company name display.

### Recipient Management
- **Group Operations**: Create, organize, and **duplicate** recipient groups.
- **Recipient Control**: Add, **edit**, and **delete** individual recipients within groups.
- **Unsubscribe System**: Automated unsubscribe handling with import protection.

### Analytics & Tracking
- **Dashboard**: Visual overview of newsletter performance with charts and key metrics.
- **Detailed Metrics**: Track open rates, click rates, and bounce rates.
- **Bounce Email Tracking**: Comprehensive bounce reporting with hard/soft bounce categorization, filterable by newsletter, bounce type, and error category.
- **Bounce Count Badges**: Visual indicators on newsletter cards showing bounced email counts with red alert icons.
- **CSV Export**: Download bounce reports with email addresses, newsletters, bounce types, categories, error messages, and timestamps.
- **Smart Link Tracking**: Accurate tracking of clicked links with support for special protocols.
- **Individual Tracking**: View detailed logs of who opened and clicked links in each newsletter.
- **Trend Analysis**: Monitor performance trends over time.
- **Navigation Access**: Analytics accessible to all admin roles (Site Admin, Company Admin, Newsletter Admin).

### User & Role Management

- **Multi-Tenant Architecture**: Complete company-level data isolation with proper security rules.
- **Three-Tier Roles**:
  - **Site Admin**: Manage all companies, users, and system-wide data
  - **Company Admin**: Manage their company's newsletters, users, categories, and recipient groups
  - **Newsletter Admin**: Create and manage newsletters for their company
- **Authentication**: Secure login via Firebase Authentication with Google Sign-In.
- **User Management**: Site Admins can view and filter users by company and role with company name display.
- **Company Assignment**: Users are assigned to companies with validation to ensure proper access control.
- **Profile Management**: Users can update their profile information and view their role permissions.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Infrastructure**: Terraform for GCP resource management
- **Visualization**: Recharts for analytics charts
- **Icons**: Lucide React
- **PDF Generation**: Native Browser Print
- **Deployment**: Google Cloud Build, Cloud Run, Artifact Registry

## 📂 Project Structure

```
├── src/
│   ├── components/     # React components (Editor, Analytics, Admin, etc.)
│   ├── services/       # API services (Firestore, Auth, Audit)
│   ├── functions/      # Firebase Cloud Functions
│   ├── scripts/        # Utility scripts (Database seeding)
│   ├── App.tsx         # Main application component
│   ├── types.ts        # TypeScript definitions
│   └── ...
├── functions/          # Backend logic (Email sending, Tracking)
├── terraform/          # Infrastructure as Code (GCP resources)
├── firestore.rules     # Database security rules
├── firestore.indexes.json  # Firestore composite indexes
├── cloudbuild.yaml     # CI/CD configuration
└── ...
```

## 🏗️ Infrastructure

Infrastructure is managed using **Terraform** for automated, repeatable deployments to Google Cloud Platform.

### GCP Resources

- **Cloud Run**: Containerized application hosting
- **Artifact Registry**: Docker image storage
- **Secret Manager**: Secure credential storage
- **Service Accounts**: IAM and access control

### Terraform Setup

1. **Initialize Terraform:**
   ```bash
   cd terraform
   terraform init
   ```

2. **Configure Variables:**
   Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your values:
   ```bash
   cp terraform.tfvars.example terraform.tfvars
   ```

3. **Review Changes:**
   ```bash
   terraform plan
   ```

4. **Apply Infrastructure:**
   ```bash
   terraform apply
   ```

### Architecture Notes

- **Build-time Secrets**: Firebase config injected during Docker build via Cloud Build
- **Runtime Secrets**: Email credentials accessed by Cloud Functions via Secret Manager
- **Service Account**: Uses existing Compute Engine service account for all operations
- **Static Deployment**: React app built once, served by nginx (no runtime env vars needed)

## 💻 Run Locally

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase CLI (`npm install -g firebase-tools`)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd newsletter
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Configure Environment Variables:**
    Create a `.env` file in the root directory with your Firebase configuration:
    ```env
    VITE_FIREBASE_API_KEY=your_api_key
    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
    VITE_FIREBASE_PROJECT_ID=your_project_id
    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    VITE_FIREBASE_APP_ID=your_app_id
    ```

4.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    The app will be available at `http://localhost:5173`.

### Database Seeding
To populate the database with initial test data:
```bash
npm run seed
```
To reset and re-seed:
```bash
npm run seed:reset
```

## 🚀 Deployment

The project uses a multi-step deployment process with Terraform and Cloud Build.

### Initial Infrastructure Setup

1. **Deploy Infrastructure with Terraform:**

   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

   This creates:
   - Cloud Run service
   - Artifact Registry repository
   - Secret Manager secrets
   - IAM bindings

### Application Deployment

1. **Build and Deploy Container:**

   Cloud Build handles building the Docker image and deploying to Cloud Run:

   ```bash
   gcloud builds submit --config=cloudbuild.yaml
   ```

   This will:
   - Pull secrets from Secret Manager
   - Build Docker image with Firebase config baked in
   - Push to Artifact Registry
   - Deploy to Cloud Run (updates image only)

2. **Deploy Firebase Resources:**

   ```bash
   firebase deploy --only firestore:indexes,firestore:rules,storage,functions
   ```

### Deployment Workflow

- **Terraform**: Manages infrastructure (one-time or when infrastructure changes)
- **Cloud Build**: Builds and deploys application code (every code change)
- **Firebase**: Deploys Firestore rules, indexes, storage rules, and Cloud Functions

## 🔒 Security

- **Firestore Rules**: Data access is secured using `firestore.rules` to ensure users can only access authorized data.
- **Environment Variables**: Sensitive configuration is managed via `.env` files and Cloud Build secrets.

## 🔄 Recent Updates

### Infrastructure as Code with Terraform (November 2025)

**Implementation**: Complete migration to Terraform-managed infrastructure for Google Cloud Platform resources.

**Infrastructure Components**:

- **Cloud Run Service**: Containerized application deployment with auto-scaling configuration
- **Artifact Registry**: Docker image storage repository (migrated from Container Registry)
- **Secret Manager**: Secure storage for Firebase configuration and email credentials
- **IAM Bindings**: Service account permissions for Cloud Build, Cloud Run, and Cloud Functions

**Architecture**:

- **Build-time Secret Injection**: Firebase configuration pulled from Secret Manager during Docker build and baked into static JavaScript bundle
- **Service Account Consolidation**: Unified approach using existing Compute Engine service account for all operations
- **Separation of Concerns**: Terraform manages infrastructure, Cloud Build handles application deployment
- **Firestore Index Management**: Added composite indexes for auditLogs, media, and newsletters collections

**Terraform Configuration**:

- `main.tf`: Core infrastructure resources and API enablement
- `secrets.tf`: Secret Manager resources and IAM bindings
- `variables.tf`: Configurable parameters with sensible defaults
- `outputs.tf`: Deployment URLs and next steps guidance
- `backend.tf`: Remote state management configuration

**Deployment Workflow**:

1. **One-time setup**: `terraform apply` creates all GCP resources
2. **Code changes**: `gcloud builds submit` builds and deploys container
3. **Infrastructure updates**: Re-run `terraform apply` only when infrastructure changes

**Benefits**:

- Reproducible infrastructure across environments
- Version-controlled infrastructure changes
- Automated resource provisioning
- Clear separation between infrastructure and application code
- Simplified secret management and access control

**Result**: Infrastructure is now fully automated, documented, and version-controlled using industry-standard Infrastructure as Code practices.

### Contact Form & Legal Pages (November 2025)

**Implementation**: Complete contact form system with legal pages and footer navigation.

**Contact Form**:

- Public contact form accessible from landing page and authenticated sidebar
- Form fields: inquiry type, name, email, company, role, subject, message
- File attachment support (images, PDFs, documents up to 10MB)
- Cloud Function integration for form submission (`submitContactForm`)
- Immediate redirect to origin page after successful submission
- Error handling with user-friendly messages

**Legal Pages**:

- **Privacy Policy**: Comprehensive 12-section privacy policy covering data collection, usage, retention, security, user rights, cookies, international transfers, and GDPR compliance
- **Terms of Service**: Detailed 15-section terms covering service description, acceptable use, email compliance, intellectual property, payment, liability, dispute resolution, and termination policies
- Professional formatting with sections, subsections, and clear navigation
- Dynamic last-updated date display

**Footer & Navigation**:

- Footer component on landing page with Privacy, Terms, and Support links
- Support link in authenticated sidebar (between Profile and Sign Out)
- Available on both desktop and mobile layouts
- Consistent navigation experience across authenticated and unauthenticated states

**Security**:

- Firestore rules allow public contact form submissions
- Storage rules for contact form file attachments
- Site Admin access to view and manage contact requests
- Proper data isolation and validation

**Result**: Users can easily contact support, view legal policies, and navigate between pages seamlessly from any location in the application.

### Multi-Tenant Data Isolation & Company Filtering (November 2025)

**Problem Solved**: Users from different companies could see each other's data, breaking tenant isolation.

**Newsletter Editor Multi-Tenant Fix**:

- Fixed critical bug where `NewsletterEditor.tsx` wasn't passing `currentUser.companyId` to API calls
- Updated `getCategories()`, `getGroups()`, and `getMedia()` calls to properly filter by company
- Added defensive validation in `firestoreApi.ts` to warn when companyId is missing
- Added user validation in `App.tsx` to ensure non-Site-Admin users have a valid companyId
- Prevents users from seeing categories, recipient groups, and media from other companies

**Site Admin Company Filtering - Users Tab**:

- Added company name column to user list in Admin Panel
- Implemented company filter dropdown (All Companies, Unassigned, or specific company)
- Filter badge indicator shows when company filter is active
- Updated `filteredAndSortedUsers` logic to support company-based filtering
- Clear Filters button resets company filter along with role filter

**Site Admin Company Filtering - Newsletter Tab**:

- Added company name display in newsletter cards for Site Admin
- Implemented company filter dropdown for newsletters
- Company names shown alongside newsletter status and dates
- Filter integrates seamlessly with existing search and status filters
- Loads company data automatically when Site Admin views Newsletter tab
- Clear Filters button resets all active filters including company

**Enhanced Debug Logging**:

- Comprehensive console logging in `App.tsx` for newsletter fetching and filtering
- Logs show: user info, API queries, returned data, filter states, and final results
- Detailed warnings when no newsletters found or all filtered out
- Each newsletter shows `matchesUserCompany` flag for debugging
- Step-by-step filtering logs show exactly where newsletters are removed

### Newsletter Save/Schedule/Send Workflow Fix (November 2025)

**Problem Solved**: Save, Schedule, and Send operations were redirecting to Newsletter page without completing.

**Root Cause**: `onSave()` callback was called synchronously before async operations completed.

**Implementation**:

- Modified `handleSave()` in `NewsletterEditor.tsx` to only call `onSave()` after ALL async operations complete
- Made `handleScheduleSubmit()` async and properly await save operation before closing modal
- Fixed `handleSaveNewsletter()` in `App.tsx` to properly await newsletter list refresh
- Added comprehensive console logging for debugging save operations
- Error handling prevents closing editor on failures, allowing user to retry

**Result**: Users can now reliably save drafts, schedule newsletters, and send immediately with proper workflow completion.

### Timezone-Aware Newsletter Scheduling (November 2025)

**Problem Solved**: Users couldn't select today's date when scheduling newsletters, even for future times.

**Root Cause**: The `min` attribute on datetime-local input used UTC timezone instead of local timezone.

**Technical Details**:

- Old code: `min={new Date().toISOString().slice(0, 16)}` returned UTC time
- This caused mismatch with browser's local timezone interpretation
- Example: 10:00 AM PST became 6:00 PM UTC, blocking valid selections

**Fix**:

- Implemented local timezone calculation for `min` attribute
- Extracts year, month, day, hours, and minutes in local timezone
- Formats as `YYYY-MM-DDTHH:mm` for datetime-local input
- Users can now schedule newsletters for any future time, including later today

**Result**: Same-day scheduling works correctly across all timezones.

### Analytics Navigation Restoration (November 2025)

**Problem Solved**: Analytics link disappeared from sidebar navigation.

**Fix**:

- Restored Analytics navigation item in `Layout.tsx` navigation array
- Accessible to Site Admin, Company Admin, and Newsletter Admin roles
- Consistent with other navigation items (Dashboard, Newsletter, Admin)

### Bounce Email Tracking System (November 2025)

**Problem Solved**: No way to view which emails bounced or failed delivery when sending newsletters.

**Implementation**: Complete bounce tracking and reporting system built on existing audit log infrastructure.

**API Layer** (`services/firestoreApi.ts`):

- `getBounces()` method queries audit logs for `EMAIL_BOUNCED` action
- Filters by newsletterId for newsletter-specific bounce reports
- `categorizeBounceType()` classifies bounces as hard, soft, or unknown
- `categorizeBounceReason()` converts raw SMTP errors into user-friendly categories

**Bounce Categories**:

- **Hard Bounces**: Invalid email address, domain doesn't exist, recipient rejected
- **Soft Bounces**: Mailbox full, temporary failure, connection issues
- **Unknown**: Other errors that don't fit standard patterns

**User Interface** (`components/BounceReport.tsx`):

- Dedicated "Bounced Emails" tab in Admin Panel (Site Admin and Company Admin only)
- Stats cards showing: total bounces, hard bounces, soft bounces, filtered count
- Four-way filtering: search by email/error, newsletter dropdown, bounce type, error category
- Sortable table with columns: Type (icon + badge), Email, Newsletter, Category, Error Message, Timestamp
- Visual indicators: red for hard bounces, yellow for soft bounces, gray for unknown
- CSV export with proper quote escaping for Excel compatibility
- Empty state handling and loading states

**Dashboard Integration** (`App.tsx`):

- Bounce count badges on newsletter cards with red `AlertCircle` icon
- Only displays for sent newsletters with bounces (`stats.bounced > 0`)
- Positioned next to open count for easy performance comparison
- Visual warning indicator helps identify delivery issues at a glance

**Data Flow**:

1. Email sending failures logged to audit logs via `logEmailBounced()`
2. Newsletter `stats.bounced` field stores aggregate count
3. `getBounces()` queries audit logs with action filter
4. BounceReport component displays with filters and export capability
5. Dashboard shows bounce count badges for quick visibility

**Result**: Users can now monitor email deliverability, identify problematic email addresses, and export bounce data for cleanup or analysis.

### Unsubscribe Functionality

- Implemented `unsubscribe` Cloud Function with HTTP endpoint.
- Added `UnsubscribedUser` interface and API methods (`getUnsubscribedUsers`, `isUnsubscribed`).
- Updated Firestore rules for `unsubscribes` collection.
- Added import protection in Admin Panel to prevent re-importing unsubscribed users.

### Link Tracking Improvements

- Fixed a bug in `wrapLinksWithTracking()` where non-anchor tags were being tracked.
- Improved regex to only match `<a>` tags.
- Added handling for edge cases like `#`, `javascript:`, `mailto:`, and `tel:` links.

### Email Tracking

- Verified full implementation of the tracking system.
- Added missing Firestore composite indexes for the `tracking` collection to fix Analytics view.

### Category Management

- Fixed an issue where "X linked" counts for categories were not updating.
- Implemented `updateCategoryCount()` helper and `recalculateCategoryCounts()` utility.
- Updated newsletter operations (save, delete, duplicate) to automatically maintain category counts.
- Added "Recalculate Counts" button in Admin Panel.

### Recipient Group Features

- Added ability to **Clone/Duplicate** recipient groups.
- Added **Edit** and **Delete** functionality for individual recipients within the Manage Group modal.
- Updated Audit Logging to track `GROUP_DUPLICATED` and `RECIPIENT_UPDATED` actions.

### Dashboard Redesign

- **Command Center Layout**: Revamped dashboard to serve as a central hub for action.
- **Welcome Banner**: Dynamic greeting with scheduled newsletter count.
- **Needs Attention**: "Scheduled & Upcoming" and "Recent Drafts" sections for quick access.
- **Performance Card**: Instant view of the last sent newsletter's open and click rates.
- **Quick Stats**: Real-time count of total subscribers and newsletters sent this month.
- **Bug Fixes**: Resolved React hooks violation and Firestore audit logging errors.

## 📄 License

[MIT License](LICENSE)
