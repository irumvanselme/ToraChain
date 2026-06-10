import { beforeEach, describe, expect, test } from "vitest";

import { ElectionsService } from "../elections/service.ts";
import {
  InMemoryCandidatesRepository,
  InMemoryElectionsRepository,
  InMemoryVotersRepository,
  InMemoryVotesRepository,
} from "../test-helpers/fakes.ts";
import { VotesService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let voters: InMemoryVotersRepository;
let candidates: InMemoryCandidatesRepository;
let votesRepo: InMemoryVotesRepository;
let service: VotesService;

const NOW = new Date("2026-06-09T12:00:00Z");

function buildService() {
  return new VotesService(
    new ElectionsService(elections),
    voters,
    candidates,
    votesRepo,
    () => NOW,
  );
}

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  voters = new InMemoryVotersRepository();
  candidates = new InMemoryCandidatesRepository();
  votesRepo = new InMemoryVotesRepository(voters);
  service = buildService();
});

const expectError = async (
  fn: () => Promise<unknown>,
  code: string,
  status: number,
) => {
  await expect(fn()).rejects.toMatchObject({ code, status });
};

describe("getBallot", () => {
  test("returns the candidate list and voting state", async () => {
    const election = elections.seed({ status: "active" });
    const voter = voters.seedVoter();
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId: election.electionId,
      votingNumber: "5001",
    });
    candidates.seed({ electionId: election.electionId, fullName: "Jane" });

    const ballot = await service.getBallot(election.electionId, voter.voterId);
    expect(ballot).toMatchObject({
      electionId: election.electionId,
      status: "active",
      voter: { voterId: voter.voterId, votingNumber: "5001", hasVoted: false },
    });
    expect(ballot.candidates).toHaveLength(1);
    expect(ballot.candidates[0]).not.toHaveProperty("votes");
  });

  test("403 NOT_ELIGIBLE when the voter exists but is not eligible", async () => {
    const election = elections.seed({ status: "active" });
    const voter = voters.seedVoter();
    await expectError(
      () => service.getBallot(election.electionId, voter.voterId),
      "NOT_ELIGIBLE",
      403,
    );
  });

  test("404 when the voter does not exist", async () => {
    const election = elections.seed({ status: "active" });
    await expectError(
      () =>
        service.getBallot(
          election.electionId,
          "99999999-9999-9999-9999-999999999999",
        ),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("includes tallies once the election is closed", async () => {
    const election = elections.seed({ status: "closed" });
    const voter = voters.seedVoter();
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId: election.electionId,
    });
    candidates.seed({ electionId: election.electionId });
    const ballot = await service.getBallot(election.electionId, voter.voterId);
    expect(ballot.candidates[0]).toHaveProperty("votes", 0);
  });
});

describe("cast", () => {
  function activeElectionWithVoter() {
    const election = elections.seed({ status: "active" });
    const voter = voters.seedVoter();
    const eligibility = voters.seedEligibility({
      voterId: voter.voterId,
      electionId: election.electionId,
      votingNumber: "5001",
    });
    const candidate = candidates.seed({ electionId: election.electionId });
    return { election, voter, eligibility, candidate };
  }

  test("records a ballot and flips hasVoted", async () => {
    const { election, voter, candidate } = activeElectionWithVoter();
    const result = await service.cast(election.electionId, voter.voterId, {
      candidateId: candidate.candidateId,
    });
    expect(result).toMatchObject({ accepted: true, votingNumber: "5001" });
    expect(result.castAt).toMatch(/Z$/);

    const ballot = await service.getBallot(election.electionId, voter.voterId);
    expect(ballot.voter.hasVoted).toBe(true);
  });

  test("409 ALREADY_VOTED on a second ballot", async () => {
    const { election, voter, candidate } = activeElectionWithVoter();
    await service.cast(election.electionId, voter.voterId, {
      candidateId: candidate.candidateId,
    });
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: candidate.candidateId,
        }),
      "ALREADY_VOTED",
      409,
    );
  });

  test("409 ELECTION_NOT_OPEN when the election is not active", async () => {
    const election = elections.seed({ status: "scheduled" });
    const voter = voters.seedVoter();
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId: election.electionId,
    });
    const candidate = candidates.seed({ electionId: election.electionId });
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: candidate.candidateId,
        }),
      "ELECTION_NOT_OPEN",
      409,
    );
  });

  test("409 ELECTION_NOT_OPEN when outside the time window", async () => {
    const election = elections.seed({
      status: "active",
      startTime: new Date("2026-06-10T00:00:00Z"),
      endTime: new Date("2026-06-11T00:00:00Z"),
    });
    const voter = voters.seedVoter();
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId: election.electionId,
    });
    const candidate = candidates.seed({ electionId: election.electionId });
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: candidate.candidateId,
        }),
      "ELECTION_NOT_OPEN",
      409,
    );
  });

  test("422 CANDIDATE_NOT_IN_ELECTION for a candidate from another election", async () => {
    const { election, voter } = activeElectionWithVoter();
    const other = elections.seed({ status: "active" });
    const otherCandidate = candidates.seed({ electionId: other.electionId });
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: otherCandidate.candidateId,
        }),
      "CANDIDATE_NOT_IN_ELECTION",
      422,
    );
  });

  test("404 when the candidate does not exist at all", async () => {
    const { election, voter } = activeElectionWithVoter();
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        }),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("403 NOT_ELIGIBLE when the voter is not eligible", async () => {
    const election = elections.seed({ status: "active" });
    const voter = voters.seedVoter();
    const candidate = candidates.seed({ electionId: election.electionId });
    await expectError(
      () =>
        service.cast(election.electionId, voter.voterId, {
          candidateId: candidate.candidateId,
        }),
      "NOT_ELIGIBLE",
      403,
    );
  });
});
