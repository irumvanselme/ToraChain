resource "google_cloud_run_v2_service" "services" {
  for_each = local.services

  project  = var.project_id
  location = var.region
  name     = each.value.cr_name

  deletion_protection = false

  # Allow the LB (and direct Cloud Run URLs) to reach the service.
  # Tighten to INGRESS_TRAFFIC_INTERNAL_LOAD_BALANCER once the LB is verified.
  ingress = "INGRESS_TRAFFIC_ALL"

  template {
    scaling {
      min_instance_count = each.value.min_instances
      max_instance_count = each.value.max_instances
    }

    containers {
      image = "${local.ar_base}/${each.value.image_name}:${lookup(var.image_tags, each.key, "latest")}"

      ports {
        container_port = each.value.port
      }

      resources {
        limits = {
          cpu    = each.value.cpu
          memory = each.value.memory
        }
        # Allow CPU to burst during request processing; idle scales to 0 cost.
        cpu_idle = true
      }

      # Non-sensitive env vars from the service definition
      dynamic "env" {
        for_each = each.value.env
        content {
          name  = env.key
          value = env.value
        }
      }

      # Sensitive env vars injected per service
      dynamic "env" {
        for_each = each.key == "auth" ? {
          BETTER_AUTH_SECRET   = var.auth_secrets.better_auth_secret
          AUTH_DB_URI = var.auth_secrets.auth_db_uri
        } : {}
        content {
          name  = env.key
          value = env.value
        }
      }

      dynamic "env" {
        for_each = each.key == "backend" ? {
          ELECTIONS_DB_URI = var.backend_secrets.elections_db_uri
        } : {}
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  depends_on = [google_project_service.apis]
}

# Allow unauthenticated invocations so the load balancer can forward traffic.
resource "google_cloud_run_v2_service_iam_member" "public_invoker" {
  for_each = google_cloud_run_v2_service.services

  project  = var.project_id
  location = var.region
  name     = each.value.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
