# Newsletter Service - Terraform Infrastructure

Terraform configuration for deploying the Newsletter SaaS application to Google Cloud Platform.

## Overview

This Terraform configuration manages the following GCP resources:

- **Cloud Run Service**: Frontend hosting (React + Vite SPA)
- **Artifact Registry**: Container image storage
- **Secret Manager**: Secure secret storage (Firebase config, SMTP credentials)
- **IAM**: Service accounts and permissions
- **API Enablement**: Required GCP APIs

## Architecture

### Deployment Model

The platform uses a **hybrid deployment architecture**:

```
┌─────────────────────────────────────────────────────────┐
│                     GCP Project                         │
│                   (clearly-478614)                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐      ┌─────────────────┐           │
│  │  Cloud Run   │◄─────┤ Artifact        │           │
│  │  (Frontend)  │      │ Registry        │           │
│  │  Dockerized  │      │                 │           │
│  └──────┬───────┘      └─────────────────┘           │
│         │                                              │
│         │ reads                                        │
│         ▼                                              │
│  ┌──────────────┐      ┌─────────────────┐           │
│  │   Secret     │◄─────┤  Cloud Build    │           │
│  │   Manager    │      │  (CI/CD)        │           │
│  └──────┬───────┘      └─────────────────┘           │
│         │                                              │
│         │ provides secrets to                         │
│         ▼                                              │
│  ┌──────────────────────────────────────────┐        │
│  │       Firebase Services                  │        │
│  │  - Authentication (Google Sign-In)       │        │
│  │  - Firestore Database                    │        │
│  │  - Cloud Storage                         │        │
│  │  - Cloud Functions (Email, Tracking)     │        │
│  │    └─ Serverless (No Docker)            │        │
│  └──────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────┘
```

### Why Backend Uses Firebase Functions (Not Docker)

**Frontend (Cloud Run + Docker)**:
- Containerized React app with nginx
- Managed by Terraform
- Deployed via Cloud Build

**Backend (Firebase Functions - Serverless)**:
- **No Docker required**: Firebase Functions are fully managed serverless functions
- **Deployment**: `firebase deploy --only functions` (not managed by Terraform)
- **Benefits**:
  - Auto-scaling (scales to zero when idle)
  - Pay-per-use pricing
  - Native Firebase integration (Firestore, Auth, Storage)
  - Built-in triggers (HTTP, Firestore, scheduled)
  - Fast cold starts with optimized Node.js runtime
  - Minimal DevOps overhead

**Terraform Scope**:
- ✅ Cloud Run (frontend)
- ✅ Artifact Registry
- ✅ Secret Manager
- ✅ IAM and service accounts
- ❌ Firebase Functions (deployed separately via Firebase CLI)

## Prerequisites

1. **Terraform**: Install Terraform v1.0 or later
   ```bash
   brew install terraform  # macOS
   # or download from https://www.terraform.io/downloads
   ```

2. **Google Cloud SDK**: Install and configure gcloud CLI
   ```bash
   brew install --cask google-cloud-sdk  # macOS
   gcloud auth application-default login
   gcloud config set project clearly-478614
   ```

3. **Firebase CLI**: For deploying Firebase resources
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

4. **Required Secret Values**: Gather these before deployment
   - Firebase configuration (from Firebase Console)
   - Gmail App Password (from Google Account settings)

## Quick Start

### 1. Configure Variables

Copy the example variables file and fill in your values:

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your actual secret values:

```hcl
# Get Firebase values from: Firebase Console > Project Settings > General
vite_firebase_api_key              = "AIzaSy..."
vite_firebase_auth_domain          = "clearly-478614.firebaseapp.com"
vite_firebase_storage_bucket       = "clearly-478614.appspot.com"
vite_firebase_messaging_sender_id  = "123456789"
vite_firebase_app_id               = "1:123456789:web:abc123"

# Generate Gmail App Password: https://myaccount.google.com/apppasswords
gmail_app_password = "abcd efgh ijkl mnop"
```

### 2. Initialize Terraform

```bash
terraform init
```

This will:
- Download required provider plugins (Google Cloud)
- Initialize the backend (local state initially)

### 3. Review the Plan

```bash
terraform plan
```

