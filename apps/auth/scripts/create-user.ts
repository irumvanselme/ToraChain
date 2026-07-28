import { APIError } from "better-auth/api";

import type { App } from "../app/_apps.ts";
import { AdminApp } from "../app/auth/admins.ts";
import { AuditorsApp } from "../app/auth/auditors.ts";
import { VotersApp } from "../app/auth/voters.ts";
import { EUserType } from "../app/types.ts";

/**
 * Creates an account in any identity domain directly against the configured
 * database, without going through the HTTP sign-up flow. Admins *must* be
 * bootstrapped this way (self-registration is disabled for them); voters and
 * auditors can also be provisioned here, which is handy before the services
 * are even running (e.g. `scripts/prepare-for-demo.ts`).
 *
 * Credentials may be supplied three ways, so that values containing shell
 * metacharacters (`$`, `!`, `"`, spaces, a leading `-`, …) always survive
 * intact:
 *
 *   1. `--password-stdin` — read the password from stdin (nothing to quote,
 *      and the secret never appears in `ps`/shell history). Recommended.
 *   2. Environment variables `CREATE_USER_{TYPE,NAME,EMAIL,PASSWORD}`.
 *   3. Flags `--name/--email/--password`, in either `--flag value` or
 *      `--flag=value` form. Values are taken verbatim — a value may start with
 *      a dash or contain `=`.
 */

const APP_BY_USER_TYPE: Record<EUserType, () => App> = {
  [EUserType.ADMINS]: () => new AdminApp(),
  [EUserType.VOTERS]: () => new VotersApp(),
  [EUserType.AUDITORS]: () => new AuditorsApp(),
};

const USER_TYPES = Object.keys(APP_BY_USER_TYPE) as EUserType[];

const VALUE_FLAGS = ["user-type", "name", "email", "password"] as const;
const BOOLEAN_FLAGS = ["password-stdin", "skip-existing", "help"] as const;

type ValueFlag = (typeof VALUE_FLAGS)[number];
type BooleanFlag = (typeof BOOLEAN_FLAGS)[number];

const MIN_PASSWORD_LENGTH = 8;

const usage = (invokedAs: string) =>
  [
    `Usage: bun run ${invokedAs} -- --name "Jane Doe" --email jane@example.com --password-stdin`,
    ``,
    `Flags`,
    `  --user-type <${USER_TYPES.join("|")}>   identity domain to create the account in`,
    `  --name <name>                          display name`,
    `  --email <email>                        login email`,
    `  --password <password>                  password (min ${MIN_PASSWORD_LENGTH} chars); prefer`,
    `                                         --password-stdin or CREATE_USER_PASSWORD so the`,
    `                                         secret stays out of argv and shell history`,
    `  --password-stdin                       read the password from stdin instead`,
    `  --skip-existing                        exit 0 instead of failing if the email is taken`,
    `  --help                                 show this help`,
    ``,
    `Environment fallbacks: CREATE_USER_TYPE, CREATE_USER_NAME, CREATE_USER_EMAIL,`,
    `CREATE_USER_PASSWORD. Flags win over the environment.`,
  ].join("\n");

class UsageError extends Error {}

interface ParsedArgs {
  values: Partial<Record<ValueFlag, string>>;
  flags: Set<BooleanFlag>;
}

/**
 * A deliberately small, permissive parser. `node:util`'s `parseArgs` rejects
 * any value that starts with a dash ("argument is ambiguous"), which makes it
 * unusable for arbitrary passwords; here the token after a value flag is
 * always consumed as-is.
 */
