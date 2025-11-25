# Project Configuration
variable "project_id" {
  description = "GCP Project ID"
  type        = string
  default     = "clearly-478614"
}

variable "region" {
  description = "GCP region for Cloud Run deployment"
  type        = string
  default     = "us-west1"
}

variable "functions_region" {
  description = "GCP region for Cloud Functions"
  type        = string
  default     = "us-central1"
}

# Cloud Run Configuration
variable "service_name" {
  description = "Cloud Run service name"
  type        = string
  default     = "newsletter"
}

variable "container_image" {
  description = "Container image URL (will be updated by Cloud Build)"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}

variable "cloud_run_memory" {
  description = "Memory limit for Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "cloud_run_cpu" {
  description = "CPU limit for Cloud Run service"
  type        = string
  default     = "1"
}

variable "cloud_run_min_instances" {
  description = "Minimum number of Cloud Run instances"
  type        = number
  default     = 0
}

variable "cloud_run_max_instances" {
  description = "Maximum number of Cloud Run instances"
  type        = number
  default     = 10
}

variable "cloud_run_port" {
  description = "Container port for Cloud Run service"
  type        = number
  default     = 8080
}

# Firebase Frontend Secrets
variable "vite_firebase_api_key" {
  description = "Firebase API Key for frontend"
  type        = string
  sensitive   = true
}

variable "vite_firebase_auth_domain" {
  description = "Firebase Auth Domain for frontend"
  type        = string
  sensitive   = true
}

variable "vite_firebase_storage_bucket" {
  description = "Firebase Storage Bucket for frontend"
  type        = string
  sensitive   = true
}

variable "vite_firebase_messaging_sender_id" {
  description = "Firebase Messaging Sender ID for frontend"
  type        = string
  sensitive   = true
}

variable "vite_firebase_app_id" {
  description = "Firebase App ID for frontend"
  type        = string
  sensitive   = true
}

# Service Account Configuration
variable "compute_service_account" {
  description = "Existing Compute Engine service account email"
  type        = string
  default     = "1019651592490-compute@developer.gserviceaccount.com"
}

# Backend Email Configuration
variable "gmail_user" {
  description = "Gmail user for SMTP sending"
  type        = string
  default     = "jsong@koreatous.com"
}

variable "gmail_app_password" {
  description = "Gmail app password for SMTP"
  type        = string
  sensitive   = true
}

variable "admin_email" {
  description = "Admin email address"
  type        = string
  default     = "jsong@koreatous.com"
}

# Artifact Registry
variable "artifact_registry_repository" {
  description = "Artifact Registry repository name"
  type        = string
  default     = "newsletter"
}

variable "artifact_registry_location" {
  description = "Artifact Registry location"
  type        = string
  default     = "us-west1"
}

# Cloud Build
variable "enable_cloud_build_trigger" {
  description = "Enable automated Cloud Build trigger"
  type        = bool
  default     = false
}

variable "repository_uri" {
  description = "Source repository URI for Cloud Build trigger"
  type        = string
  default     = ""
}

variable "branch_name" {
  description = "Branch name for Cloud Build trigger"
  type        = string
  default     = "main"
}

# Tags
variable "labels" {
  description = "Labels to apply to resources"
  type        = map(string)
  default = {
    app         = "newsletter"
    managed_by  = "terraform"
    environment = "production"
  }
}
