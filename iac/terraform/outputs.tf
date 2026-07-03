output "lb_ip" {
  description = "Global load balancer IP — GCP Cloud DNS A records already point here; no action needed"
  value       = google_compute_global_address.tora.address
}

output "nameservers" {
  description = <<-EOT
    GCP nameservers for the tora-chain-demo.iansel.me zone.
    Add ONE NS record in your iansel.me DNS:
      Name:  tora-chain-demo
      Type:  NS
      Value: (each nameserver listed here)
    This delegates only the subdomain — it does not affect iansel.me itself.
  EOT
  value       = google_dns_managed_zone.tora.name_servers
}

output "artifact_registry_base" {
  description = "Docker image base path — prefix every image tag with this"
  value       = local.ar_base
}

output "cloud_run_urls" {
  description = "Direct *.run.app URLs for each service (useful before DNS propagates)"
  value       = { for k, svc in google_cloud_run_v2_service.services : k => svc.uri }
}

output "domain_map" {
  description = "Custom hostname → service mapping deployed by this workspace"
  value       = local.host_to_svc
}

output "chain_worker_service_account" {
  description = <<-EOT
    Email of the service account to generate worker-node keys from:
      gcloud iam service-accounts keys create key.json --iam-account=<this>
    Distribute the resulting key.json to whoever runs a torachain-cli worker.
  EOT
  value       = google_service_account.chain_worker.email
}