export function parseArgv(argv: readonly string[]): ParsedArgs {
  const values: Partial<Record<ValueFlag, string>> = {};
  const flags = new Set<BooleanFlag>();

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i]!;

    // Tolerate the `--` separator that `bun run <script> -- …` may forward.
    if (token === "--") continue;

    if (!token.startsWith("--")) {
      throw new UsageError(`Unexpected argument: ${token}`);
    }

    const eq = token.indexOf("=");
    const key = (eq === -1 ? token.slice(2) : token.slice(2, eq)) as string;
    const inline = eq === -1 ? undefined : token.slice(eq + 1);

    if ((BOOLEAN_FLAGS as readonly string[]).includes(key)) {
      if (inline !== undefined && inline !== "true") {
        if (inline === "false") continue;
        throw new UsageError(`--${key} does not take a value`);
      }
      flags.add(key as BooleanFlag);
      continue;
    }

    if (!(VALUE_FLAGS as readonly string[]).includes(key)) {
      throw new UsageError(`Unknown option: --${key}`);
    }

    if (inline !== undefined) {
      values[key as ValueFlag] = inline;
      continue;
    }

    // Consume the next token verbatim, dashes and all.
    if (i + 1 >= argv.length) {
      throw new UsageError(`Missing value for --${key}`);
    }
    values[key as ValueFlag] = argv[++i]!;
  }

  return { values, flags };
}

function assertUserType(value: string): EUserType {
  if ((USER_TYPES as readonly string[]).includes(value)) {
    return value as EUserType;
  }
  throw new UsageError(
    `Invalid --user-type "${value}". Must be one of ${USER_TYPES.join(", ")}.`,
  );
}

/** Strips the single trailing newline a heredoc/`echo` pipe adds. */
function readPasswordFromStdin(): Promise<string> {
  return Bun.stdin.text().then((text) => text.replace(/\r?\n$/, ""));
}

function isEmailTaken(error: APIError): boolean {
  const code = (error.body as { code?: string } | undefined)?.code;
  if (code === "USER_ALREADY_EXISTS") return true;
  const message = error.body?.message ?? error.message;
  return /already exists|already registered/i.test(message ?? "");
}

export interface CreateUserOptions {
  /** Domain used when `--user-type`/`CREATE_USER_TYPE` is absent. */
  defaultUserType?: EUserType;
  /** Script name shown in the usage text. */
  invokedAs?: string;
  argv?: readonly string[];
}

export async function main(options: CreateUserOptions = {}): Promise<void> {
  const invokedAs = options.invokedAs ?? "create-user";
  const argv = options.argv ?? process.argv.slice(2);

  let parsed: ParsedArgs;
  try {
    parsed = parseArgv(argv);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(`${error.message}\n\n${usage(invokedAs)}`);
      process.exit(1);
    }
    throw error;
  }

  const { values, flags } = parsed;
  if (flags.has("help")) {
    console.log(usage(invokedAs));
    return;
  }

  const env = process.env;
  const name = values.name ?? env.CREATE_USER_NAME;
  const email = values.email ?? env.CREATE_USER_EMAIL;
  const password = flags.has("password-stdin")
    ? await readPasswordFromStdin()
    : (values.password ?? env.CREATE_USER_PASSWORD);

  let userType: EUserType;
  try {
    const requested = values["user-type"] ?? env.CREATE_USER_TYPE;
    userType = requested
      ? assertUserType(requested)
      : (options.defaultUserType ?? EUserType.ADMINS);
  } catch (error) {
    if (error instanceof UsageError) {
      console.error(error.message);
      process.exit(1);
    }
    throw error;
  }

  if (!name || !email || !password) {
    const missing = [
      !name && "name",
      !email && "email",
      !password && "password",
    ].filter(Boolean);
    console.error(
      `Missing required ${missing.join(", ")}.\n\n${usage(invokedAs)}`,
    );
    process.exit(1);
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(
      `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
    );
    process.exit(1);
  }

  const app = APP_BY_USER_TYPE[userType]();
  console.log({ name, email, password })
  try {
    const { user } = await app.auth.api.createUser({
      body: { name, email, password },
    });
    console.log(`Created ${userType} ${user.email} (${user.id})`);
  } catch (error) {
    if (error instanceof APIError) {
      if (flags.has("skip-existing") && isEmailTaken(error)) {
        console.log(`Skipped ${userType} ${email} (already exists)`);
        return;
      }
      console.error(
        `Failed to create ${userType} ${email}: ` +
          `${error.body?.message ?? error.message}`,
      );
      process.exit(1);
    }
    throw error;
  } finally {
    await app.dbPool.end();
  }
}

if (import.meta.main) {
  await main();
}
