import { expect, test } from "vitest";

import {
  createElection,
  integrationSuite,
  setStatus,
} from "tests/integration/seed";

integrationSuite("Elections", (ctx) => {
  test("creates a draft election", async () => {
    const { call } = ctx();
    const created = await call<{ electionId: string; status: string }>(
      "POST",
      "/elections",
      { title: "2026 General Election", description: "Nationwide." },
    );
    expect(created.status).toBe(201);
    expect(created.body.status).toBe("draft");
    expect(created.body.electionId).toBeTypeOf("string");
  });

  test("moves through draft → active → closed", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Lifecycle" });

    const active = await setStatus(call, electionId, "active");
    expect(active.status).toBe("active");

    const closed = await setStatus(call, electionId, "ended");
    expect(closed.status).toBe("ended");
  });

  test("active elections cannot be deleted", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Locked" });
    await setStatus(call, electionId, "active");

    const del = await call<{ code: string }>(
      "DELETE",
      `/elections/${electionId}`,
    );
    expect(del.status).toBe(409);
    expect(del.body.code).toBe("CANNOT_DELETE_ACTIVE");
  });

  test("soft delete hides elections from the default list", async () => {
    const { call } = ctx();
    const a = await createElection(call, { title: "Keep" });
    const b = await createElection(call, { title: "Trash" });

    const del = await call("DELETE", `/elections/${b.electionId}`);
    expect(del.status).toBe(200);

    const list = await call<{ data: { electionId: string }[] }>(
      "GET",
      "/elections",
    );
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]!.electionId).toBe(a.electionId);

    const trash = await call<{ data: { electionId: string }[] }>(
      "GET",
      "/elections?trash=true",
    );
    expect(trash.body.data).toHaveLength(1);
    expect(trash.body.data[0]!.electionId).toBe(b.electionId);

    // Deleted rows are excluded from get-by-id unless includeDeleted.
    const hidden = await call("GET", `/elections/${b.electionId}`);
    expect(hidden.status).toBe(404);
    const shown = await call(
      "GET",
      `/elections/${b.electionId}?includeDeleted=true`,
    );
    expect(shown.status).toBe(200);
  });
});
