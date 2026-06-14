# ToraChain — monorepo task runner
#
# Per-project targets are prefixed with the project name (e.g. `backend-test`,
# `admin-fe-build`). Combined targets fan out across every relevant sub-project
# (e.g. `make test`, `make build`, `make lint`). Run `make help` for the list.

.DEFAULT_GOAL := help

# ===========================================================================
# Combined commands (fan out across all relevant sub-projects)
# ===========================================================================

.PHONY: help install build test lint lint-fix format format-check check-types migrate ci clean

help: ## Show this help
	@grep -hE '^[a-zA-Z0-9_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| sort \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-26s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	bun install

build: admin-fe-build auditing-fe-build voting-fe-build ## Build all buildable projects

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
		admin-fe/dist auditing-fe/.next voting-fe/.next

# ===========================================================================
# Backend
# ===========================================================================

.PHONY: backend-dev backend-start backend-test backend-unit-test \
	backend-integration-test backend-check-types backend-lint backend-lint-fix \
	backend-format backend-format-check backend-db-generate backend-db-migrate \
	backend-db-push

backend-dev: ## Run backend in watch mode
	cd backend && bun run dev

backend-start: ## Start backend
	cd backend && bun run start

backend-test: backend-unit-test backend-integration-test ## Run backend unit + integration tests

backend-unit-test: ## Run backend unit tests
	cd backend && bun run test

backend-integration-test: ## Run backend integration tests
	cd backend && bun run test:integration

backend-check-types: ## Type-check backend
	cd backend && bun run check-types

backend-lint: ## Lint backend
	cd backend && bun run lint

backend-lint-fix: ## Autofix backend lint issues
	cd backend && bun run lint:fix

backend-format: ## Format backend
	cd backend && bun run format

backend-format-check: ## Check backend formatting
	cd backend && bun run format:check

backend-db-generate: ## Generate backend DB migrations
	cd backend && bun run db:generate

backend-db-migrate: ## Apply backend DB migrations
	cd backend && bun run db:migrate

backend-db-push: ## Push backend DB schema
	cd backend && bun run db:push

# ===========================================================================
# Auth
# ===========================================================================

.PHONY: auth-dev auth-start auth-test auth-check-types auth-lint auth-lint-fix \
	auth-format auth-format-check auth-health-check auth-generate auth-migrate

auth-dev: ## Run auth in watch mode
	cd auth && bun run dev

auth-start: ## Start auth
	cd auth && bun run start

auth-test: ## Run auth tests
	cd auth && bun run test

auth-check-types: ## Type-check auth
	cd auth && bun run check-types

auth-lint: ## Lint auth
	cd auth && bun run lint

auth-lint-fix: ## Autofix auth lint issues
	cd auth && bun run lint:fix

auth-format: ## Format auth
	cd auth && bun run format

auth-format-check: ## Check auth formatting
	cd auth && bun run format:check

auth-health-check: ## Probe auth health endpoints
	cd auth && bun run health-check

auth-generate: ## Regenerate all auth migrations
	cd auth && bun run generate:all

auth-migrate: ## Apply all auth migrations
	cd auth && bun run migrate:all

# ===========================================================================
# Admin Frontend
# ===========================================================================

.PHONY: admin-fe-dev admin-fe-build admin-fe-check-types admin-fe-lint admin-fe-preview

admin-fe-dev: ## Run admin frontend dev server
	cd admin-fe && bun run dev

admin-fe-build: ## Build admin frontend
	cd admin-fe && bun run build

admin-fe-check-types: ## Type-check admin frontend
	cd admin-fe && bun run check-types

admin-fe-lint: ## Lint admin frontend
	cd admin-fe && bun run lint

admin-fe-preview: ## Preview built admin frontend
	cd admin-fe && bun run preview

# ===========================================================================
# Voting Frontend
# ===========================================================================

.PHONY: voting-fe-dev voting-fe-build voting-fe-start voting-fe-lint

voting-fe-dev: ## Run voting frontend dev server
	cd voting-fe && bun run dev

voting-fe-build: ## Build voting frontend
	cd voting-fe && bun run build

voting-fe-start: ## Start built voting frontend
	cd voting-fe && bun run start

voting-fe-lint: ## Lint voting frontend
	cd voting-fe && bun run lint

# ===========================================================================
# Auditing Frontend
# ===========================================================================

.PHONY: auditing-fe-dev auditing-fe-build auditing-fe-start auditing-fe-lint

auditing-fe-dev: ## Run auditing frontend dev server
	cd auditing-fe && bun run dev

auditing-fe-build: ## Build auditing frontend
	cd auditing-fe && bun run build

auditing-fe-start: ## Start built auditing frontend
	cd auditing-fe && bun run start

auditing-fe-lint: ## Lint auditing frontend
	cd auditing-fe && bun run lint

# ===========================================================================
# Blockchain
# ===========================================================================

.PHONY: blockchain-dev

blockchain-dev: ## Run blockchain in watch mode
	cd blockchain && bun run dev
