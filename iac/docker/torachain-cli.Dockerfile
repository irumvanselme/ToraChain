# torachain-cli master node.
# Build context: repo root.
# Workers (subscribers) are not deployed to Cloud Run — anyone can join the
# pub/sub network locally:
#   bun run src/start.ts --master-url wss://node.tora-chain-demo.iansel.me --election <id>
FROM oven/bun:1.2-alpine
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile --filter @tora-chain/cli

EXPOSE 8080
# --master starts coordinator mode; $PORT comes from Cloud Run (set to 8080).
# CHAIN_DB_URI (Postgres persistence) is injected by Terraform.
CMD ["sh", "-c", "exec bun run --cwd /app/apps/torachain-cli src/start.ts --master --port ${PORT:-8080}"]
