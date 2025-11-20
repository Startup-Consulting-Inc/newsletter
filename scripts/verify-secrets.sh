#!/bin/bash

# Verify Google Secret Manager secrets for InNews Newsletter Platform
# This script checks that all required secrets exist and have proper permissions
# Usage: ./scripts/verify-secrets.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ID="clearly-478614"

echo -e "${BLUE}🔍 Verifying Google Secret Manager configuration${NC}"
echo ""

# Required secrets for frontend build (Cloud Build)
REQUIRED_SECRETS=(
  "VITE_FIREBASE_API_KEY"
  "VITE_FIREBASE_AUTH_DOMAIN"
  "VITE_FIREBASE_PROJECT_ID"
  "VITE_FIREBASE_STORAGE_BUCKET"
  "VITE_FIREBASE_MESSAGING_SENDER_ID"
  "VITE_FIREBASE_APP_ID"
)

# Optional secrets (backend/runtime)
OPTIONAL_SECRETS=(
  "GMAIL_USER"
  "GMAIL_APP_PASSWORD"
  "ADMIN_EMAIL"
  "JWT_SECRET"
  "OPENROUTER_API_KEY"
)

# Track results
MISSING_SECRETS=()
EXISTING_SECRETS=()
PERMISSION_ISSUES=()

# Check required secrets
echo -e "${BLUE}📋 Checking required secrets...${NC}"
for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" &>/dev/null; then
    VERSION=$(gcloud secrets versions list "$SECRET" --project="$PROJECT_ID" --limit=1 --format="value(name)" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ $SECRET${NC} (version: $VERSION)"
    EXISTING_SECRETS+=("$SECRET")
  else
    echo -e "${RED}❌ $SECRET${NC} - NOT FOUND"
    MISSING_SECRETS+=("$SECRET")
  fi
done
echo ""

# Check optional secrets
echo -e "${BLUE}📋 Checking optional secrets...${NC}"
for SECRET in "${OPTIONAL_SECRETS[@]}"; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT_ID" &>/dev/null; then
    VERSION=$(gcloud secrets versions list "$SECRET" --project="$PROJECT_ID" --limit=1 --format="value(name)" 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ $SECRET${NC} (version: $VERSION)"
    EXISTING_SECRETS+=("$SECRET")
  else
    echo -e "${YELLOW}⚠️  $SECRET${NC} - not found (optional)"
  fi
done
echo ""

# Check Cloud Build permissions
echo -e "${BLUE}🔐 Checking Cloud Build service account permissions...${NC}"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")
CLOUD_BUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

for SECRET in "${EXISTING_SECRETS[@]}"; do
  if gcloud secrets get-iam-policy "$SECRET" --project="$PROJECT_ID" \
     --flatten="bindings[].members" \
     --filter="bindings.members:serviceAccount:${CLOUD_BUILD_SA}" &>/dev/null; then
    echo -e "${GREEN}✅ $SECRET${NC} - Cloud Build has access"
  else
    echo -e "${RED}❌ $SECRET${NC} - Cloud Build does NOT have access"
    PERMISSION_ISSUES+=("$SECRET")
  fi
done
echo ""

# Summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📊 Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo -e "Project: ${YELLOW}$PROJECT_ID${NC}"
echo -e "Cloud Build SA: ${YELLOW}$CLOUD_BUILD_SA${NC}"
echo ""

if [ ${#MISSING_SECRETS[@]} -eq 0 ] && [ ${#PERMISSION_ISSUES[@]} -eq 0 ]; then
  echo -e "${GREEN}✅ All required secrets exist and have proper permissions!${NC}"
  echo ""
  echo -e "${BLUE}You're ready to deploy:${NC}"
  echo "  gcloud builds submit --config=cloudbuild.yaml"
  echo ""
  exit 0
else
  if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required secrets (${#MISSING_SECRETS[@]}):${NC}"
    for SECRET in "${MISSING_SECRETS[@]}"; do
      echo "  - $SECRET"
    done
    echo ""
    echo -e "${YELLOW}To fix: Run ./scripts/setup-secrets.sh${NC}"
    echo ""
  fi

  if [ ${#PERMISSION_ISSUES[@]} -gt 0 ]; then
    echo -e "${RED}❌ Secrets with permission issues (${#PERMISSION_ISSUES[@]}):${NC}"
    for SECRET in "${PERMISSION_ISSUES[@]}"; do
      echo "  - $SECRET"
    done
    echo ""
    echo -e "${YELLOW}To fix: Run these commands:${NC}"
    echo ""
    for SECRET in "${PERMISSION_ISSUES[@]}"; do
      echo "gcloud secrets add-iam-policy-binding $SECRET \\"
      echo "  --project=$PROJECT_ID \\"
      echo "  --member=\"serviceAccount:$CLOUD_BUILD_SA\" \\"
      echo "  --role=\"roles/secretmanager.secretAccessor\""
      echo ""
    done
  fi

  exit 1
fi
