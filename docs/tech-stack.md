# Tech Stack

## Overview

| Layer                   | Technology                                                  | Used in                    |
| ----------------------- | ----------------------------------------------------------- | -------------------------- |
| Runtime                 | **Bun** (TypeScript executed directly, no build step)       | all backends, tooling      |
| Backend framework       | **Elysia**                                                  | `auth`, `backend`          |
| Identity                | **better-auth** (JWT, OpenAPI, admin, organization plugins) | `auth`                     |
| ORM / DB access         | **Drizzle ORM** + `pg`                                      | `backend`, `be-common`     |
| Database                | **PostgreSQL 17**                                           | all services               |
| Validation              | **Zod** + Elysia `t`                                        | all backends               |
| Admin frontend          | **React 19 + Vite**, Tailwind CSS v4, DaisyUI               | `admin-fe`                 |
| Voter/Auditor frontends | **Next.js (App Router) + React 19**                         | `voting-fe`, `auditing-fe` |
| Blockchain node         | **Express** + `@google-cloud/pubsub` (publisher/subscriber) | `torachain-cli`            |
| Messaging               | **Google Cloud Pub/Sub** (emulator locally)                 | chain network              |
| Logging                 | **pino**                                                    | `be-common`                |
| Testing                 | **Vitest** (unit + integration)                             | all workspaces             |
| Tooling                 | ESLint, Prettier, Makefile task runner                      | monorepo                   |
| Package management      | Bun workspaces (`bun.lock`)                                 | monorepo                   |

## Why these choices

**Bun** — a single fast runtime that executes TypeScript directly (no compile
step for the backends), with a built-in workspace-aware package manager. Cuts
build tooling and keeps dev startup near-instant.

**Elysia** — an ergonomic, type-safe Bun-native web framework. End-to-end types
from route schema to handler, first-class OpenAPI, and a plugin model that fits
the auth service's multi-domain registry pattern.

**better-auth** — batteries-included auth (sessions, JWT, admin, organizations)
we compose per identity domain instead of hand-rolling password/session security.

**Drizzle ORM** — typed SQL with zero-runtime overhead and file-based migrations
discovered from each module's `model.ts`, keeping schema next to its domain code.

**PostgreSQL** — a proven relational store; each service owns its own database so
the data model stays isolated and independently migratable.

**React 19 + Vite (admin)** vs **Next.js (voter/auditor)** — the admin console is
a session-gated SPA where a lightweight Vite build shines; the public-facing
voter and auditor apps benefit from Next.js routing/SSR conventions.

**Publisher/subscriber over Pub/Sub** — the master publishes each committed
block and workers subscribe and replicate. Every worker re-hashes the blocks it
receives, so tampering is detectable, and Pub/Sub decouples the master from
workers so nodes can join from anywhere.

**Shared packages** — `configs` (URLs/env), `be-common` (logging/db), `fe-common`
(auth React utils), `ui-components` (DaisyUI atoms), and `specs` (Pub/Sub
contracts) remove duplication and enforce one source of truth.

See [architecture.md](architecture.md) for how these fit together and
[infrastructure.md](infrastructure.md) for how they are deployed.
