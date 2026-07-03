# Pub/Sub backbone for the torachain-cli network. The master publishes every
# committed block to a single shared topic tagged with an `electionId`
# attribute; workers create their own subscription and only receive. The topic
# name must match packages/specs/src/network.ts (TOPICS.NEW_BLOCK) — nodes also
# create it on demand if missing, so a mismatch here just means falling back to
# auto-creation with looser IAM than intended.

resource "google_pubsub_topic" "new_block" {
  project = var.project_id
  name    = "torachain-new-block"

  depends_on = [google_project_service.apis]
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

# Master publishes committed blocks to the shared topic.
resource "google_pubsub_topic_iam_member" "master_publisher" {
  project = var.project_id
  topic   = google_pubsub_topic.new_block.name
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

# Workers subscribe to new_block — granted at the topic level (rather than on a
# fixed subscription) because each worker creates its own subscription on
# startup so it gets an independent copy of the stream.
# roles/pubsub.subscriber includes subscriptions.create + attachSubscription,
# scoped to just this topic.
resource "google_pubsub_topic_iam_member" "worker_subscriber" {
  project = var.project_id
  topic   = google_pubsub_topic.new_block.name
  role    = "roles/pubsub.subscriber"
  member  = "serviceAccount:${google_service_account.chain_worker.email}"
}
