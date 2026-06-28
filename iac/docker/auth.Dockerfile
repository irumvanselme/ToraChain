FROM oven/bun:1.2-alpine
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile --filter @tora-chain/auth

EXPOSE 8080

# Cloud Run injects $PORT (matches container_port in Terraform = 8080).
# The Bun apps read PORT via their env.ts config.
CMD ["sh", "-c", "exec bun run --cwd /app/apps/auth start"]
