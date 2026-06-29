# Vite SPA (admin-fe): build → nginx.
# Build context: repo root.
#
# VITE_* env vars are baked in at build time — pass them with
#   --build-arg VITE_API_BASE=https://api.tora-chain-demo.iansel.me
#   --build-arg VITE_AUTH_BASE=https://idp.tora-chain-demo.iansel.me/admins
# when real URLs differ from the defaults below.

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM oven/bun:1.2-alpine AS builder
WORKDIR /app

COPY . .
RUN bun install --frozen-lockfile --filter @tora-chain/admin-frontend

ARG VITE_API_BASE=https://api.tora-chain-demo.iansel.me
ARG VITE_AUTH_BASE=https://idp.tora-chain-demo.iansel.me/admins
ENV VITE_API_BASE=${VITE_API_BASE} \
    VITE_AUTH_BASE=${VITE_AUTH_BASE}

ENV VITE_NODE_ENV=demo
ENV NODE_ENV=demo

RUN cd apps/admin-fe && bun run build

# ── Stage 2: nginx ────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/apps/admin-fe/dist /usr/share/nginx/html
COPY iac/docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
