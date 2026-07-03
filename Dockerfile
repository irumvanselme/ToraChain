# Single image for every service in docker-compose.demo.yaml — each compose
# service overrides `working_dir` + `command`. Production images are built
# per-service from iac/docker/*.Dockerfile instead.
FROM oven/bun:1

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# Shared static assets for the frontends (mirrors `make prepare-assets`).
RUN cp -r assets apps/admin-fe/public/_assets \
  && cp -r assets apps/voting-fe/public/_assets \
  && cp -r assets apps/auditing-fe/public/_assets \
  && cp -r assets examples/simple-voters-database/public/_assets

# backend :8000 · auth :8001 · admin :3000 · voting :3001 · auditing :3002
# example voters :3003 · chain master :7100 · chain workers :7101-7103
EXPOSE 8000 8001 3000 3001 3002 3003 7100 7101 7102 7103
