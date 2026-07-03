# Pub/Sub backbone for the torachain-cli network (replaces the old
# socket.io transport). Topic and fixed-subscription names must match
# packages/specs/src/network.ts (TOPICS / MASTER_SUBSCRIPTIONS) — nodes also
# create these on demand if missing, so a mismatch here just means falling
# back to auto-creation with looser IAM than intended.

locals {
  chain_topics = {
    new_block       = "torachain-new-block"
    validate_block  = "torachain-validate-block"
    block_validated = "torachain-block-validated"
    worker_presence = "torachain-worker-presence"
  }
}

resource "google_pubsub_topic" "chain" {
  for_each = local.chain_topics

  project = var.project_id
  name    = each.value

  depends_on = [google_project_service.apis]
}

# Master's two fixed, singleton subscriptions — provisioned ahead of time so
# the master service account only needs subscriber rights on these specific
# subscriptions, not the broader topic-level subscriber role workers need in
# order to create their own.
resource "google_pubsub_subscription" "block_validated_master" {
  project = var.project_id
  name    = "torachain-block-validated-master"
  topic   = google_pubsub_topic.chain["block_validated"].id

  expiration_policy {
    ttl = "" # never expire — this is permanent infra, not an ephemeral worker
  }
}

resource "google_pubsub_subscription" "worker_presence_master" {
  project = var.project_id
  name    = "torachain-worker-presence-master"
  topic   = google_pubsub_topic.chain["worker_presence"].id

  expiration_policy {
    ttl = "" # never expire
  }
}

# ── Service accounts ─────────────────────────────────────────────────────────

# Attached to the chain_node Cloud Run service (see cloud_run.tf). Cloud Run
# injects credentials for this SA automatically — no key file needed.
resource "google_service_account" "chain_master" {
  project      = var.project_id
  account_id   = "torachain-master"
  display_name = "ToraChain master node (Cloud Run)"

  # Creating a service account needs the IAM API enabled first (apis.tf).
  depends_on = [google_project_service.apis]
}

# Not attached to any GCP resource here — its key is handed out to whoever
# runs a worker node (locally, on a VM, wherever). Generate a key manually
# when you need one, e.g.:
#   gcloud iam service-accounts keys create key.json \
#     --iam-account=$(terraform -chdir=iac/terraform output -raw chain_worker_service_account)
# Deliberately not a google_service_account_key resource — that would put
# the private key material in Terraform state.
resource "google_service_account" "chain_worker" {
  project      = var.project_id
  account_id   = "torachain-worker"
  display_name = "ToraChain worker node (key distributed to node operators)"

  # Creating a service account needs the IAM API enabled first (apis.tf).
  depends_on = [google_project_service.apis]
}

# ── IAM ───────────────────────────────────────────────────────────────────────

# Master publishes candidate blocks (pBFT) and committed blocks (publish).
resource "google_pubsub_topic_iam_member" "master_publisher" {
  for_each = toset(["new_block", "validate_block"])

  project = var.project_id
  topic   = google_pubsub_topic.chain[each.value].name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.chain_master.email}"
}

# The node's ensureTopic()/ensureSubscription() startup checks call exists(),
# which needs pubsub.topics.get / pubsub.subscriptions.get — not included in
# the publisher/subscriber roles below. Viewer is read-only metadata access.
resource "google_project_iam_member" "master_pubsub_viewer" {
  project = var.project_id
  role    = "roles/pubsub.viewer"
  member  = "serviceAccount:${google_service_account.chain_master.email}"
}

# Master consumes validation responses and presence heartbeats from its own
# fixed subscriptions above.
resource "google_pubsub_subscription_iam_member" "master_subscriber" {
  for_each = {
    block_validated = google_pubsub_subscription.block_validated_master.name
    worker_presence = google_pubsub_subscription.worker_presence_master.name
  }

  project      = var.project_id
  subscription = each.value
  role         = "roles/pubsub.subscriber"
  member       = "serviceAccount:${google_service_account.chain_master.email}"
}

# Workers subscribe to new_block/validate_block — granted at the topic level
# (rather than on a fixed subscription) because each worker creates its own
# subscription on startup so it gets an independent copy of the stream.
# roles/pubsub.subscriber includes subscriptions.create + attachSubscription,
# scoped to just these two topics.
resource "google_pubsub_topic_iam_member" "worker_subscriber" {
  for_each = toset(["new_block", "validate_block"])

  project = var.project_id
  topic   = google_pubsub_topic.chain[each.value].name
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.chain_worker.email}"
}

# Workers publish their validation responses and liveness heartbeats.
resource "google_pubsub_topic_iam_member" "worker_publisher" {
  for_each = toset(["block_validated", "worker_presence"])

  project = var.project_id
  topic   = google_pubsub_topic.chain[each.value].name
  role    = "roles/pubsub.publisher"
  member  = "serviceAccount:${google_service_account.chain_worker.email}"
}
