#!/bin/bash

# Setup Google Secret Manager secrets for InNews Newsletter Platform
# This script creates all required secrets and grants Cloud Build access
# Usage: ./scripts/setup-secrets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="clearly-478614"
ENV_FILE=".env"

echo -e "${BLUE}🔐 Setting up Google Secret Manager for InNews Newsletter Platform${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Error: $ENV_FILE file not found${NC}"
  echo "Please create a .env file with your environment variables"
  exit 1
fi

# Source environment variables
echo -e "${YELLOW}📖 Loading environment variables from $ENV_FILE...${NC}"
set -a
source "$ENV_FILE"
set +a

# Check if required variables are set
REQUIRED_VARS=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID"
  "VITE_FIREBASE_APP_ID"
)

MISSING_VARS=()
for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}❌ Error: Missing required environment variables:${NC}"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "  - $VAR"
  done
  exit 1
fi

echo -e "${GREEN}✅ All required environment variables found${NC}"
echo ""

# Function to create or update a secret
create_or_update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2

  if [ -z "$SECRET_VALUE" ]; then
    echo -e "${YELLOW}⚠️  Skipping $SECRET_NAME (empty value)${NC}"
    return
  fi

  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${YELLOW}📝 Updating existing secret: $SECRET_NAME${NC}"
    echo "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=-
    echo -e "${GREEN}✅ Updated: $SECRET_NAME${NC}"
  else
    echo -e "${BLUE}🆕 Creating new secret: $SECRET_NAME${NC}"
    echo "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=- \
      --replication-policy="automatic"
    echo -e "${GREEN}✅ Created: $SECRET_NAME${NC}"
  fi
}

# Create/update Firebase secrets (required for frontend build)
echo -e "${BLUE}📱 Setting up Firebase configuration secrets...${NC}"
create_or_update_secret "VITE_FIREBASE_API_KEY" "$VITE_FIREBASE_API_KEY"
create_or_update_secret "VITE_FIREBASE_AUTH_DOMAIN" "$VITE_FIREBASE_AUTH_DOMAIN"
create_or_update_secret "VITE_FIREBASE_PROJECT_ID" "$VITE_FIREBASE_PROJECT_ID"
create_or_update_secret "VITE_FIREBASE_STORAGE_BUCKET" "$VITE_FIREBASE_STORAGE_BUCKET"
create_or_update_secret "VITE_FIREBASE_MESSAGING_SENDER_ID" "$VITE_FIREBASE_MESSAGING_SENDER_ID"
create_or_update_secret "VITE_FIREBASE_APP_ID" "$VITE_FIREBASE_APP_ID"
echo ""

# Create/update backend secrets (for Cloud Functions)
echo -e "${BLUE}📧 Setting up backend email configuration secrets...${NC}"
create_or_update_secret "GMAIL_USER" "$GMAIL_USER"
create_or_update_secret "GMAIL_APP_PASSWORD" "$GMAIL_APP_PASSWORD"
create_or_update_secret "ADMIN_EMAIL" "$ADMIN_EMAIL"
echo ""

# Create/update optional secrets (if defined)
echo -e "${BLUE}🔑 Setting up optional secrets...${NC}"
create_or_update_secret "JWT_SECRET" "$JWT_SECRET"
create_or_update_secret "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
echo ""

# Grant Cloud Build service account access to all secrets
echo -e "${BLUE}🔐 Granting Cloud Build access to secrets...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

ALL_SECRETS=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID"
  "VITE_FIREBASE_APP_ID"
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
  "ADMIN_EMAIL"
  "JWT_SECRET"
  "OPENROUTER_API_KEY"
)

for SECRET in "${ALL_SECRETS[@]}"; do
  # Check if secret exists before granting access
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" &>/dev/null; then
    # Check if permission already exists
    if gcloud secrets get-iam-policy "$SECRET" --project="$PROJECT_ID" \
       --flatten="bindings[].members" \
       --filter="bindings.members:serviceAccount:${CLOUD_BUILD_SA}" &>/dev/null; then
      echo -e "${YELLOW}⏭️  $SECRET: Cloud Build already has access${NC}"
    else
      gcloud secrets add-iam-policy-binding "$SECRET" \
        --project="$PROJECT_ID" \
        --member="serviceAccount:${CLOUD_BUILD_SA}" \
        --role="roles/secretmanager.secretAccessor" \
        &>/dev/null
      echo -e "${GREEN}✅ Granted access: $SECRET${NC}"
    fi
  fi
done

echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Secret Manager setup complete!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify secrets: ./scripts/verify-secrets.sh"
echo "2. Deploy to Cloud Run: gcloud builds submit --config=cloudbuild.yaml"
echo ""
