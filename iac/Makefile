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
GIT_SHA  := $(shell git rev-parse HEAD 2>/dev/null)
TAG      ?= $(GIT_SHA)

# Frontend build-time URLs — override to target a different deployment.
# Defaults match the tora-chain-demo.iansel.me production environment.
ADMIN_FE_API_BASE    ?=
ADMIN_FE_AUTH_BASE   ?=
AUDITING_FE_API_BASE ?=
AUDITING_FE_AUTH_BASE ?=
VOTING_FE_API_BASE   ?=
VOTING_FE_AUTH_BASE  ?=

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

# ── Step 3: build & push images ───────────────────────────────────────────────

.PHONY: build-push
build-push: ## [STEP 3] Build & push all images tagged with the current git SHA (override: TAG=<sha>)
	@test -n "$(TAG)" || { echo "ERROR: not in a git repo and TAG is unset — pass TAG=<sha>" >&2; exit 1; }
	@test "$(TAG)" != "latest" || { echo "ERROR: TAG=latest is forbidden — use an explicit git SHA" >&2; exit 1; }
	@echo "Building images: TAG=$(TAG)"
	PROJECT=$(PROJECT) REGION=$(REGION) TAG=$(TAG) \
	  ADMIN_FE_API_BASE=$(ADMIN_FE_API_BASE) ADMIN_FE_AUTH_BASE=$(ADMIN_FE_AUTH_BASE) \
	  AUDITING_FE_API_BASE=$(AUDITING_FE_API_BASE) AUDITING_FE_AUTH_BASE=$(AUDITING_FE_AUTH_BASE) \
	  VOTING_FE_API_BASE=$(VOTING_FE_API_BASE) VOTING_FE_AUTH_BASE=$(VOTING_FE_AUTH_BASE) \
	  scripts/build-push.sh

.PHONY: build-push-one
build-push-one: ## Build/push one service:  make build-push-one SVC=auth [TAG=<sha>]
	@test -n "$(TAG)" || { echo "ERROR: not in a git repo and TAG is unset — pass TAG=<sha>" >&2; exit 1; }
	@test "$(TAG)" != "latest" || { echo "ERROR: TAG=latest is forbidden — use an explicit git SHA" >&2; exit 1; }
	@echo "Building image: SVC=$(SVC)  TAG=$(TAG)"
	PROJECT=$(PROJECT) REGION=$(REGION) TAG=$(TAG) \
	  ADMIN_FE_API_BASE=$(ADMIN_FE_API_BASE) ADMIN_FE_AUTH_BASE=$(ADMIN_FE_AUTH_BASE) \
	  AUDITING_FE_API_BASE=$(AUDITING_FE_API_BASE) AUDITING_FE_AUTH_BASE=$(AUDITING_FE_AUTH_BASE) \
	  VOTING_FE_API_BASE=$(VOTING_FE_API_BASE) VOTING_FE_AUTH_BASE=$(VOTING_FE_AUTH_BASE) \
	  scripts/build-push.sh $(SVC)

# ── Step 3: full apply ────────────────────────────────────────────────────────

.PHONY: apply
apply: ## [STEP 4] Deploy: make apply [TAG=<sha>]  — defaults to current git HEAD
	@test -n "$(TAG)" || { echo "ERROR: not in a git repo and TAG is unset — pass TAG=<sha>" >&2; exit 1; }
	@test "$(TAG)" != "latest" || { echo "ERROR: TAG=latest is forbidden — use an explicit git SHA" >&2; exit 1; }
	@echo "Deploying images: TAG=$(TAG)"
	TF_VAR_image_tags=$$(jq -cn --arg t "$(TAG)" \
	  '{admin_fe:$$t,auditing_fe:$$t,auth:$$t,backend:$$t,chain_node:$$t,tracability:$$t,voting_fe:$$t}') \
	$(TF) apply

.PHONY: plan
plan: ## Dry-run apply:  make plan [TAG=<sha>]  — defaults to current git HEAD
	@test -n "$(TAG)" || { echo "ERROR: not in a git repo and TAG is unset — pass TAG=<sha>" >&2; exit 1; }
	@test "$(TAG)" != "latest" || { echo "ERROR: TAG=latest is forbidden — use an explicit git SHA" >&2; exit 1; }
	TF_VAR_image_tags=$$(jq -cn --arg t "$(TAG)" \
	  '{admin_fe:$$t,auditing_fe:$$t,auth:$$t,backend:$$t,chain_node:$$t,tracability:$$t,voting_fe:$$t}') \
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
