#!/bin/bash

# Update Google Secret Manager secrets for InNews Newsletter Platform
# This script updates existing secrets with new versions
# Usage: ./scripts/update-secrets.sh

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

echo -e "${BLUE}🔄 Updating Google Secret Manager secrets${NC}"
echo ""

# Check if .env file exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}❌ Error: $ENV_FILE file not found${NC}"
  echo "Please create a .env file with your updated environment variables"
  exit 1
fi

# Source environment variables
echo -e "${YELLOW}📖 Loading environment variables from $ENV_FILE...${NC}"
set -a
source "$ENV_FILE"
set +a
echo ""

# Function to update a secret
update_secret() {
  local SECRET_NAME=$1
  local SECRET_VALUE=$2

  if [ -z "$SECRET_VALUE" ]; then
    echo -e "${YELLOW}⏭️  Skipping $SECRET_NAME (empty value)${NC}"
    return
  fi

  if gcloud secrets describe "$SECRET_NAME" --project="$PROJECT_ID" &>/dev/null; then
    echo -e "${BLUE}📝 Updating secret: $SECRET_NAME${NC}"
    echo "$SECRET_VALUE" | gcloud secrets versions add "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=-

    # Get new version number
    NEW_VERSION=$(gcloud secrets versions list "$SECRET_NAME" --project="$PROJECT_ID" --limit=1 --format="value(name)")
    echo -e "${GREEN}✅ Updated: $SECRET_NAME (new version: $NEW_VERSION)${NC}"
  else
    echo -e "${YELLOW}⚠️  Secret $SECRET_NAME doesn't exist yet${NC}"
    echo -e "${BLUE}   Creating new secret: $SECRET_NAME${NC}"
    echo "$SECRET_VALUE" | gcloud secrets create "$SECRET_NAME" \
      --project="$PROJECT_ID" \
      --data-file=- \
      --replication-policy="automatic"
    echo -e "${GREEN}✅ Created: $SECRET_NAME${NC}"
  fi
}

# Update Firebase secrets
echo -e "${BLUE}📱 Updating Firebase configuration secrets...${NC}"
update_secret "VITE_FIREBASE_API_KEY" "$VITE_FIREBASE_API_KEY"
update_secret "VITE_FIREBASE_AUTH_DOMAIN" "$VITE_FIREBASE_AUTH_DOMAIN"
update_secret "VITE_FIREBASE_PROJECT_ID" "$VITE_FIREBASE_PROJECT_ID"
update_secret "VITE_FIREBASE_STORAGE_BUCKET" "$VITE_FIREBASE_STORAGE_BUCKET"
update_secret "VITE_FIREBASE_MESSAGING_SENDER_ID" "$VITE_FIREBASE_MESSAGING_SENDER_ID"
update_secret "VITE_FIREBASE_APP_ID" "$VITE_FIREBASE_APP_ID"
echo ""

# Update backend secrets
echo -e "${BLUE}📧 Updating backend email configuration secrets...${NC}"
update_secret "GMAIL_USER" "$GMAIL_USER"
update_secret "GMAIL_APP_PASSWORD" "$GMAIL_APP_PASSWORD"
update_secret "ADMIN_EMAIL" "$ADMIN_EMAIL"
echo ""

# Update optional secrets
echo -e "${BLUE}🔑 Updating optional secrets...${NC}"
update_secret "JWT_SECRET" "$JWT_SECRET"
update_secret "OPENROUTER_API_KEY" "$OPENROUTER_API_KEY"
echo ""

echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Secrets updated successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "${BLUE}ℹ️  Note about previous versions:${NC}"
echo "Previous secret versions are preserved and can be used for rollback."
echo ""
echo -e "${YELLOW}To rollback a secret to a previous version:${NC}"
echo "  gcloud secrets versions list SECRET_NAME --project=$PROJECT_ID"
echo "  # Find the version you want, then in cloudbuild.yaml change:"
echo "  # versionName: projects/\$PROJECT_ID/secrets/SECRET_NAME/versions/VERSION_NUMBER"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "1. Verify secrets: ./scripts/verify-secrets.sh"
echo "2. Deploy with updated secrets: gcloud builds submit --config=cloudbuild.yaml"
echo ""
