import { EUserType } from "app/types.ts";

const TIMEOUT_MS = Number(process.env.HEALTH_CHECK_TIMEOUT ?? 5000);

interface Check {
  label: string;
  url: string;
}

interface Result extends Check {
  ok: boolean;
  detail: string;
}

function resolveBaseUrl(): string {
  const fromArg = process.argv[2];
  const raw =
    fromArg ??
    process.env.HEALTH_CHECK_URL ??
    process.env.BETTER_AUTH_URL ??
    `http://localhost:${process.env.PORT ?? 3000}`;
  return raw.replace(/\/+$/, "");
}

function buildChecks(baseUrl: string): Check[] {
  const checks: Check[] = [];
  for (const userType of Object.values(EUserType)) {
    checks.push({ label: `${userType}/ok`, url: `${baseUrl}/${userType}/ok` });
    checks.push({
      label: `${userType}/api/ok`,
      url: `${baseUrl}/${userType}/api/ok`,
    });
  }
  checks.push({ label: "health", url: `${baseUrl}/health` });
  return checks;
}

function isOkBody(body: unknown): boolean {
  return (
    typeof body === "object" &&
    body !== null &&
    (body as Record<string, unknown>).ok === true
  );
}

async function runCheck(check: Check): Promise<Result> {
  try {
    const res = await fetch(check.url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const text = await res.text();
    let body: unknown = text;
    try {
      body = JSON.parse(text);
    } catch {
      /* keep raw text for the failure message */
    }

    const ok = res.status === 200 && isOkBody(body);
    return {
      ...check,
      ok,
      detail: ok
        ? "200 { ok: true }"
        : `${res.status} ${typeof body === "string" ? body.slice(0, 80) : JSON.stringify(body)}`,
    };
  } catch (err) {
    return {
      ...check,
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

async function main(): Promise<void> {
  const baseUrl = resolveBaseUrl();
  const checks = buildChecks(baseUrl);

  console.log(`Health-checking ${checks.length} endpoints at ${baseUrl}\n`);

  const width = Math.max(...checks.map((c) => c.label.length));
  let failures = 0;

  // Sequential keeps output ordered and readable.
  for (const check of checks) {
    const result = await runCheck(check);
    const icon = result.ok ? "✓" : "✗";
    const line = `  ${icon} ${result.label.padEnd(width)}  ${result.detail}`;
    if (result.ok) {
      console.log(line);
    } else {
      failures += 1;
      console.error(line);
    }
  }

  const passed = checks.length - failures;
  console.log(`\n${passed}/${checks.length} passed`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
