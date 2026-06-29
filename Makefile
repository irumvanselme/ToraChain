# ToraChain — monorepo task runner
#
# Per-project targets are prefixed with the project name (e.g. `backend-test`,
# `admin-fe-build`). Combined targets fan out across every relevant sub-project
# (e.g. `make test`, `make build`, `make lint`). Run `make help` for the list.

.DEFAULT_GOAL := help

# ===========================================================================
# Combined commands (fan out across all relevant sub-projects)
# ===========================================================================

.PHONY: help install dev build test lint lint-fix format format-check check-types migrate ci clean \
	chain-node-master chain-node-worker chain-node-network \
	tracability-dev tracability-build tracability-start

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-26s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	bun install

dev: prepare-assets ## Run all dev services concurrently
	npx concurrently -n backend,auth,admin-fe,voting-fe,auditing-fe,blockchain,example-voters,chain-master,chain-w1,chain-w2,chain-w3,tracability \
		-c blue,green,magenta,cyan,yellow,red,gray,white,white,white,white,cyan \
		"cd apps/backend && bun run dev" \
		"cd apps/auth && bun run dev" \
		"cd apps/admin-fe && bun run dev" \
		"cd apps/voting-fe && bun run dev" \
		"cd apps/auditing-fe && bun run dev" \
		"cd apps/blockchain && bun run dev" \
		"cd examples/simple-voters-database && bun run dev" \
		"./apps/chain-node/start --master --port 7100" \
		"./apps/chain-node/start --port 7101 --master-url ws://localhost:7100" \
		"./apps/chain-node/start --port 7102 --master-url ws://localhost:7100" \
		"./apps/chain-node/start --port 7103 --master-url ws://localhost:7100" \
		"cd apps/tracability && bun run dev"

build: prepare-assets admin-fe-build auditing-fe-build voting-fe-build ## Build all buildable projects

test: backend-test auth-test ## Run all tests

lint: backend-lint auth-lint admin-fe-lint auditing-fe-lint voting-fe-lint ## Lint all projects

lint-fix: backend-lint-fix auth-lint-fix ## Autofix lint issues where supported

format: ## Format the whole repo (prettier)
	bun run format

format-check: backend-format-check auth-format-check ## Check formatting (backend + auth)

check-types: backend-check-types auth-check-types admin-fe-check-types ## Type-check all typed projects

migrate: backend-db-migrate auth-migrate ## Run all database migrations

ci: format-check check-types lint test ## Run the full CI gate locally

