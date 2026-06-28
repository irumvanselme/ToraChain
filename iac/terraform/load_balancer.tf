# ── Static external IP ────────────────────────────────────────────────────────

resource "google_compute_global_address" "tora" {
  project = var.project_id
  name    = "tora-chain-ip"
}

# ── Google-managed SSL certificate (covers every hostname) ────────────────────

resource "google_compute_managed_ssl_certificate" "tora" {
  project = var.project_id
  name    = "tora-chain-ssl"

  managed {
    # Sort for deterministic plan output; GCP validates each domain via DNS.
    domains = sort(keys(local.host_to_svc))
  }
}

# ── Serverless NEGs — one per Cloud Run service ───────────────────────────────

resource "google_compute_region_network_endpoint_group" "negs" {
  for_each = local.services

  project               = var.project_id
  name                  = "neg-${each.value.cr_name}"
  network_endpoint_type = "SERVERLESS"
  region                = var.region

  cloud_run {
    service = google_cloud_run_v2_service.services[each.key].name
  }
}

# ── Backend services — one per Cloud Run service ──────────────────────────────

resource "google_compute_backend_service" "backends" {
  for_each = local.services

  project               = var.project_id
  name                  = "bs-${each.value.cr_name}"
  protocol              = "HTTP"
  load_balancing_scheme = "EXTERNAL_MANAGED"

  backend {
    group = google_compute_region_network_endpoint_group.negs[each.key].id
  }
}

# ── URL map — host-based routing to the right backend ────────────────────────

resource "google_compute_url_map" "tora" {
  project = var.project_id
  name    = "tora-chain-urlmap"

  # voting_fe is the public-facing default (serves the root domain too)
  default_service = google_compute_backend_service.backends["voting_fe"].id

  dynamic "host_rule" {
    for_each = local.svc_to_hosts
    content {
      hosts        = host_rule.value
      path_matcher = replace(host_rule.key, "_", "-")
    }
  }

  dynamic "path_matcher" {
    for_each = local.services
    content {
      name            = replace(path_matcher.key, "_", "-")
      default_service = google_compute_backend_service.backends[path_matcher.key].id
    }
  }
}

# ── HTTPS proxy + forwarding rule ─────────────────────────────────────────────

resource "google_compute_target_https_proxy" "tora" {
  project          = var.project_id
  name             = "tora-chain-https-proxy"
  url_map          = google_compute_url_map.tora.id
  ssl_certificates = [google_compute_managed_ssl_certificate.tora.id]
}

resource "google_compute_global_forwarding_rule" "https" {
  project               = var.project_id
  name                  = "tora-chain-https"
  ip_address            = google_compute_global_address.tora.address
  port_range            = "443"
  target                = google_compute_target_https_proxy.tora.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}

# ── HTTP → HTTPS redirect ─────────────────────────────────────────────────────

resource "google_compute_url_map" "http_redirect" {
  project = var.project_id
  name    = "tora-chain-http-redirect"

  default_url_redirect {
    redirect_response_code = "MOVED_PERMANENTLY_DEFAULT"
    https_redirect         = true
    strip_query            = false
  }
}

resource "google_compute_target_http_proxy" "tora" {
  project = var.project_id
  name    = "tora-chain-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  project               = var.project_id
  name                  = "tora-chain-http"
  ip_address            = google_compute_global_address.tora.address
  port_range            = "80"
  target                = google_compute_target_http_proxy.tora.id
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
