import { expect, test } from "vitest";

import {
  addCandidate,
  createElection,
  integrationSuite,
  setStatus,
} from "tests/integration/seed";

integrationSuite("Candidates", (ctx) => {
  test("adds candidates while the election is editable", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Ballot" });

    const jane = await call<{ candidateId: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "Jane Doe", manifesto: "A fairer future." },
    );
    expect(jane.status).toBe(201);

    // Manifesto is optional.
    const john = await call<{ candidateId: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "John Roe" },
    );
    expect(john.status).toBe(201);

    const list = await call<{ data: unknown[] }>(
      "GET",
      `/elections/${electionId}/candidates`,
    );
    expect(list.body.data).toHaveLength(2);
  });

  test("candidates lock once the election goes active", async () => {
    const { call } = ctx();
    const { electionId } = await createElection(call, { title: "Locked" });
    await addCandidate(call, electionId, { fullName: "Jane Doe" });
    await setStatus(call, electionId, "active");

    const locked = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/candidates`,
      { fullName: "Too Late" },
    );
    expect(locked.status).toBe(409);
    expect(locked.body.code).toBe("CANDIDATES_LOCKED");
  });
});
