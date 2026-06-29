# `@tora-chain/configs`

Framework-agnostic **development-only** configuration shared across the
monorepo: well-known dev account credentials and the dev-navigation link set.
Pure TypeScript data with no dependencies, so it can be consumed by both the
Bun backends and the bundled frontends.

```ts
import {
  DEV_CREDENTIALS,
  DEV_USERS,
  DEV_PASSWORD,
  getDevCredential,
  DEV_LINKS,
} from "@tora-chain/configs";
```

## Credentials

`DEV_CREDENTIALS` holds one known account per identity domain (`voters`,
`admins`, `auditors`), all sharing `DEV_PASSWORD`. Single source of truth for:

- `scripts/seed.ts` — seeds these accounts.
- The auth service's **"Default login"** button (dev only).

These are intentionally weak, well-known credentials for local development —
never seed them into a real environment.

## Links

`DEV_LINKS` describes the ToraChain services for the floating `DevLinks` widget
(`@tora-chain/ui-components`). Icons are stored as **names** (e.g.
`"ShieldCheck"`) and resolved to `lucide-react` components by the UI layer, so
this package stays React-free.

> Consumed from a **Next.js** app (transitively, via `ui-components`)? Add it to
> `transpilePackages` in `next.config.ts`, since it ships raw TS source.
