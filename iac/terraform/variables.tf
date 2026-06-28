variable "project_id" {
  description = "GCP project ID where all resources are created"
  type        = string
}

variable "region" {
  description = "GCP region for Cloud Run services and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "image_tags" {
  description = "Docker image tag per service. Keys must match the service keys in locals.tf."
  type        = map(string)
  default = {
    admin_fe    = "latest"
    auditing_fe = "latest"
    auth        = "latest"
    backend     = "latest"
    chain_node  = "latest"
    tracability = "latest"
    voting_fe   = "latest"
  }
}

# ── Sensitive service configuration ──────────────────────────────────────────
# Store these as sensitive workspace variables in HCP Terraform, never in
# terraform.tfvars committed to the repo.

variable "auth_secrets" {
  description = "Secrets injected into the auth (idp) Cloud Run service"
  type = object({
    better_auth_secret = string
    auth_db_uri        = string
  })
  sensitive = true
}

variable "backend_secrets" {
  description = "Secrets injected into the backend (api) Cloud Run service"
  type = object({
    elections_db_uri = string
  })
  sensitive = true
}