Review the resources that will be created:
- 1 Cloud Run service
- 1 Artifact Registry repository
- 9 Secret Manager secrets
- 2 Service accounts
- Multiple IAM bindings
- API enablements

### 4. Deploy Infrastructure

```bash
terraform apply
```

Type `yes` when prompted. This will:
- Create all GCP resources
- Set up Secret Manager with your credentials
- Configure IAM permissions
- Output the service URL and next steps

### 5. Build and Deploy Application

After Terraform completes, deploy the container:

```bash
# From project root directory
gcloud builds submit --config=cloudbuild.yaml \
  --service-account=projects/clearly-478614/serviceAccounts/newsletter-cloud-build@clearly-478614.iam.gserviceaccount.com
```

### 6. Deploy Firebase Resources

Deploy Firestore rules, indexes, and Cloud Functions:

```bash
# From project root directory
firebase deploy --only firestore:indexes,firestore:rules,storage,functions
```

### 7. Verify Deployment

```bash
# Get the service URL from Terraform output
terraform output cloud_run_url

# Test the service
curl $(terraform output -raw cloud_run_url)
```

## Project Structure

```
terraform/
├── backend.tf                # Remote state configuration
├── main.tf                   # Provider, Cloud Run, API enablement
├── variables.tf              # Input variable definitions
├── secrets.tf                # Secret Manager resources
├── iam.tf                    # Service accounts and IAM bindings
├── outputs.tf                # Output values after deployment
├── terraform.tfvars.example  # Template for variables
├── .gitignore                # Ignore sensitive files
└── README.md                 # This file
```

## Resource Details

### Cloud Run Service

- **Name**: `newsletter`
- **Region**: `us-west1`
- **Resources**: 512Mi RAM, 1 CPU
- **Autoscaling**: 0-10 instances
- **Port**: 8080 (nginx)
- **Access**: Public (allUsers invoker)

### Secret Manager Secrets

**Frontend (6 secrets)**:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_PROJECT_ID` (non-secret, hardcoded)

**Backend (3 secrets)**:
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ADMIN_EMAIL`

### Service Accounts

1. **Cloud Run Service Account** (`newsletter-cloud-run`)
   - Runs the Cloud Run service
   - Reads secrets from Secret Manager
   - Writes logs and metrics

2. **Cloud Build Service Account** (`newsletter-cloud-build`)
   - Builds and deploys containers
   - Accesses secrets during build
   - Deploys to Cloud Run

## Remote State Management (Optional)

To use GCS for remote state storage:

### 1. Create GCS Bucket

```bash
gsutil mb gs://clearly-478614-terraform-state
gsutil versioning set on gs://clearly-478614-terraform-state
```

### 2. Enable Remote Backend

Edit `backend.tf` and uncomment the backend block:

```hcl
terraform {
  backend "gcs" {
    bucket  = "clearly-478614-terraform-state"
    prefix  = "newsletter/state"
  }
}
```

### 3. Migrate State

```bash
terraform init -migrate-state
```

## Common Operations

### Update Secrets

```bash
# Update a secret value in terraform.tfvars
terraform apply -target=google_secret_manager_secret_version.vite_firebase_api_key
```

### Update Cloud Run Configuration

```bash
# Modify variables in terraform.tfvars
terraform apply -target=google_cloud_run_v2_service.newsletter
```

### View Outputs

```bash
terraform output                    # All outputs
terraform output cloud_run_url      # Specific output
terraform output -raw cloud_run_url # Raw value (no quotes)
```

### Destroy Resources

```bash
terraform destroy  # Remove all resources
```

⚠️ **Warning**: This will delete all infrastructure, but not Firebase data.

## Monitoring and Logs

### View Cloud Run Logs

```bash
gcloud run logs tail newsletter --region=us-west1
```

### View Cloud Build Logs

```bash
gcloud builds list --limit=5
gcloud builds log BUILD_ID
```

### View Secret Manager Secrets

```bash
gcloud secrets list
gcloud secrets versions access latest --secret="VITE_FIREBASE_API_KEY"
```

## Troubleshooting

### API Not Enabled

