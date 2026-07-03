# voting-fe

Voter app for ToraChain — Next.js App Router + React 19, styled with Tailwind
CSS v4 + DaisyUI and the shared `@tora-chain/ui-components` library. Voters sign
in against the **voters** identity domain, enroll in elections (delegated to an
external eligibility API), cast an encrypted ballot, and later verify their vote
against the backend **and** the on-chain record.

See [docs/frontends.md](../../docs/frontends.md) for the shared frontend patterns.

## Routes

| Route             | Auth          | Purpose                                               |
| ----------------- | ------------- | ----------------------------------------------------- |
| `/`               | public        | Landing page + sign-in CTA                            |
| `/elections`      | `RequireAuth` | Elections list with status filters                    |
| `/elections/[id]` | `RequireAuth` | Eligibility/enrollment, cast ballot, receipt, tallies |
| `/verify`         | `RequireAuth` | Paste a receipt to verify a vote                      |

## Key flows

- **Enrollment** — a per-election eligibility integration drives a state machine
  (`idle → checking → eligible → enrolling → enrolled`) and renders its
  `formFields` (incl. demo `fingerprint` / `eyes` biometric widgets).
- **Voting** — the ballot is sealed client-side (AES-256-GCM in
  `app/lib/receipt.ts`) and cast with its `ciphertext` + `commitment`; the AES
  key stays with the voter in the receipt (QR + text), never server-side.
- **Verification** (`/verify`) — re-derives the commitment, decrypts with the
  receipt key, and cross-checks the backend record against the blockchain node
  (`api/chain.ts`, public read).

## Auth

`AuthProvider` (from `@tora-chain/fe-common`) wraps the app at the root so the
public landing page can read the session. Backend calls exchange the session
cookie for a short-lived voter JWT (`getTokenManager` → `{AUTH_API}/token`) and
send it alongside `credentials: "include"`, auto-refreshing on 401.

## Running locally

```bash
bun install
bun run dev          # http://localhost:3001
```

Service URLs (`apiLink`, `idpLink`, `chainNodeLink`) come from
`@tora-chain/configs` — there are **no env vars**; `getEnv()` resolves
`development` vs `demo`. Start the auth + backend services (and a chain node for
on-chain verification) for full functionality.

## Scripts

```bash
bun run dev          # next dev --port 3001
bun run build        # next build (output: standalone)
bun run start        # next start
bun run lint         # eslint .
bun run test         # vitest run
bun run format:check
```
