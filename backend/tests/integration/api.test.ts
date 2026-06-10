import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "vitest";
import type { Database } from "@tora-chain/be-common/database";

import { bootstrapDatabase, hasTestDb, truncateAll } from "./setup.ts";

interface App {
  handle(request: Request): Promise<Response>;
}

let database: Database;
let app: App;

async function call<T = Record<string, unknown>>(
  method: string,
  path: string,
  body?: unknown,
): Promise<{ status: number; body: T }> {
  const res = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers: body ? { "content-type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }),
  );
  return { status: res.status, body: (await res.json()) as T };
}

// Skip the whole suite unless a test database is configured.
const suite = hasTestDb ? describe : describe.skip;

suite("Elections API integration", () => {
  beforeAll(async () => {
    database = await bootstrapDatabase();
    const { buildServices, buildApp } = await import("../../app/app.ts");
    const { NullAuthDirectory } =
      await import("../../app/voters/auth-directory.ts");
    const services = buildServices(database.db, new NullAuthDirectory());
    app = buildApp(services, database) as App;
  });

  afterAll(async () => {
    if (database) await database.close();
  });

  beforeEach(async () => {
    await truncateAll(database);
  });

  test("full election lifecycle: create → candidates → voters → vote", async () => {
    // Create a draft election.
    const created = await call<{ electionId: string; status: string }>(
      "POST",
      "/elections",
      { title: "2026 General Election", description: "Nationwide." },
    );
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("draft");
    const electionId = created.body.electionId;

    // Add two candidates while the election is editable.
    const jane = await call<{ candidateId: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "Jane Doe", manifesto: "A fairer future." },
    );
    expect(jane.status).toBe(201);
    const john = await call<{ candidateId: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "John Roe" },
    );
    expect(john.status).toBe(201);

    const candidateList = await call<{ data: unknown[] }>(
      "GET",
      `/elections/${electionId}/candidates`,
    );
    expect(candidateList.body.data).toHaveLength(2);

    // Grant a voter eligibility (lenient mode — no auth DB).
    const grant = await call<{ voterId: string; hasVoted: boolean }>(
      "POST",
      `/elections/${electionId}/voters`,
      { email: "voter@example.com" },
    );
    expect(grant.status).toBe(201);
    expect(grant.body.hasVoted).toBe(false);
    const voterId = grant.body.voterId;

    // Duplicate grant is rejected.
    const dup = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/voters`,
      { email: "voter@example.com" },
    );
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe("ALREADY_ELIGIBLE");

    // Candidates lock once the election goes active.
    const activate = await call<{ status: string }>(
      "PATCH",
      `/elections/${electionId}`,
      { status: "active" },
    );
    expect(activate.body.status).toBe("active");
    const locked = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "Too Late" },
    );
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe("CANDIDATES_LOCKED");

    // Read the ballot.
    const ballot = await call<{
      candidates: unknown[];
      voter: { hasVoted: boolean; votingNumber: string };
    }>("GET", `/elections/${electionId}/voter/${voterId}/vote`);
    expect(ballot.status).toBe(200);
    expect(ballot.body.candidates).toHaveLength(2);
    expect(ballot.body.voter.hasVoted).toBe(false);
    expect(ballot.body.voter.votingNumber).toMatch(/^\d+$/);

    // Cast a ballot.
    const vote = await call<{ accepted: boolean; votingNumber: string }>(
      "POST",
      `/elections/${electionId}/voter/${voterId}/vote`,
      { candidateId: jane.body.candidateId },
    );
    expect(vote.status).toBe(201);
    expect(vote.body.accepted).toBe(true);

    // Second ballot is rejected.
    const second = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/voter/${voterId}/vote`,
      { candidateId: john.body.candidateId },
    );
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_VOTED");

    // Active elections cannot be deleted.
    const del = await call<{ code: string }>(
      "DELETE",
      `/elections/${electionId}`,
    );
    expect(del.status).toBe(409);
    expect(del.body.code).toBe("CANNOT_DELETE_ACTIVE");

    // Closing the election surfaces tallies on the ballot.
    await call("PATCH", `/elections/${electionId}`, { status: "closed" });
    const closedBallot = await call<{
      candidates: { candidateId: string; votes: number }[];
    }>("GET", `/elections/${electionId}/voter/${voterId}/vote`);
    const tally = closedBallot.body.candidates.find(
      (c) => c.candidateId === jane.body.candidateId,
    );
    expect(tally?.votes).toBe(1);
  });

  test("soft delete hides elections from the default list", async () => {
    const a = await call<{ electionId: string }>("POST", "/elections", {
      title: "Keep",
    });
    const b = await call<{ electionId: string }>("POST", "/elections", {
      title: "Trash",
    });

    const del = await call("DELETE", `/elections/${b.body.electionId}`);
    expect(del.status).toBe(200);

    const list = await call<{ data: { electionId: string }[] }>(
      "GET",
      "/elections",
    );
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]!.electionId).toBe(a.body.electionId);

    const trash = await call<{ data: { electionId: string }[] }>(
      "GET",
      "/elections?trash=true",
    );
    expect(trash.body.data).toHaveLength(1);
    expect(trash.body.data[0]!.electionId).toBe(b.body.electionId);

    // Deleted rows are excluded from get-by-id unless includeDeleted.
    const hidden = await call("GET", `/elections/${b.body.electionId}`);
    expect(hidden.status).toBe(404);
    const shown = await call(
      "GET",
      `/elections/${b.body.electionId}?includeDeleted=true`,
    );
    expect(shown.status).toBe(200);
  });

  test("voters list uses cursor pagination", async () => {
    const election = await call<{ electionId: string }>("POST", "/elections", {
      title: "Cursor",
    });
    const electionId = election.body.electionId;
    for (let i = 0; i < 5; i++) {
      await call("POST", `/elections/${electionId}/voters`, {
        email: `voter${i}@example.com`,
      });
    }

    const page1 = await call<{
      data: unknown[];
      pagination: { nextCursor: string | null };
    }>("GET", `/elections/${electionId}/voters?limit=2`);
    expect(page1.body.data).toHaveLength(2);
    expect(page1.body.pagination.nextCursor).toBeTypeOf("string");

    const page2 = await call<{
      data: unknown[];
      pagination: { nextCursor: string | null };
    }>(
      "GET",
      `/elections/${electionId}/voters?limit=2&cursor=${encodeURIComponent(
        page1.body.pagination.nextCursor!,
      )}`,
    );
    expect(page2.body.data).toHaveLength(2);

    const page3 = await call<{
      data: unknown[];
      pagination: { nextCursor: string | null };
    }>(
      "GET",
      `/elections/${electionId}/voters?limit=2&cursor=${encodeURIComponent(
        page2.body.pagination.nextCursor!,
      )}`,
    );
    expect(page3.body.data).toHaveLength(1);
    expect(page3.body.pagination.nextCursor).toBeNull();
  });
});
