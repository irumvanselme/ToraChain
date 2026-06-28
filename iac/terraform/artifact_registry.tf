resource "google_artifact_registry_repository" "tora" {
  project       = var.project_id
  location      = var.region
  repository_id = "tora-chain"
  format        = "DOCKER"
  description   = "ToraChain container images"

  depends_on = [google_project_service.apis]
}
