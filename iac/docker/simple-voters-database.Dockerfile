# ── Stage 1: install deps + seed demo data ────────────────────────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile --filter simple-voters-database
# Bake demo voters into the image so the dashboard isn't empty on first visit.
RUN cd examples/simple-voters-database && bun run seed

# ── Stage 2: build (Node.js — bun worker_threads is incomplete on Linux) ──────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app .

# Remove workspace-local react instances to avoid duplicate react / react-dom
# causing styled-jsx / SSR failures during static generation.
RUN rm -rf examples/simple-voters-database/node_modules/react \
           examples/simple-voters-database/node_modules/react-dom \
           examples/simple-voters-database/node_modules/react-is \
           examples/simple-voters-database/node_modules/scheduler

RUN cd examples/simple-voters-database && npm run build
# Ensure public/ exists so the COPY in the runner stage never fails.
RUN mkdir -p examples/simple-voters-database/public

# ── Stage 3: minimal runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Standalone bundle: server + all required node_modules
COPY --from=builder /app/examples/simple-voters-database/.next/standalone ./
# Static files are excluded from the standalone bundle and must be overlaid
COPY --from=builder /app/examples/simple-voters-database/.next/static \
     ./examples/simple-voters-database/.next/static
COPY --from=builder /app/examples/simple-voters-database/public \
     ./examples/simple-voters-database/public
# Pre-seeded demo voters (db/index.ts reads from process.cwd()/data = /app/data)
COPY --from=deps /app/examples/simple-voters-database/data ./data

EXPOSE 8080
CMD ["node", "examples/simple-voters-database/server.js"]
