terraform {
  required_version = ">= 1.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 6.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Enable required APIs
resource "google_project_service" "cloud_run" {
  service            = "run.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "artifact_registry" {
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "secret_manager" {
  service            = "secretmanager.googleapis.com"
  disable_on_destroy = false
}

resource "google_project_service" "cloud_build" {
  service            = "cloudbuild.googleapis.com"
  disable_on_destroy = false
}

# Artifact Registry repository for container images
resource "google_artifact_registry_repository" "newsletter" {
  location      = var.artifact_registry_location
  repository_id = var.artifact_registry_repository
  description   = "Docker repository for newsletter application"
  format        = "DOCKER"
  labels        = var.labels

  depends_on = [google_project_service.artifact_registry]
}

# Cloud Run service
resource "google_cloud_run_v2_service" "newsletter" {
  name     = var.service_name
  location = var.region
  labels   = var.labels

  template {
    scaling {
      min_instance_count = var.cloud_run_min_instances
      max_instance_count = var.cloud_run_max_instances
    }

    containers {
      image = var.container_image

      ports {
        container_port = var.cloud_run_port
      }

      resources {
        limits = {
          cpu    = var.cloud_run_cpu
          memory = var.cloud_run_memory
        }
      }

      # Note: Firebase config is baked into the static bundle at build time
      # No runtime environment variables needed for static React/Vite app
    }

    # Service account for logging and monitoring (using existing Compute Engine SA)
    service_account = var.compute_service_account
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  depends_on = [
    google_project_service.cloud_run,
  ]
}

# Allow public access to Cloud Run service
resource "google_cloud_run_v2_service_iam_member" "public_access" {
  location = google_cloud_run_v2_service.newsletter.location
  name     = google_cloud_run_v2_service.newsletter.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
