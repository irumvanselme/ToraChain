#!/usr/bin/env bash
# Build and push all ToraChain service images to Artifact Registry.
#
# Usage:
#   PROJECT=my-project ./iac/scripts/build-push.sh            # all services
#   PROJECT=my-project ./iac/scripts/build-push.sh auth       # one service
#
# Environment variables (all optional except PROJECT):
#   PROJECT   GCP project ID                         (required)
#   REGION    AR region                              (default: us-central1)
#   TAG       Image tag                              (default: latest)
#   PLATFORM  Docker target platform                 (default: linux/amd64)
set -euo pipefail

# ── Config ────────────────────────────────────────────────────────────────────

PROJECT=${PROJECT:-""}
REGION=${REGION:-"us-central1"}
TAG=${TAG:-"latest"}
PLATFORM=${PLATFORM:-"linux/amd64"}

if [[ -z "$PROJECT" ]]; then
  echo "ERROR: PROJECT env var is required (GCP project ID)" >&2
  exit 1
fi

AR_BASE="${REGION}-docker.pkg.dev/${PROJECT}/tora-chain"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DOCKER_DIR="${REPO_ROOT}/iac/docker"

# ── Auth ──────────────────────────────────────────────────────────────────────

echo "Configuring Docker auth for ${REGION}-docker.pkg.dev …"
gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet

# ── Build helpers ─────────────────────────────────────────────────────────────

build_and_push() {
  local name=$1
  local dockerfile=$2
  local extra_args=${3:-""}
  local image="${AR_BASE}/${name}:${TAG}"

  echo ""
  echo "┌─ Building ${name} → ${image}"
  # shellcheck disable=SC2086
  docker build \
    --platform "${PLATFORM}" \
    --file "${DOCKER_DIR}/${dockerfile}" \
    --tag "${image}" \
    ${extra_args} \
    "${REPO_ROOT}"

  echo "└─ Pushing ${image}"
  docker push "${image}"
}

# ── Service definitions ───────────────────────────────────────────────────────
# Returns "image-name|Dockerfile|extra_build_args" for a given service key.
# Using a case statement instead of an associative array for bash 3.2 compat
# (macOS ships bash 3.2; declare -A requires bash 4+).

ALL_SERVICES=(admin_fe auditing_fe auth backend chain_node tracability voting_fe)

service_info() {
  case "$1" in
    admin_fe)    echo "admin-fe|Dockerfile.spa|" ;;
    auditing_fe) echo "auditing-fe|Dockerfile.nextjs|--build-arg APP_DIR=auditing-fe" ;;
    auth)        echo "auth|Dockerfile.bun|--build-arg APP_DIR=auth" ;;
    backend)     echo "backend|Dockerfile.bun|--build-arg APP_DIR=backend" ;;
    chain_node)  echo "chain-node|Dockerfile.chain-node|" ;;
    tracability) echo "tracability|Dockerfile.nextjs|--build-arg APP_DIR=tracability" ;;
    voting_fe)   echo "voting-fe|Dockerfile.nextjs|--build-arg APP_DIR=voting-fe" ;;
    *) return 1 ;;
  esac
}

# ── Main ──────────────────────────────────────────────────────────────────────

# If args given, build only those services; otherwise build all.
if [[ $# -gt 0 ]]; then
  TARGETS=("$@")
else
  TARGETS=("${ALL_SERVICES[@]}")
fi

for key in "${TARGETS[@]}"; do
  info=$(service_info "$key") || {
    echo "ERROR: Unknown service '${key}'. Valid keys: ${ALL_SERVICES[*]}" >&2
    exit 1
  }
  IFS='|' read -r name dockerfile extra_args <<< "$info"
  build_and_push "$name" "$dockerfile" "$extra_args"
done

echo ""
echo "Done. All images pushed to ${AR_BASE}."
