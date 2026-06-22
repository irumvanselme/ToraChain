import { expect, test } from "vitest";

import {
  createElection,
  grantVoter,
  integrationSuite,
} from "tests/integration/seed";

integrationSuite("Voters", (ctx) => {
  test("grants eligibility (lenient mode — no auth DB)", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Roll" });

    const grant = await call<{ voterId: string; hasVoted: boolean }>(
      "POST",
      `/elections/${electionId}/voters`,
      { email: "voter@example.com" },
    );
    expect(grant.status).toBe(201);
    expect(grant.body.hasVoted).toBe(false);
    expect(grant.body.voterId).toBeTypeOf("string");
  });

  test("grants eligibility by voterUserId via the mocked auth core", async () => {
    const { call, authCore } = ctx();
    authCore.add({
      id: "auth-user-1",
      email: "by-id@example.com",
      name: "Ada",
    });
    const { electionId } = await createElection(call, { title: "By id" });

    const grant = await call<{ accountId: string | null; voterId: string }>(
      "POST",
      `/elections/${electionId}/voters`,
      { voterUserId: "auth-user-1" },
    );
    expect(grant.status).toBe(201);
    expect(grant.body.accountId).toBe("auth-user-1");

    // The same voter is now listed for the election.
    const list = await call<{ data: { voterId: string }[] }>(
      "GET",
      `/elections/${electionId}/voters`,
    );
    expect(list.body.data.map((v) => v.voterId)).toContain(grant.body.voterId);
  });

  test("404 when granting by an unknown voterUserId", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Unknown" });
    const res = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/voters`,
      { voterUserId: "does-not-exist" },
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
  });

  test("rejects a duplicate eligibility grant", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Roll" });
    await grantVoter(call, electionId, "voter@example.com");

    const dup = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/voters`,
      { email: "voter@example.com" },
    );
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe("ALREADY_ELIGIBLE");
  });

  test("voters list uses cursor pagination", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Cursor" });
    for (let i = 0; i < 5; i++) {
      await grantVoter(call, electionId, `voter${i}@example.com`);
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