clean: ## Remove build artifacts and installed dependencies
	rm -rf node_modules */node_modules packages/*/node_modules \
		apps/admin-fe/dist apps/auditing-fe/.next apps/voting-fe/.next

prepare-assets:
	cp -r ./assets ./apps/admin-fe/public/_assets     					&& \
	cp -r ./assets ./apps/voting-fe/public/_assets    					&& \
	cp -r ./assets ./apps/auditing-fe/public/_assets  					&& \
	cp -r ./assets ./apps/tracability/public/_assets  					&& \
	cp -r ./assets ./examples/simple-voters-database/public/_assets

# ===========================================================================
# Backend
# ===========================================================================

.PHONY: backend-dev backend-start backend-test backend-unit-test \
	backend-integration-test backend-check-types backend-lint backend-lint-fix \
	backend-format backend-format-check backend-db-generate backend-db-migrate \
	backend-db-push

backend-dev: ## Run backend in watch mode
	cd apps/backend && bun run dev

backend-start: ## Start backend
	cd apps/backend && bun run start

backend-test: backend-unit-test backend-integration-test ## Run backend unit + integration tests

backend-unit-test: ## Run backend unit tests
	cd apps/backend && bun run test

backend-integration-test: ## Run backend integration tests
	cd apps/backend && bun run test:integration

backend-check-types: ## Type-check backend
	cd apps/backend && bun run check-types

backend-lint: ## Lint backend
	cd apps/backend && bun run lint

backend-lint-fix: ## Autofix backend lint issues
	cd apps/backend && bun run lint:fix

backend-format: ## Format backend
	cd apps/backend && bun run format

backend-format-check: ## Check backend formatting
	cd apps/backend && bun run format:check

backend-db-generate: ## Generate backend DB migrations
	cd apps/backend && bun run db:generate

backend-db-migrate: ## Apply backend DB migrations
	cd apps/backend && bun run db:migrate

backend-db-push: ## Push backend DB schema
	cd apps/backend && bun run db:push

# ===========================================================================
# Auth
# ===========================================================================

.PHONY: auth-dev auth-start auth-test auth-check-types auth-lint auth-lint-fix \
	auth-format auth-format-check auth-health-check auth-generate auth-migrate

auth-dev: ## Run auth in watch mode
	cd apps/auth && bun run dev

auth-start: ## Start auth
	cd apps/auth && bun run start

auth-test: ## Run auth tests
	cd apps/auth && bun run test

auth-check-types: ## Type-check auth
	cd apps/auth && bun run check-types

auth-lint: ## Lint auth
	cd apps/auth && bun run lint

auth-lint-fix: ## Autofix auth lint issues
	cd apps/auth && bun run lint:fix

auth-format: ## Format auth
	cd apps/auth && bun run format

auth-format-check: ## Check auth formatting
	cd apps/auth && bun run format:check

auth-health-check: ## Probe auth health endpoints
	cd apps/auth && bun run health-check

auth-generate: ## Regenerate all auth migrations
	cd apps/auth && bun run generate:all

auth-migrate: ## Apply all auth migrations
	cd apps/auth && bun run migrate:all

# ===========================================================================
# Admin Frontend
# ===========================================================================

.PHONY: admin-fe-dev admin-fe-build admin-fe-check-types admin-fe-lint admin-fe-preview

admin-fe-dev: ## Run admin frontend dev server
	cd apps/admin-fe && bun run dev

admin-fe-build: ## Build admin frontend
	cd apps/admin-fe && bun run build

admin-fe-check-types: ## Type-check admin frontend
	cd apps/admin-fe && bun run check-types

admin-fe-lint: ## Lint admin frontend
	cd apps/admin-fe && bun run lint

admin-fe-preview: ## Preview built admin frontend
	cd apps/admin-fe && bun run preview

# ===========================================================================
# Voting Frontend
# ===========================================================================

.PHONY: voting-fe-dev voting-fe-build voting-fe-start voting-fe-lint

voting-fe-dev: ## Run voting frontend dev server
	cd apps/voting-fe && bun run dev

voting-fe-build: ## Build voting frontend
	cd apps/voting-fe && bun run build

voting-fe-start: ## Start built voting frontend
	cd apps/voting-fe && bun run start

voting-fe-lint: ## Lint voting frontend
	cd apps/voting-fe && bun run lint

# ===========================================================================
# Auditing Frontend
# ===========================================================================

.PHONY: auditing-fe-dev auditing-fe-build auditing-fe-start auditing-fe-lint

auditing-fe-dev: ## Run auditing frontend dev server
	cd apps/auditing-fe && bun run dev

auditing-fe-build: ## Build auditing frontend
	cd apps/auditing-fe && bun run build

auditing-fe-start: ## Start built auditing frontend
	cd apps/auditing-fe && bun run start

auditing-fe-lint: ## Lint auditing frontend
	cd apps/auditing-fe && bun run lint

# ===========================================================================
# Blockchain
# ===========================================================================

.PHONY: blockchain-dev

blockchain-dev: ## Run blockchain in watch mode
	cd apps/blockchain && bun run dev

# ===========================================================================
# Examples
# ===========================================================================

.PHONY: example-voters-dev example-voters-seed

example-voters-dev: ## Run the simple-voters-database example app (port 3002)
	cd examples/simple-voters-database && bun run dev

example-voters-seed: ## Seed the simple-voters-database with example data
	cd examples/simple-voters-database && bun run seed

# ===========================================================================
# Chain Node
# ===========================================================================

chain-node-master: ## Start the master blockchain node on port 7000
	./apps/chain-node/start --master --port 7100

chain-node-worker: ## Start a worker node (PORT=7101 MASTER_URL=ws://localhost:7100 overridable)
	./apps/chain-node/start \
		--port $${PORT:-7101} \
		--master-url $${MASTER_URL:-ws://localhost:7100}

chain-node-network: ## Spin up master + 3 worker nodes via concurrently
	npx concurrently -n master,worker-1,worker-2,worker-3 \
		-c white,green,cyan,yellow \
		"./apps/chain-node/start --master --port 7100" \
		"./apps/chain-node/start --port 7101 --master-url ws://localhost:7100" \
		"./apps/chain-node/start --port 7102 --master-url ws://localhost:7100" \
		"./apps/chain-node/start --port 7103 --master-url ws://localhost:7100"

# ===========================================================================
# Tracability
# ===========================================================================

tracability-dev: ## Run tracability dashboard in dev mode (port 4000)
	cd apps/tracability && bun run dev

tracability-build: ## Build tracability dashboard
	cd apps/tracability && bun run build

tracability-start: ## Start built tracability dashboard (port 4000)
	cd apps/tracability && bun run start
