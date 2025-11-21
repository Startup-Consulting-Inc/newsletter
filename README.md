# Internal Newsletter Platform

A comprehensive internal newsletter management system built with React, Vite, and Firebase. This platform allows teams to create, manage, and track internal communications with detailed analytics and user management.

## 🚀 Features

### Newsletter Management
- **Create & Edit**: Rich text editor with image support, placeholders, and real-time preview.
- **Status Tracking**: Manage newsletters through Draft, Scheduled, Sending, Sent, and Paused states.
- **Scheduling**: Schedule newsletters to be sent at specific dates and times.
- **Duplication**: Easily duplicate existing newsletters to use as templates.
- **Global Delete**: Delete newsletters at any stage (Draft, Scheduled, Sent) to maintain a clean workspace.
- **Download**: Export newsletters as HTML or PDF files for offline viewing or archiving.

### Analytics & Tracking
- **Dashboard**: Visual overview of newsletter performance with charts and key metrics.
- **Detailed Metrics**: Track open rates, click rates, and bounce rates.
- **Individual Tracking**: View detailed logs of who opened and clicked links in each newsletter.
- **Trend Analysis**: Monitor performance trends over time.

### User & Role Management
- **Authentication**: Secure login via Firebase Authentication.
- **Role-Based Access**: Admin panel for managing user roles (Admin, Editor, Viewer) and permissions.
- **Profile Management**: Users can update their profile information.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS
- **Backend**: Firebase (Auth, Firestore, Cloud Functions)
- **Visualization**: Recharts for analytics charts
- **Icons**: Lucide React
- **PDF Generation**: Native Browser Print
- **Deployment**: Google Cloud Build, Cloud Run

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
├── firestore.rules     # Database security rules
├── cloudbuild.yaml     # CI/CD configuration
└── ...
```

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

The project is configured for automated deployment using Google Cloud Build and Cloud Run.

1.  **Trigger Build:**
    Push to the `main` branch or manually submit a build:
    ```bash
    gcloud builds submit --config cloudbuild.yaml .
    ```

2.  **Cloud Functions:**
    Deploy Firebase Cloud Functions separately if needed:
    ```bash
    firebase deploy --only functions
    ```

## 🔒 Security

- **Firestore Rules**: Data access is secured using `firestore.rules` to ensure users can only access authorized data.
- **Environment Variables**: Sensitive configuration is managed via `.env` files and Cloud Build secrets.

## 📄 License

[MIT License](LICENSE)
