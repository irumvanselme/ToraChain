# Single image for all Bun services (auth, backend, admin-fe). Each service
# overrides `working_dir` + `command` in docker-compose.demo.yaml.
FROM oven/bun:1

WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile

# auth :3000 · backend :3001 · admin-fe (vite) :5173
EXPOSE 3000 3001 5173
