# ── Stage 1: install (bun is fast at resolution + download) ──────────────────
FROM oven/bun:1.2-alpine AS deps
WORKDIR /app
COPY . .
ARG PACKAGE_NAME
RUN bun install --frozen-lockfile --filter @tora-chain/${PACKAGE_NAME}

# ── Stage 2: build with Node.js (bun worker_threads is incomplete on Linux) ───
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app .

ARG APP_DIR
# NEXT_PUBLIC_* vars are baked into the client bundle at build time.
# Pass --build-arg NEXT_PUBLIC_AUTH_BASE=... and NEXT_PUBLIC_API_BASE=...
# for apps that need them (auditing-fe, voting-fe). Unused by tracability.
ARG NEXT_PUBLIC_AUTH_BASE=""
ARG NEXT_PUBLIC_API_BASE=""
ENV NEXT_PUBLIC_AUTH_BASE=${NEXT_PUBLIC_AUTH_BASE} \
    NEXT_PUBLIC_API_BASE=${NEXT_PUBLIC_API_BASE}

# Remove workspace-local react / react-dom so every package shares one instance.
# Bun's resolver deduplicates at runtime; Node.js does not — a duplicate react
# instance causes styled-jsx / react-dom SSR failures during static generation.
# If no workspace-local copy exists the rm is a harmless no-op.
RUN rm -rf apps/${APP_DIR}/node_modules/react \
           apps/${APP_DIR}/node_modules/react-dom \
           apps/${APP_DIR}/node_modules/react-is \
           apps/${APP_DIR}/node_modules/scheduler
# npm resolves the correct 'next' binary by walking up node_modules/.bin,
# handling version divergence across workspaces (e.g. next@15 vs next@16).
RUN cd apps/${APP_DIR} && npm run build
# Ensure public/ exists so the runner COPY never fails for apps that omit it
RUN mkdir -p apps/${APP_DIR}/public

# ── Stage 3: minimal runtime ──────────────────────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app

ARG APP_DIR
ENV APP_DIR=${APP_DIR} \
    NODE_ENV=production \
    PORT=8080 \
    HOSTNAME=0.0.0.0

# Standalone bundle: server + all required node_modules
COPY --from=builder /app/apps/${APP_DIR}/.next/standalone ./
# Static files are excluded from standalone and must be overlaid
COPY --from=builder /app/apps/${APP_DIR}/.next/static ./apps/${APP_DIR}/.next/static
COPY --from=builder /app/apps/${APP_DIR}/public        ./apps/${APP_DIR}/public

EXPOSE 8080
CMD ["sh", "-c", "exec node apps/${APP_DIR}/server.js"]
