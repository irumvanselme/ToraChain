import { Elysia } from "elysia";
import { beforeEach, describe, expect, test } from "vitest";

import { errorHandler } from "../common/error-handler.ts";
import { ElectionsService } from "../elections/service.ts";
import {
  InMemoryCandidatesRepository,
  InMemoryElectionsRepository,
  InMemoryVotersRepository,
  InMemoryVotesRepository,
} from "../test-helpers/fakes.ts";
import { readJson, type TestApp } from "../test-helpers/http.ts";
import { testAuthGuard } from "../test-helpers/auth.ts";
import { VotesController } from "./controller.ts";
import { VotesService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let voters: InMemoryVotersRepository;
let candidates: InMemoryCandidatesRepository;
let app: TestApp;

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  voters = new InMemoryVotersRepository();
  candidates = new InMemoryCandidatesRepository();
  const votesRepo = new InMemoryVotesRepository(voters);
  const service = new VotesService(
    new ElectionsService(elections),
    voters,
    candidates,
    votesRepo,
    () => new Date("2026-06-09T12:00:00Z"),
  );
  app = new Elysia()
    .use(errorHandler)
    .use(VotesController(service, testAuthGuard()));
});

const req = (path: string, init?: RequestInit) =>
  app.handle(new Request(`http://localhost${path}`, init));

function activeSetup() {
  const election = elections.seed({ status: "active" });
  const voter = voters.seedVoter();
  voters.seedEligibility({
    voterId: voter.voterId,
    electionId: election.electionId,
    votingNumber: "5001",
  });
  const candidate = candidates.seed({ electionId: election.electionId });
  return { election, voter, candidate };
}

describe("GET /elections/:id/voter/:voterId/vote", () => {
  test("returns the ballot state", async () => {
    const { election, voter } = activeSetup();
    const res = await req(
      `/elections/${election.electionId}/voter/${voter.voterId}/vote`,
    );
    expect(res.status).toBe(200);
    const body = await readJson(res);
    expect(body.voter).toMatchObject({ votingNumber: "5001", hasVoted: false });
    expect(body.candidates).toHaveLength(1);
  });

  test("403 NOT_ELIGIBLE for an ineligible voter", async () => {
    const election = elections.seed({ status: "active" });
    const voter = voters.seedVoter();
    const res = await req(
      `/elections/${election.electionId}/voter/${voter.voterId}/vote`,
    );
    expect(res.status).toBe(403);
    expect((await readJson(res)).code).toBe("NOT_ELIGIBLE");
  });
});

describe("POST /elections/:id/voter/:voterId/vote", () => {
  test("201 casts a ballot", async () => {
    const { election, voter, candidate } = activeSetup();
    const res = await req(
      `/elections/${election.electionId}/voter/${voter.voterId}/vote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.candidateId }),
      },
    );
    expect(res.status).toBe(201);
    const body = await readJson(res);
    expect(body).toMatchObject({ accepted: true, votingNumber: "5001" });
    // The voter needs the id to build their `<voteId>:<key>` receipt — it is
    // their only route back to a ballot the database cannot tie to them.
    expect(body.voteId).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("GET /votes/:voteId/verify", () => {
  async function cast() {
    const { election, voter, candidate } = activeSetup();
    const res = await req(
      `/elections/${election.electionId}/voter/${voter.voterId}/vote`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ candidateId: candidate.candidateId }),
      },
    );
    return { election, candidate, voteId: (await readJson(res)).voteId };
  }

  test("returns the stored side of the ballot for the receipt's vote id", async () => {
    const { election, candidate, voteId } = await cast();
    const res = await req(`/votes/${voteId}/verify`);
    expect(res.status).toBe(200);
    expect(await readJson(res)).toMatchObject({
      voteId,
      electionId: election.electionId,
      countedCandidateId: candidate.candidateId,
    });
  });

  test("404 for an unknown vote id", async () => {
    await cast();
    const res = await req(`/votes/99999999-9999-9999-9999-999999999999/verify`);
    expect(res.status).toBe(404);
    expect((await readJson(res)).code).toBe("RESOURCE_NOT_FOUND");
  });

  test("400 for a malformed vote id", async () => {
    const res = await req("/votes/not-a-uuid/verify");
    expect(res.status).toBe(400);
  });
});
