# auditing-fe

Auditor app for ToraChain — Next.js App Router + React 19, styled with Tailwind
CSS v4 + DaisyUI and the shared `@tora-chain/ui-components` library. Auditors
sign in against the **auditors** identity domain, join an organization (subject
to admin approval), and independently verify election results and the
underlying blockchain.

See [docs/frontends.md](../../docs/frontends.md) for the shared frontend patterns.

## Routes

The whole app is gated (no public route): `AuthProvider → RequireAuth →
AuditProvider → OrgGate`. `OrgGate` redirects auditors with no org to the auth
service's onboarding page, pending/rejected ones to its pending page, and
approved ones to `/dashboard`.

| Route | Purpose |
| ----- | ------- |
| `/` | Redirects approved auditors to `/dashboard` |
| `/dashboard` | Elections list (search + pagination, vote counts) |
| `/elections/[id]` | Audit detail — Overview, Results (chart + JSON), Blockchain (blocks + JSON) |

Onboarding / pending pages are served by the **auth service**, not this app.

## Auth (JWT Bearer)

This is the frontend that uses **`Authorization: Bearer`** for backend calls.
`AuditProvider` (`app/lib/audit-context.tsx`) exchanges the auditor session
cookie for a short-lived JWT (`api/token.ts` → `getTokenManager` →
`{AUTH_API}/token`, cached and refreshed) and fetches org-approval status in
parallel. Backend audit endpoints (`{apiLink}/audit/*`) receive the Bearer
token; the auth service's `/auditors/audit/status` is still cookie-based.

## Running locally

```bash
bun install
bun run dev          # http://localhost:3002
```

Service URLs (`apiLink`, `idpLink`) come from `@tora-chain/configs` — there are
**no env vars**; `getEnv()` resolves `development` vs `demo`. Start the auth +
backend services; an admin must approve the auditor's organization before the
dashboard unlocks.

## Scripts

```bash
bun run dev          # next dev --port 3002
bun run build        # next build (output: standalone)
bun run start        # next start
bun run lint         # eslint .
bun run test         # vitest run
bun run format:check
```
