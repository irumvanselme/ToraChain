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
      max_instances = 1
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
      max_instances = 1
      cpu           = "1"
      memory        = "512Mi"
      env = {
        NODE_ENV = "demo"
      }
    }

    auth = {
      cr_name    = "tora-auth"
      image_name = "auth"
      port       = 8080
      subdomains = ["idp"]
      # Keep at least one instance warm — cold-start latency on auth is noticeable.
      min_instances = 0
      max_instances = 1
      cpu           = "1"
      memory        = "512Mi"
      env = {
        NODE_ENV = "demo"
      }
    }

    backend = {
      cr_name       = "tora-backend"
      image_name    = "backend"
      port          = 8080
      subdomains    = ["api"]
      min_instances = 0
      max_instances = 1
      cpu           = "1"
      memory        = "512Mi"
      env = {
        NODE_ENV = "demo"
        # The elections backend fire-and-forget POSTs each committed vote to the
        CHAIN_NODE_URL = "https://node.${local.domain}"
      }
    }

    # torachain-cli master only.  Its chain viewer is served at
    # https://node.<domain>/ for anyone to inspect the blockchain.  Workers
    # (subscribers) run anywhere — locally or on a VM — joining the Google
    # Cloud Pub/Sub network (see pubsub.tf) via
    #   GOOGLE_APPLICATION_CREDENTIALS=<worker-key.json> \
    #   --master-url https://node.<domain> --election <id>
    chain_node = {
      cr_name    = "tora-chain-node"
      image_name = "chain-node"
      port       = 8080
      subdomains = ["node"]
      # Single master — it is the sole publisher of committed blocks.
      min_instances = 0
      max_instances = 1
      cpu           = "1"
      memory        = "512Mi"
      env = {
        GOOGLE_CLOUD_PROJECT = var.project_id
      }
    }

    demo_voters_database = {
      cr_name       = "tora-demo-voters-db"
      image_name    = "demo-voters-database"
      port          = 8080
      subdomains    = ["demo-voters-database"]
      min_instances = 0
      max_instances = 1
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
      max_instances = 1
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
