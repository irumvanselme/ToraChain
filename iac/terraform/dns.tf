# Managed zone for the tora-chain-demo.iansel.me subdomain.
#
# Delegation setup (one-time, after `make bootstrap`):
#   1. Run `make nameservers` to print the 4 GCP nameservers.
#   2. In wherever you manage iansel.me DNS, add a single NS record:
#        Name:  tora-chain-demo          ← just the subdomain label
#        Type:  NS
#        Value: <each of the 4 nameservers printed above>
#   You are NOT replacing iansel.me's own nameservers — only delegating
#   the tora-chain-demo subdomain to GCP Cloud DNS.
resource "google_dns_managed_zone" "tora" {
  project     = var.project_id
  name        = "tora-chain-demo"
  dns_name    = "${local.domain}."
  description = "ToraChain demo zone"

  depends_on = [google_project_service.apis]
}

# A record for every hostname, all pointing at the load balancer IP.
resource "google_dns_record_set" "hosts" {
  for_each = local.host_to_svc

  project      = var.project_id
  managed_zone = google_dns_managed_zone.tora.name
  name         = "${each.key}."
  type         = "A"
  ttl          = 300
  rrdatas      = [google_compute_global_address.tora.address]
}
