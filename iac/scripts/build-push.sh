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

# Frontend build-time URLs (baked into JS bundles — override for non-default deployments).
# Each service has its own auth path segment (/admins, /auditors, /voters).
ADMIN_FE_API_BASE=${ADMIN_FE_API_BASE:-"https://api.tora-chain-demo.iansel.me"}
ADMIN_FE_AUTH_BASE=${ADMIN_FE_AUTH_BASE:-"https://idp.tora-chain-demo.iansel.me/admins"}
AUDITING_FE_API_BASE=${AUDITING_FE_API_BASE:-"https://api.tora-chain-demo.iansel.me"}
AUDITING_FE_AUTH_BASE=${AUDITING_FE_AUTH_BASE:-"https://idp.tora-chain-demo.iansel.me/auditors"}
VOTING_FE_API_BASE=${VOTING_FE_API_BASE:-"https://api.tora-chain-demo.iansel.me"}
VOTING_FE_AUTH_BASE=${VOTING_FE_AUTH_BASE:-"https://idp.tora-chain-demo.iansel.me/voters"}

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
    admin_fe)    echo "admin-fe|admin-fe.Dockerfile|--build-arg VITE_API_BASE=${ADMIN_FE_API_BASE} --build-arg VITE_AUTH_BASE=${ADMIN_FE_AUTH_BASE}" ;;
    auditing_fe) echo "auditing-fe|nextjs.Dockerfile|--build-arg APP_DIR=auditing-fe --build-arg PACKAGE_NAME=auditing-frontend --build-arg NEXT_PUBLIC_API_BASE=${AUDITING_FE_API_BASE} --build-arg NEXT_PUBLIC_AUTH_BASE=${AUDITING_FE_AUTH_BASE}" ;;
    auth)        echo "auth|auth.Dockerfile|" ;;
    backend)     echo "backend|backend.Dockerfile|" ;;
    chain_node)  echo "chain-node|chain-node.Dockerfile|" ;;
    tracability) echo "tracability|nextjs.Dockerfile|--build-arg APP_DIR=tracability --build-arg PACKAGE_NAME=tracability" ;;
    voting_fe)   echo "voting-fe|nextjs.Dockerfile|--build-arg APP_DIR=voting-fe --build-arg PACKAGE_NAME=voting-frontend --build-arg NEXT_PUBLIC_API_BASE=${VOTING_FE_API_BASE} --build-arg NEXT_PUBLIC_AUTH_BASE=${VOTING_FE_AUTH_BASE}" ;;
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

# Validate all keys up front before spawning any background jobs.
for key in "${TARGETS[@]}"; do
  service_info "$key" > /dev/null || {
    echo "ERROR: Unknown service '${key}'. Valid keys: ${ALL_SERVICES[*]}" >&2
    exit 1
  }
done

# ── Parallel build & push ─────────────────────────────────────────────────────
# Each service builds in the background; stdout+stderr go to a per-service temp
# file so output is not interleaved.  All PIDs are collected then waited on;
# every failure is reported after all jobs complete.

PIDS=()
NAMES=()
LOG_FILES=()

for key in "${TARGETS[@]}"; do
  info=$(service_info "$key")
  IFS='|' read -r name dockerfile extra_args <<< "$info"

  log_file=$(mktemp "/tmp/torachain-build-${name}-XXXXXX")
  LOG_FILES+=("$log_file")
  NAMES+=("$name")

  # shellcheck disable=SC2086
  build_and_push "$name" "$dockerfile" "$extra_args" >"$log_file" 2>&1 &
  PIDS+=($!)
  echo "  → spawned ${name} (pid $!)"
done

echo ""
echo "Waiting for ${#PIDS[@]} build(s) …"
echo ""

FAILED=0
for i in "${!PIDS[@]}"; do
  pid=${PIDS[$i]}
  name=${NAMES[$i]}
  log_file=${LOG_FILES[$i]}

  # 'if wait' prevents set -e from firing on non-zero exit.
  if wait "$pid"; then
    echo "  ✔ ${name}"
  else
    echo "  ✘ ${name} FAILED"
    FAILED=1
  fi

  cat "$log_file"
  rm -f "$log_file"
done

if [[ $FAILED -ne 0 ]]; then
  echo "" >&2
  echo "ERROR: one or more builds failed — see output above." >&2
  exit 1
fi

echo ""
echo "Done. All images pushed to ${AR_BASE}."
