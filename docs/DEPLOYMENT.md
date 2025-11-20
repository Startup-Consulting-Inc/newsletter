# Google Cloud Run Deployment Guide

This guide will walk you through deploying the InNews Newsletter Platform to Google Cloud Run.

## Prerequisites

- Google Cloud account
- [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed
- Firebase project already configured (newsletter-b104f)
- `.env` file with all required environment variables (see Option B for list)
- Bash shell (for running setup scripts)

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Option A: Quick Manual Deployment](#option-a-quick-manual-deployment)
3. [Option B: Automated Deployment with Secret Manager](#option-b-automated-deployment-with-secret-manager)
4. [Verification](#verification)
5. [Custom Domain Setup](#custom-domain-setup-optional)
6. [CI/CD with GitHub Actions](#cicd-with-github-actions-optional)
7. [Troubleshooting](#troubleshooting)

---

## Initial Setup

### 1. Authenticate with Google Cloud

```bash
gcloud auth login
```

### 2. Set your project

```bash
gcloud config set project newsletter-b104f
```

### 3. Enable required APIs

```bash
gcloud services enable \
  cloudbuild.googleapis.com \
  run.googleapis.com \
  containerregistry.googleapis.com \
  secretmanager.googleapis.com
```

---

## Option A: Quick Manual Deployment

⚠️ **Not recommended for production** - Use Option B (Secret Manager) instead for better security.

This is the fastest way to deploy for **testing/development only**. Environment variables would need to be configured manually in Cloud Build.

> **Note**: The current `cloudbuild.yaml` is configured for Secret Manager (Option B). To use manual deployment, you would need to modify `cloudbuild.yaml` to use substitution variables instead.

For production deployments, **skip to [Option B](#option-b-automated-deployment-with-secret-manager-recommended)**.

---

## Option B: Automated Deployment with Secret Manager (Recommended)

This approach stores all environment variables in Google Secret Manager for better security and automation. **This is the recommended method for production deployments.**

### Why Secret Manager?

- **Security**: Secrets are encrypted at rest and in transit
- **Version Control**: Keep multiple versions of secrets for easy rollback
- **IAM Integration**: Fine-grained access control via Cloud IAM
- **Audit Logging**: Track who accessed secrets and when
- **No Command-line Exposure**: Secrets don't appear in shell history or logs

### Step 1: Setup Secrets (One-time)

We've provided automated scripts to simplify Secret Manager setup:

```bash
# Make scripts executable
chmod +x scripts/setup-secrets.sh scripts/verify-secrets.sh scripts/update-secrets.sh

# Create all secrets from your .env file
./scripts/setup-secrets.sh
```

This script will:
- ✅ Read environment variables from `.env`
- ✅ Create all required secrets in Secret Manager
- ✅ Grant Cloud Build service account access
- ✅ Handle both new secrets and updates to existing ones

**Required secrets** (must be in `.env`):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

**Optional secrets** (backend/runtime, created if present in `.env`):
- `GMAIL_USER`
- `GMAIL_APP_PASSWORD`
- `ADMIN_EMAIL`
- `JWT_SECRET`
- `OPENROUTER_API_KEY`

### Step 2: Verify Setup

```bash
./scripts/verify-secrets.sh
```

This script will:
- ✅ Check that all required secrets exist
- ✅ Verify Cloud Build has proper IAM permissions
- ✅ Display current secret versions
- ✅ Provide actionable error messages if issues found

**Expected output:**
```
🔍 Verifying Google Secret Manager configuration

📋 Checking required secrets...
✅ VITE_FIREBASE_API_KEY (version: 1)
✅ VITE_FIREBASE_AUTH_DOMAIN (version: 1)
✅ VITE_FIREBASE_PROJECT_ID (version: 1)
✅ VITE_FIREBASE_STORAGE_BUCKET (version: 1)
✅ VITE_FIREBASE_MESSAGING_SENDER_ID (version: 1)
✅ VITE_FIREBASE_APP_ID (version: 1)

🔐 Checking Cloud Build service account permissions...
✅ All required secrets exist and have proper permissions!

You're ready to deploy:
  gcloud builds submit --config=cloudbuild.yaml
```

### Step 3: Deploy

With secrets configured, deployment is simple:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

**No substitution variables needed!** The `cloudbuild.yaml` is already configured to pull secrets from Secret Manager automatically.

**Build time**: ~5-10 minutes for first build, ~2-3 minutes for subsequent builds.

### Updating Secrets

When you need to update secret values (e.g., Firebase config change, new API keys):

```bash
# Update .env with new values
nano .env

# Update secrets in Secret Manager
./scripts/update-secrets.sh
```

This creates **new versions** of secrets while preserving old ones for rollback capability.

**Rollback to previous version:**
```bash
# List secret versions
gcloud secrets versions list VITE_FIREBASE_API_KEY --project=newsletter-b104f

# In cloudbuild.yaml, change version number:
# versionName: projects/$PROJECT_ID/secrets/VITE_FIREBASE_API_KEY/versions/2
# (Change "latest" to specific version number)
```

---

## Verification

### Check deployment status

```bash
gcloud run services list --region=us-west1
```

### View logs

```bash
gcloud run services logs read newsletter --region=us-west1 --limit=50
```

### Test the application

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe newsletter --region=us-west1 --format="value(status.url)")

# Open in browser
open $SERVICE_URL  # macOS
# or
xdg-open $SERVICE_URL  # Linux
```

---

## Custom Domain Setup (Optional)

### Step 1: Map custom domain

```bash
gcloud run domain-mappings create \
  --service=newsletter \
  --domain=your-domain.com \
  --region=us-west1
```

### Step 2: Add DNS records

Follow the instructions from the output to add DNS records to your domain registrar.

### Step 3: Verify

```bash
gcloud run domain-mappings describe \
  --domain=your-domain.com \
  --region=us-west1
```

---

## CI/CD with GitHub Actions (Optional)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloud Run

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT_ID: newsletter-b104f
  REGION: us-west1
  SERVICE_NAME: newsletter

jobs:
  deploy:
    runs-on: ubuntu-latest

    permissions:
      contents: read
      id-token: write

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v2
        with:
          workload_identity_provider: ${{ secrets.WIF_PROVIDER }}
          service_account: ${{ secrets.WIF_SERVICE_ACCOUNT }}

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Build and Deploy
        run: |
          gcloud builds submit --config=cloudbuild.yaml

      - name: Get Service URL
        run: |
          SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
          echo "Service deployed to: $SERVICE_URL"
```

**Setup Workload Identity Federation** (recommended over service account keys):

```bash
# Create Workload Identity Pool
gcloud iam workload-identity-pools create "github" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# Create Workload Identity Provider
gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding newsletter-b104f \
  --member="serviceAccount:github-actions@newsletter-b104f.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding newsletter-b104f \
  --member="serviceAccount:github-actions@newsletter-b104f.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Allow GitHub repo to impersonate service account
gcloud iam service-accounts add-iam-policy-binding github-actions@newsletter-b104f.iam.gserviceaccount.com \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/attribute.repository/YOUR_GITHUB_USERNAME/newsletter"
```

Add these secrets to GitHub repository:
- `WIF_PROVIDER`: `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-provider`
- `WIF_SERVICE_ACCOUNT`: `github-actions@newsletter-b104f.iam.gserviceaccount.com`

---

## Troubleshooting

### Secret Manager Issues

#### "Secret does not exist" error

```bash
# Check if secret exists
gcloud secrets describe VITE_FIREBASE_API_KEY --project=newsletter-b104f

# If it doesn't exist, create it
./scripts/setup-secrets.sh
```

#### "Permission denied" accessing secrets

```bash
# Verify Cloud Build has access
./scripts/verify-secrets.sh

# If permission is missing, grant it manually
PROJECT_NUMBER=$(gcloud projects describe newsletter-b104f --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding VITE_FIREBASE_API_KEY \
  --project=newsletter-b104f \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### Secret value is wrong/outdated

```bash
# Update .env with correct values
nano .env

# Update secrets
./scripts/update-secrets.sh

# Verify the update
gcloud secrets versions list VITE_FIREBASE_API_KEY --project=newsletter-b104f
```

#### Need to rollback to previous secret version

```bash
# List all versions
gcloud secrets versions list VITE_FIREBASE_API_KEY --project=newsletter-b104f

# Edit cloudbuild.yaml to use specific version
# Change: versions/latest → versions/1 (or desired version number)
# Then redeploy
gcloud builds submit --config=cloudbuild.yaml
```

### Build fails with "permission denied"

```bash
# Grant Cloud Build service account access
PROJECT_NUMBER=$(gcloud projects describe newsletter-b104f --format="value(projectNumber)")

gcloud projects add-iam-policy-binding newsletter-b104f \
  --member="serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
  --role="roles/run.admin"
```

### Container fails to start

Check logs:

```bash
gcloud run services logs read newsletter --region=us-west1 --limit=100
```

Common issues:
- **Port mismatch**: Ensure nginx listens on port 8080
- **Missing environment variables**: Run `./scripts/verify-secrets.sh` to check Secret Manager setup
- **Build errors**: Check Cloud Build logs with `gcloud builds log <BUILD_ID>`
- **Invalid Firebase config**: Verify secrets contain correct values

### View Cloud Build logs

```bash
gcloud builds list --limit=5
gcloud builds log <BUILD_ID>
```

### Update existing deployment

```bash
# Rebuild and redeploy
gcloud builds submit --config=cloudbuild.yaml

# Update with new image
gcloud run deploy newsletter \
  --image=gcr.io/newsletter-b104f/newsletter:latest \
  --region=us-west1
```

### Rollback to previous version

**Cloud Run revision rollback:**
```bash
# List revisions
gcloud run revisions list --service=newsletter --region=us-west1

# Rollback to specific revision
gcloud run services update-traffic newsletter \
  --to-revisions=REVISION_NAME=100 \
  --region=us-west1
```

**Secret version rollback:**
```bash
# List secret versions
gcloud secrets versions list VITE_FIREBASE_API_KEY --project=newsletter-b104f

# Edit cloudbuild.yaml to use older version
# versionName: projects/$PROJECT_ID/secrets/VITE_FIREBASE_API_KEY/versions/1

# Redeploy with old secret
gcloud builds submit --config=cloudbuild.yaml
```

---

## Cost Optimization

Current configuration costs:
- **Low traffic** (< 1000 requests/day): ~$0-2/month
- **Medium traffic** (10k requests/day): ~$5-10/month
- **High traffic** (100k requests/day): ~$30-50/month

Optimization tips:
1. Keep `min-instances=0` to scale to zero when idle
2. Use CDN (Cloud CDN) for static assets
3. Enable CPU allocation only during request processing
4. Monitor with Cloud Monitoring (free tier)

---

## Monitoring

### Set up uptime checks

```bash
gcloud monitoring uptime-checks create https newsletter-uptime \
  --display-name="Newsletter Uptime Check" \
  --resource-type=uptime-url \
  --monitored-resource-type=uptime-url \
  --host=$SERVICE_URL \
  --path=/
```

### View metrics

```bash
# Request count
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_count"'

# Latency
gcloud monitoring time-series list \
  --filter='metric.type="run.googleapis.com/request_latencies"'
```

---

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Cloud Build Documentation](https://cloud.google.com/build/docs)
- [Firebase + Cloud Run Integration](https://firebase.google.com/docs/hosting/cloud-run)
- [Cloud Run Pricing Calculator](https://cloud.google.com/products/calculator)

---

## Quick Reference

### Secret Manager Scripts

```bash
# Setup secrets (one-time)
./scripts/setup-secrets.sh

# Verify secrets are configured correctly
./scripts/verify-secrets.sh

# Update existing secrets
./scripts/update-secrets.sh
```

### Deployment Commands

```bash
# Deploy to Cloud Run
gcloud builds submit --config=cloudbuild.yaml

# Get service URL
gcloud run services describe newsletter --region=us-west1 --format="value(status.url)"

# View logs
gcloud run services logs read newsletter --region=us-west1

# Update service configuration
gcloud run services update newsletter --region=us-west1 --memory=1Gi

# Delete service
gcloud run services delete newsletter --region=us-west1
```

### Build Management

```bash
# List all builds
gcloud builds list --limit=10

# Stream build logs
gcloud builds log --stream

# View specific build log
gcloud builds log <BUILD_ID>
```

### Secret Management

```bash
# List all secrets
gcloud secrets list --project=newsletter-b104f

# View secret versions
gcloud secrets versions list VITE_FIREBASE_API_KEY --project=newsletter-b104f

# Access secret value (requires permission)
gcloud secrets versions access latest --secret=VITE_FIREBASE_API_KEY --project=newsletter-b104f

# Delete a secret (use with caution!)
gcloud secrets delete VITE_FIREBASE_API_KEY --project=newsletter-b104f
```

---

**Support**: For issues specific to this deployment, check Cloud Build and Cloud Run logs. For Firebase issues, check Firebase Console.
