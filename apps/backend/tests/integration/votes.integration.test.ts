import { expect, test } from "vitest";

import {
  integrationSuite,
  seedActiveElection,
  setStatus,
} from "tests/integration/seed";

integrationSuite("Voting", (ctx) => {
  test("reads the ballot for an eligible voter", async () => {
    const { call } = ctx();
    const { electionId, voterId } = await seedActiveElection(call);

    const ballot = await call<{
      candidates: unknown[];
      voter: { hasVoted: boolean; votingNumber: string };
    }>("GET", `/elections/${electionId}/voter/${voterId}/vote`);
    expect(ballot.status).toBe(200);
    expect(ballot.body.candidates).toHaveLength(2);
    expect(ballot.body.voter.hasVoted).toBe(false);
    expect(ballot.body.voter.votingNumber).toMatch(/^\d+$/);
  });

  test("casts a ballot, then rejects a second", async () => {
    const { call } = ctx();
    const { electionId, jane, john, voterId } = await seedActiveElection(call);

    const vote = await call<{ accepted: boolean; votingNumber: string }>(
      "POST",
      `/elections/${electionId}/voter/${voterId}/vote`,
      { candidateId: jane.candidateId },
    );
    expect(vote.status).toBe(201);
    expect(vote.body.accepted).toBe(true);

    const second = await call<{ code: string }>(
      "POST",
      `/elections/${electionId}/voter/${voterId}/vote`,
      { candidateId: john.candidateId },
    );
    expect(second.status).toBe(409);
    expect(second.body.code).toBe("ALREADY_VOTED");
  });

  test("closing the election surfaces tallies on the ballot", async () => {
    const { call } = ctx();
    const { electionId, jane, voterId } = await seedActiveElection(call);

    await call("POST", `/elections/${electionId}/voter/${voterId}/vote`, {
      candidateId: jane.candidateId,
    });
    await setStatus(call, electionId, "ended");

    const closedBallot = await call<{
      candidates: { candidateId: string; votes: number }[];
    }>("GET", `/elections/${electionId}/voter/${voterId}/vote`);
    const tally = closedBallot.body.candidates.find(
      (c) => c.candidateId === jane.candidateId,
    );
    expect(tally?.votes).toBe(1);
  });
});
