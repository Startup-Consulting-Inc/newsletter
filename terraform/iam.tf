# Service Accounts and IAM Configuration
#
# NOTE: Using existing Compute Engine service account instead of creating new ones
# Service Account: 1019651592490-compute@developer.gserviceaccount.com
#
# This account already has the necessary permissions for:
# - Cloud Build (build-time secret access)
# - Cloud Run (serving static files)
# - Artifact Registry (image storage)
#
# If you need to create custom service accounts in the future, uncomment the resources below:

# # Cloud Run service account
# # Used for serving static React/Vite app (nginx) - only needs logging/monitoring
# resource "google_service_account" "cloud_run" {
#   account_id   = "newsletter-cloud-run"
#   display_name = "Newsletter Cloud Run Service Account"
#   description  = "Service account for Cloud Run newsletter service (static file serving)"
# }
#
# # Cloud Build service account
# # Needs secret access for build-time Firebase config injection into static bundle
# resource "google_service_account" "cloud_build" {
#   account_id   = "newsletter-cloud-build"
#   display_name = "Newsletter Cloud Build Service Account"
#   description  = "Service account for Cloud Build operations (build-time secret access)"
# }
#
# # IAM roles for Cloud Build service account
# resource "google_project_iam_member" "cloud_build_run_admin" {
#   project = var.project_id
#   role    = "roles/run.admin"
#   member  = "serviceAccount:${google_service_account.cloud_build.email}"
# }
#
# resource "google_project_iam_member" "cloud_build_storage_admin" {
#   project = var.project_id
#   role    = "roles/storage.admin"
#   member  = "serviceAccount:${google_service_account.cloud_build.email}"
# }
#
# resource "google_project_iam_member" "cloud_build_logs_writer" {
#   project = var.project_id
#   role    = "roles/logging.logWriter"
#   member  = "serviceAccount:${google_service_account.cloud_build.email}"
# }
#
# resource "google_project_iam_member" "cloud_build_artifact_registry_admin" {
#   project = var.project_id
#   role    = "roles/artifactregistry.admin"
#   member  = "serviceAccount:${google_service_account.cloud_build.email}"
# }
#
# # Allow Cloud Build to act as Cloud Run service account
# resource "google_service_account_iam_member" "cloud_build_act_as_cloud_run" {
#   service_account_id = google_service_account.cloud_run.name
#   role               = "roles/iam.serviceAccountUser"
#   member             = "serviceAccount:${google_service_account.cloud_build.email}"
# }
#
# # IAM roles for Cloud Run service account
# resource "google_project_iam_member" "cloud_run_logging" {
#   project = var.project_id
#   role    = "roles/logging.logWriter"
#   member  = "serviceAccount:${google_service_account.cloud_run.email}"
# }
#
# resource "google_project_iam_member" "cloud_run_monitoring" {
#   project = var.project_id
#   role    = "roles/monitoring.metricWriter"
#   member  = "serviceAccount:${google_service_account.cloud_run.email}"
# }
#
# # Grant Cloud Build service account permission to use its own service account
# resource "google_service_account_iam_member" "cloud_build_self" {
#   service_account_id = google_service_account.cloud_build.name
#   role               = "roles/iam.serviceAccountUser"
#   member             = "serviceAccount:${google_service_account.cloud_build.email}"
# }
