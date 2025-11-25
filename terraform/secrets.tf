# Secret Manager Secrets for Newsletter Application
#
# Frontend secrets are used at BUILD TIME by Cloud Build to bake Firebase config
# into the static React/Vite bundle. Cloud Run does NOT need runtime access to these.
#
# Backend secrets are used by Cloud Functions for SMTP email sending.

# Frontend Firebase Configuration Secrets (Build-Time Only)
resource "google_secret_manager_secret" "vite_firebase_api_key" {
  secret_id = "VITE_FIREBASE_API_KEY"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "vite_firebase_api_key" {
  secret      = google_secret_manager_secret.vite_firebase_api_key.id
  secret_data = var.vite_firebase_api_key
}

resource "google_secret_manager_secret" "vite_firebase_auth_domain" {
  secret_id = "VITE_FIREBASE_AUTH_DOMAIN"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "vite_firebase_auth_domain" {
  secret      = google_secret_manager_secret.vite_firebase_auth_domain.id
  secret_data = var.vite_firebase_auth_domain
}

resource "google_secret_manager_secret" "vite_firebase_storage_bucket" {
  secret_id = "VITE_FIREBASE_STORAGE_BUCKET"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "vite_firebase_storage_bucket" {
  secret      = google_secret_manager_secret.vite_firebase_storage_bucket.id
  secret_data = var.vite_firebase_storage_bucket
}

resource "google_secret_manager_secret" "vite_firebase_messaging_sender_id" {
  secret_id = "VITE_FIREBASE_MESSAGING_SENDER_ID"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "vite_firebase_messaging_sender_id" {
  secret      = google_secret_manager_secret.vite_firebase_messaging_sender_id.id
  secret_data = var.vite_firebase_messaging_sender_id
}

resource "google_secret_manager_secret" "vite_firebase_app_id" {
  secret_id = "VITE_FIREBASE_APP_ID"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "vite_firebase_app_id" {
  secret      = google_secret_manager_secret.vite_firebase_app_id.id
  secret_data = var.vite_firebase_app_id
}

# Backend Email Configuration Secrets
resource "google_secret_manager_secret" "gmail_user" {
  secret_id = "GMAIL_USER"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "gmail_user" {
  secret      = google_secret_manager_secret.gmail_user.id
  secret_data = var.gmail_user
}

resource "google_secret_manager_secret" "gmail_app_password" {
  secret_id = "GMAIL_APP_PASSWORD"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "gmail_app_password" {
  secret      = google_secret_manager_secret.gmail_app_password.id
  secret_data = var.gmail_app_password
}

resource "google_secret_manager_secret" "admin_email" {
  secret_id = "ADMIN_EMAIL"
  labels    = var.labels

  replication {
    auto {}
  }

  depends_on = [google_project_service.secret_manager]
}

resource "google_secret_manager_secret_version" "admin_email" {
  secret      = google_secret_manager_secret.admin_email.id
  secret_data = var.admin_email
}

# IAM bindings for secrets access
#
# Compute Engine service account needs access to frontend secrets for build-time injection
# This is the existing service account already used by Cloud Build and Cloud Run
resource "google_secret_manager_secret_iam_member" "compute_vite_firebase_api_key" {
  secret_id = google_secret_manager_secret.vite_firebase_api_key.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "compute_vite_firebase_auth_domain" {
  secret_id = google_secret_manager_secret.vite_firebase_auth_domain.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "compute_vite_firebase_storage_bucket" {
  secret_id = google_secret_manager_secret.vite_firebase_storage_bucket.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "compute_vite_firebase_messaging_sender_id" {
  secret_id = google_secret_manager_secret.vite_firebase_messaging_sender_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "compute_vite_firebase_app_id" {
  secret_id = google_secret_manager_secret.vite_firebase_app_id.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

# Backend secrets for Cloud Functions
# Using Compute Engine service account for secret access
resource "google_secret_manager_secret_iam_member" "functions_gmail_user" {
  secret_id = google_secret_manager_secret.gmail_user.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "functions_gmail_app_password" {
  secret_id = google_secret_manager_secret.gmail_app_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}

resource "google_secret_manager_secret_iam_member" "functions_admin_email" {
  secret_id = google_secret_manager_secret.admin_email.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.compute_service_account}"
}
