# Terraform Outputs

output "cloud_run_url" {
  description = "URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.newsletter.uri
}

output "cloud_run_service_name" {
  description = "Name of the Cloud Run service"
  value       = google_cloud_run_v2_service.newsletter.name
}

output "artifact_registry_repository" {
  description = "Artifact Registry repository URL"
  value       = "${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.newsletter.repository_id}"
}

output "compute_service_account_email" {
  description = "Email of the Compute Engine service account used for Cloud Build and Cloud Run"
  value       = var.compute_service_account
}

output "secret_manager_secrets" {
  description = "List of created Secret Manager secrets"
  value = {
    frontend = [
      google_secret_manager_secret.vite_firebase_api_key.secret_id,
      google_secret_manager_secret.vite_firebase_auth_domain.secret_id,
      google_secret_manager_secret.vite_firebase_storage_bucket.secret_id,
      google_secret_manager_secret.vite_firebase_messaging_sender_id.secret_id,
      google_secret_manager_secret.vite_firebase_app_id.secret_id,
    ]
    backend = [
      google_secret_manager_secret.gmail_user.secret_id,
      google_secret_manager_secret.gmail_app_password.secret_id,
      google_secret_manager_secret.admin_email.secret_id,
    ]
  }
}

output "project_id" {
  description = "GCP Project ID"
  value       = var.project_id
}

output "region" {
  description = "GCP region"
  value       = var.region
}

output "deployment_instructions" {
  description = "Next steps after Terraform deployment"
  value = <<-EOT

    ═══════════════════════════════════════════════════════════════
    Newsletter Service Infrastructure Deployed Successfully!
    ═══════════════════════════════════════════════════════════════

    🌐 Service URL: ${google_cloud_run_v2_service.newsletter.uri}
    📦 Container Registry: ${var.artifact_registry_location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.newsletter.repository_id}

    Next Steps:

    1. Build and Deploy Container Image:
       gcloud builds submit --config=cloudbuild.yaml

    2. Deploy Firebase Resources:
       firebase deploy --only firestore:indexes,firestore:rules,storage,functions

    3. Verify Deployment:
       curl ${google_cloud_run_v2_service.newsletter.uri}

    4. Monitor Logs:
       gcloud run logs tail ${google_cloud_run_v2_service.newsletter.name} --region=${var.region}

    ═══════════════════════════════════════════════════════════════
  EOT
}
