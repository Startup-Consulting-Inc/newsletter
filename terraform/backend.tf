# Remote state configuration for Google Cloud Storage
#
# To use this backend:
# 1. Create a GCS bucket: gsutil mb gs://clearly-478614-terraform-state
# 2. Enable versioning: gsutil versioning set on gs://clearly-478614-terraform-state
# 3. Uncomment the backend block below
# 4. Run: terraform init -migrate-state

# terraform {
#   backend "gcs" {
#     bucket  = "clearly-478614-terraform-state"
#     prefix  = "newsletter/state"
#   }
# }

# For initial setup, local backend is used.
# After creating the GCS bucket, uncomment the above block and run:
# terraform init -migrate-state
