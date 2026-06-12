# `@tora-chain/be-common`

Shared backend library for the Bun services, consumed via `workspace:*`. Three
subpath exports (also re-exported from the root):

- **`/logging`** — a `Logger` class wrapping [pino](https://getpino.io). Level
  and pretty-printing from `LOG_LEVEL` / `LOG_PRETTY`. Use `.child(bindings)`
  for scoped loggers.
- **`/database`** — a `Database` class wrapping a `pg.Pool` + Drizzle ORM, with
  `connect()` / `ping()` / `close()`. Accepts a `url` or discrete fields.
- **`/config`** — env helpers: `requireEnv`, `getEnv`, `getNumberEnv`,
  `getBoolEnv`, `getNodeEnv`, `isProduction`, and `MissingEnvError`.

```ts
import { Logger } from "@tora-chain/be-common/logging";
import { Database } from "@tora-chain/be-common/database";
import { requireEnv } from "@tora-chain/be-common/config";
```
