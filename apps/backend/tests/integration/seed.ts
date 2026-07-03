import { afterAll, beforeAll, beforeEach, describe } from "vitest";
import type { Database } from "@tora-chain/be-common/database";

import { FakeAuthCore } from "../../app/test-helpers/fakes.ts";
import { AllowAllVerifier } from "../../app/test-helpers/auth.ts";
import { bootstrapDatabase, hasTestDb, truncateAll } from "./setup.ts";

export interface TestApp {
  handle(request: Request): Promise<Response>;
}

export interface CallResult<T> {
  status: number;
  body: T;
}

export type Call = <T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
) => Promise<CallResult<T>>;

export interface TestContext {
  database: Database;
  app: TestApp;
  call: Call;
  /** The mocked auth /core client — never hits the network in tests. */
  authCore: FakeAuthCore;
}

/** Boot the elections app against the (freshly migrated) test database. */
export async function setupContext(): Promise<TestContext> {
  const database = await bootstrapDatabase();
  const { buildServices, buildApp } = await import("../../app/app.ts");
  const { NullAuthDirectory } =
    await import("../../app/voters/auth-directory.ts");
  // The auth /core API is mocked in integration tests — no network access.
  const authCore = new FakeAuthCore(true);
  const services = buildServices(
    database.db,
    new NullAuthDirectory(),
    authCore,
  );
  // Bypass JWT verification in integration tests — every route is protected,
  // but we exercise them without minting real tokens.
  const app = buildApp(
    services,
    database,
    undefined,
    new AllowAllVerifier(),
  ) as TestApp;

  const call: Call = async (method, path, body) => {
    const res = await app.handle(
      new Request(`http://localhost${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      }),
    );
    return { status: res.status, body: (await res.json()) as never };
  };

  return { database, app, call, authCore };
}

/**
 * Register an integration suite that owns one app + database for its lifetime
 * and truncates between tests. The suite skips itself when no test database is
 * configured (see {@link hasTestDb}).
 *
 * The whole integration run shares a single database and executes serially
 * (see `vitest.integration.config.ts`), so per-suite bootstrap is safe.
 */
export function integrationSuite(
  name: string,
  define: (ctx: () => TestContext) => void,
): void {
  const suite = hasTestDb ? describe : describe.skip;
  suite(name, () => {
    let context: TestContext;

    beforeAll(async () => {
      context = await setupContext();
    });

    afterAll(async () => {
      if (context?.database) await context.database.close();
    });

    beforeEach(async () => {
      await truncateAll(context.database);
    });

    define(() => context);
  });
}

// ---- Fixtures ------------------------------------------------------------
// Small helpers to set up preconditions through the public HTTP surface, so
// each resource's suite can stand up just the state it needs.

export async function createElection(
  call: Call,
  body: Record<string, unknown> = { title: "Test Election" },
): Promise<{ electionId: string; status: string }> {
  const res = await call<{ electionId: string; status: string }>(
    "POST",
    "/elections",
    body,
  );
  return res.body;
}

export async function addCandidate(
  call: Call,
  electionId: string,
  body: Record<string, unknown>,
): Promise<{ candidateId: string }> {
  const res = await call<{ candidateId: string }>(
    "POST",
    `/elections/${electionId}/candidates`,
    body,
  );
  return res.body;
}

export async function grantVoter(
  call: Call,
  electionId: string,
  email: string,
): Promise<{ voterId: string; hasVoted: boolean }> {
  const res = await call<{ voterId: string; hasVoted: boolean }>(
    "POST",
    `/elections/${electionId}/voters`,
    { email },
  );
  return res.body;
}

export async function setStatus(
  call: Call,
  electionId: string,
  status: string,
): Promise<{ status: string }> {
  const res = await call<{ status: string }>(
    "PATCH",
    `/elections/${electionId}`,
    { status },
  );
  return res.body;
}

/**
 * Stand up an `active` election with two candidates and one eligible voter —
 * the precondition the voting suite exercises.
 */
export async function seedActiveElection(call: Call): Promise<{
  electionId: string;
  jane: { candidateId: string };
  john: { candidateId: string };
  voterId: string;
}> {
  const { electionId } = await createElection(call, {
    title: "Seeded Election",
  });
  const jane = await addCandidate(call, electionId, {
    fullName: "Jane Doe",
    manifesto: "A fairer future.",
  });
  const john = await addCandidate(call, electionId, { fullName: "John Roe" });
  const { voterId } = await grantVoter(call, electionId, "voter@example.com");
  await setStatus(call, electionId, "active");
  return { electionId, jane, john, voterId };
}
