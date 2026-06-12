# ToraChain monorepo task runner.
#
# `make install` installs all workspace dependencies (Bun resolves the whole
# monorepo from the root lockfile). `make dev` starts the auth, backend, and
# admin-fe dev servers together via `concurrently`, with prefixed, colorized
# output and a single Ctrl-C that stops all three.

.DEFAULT_GOAL := help

# Run all recipe lines for a target in one shell.
.ONESHELL:

.PHONY: help install dev dev-auth dev-backend dev-admin-fe build check format clean

help: ## Show this help
	@echo "ToraChain — available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install all workspace dependencies
	bun install

dev: ## Start auth + backend + admin-fe dev servers concurrently
	bunx concurrently \
		--kill-others \
		--prefix "[{name}]" \
		--names "auth,backend,admin-fe" \
		--prefix-colors "blue,green,magenta" \
		"cd auth && bun run dev" \
		"cd backend && bun run dev" \
		"cd admin-fe && bun run dev"

dev-auth: ## Start only the auth dev server
	cd auth && bun run dev

dev-backend: ## Start only the backend dev server
	cd backend && bun run dev

dev-admin-fe: ## Start only the admin-fe dev server
	cd admin-fe && bun run dev

build: ## Build the admin-fe production bundle
	cd admin-fe && bun run build

check: ## Type-check + lint auth, backend, and admin-fe
	cd auth && bun run check-types && bun run lint
	cd backend && bun run check-types && bun run lint
	cd admin-fe && bun run check-types && bun run lint

format: ## Format the whole repo with Prettier
	bun run format

clean: ## Remove installed dependencies and build output
	rm -rf node_modules */node_modules packages/*/node_modules admin-fe/dist
