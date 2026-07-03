# torachain-cli master node.
# Build context: repo root.
# Workers (subscribers) are not deployed to Cloud Run — anyone with a
# torachain-worker service-account key (see iac/terraform/pubsub.tf) can join
# the pub/sub network from anywhere:
#   GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json \
#   bun run src/start.ts --master-url https://node.tora-chain-demo.iansel.me --election <id>
FROM oven/bun:1.2-alpine
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile --filter @tora-chain/cli

EXPOSE 8080
# --master starts coordinator mode; $PORT comes from Cloud Run (set to 8080).
# CHAIN_DB_URI (Postgres persistence) and GOOGLE_CLOUD_PROJECT (Pub/Sub) are
# injected by Terraform; Pub/Sub credentials come from the attached Cloud Run
# service account (see chain_master_sa in iac/terraform/pubsub.tf) — no key
# file needed.
CMD ["sh", "-c", "exec bun run --cwd /app/apps/torachain-cli src/start.ts --master --port ${PORT:-8080}"]
