locals {
  gcp_apis = [
    "run.googleapis.com",
    "compute.googleapis.com",
    "dns.googleapis.com",
    "artifactregistry.googleapis.com",
  ]
}

resource "google_project_service" "apis" {
  for_each = toset(local.gcp_apis)

  project                    = var.project_id
  service                    = each.value
  disable_on_destroy         = false
  disable_dependent_services = false
}
