import { beforeEach, describe, expect, test } from "vitest";

import { ElectionsService } from "../elections/service.ts";
import {
  InMemoryCandidatesRepository,
  InMemoryElectionsRepository,
} from "../test-helpers/fakes.ts";
import { CandidatesService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let candidates: InMemoryCandidatesRepository;
let service: CandidatesService;

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  candidates = new InMemoryCandidatesRepository();
  service = new CandidatesService(candidates, new ElectionsService(elections));
});

const expectError = async (
  fn: () => Promise<unknown>,
  code: string,
  status: number,
) => {
  await expect(fn()).rejects.toMatchObject({ code, status });
};

describe("create", () => {
  test("adds a candidate to a draft election with a candidateNumber", async () => {
    const election = elections.seed({ status: "draft" });
    const candidate = await service.create(election.electionId, {
      fullName: "Jane Doe",
    });
    expect(candidate).toMatchObject({
      fullName: "Jane Doe",
      electionId: election.electionId,
      deleted: false,
    });
    expect(candidates.rows.get(candidate.candidateId)!.candidateNumber).toMatch(
      /^\d+$/,
    );
  });

  test("404 when the election does not exist", async () => {
    await expectError(
      () => service.create("missing", { fullName: "X" }),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("409 CANDIDATES_LOCKED once the election is active", async () => {
    const election = elections.seed({ status: "active" });
    await expectError(
      () => service.create(election.electionId, { fullName: "X" }),
      "CANDIDATES_LOCKED",
      409,
    );
  });
});

describe("get / list", () => {
  test("get returns 404 for a candidate in another election", async () => {
    const a = elections.seed();
    const b = elections.seed();
    const candidate = candidates.seed({ electionId: a.electionId });
    await expectError(
      () => service.get(b.electionId, candidate.candidateId),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("list excludes trashed and paginates", async () => {
    const election = elections.seed();
    candidates.seed({ electionId: election.electionId, fullName: "A" });
    candidates.seed({
      electionId: election.electionId,
      fullName: "B",
      deleted: true,
    });
    const result = await service.list(election.electionId, {});
    expect(result.data).toHaveLength(1);
    expect(result.data[0]!.fullName).toBe("A");
  });
});

describe("update / remove", () => {
  test("patch updates only supplied fields", async () => {
    const election = elections.seed({ status: "draft" });
    const candidate = candidates.seed({
      electionId: election.electionId,
      fullName: "Old",
      manifesto: "keep",
    });
    const updated = await service.patch(
      election.electionId,
      candidate.candidateId,
      {
        fullName: "New",
      },
    );
    expect(updated.fullName).toBe("New");
    expect(updated.manifesto).toBe("keep");
  });

  test("remove soft-deletes", async () => {
    const election = elections.seed({ status: "draft" });
    const candidate = candidates.seed({ electionId: election.electionId });
    expect(
      await service.remove(election.electionId, candidate.candidateId),
    ).toEqual({
      candidateId: candidate.candidateId,
      deleted: true,
    });
  });

  test("remove is blocked while the election is locked", async () => {
    const election = elections.seed({ status: "ended" });
    const candidate = candidates.seed({ electionId: election.electionId });
    await expectError(
      () => service.remove(election.electionId, candidate.candidateId),
      "CANDIDATES_LOCKED",
      409,
    );
  });
});
