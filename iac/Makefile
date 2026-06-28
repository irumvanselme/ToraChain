## ToraChain IaC — three-step deploy workflow
##
## Prerequisites:
##   • gcloud CLI authenticated  (gcloud auth application-default login)
##   • Terraform CLI installed
##   • Docker (with buildx for cross-platform builds)
##   • PROJECT env var set to your GCP project ID
##   • HCP Terraform org set in terraform/backend.tf (or TF_CLOUD_ORGANIZATION)
##
## Deploy in order:
##   1.  make bootstrap   → Artifact Registry + DNS zone (tora-chain-demo.iansel.me)
##   2.  make nameservers → prints the 4 GCP nameservers; add them as ONE NS record
##                          in your iansel.me DNS:
##                            Name:  tora-chain-demo
##                            Type:  NS
##                            Value: <each nameserver>
##   3.  make build-push  → build & push all images (AR must exist from step 1)
##   4.  make apply       → Cloud Run + LB + DNS A records + SSL cert
##                          (SSL cert needs NS delegation from step 2 to validate)

TF       := terraform -chdir=terraform
PROJECT  ?= $(shell $(TF) output -raw project_id 2>/dev/null || echo "")
REGION   ?= us-central1
TAG      ?= latest

.DEFAULT_GOAL := help

# ── Step 1: bootstrap ─────────────────────────────────────────────────────────

.PHONY: init
init: ## terraform init (run once or after provider changes)
	$(TF) init

.PHONY: bootstrap
bootstrap: ## [STEP 1] Create Artifact Registry + DNS zone (before building images)
	$(TF) apply \
	  -target=google_project_service.apis \
	  -target=google_artifact_registry_repository.tora \
	  -target=google_dns_managed_zone.tora

.PHONY: nameservers
nameservers: ## Print the NS delegation record to add at iansel.me
	@echo ""
	@echo "In your iansel.me DNS, add this record:"
	@echo ""
	@echo "  Name : tora-chain-demo"
	@echo "  Type : NS"
	@echo "  Value:"
	@$(TF) output -json nameservers | python3 -c \
	  "import json,sys; [print('   ', ns) for ns in json.load(sys.stdin)]"
	@echo ""
	@echo "(This delegates only the subdomain — iansel.me itself is unchanged.)"
	@echo ""

# ── Step 2: build & push images ───────────────────────────────────────────────

.PHONY: build-push
build-push: ## [STEP 2] Build and push all service images to Artifact Registry
	PROJECT=$(PROJECT) REGION=$(REGION) TAG=$(TAG) scripts/build-push.sh

.PHONY: build-push-one
build-push-one: ## Build/push a single service:  make build-push-one SVC=auth
	PROJECT=$(PROJECT) REGION=$(REGION) TAG=$(TAG) scripts/build-push.sh $(SVC)

# ── Step 3: full apply ────────────────────────────────────────────────────────

.PHONY: apply
apply: ## [STEP 3] Deploy Cloud Run services, LB, DNS records, SSL cert
	$(TF) apply

.PHONY: plan
plan: ## Dry-run apply (no changes)
	$(TF) plan

# ── Utilities ─────────────────────────────────────────────────────────────────

.PHONY: outputs
outputs: ## Print all Terraform outputs
	$(TF) output

.PHONY: lb-ip
lb-ip: ## Print the load balancer IP
	@$(TF) output -raw lb_ip

.PHONY: fmt
fmt: ## Format Terraform files
	$(TF) fmt -recursive

.PHONY: validate
validate: ## Validate Terraform configuration
	$(TF) validate

.PHONY: destroy
destroy: ## Tear down everything (prompts for confirmation)
	$(TF) destroy

.PHONY: help
help:
	@grep -E '^[a-zA-Z_-]+:.*## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN {FS = ":.*## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'
