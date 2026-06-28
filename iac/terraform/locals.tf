locals {
  domain  = "tora-chain-demo.iansel.me"
  ar_base = "${var.region}-docker.pkg.dev/${var.project_id}/tora-chain"
}

locals {
  services = {
    admin_fe = {
      cr_name       = "tora-admin-fe"
      image_name    = "admin-fe"
      port          = 8080
      subdomains    = ["admin"]
      min_instances = 0
      max_instances = 3
      cpu           = "1"
      memory        = "512Mi"
      env           = {}
    }

    auditing_fe = {
      cr_name       = "tora-auditing-fe"
      image_name    = "auditing-fe"
      port          = 8080
      subdomains    = ["auditing"]
      min_instances = 0
      max_instances = 3
      cpu           = "1"
      memory        = "512Mi"
      env = {
        NEXT_PUBLIC_API_URL  = "https://api.${local.domain}"
        NEXT_PUBLIC_AUTH_URL = "https://idp.${local.domain}"
      }
    }

    auth = {
      cr_name    = "tora-auth"
      image_name = "auth"
      port       = 8080
      subdomains = ["idp"]
      # Keep at least one instance warm — cold-start latency on auth is noticeable.
      min_instances = 1
      max_instances = 5
      cpu           = "1"
      memory        = "512Mi"
      env = {
        BETTER_AUTH_URL = "https://idp.${local.domain}"
        TRUSTED_ORIGINS = join(",", [
          "https://${local.domain}",
          "https://admin.${local.domain}",
          "https://auditing.${local.domain}",
          "https://voting.${local.domain}",
        ])
      }
    }

    backend = {
      cr_name       = "tora-backend"
      image_name    = "backend"
      port          = 8080
      subdomains    = ["api"]
      min_instances = 0
      max_instances = 5
      cpu           = "1"
      memory        = "512Mi"
      env = {
        AUTH_URL       = "https://idp.${local.domain}"
        CHAIN_NODE_URL = "https://node.${local.domain}"
      }
    }

    # chain-node master only.  Workers use SQLite + persistent WebSocket which
    # don't map cleanly to Cloud Run's ephemeral model; run workers locally or
    # on a VM pointing their --master-url at https://node.<domain>.
    chain_node = {
      cr_name    = "tora-chain-node"
      image_name = "chain-node"
      port       = 8080
      subdomains = ["node"]
      # Single master — pBFT requires exactly one coordinator.
      min_instances = 1
      max_instances = 1
      cpu           = "1"
      memory        = "512Mi"
      env = {
        TRACABILITY_URL = "https://tracability.${local.domain}"
      }
    }

    tracability = {
      cr_name       = "tora-tracability"
      image_name    = "tracability"
      port          = 8080
      subdomains    = ["tracability"]
      min_instances = 0
      max_instances = 3
      cpu           = "1"
      memory        = "512Mi"
      env           = {}
    }

    voting_fe = {
      cr_name       = "tora-voting-fe"
      image_name    = "voting-fe"
      port          = 8080
      subdomains    = ["", "voting"] # "" → root domain; "voting" → voting.<domain>
      min_instances = 0
      max_instances = 10
      cpu           = "1"
      memory        = "512Mi"
      env = {
        NEXT_PUBLIC_API_URL  = "https://api.${local.domain}"
        NEXT_PUBLIC_AUTH_URL = "https://idp.${local.domain}"
      }
    }
  }
}

locals {
  # Flat map: fully-qualified hostname → service key
  host_to_svc = merge([
    for svc_key, svc in local.services : {
      for sub in svc.subdomains :
      (sub == "" ? local.domain : "${sub}.${local.domain}") => svc_key
    }
  ]...)

  # Inverse: service key → list of hostnames (for LB host_rule blocks)
  svc_to_hosts = {
    for svc_key in keys(local.services) : svc_key => [
      for host, sk in local.host_to_svc : host if sk == svc_key
    ]
  }
}