```bash
# Enable required APIs manually
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

### Permission Denied Errors

```bash
# Verify your account has required roles
gcloud projects get-iam-policy clearly-478614 \
  --flatten="bindings[].members" \
  --filter="bindings.members:user:YOUR_EMAIL"
```

Required roles:
- `roles/owner` or
- `roles/editor` + `roles/iam.securityAdmin`

### Secret Not Found

```bash
# Verify secret exists
gcloud secrets describe VITE_FIREBASE_API_KEY

# Recreate if missing
terraform destroy -target=google_secret_manager_secret.vite_firebase_api_key
terraform apply -target=google_secret_manager_secret.vite_firebase_api_key
```

### Cloud Run Service Not Updating

```bash
# Force new revision
gcloud run deploy newsletter \
  --image=us-west1-docker.pkg.dev/clearly-478614/newsletter/newsletter:latest \
  --region=us-west1 \
  --service-account=newsletter-cloud-run@clearly-478614.iam.gserviceaccount.com
```

## Out of Scope (Managed Separately)

These resources are **NOT** managed by Terraform:

- **Firebase Project** (pre-existing)
- **Firestore Indexes** (deploy via `firebase deploy --only firestore:indexes`)
- **Firestore Security Rules** (deploy via `firebase deploy --only firestore:rules`)
- **Cloud Storage Rules** (deploy via `firebase deploy --only storage`)
- **Cloud Functions** (deploy via `firebase deploy --only functions`)
- **Firebase Authentication Providers** (configure via Firebase Console)

**Why Firebase Functions Are Not Managed by Terraform**:

1. **Serverless Architecture**: Firebase Functions are serverless and don't require containerization or infrastructure provisioning
2. **Simplified Deployment**: `firebase deploy --only functions` handles everything automatically
3. **Native Integration**: Better integration with Firebase ecosystem when deployed via Firebase CLI
4. **Limited Terraform Support**: Firebase resources have limited Terraform provider support
5. **Deployment Model**: Functions are event-driven and don't need the same infrastructure management as containerized services

**Deployment Separation**:
- **Terraform**: Manages infrastructure (Cloud Run, Artifact Registry, Secrets, IAM)
- **Firebase CLI**: Manages Firebase resources (Functions, Firestore, Storage, Auth)
- **Cloud Build**: Builds and deploys frontend container (references Terraform-managed resources)

## CI/CD Integration

To enable automated Cloud Build triggers (optional):

1. Connect your repository:
   ```bash
   gcloud beta builds triggers create github \
     --repo-name=newsletter \
     --repo-owner=YOUR_USERNAME \
     --branch-pattern=^main$ \
     --build-config=cloudbuild.yaml
   ```

2. Update `terraform.tfvars`:
   ```hcl
   enable_cloud_build_trigger = true
   repository_uri             = "https://github.com/YOUR_USERNAME/newsletter"
   ```

3. Apply changes:
   ```bash
   terraform apply
   ```

## Security Best Practices

1. **Never commit** `terraform.tfvars` to version control
2. **Use Secret Manager** for all sensitive data (not environment variables)
3. **Enable audit logging** for Secret Manager access
4. **Rotate secrets** regularly (especially Gmail app password)
5. **Use least privilege** IAM roles for service accounts
6. **Enable VPC-SC** for additional security (optional)
7. **Review IAM bindings** periodically

## Cost Estimation

**Monthly Costs (approximate)**:

- Cloud Run: $0-50 (depends on traffic, generous free tier)
- Artifact Registry: $0.10/GB storage
- Secret Manager: $0.06/secret/month
- Cloud Functions: $0-20 (depends on email volume)
- Firestore: $0-50 (depends on data size and operations)
- Cloud Storage: $0.02/GB

**Total**: ~$10-150/month depending on usage

**Free Tier Coverage**:
- Cloud Run: 2M requests/month
- Firestore: 50K reads, 20K writes/day
- Cloud Functions: 2M invocations/month

## Support

- **Terraform Issues**: [terraform/issues](https://github.com/hashicorp/terraform/issues)
- **GCP Documentation**: [cloud.google.com/docs](https://cloud.google.com/docs)
- **Firebase Documentation**: [firebase.google.com/docs](https://firebase.google.com/docs)

## License

This infrastructure configuration is part of the Newsletter SaaS project.
