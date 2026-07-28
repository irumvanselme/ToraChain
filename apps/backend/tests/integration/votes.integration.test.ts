import { createHash } from "node:crypto";

import { sql } from "drizzle-orm";
import { expect, test } from "vitest";

import {
  integrationSuite,
  seedActiveElection,
  setStatus,
} from "tests/integration/seed";

const sha256Hex = (s: string) => createHash("sha256").update(s).digest("hex");

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

  test("the votes table carries no column that resolves to a voter", async () => {
    const { database } = ctx();

    const { rows } = await database.db.execute<{ column_name: string }>(
      sql`select column_name from information_schema.columns
          where table_schema = 'public' and table_name = 'votes'`,
    );
    const columns = rows.map((r) => r.column_name).sort();

    // Pinned deliberately: any new column here needs the same scrutiny, since
    // `candidate_id` lives in this row and anything voter-shaped next to it
    // reveals who voted for whom to anyone who can read the database.
    expect(columns).toEqual([
      "candidate_id",
      "cast_at",
      "ciphertext",
      "commitment",
      "election_id",
      "vote_id",
    ]);
  });

  test("a database reader cannot join a cast ballot back to its voter", async () => {
    const { call, database } = ctx();
    const { electionId, jane, voterId } = await seedActiveElection(call);

    await call("POST", `/elections/${electionId}/voter/${voterId}/vote`, {
      candidateId: jane.candidateId,
    });

    const eligibility = await database.db.execute<{
      eligibility_id: string;
      voting_number: string;
      has_voted: boolean;
      updated_at: Date;
      created_at: Date;
    }>(sql`select * from eligibilities where voter_id = ${voterId}::uuid`);
    const row = eligibility.rows[0]!;

    // Everything the votes table stores, as a plain string — the "bare eyes"
    // view of a database dump.
    const votes = await database.db.execute(sql`select * from votes`);
    expect(votes.rows).toHaveLength(1);
    const dumped = JSON.stringify(votes.rows[0]);

    expect(dumped).not.toContain(voterId);
    expect(dumped).not.toContain(row.eligibility_id);
    expect(dumped).not.toContain(row.voting_number);

    // …and the eligibility must not have been stamped with the moment of the
    // vote, which would re-link the two rows by timing alone.
    expect(row.has_voted).toBe(true);
    expect(new Date(row.updated_at).getTime()).toBe(
      new Date(row.created_at).getTime(),
    );
  });

  test("verifies a ballot from the vote id in the voter's receipt", async () => {
    const { call } = ctx();
    const { electionId, jane, voterId } = await seedActiveElection(call);

    const ciphertext = "encrypted-ballot-record";
    const cast = await call<{ voteId: string }>(
      "POST",
      `/elections/${electionId}/voter/${voterId}/vote`,
      {
        candidateId: jane.candidateId,
        ciphertext,
        commitment: sha256Hex(ciphertext),
      },
    );
    expect(cast.status).toBe(201);

    const verified = await call<{
      countedCandidateId: string;
      ciphertext: string;
      commitment: string;
      electionId: string;
    }>("GET", `/votes/${cast.body.voteId}/verify`);

    expect(verified.status).toBe(200);
    expect(verified.body).toMatchObject({
      electionId,
      countedCandidateId: jane.candidateId,
      ciphertext,
      commitment: sha256Hex(ciphertext),
    });
  });

  test("404s for a vote id that was never issued", async () => {
    const { call } = ctx();
    const res = await call<{ code: string }>(
      "GET",
      "/votes/99999999-9999-9999-9999-999999999999/verify",
    );
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("RESOURCE_NOT_FOUND");
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
