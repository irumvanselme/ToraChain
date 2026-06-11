import { beforeEach, describe, expect, test } from "vitest";

import { ElectionsService } from "../elections/service.ts";
import {
  FakeAuthCore,
  FakeAuthDirectory,
  InMemoryElectionsRepository,
  InMemoryVotersRepository,
} from "../test-helpers/fakes.ts";
import { VotersService } from "./service.ts";

let elections: InMemoryElectionsRepository;
let voters: InMemoryVotersRepository;
let directory: FakeAuthDirectory;
let authCore: FakeAuthCore;
let service: VotersService;
let electionId: string;

beforeEach(() => {
  elections = new InMemoryElectionsRepository();
  voters = new InMemoryVotersRepository();
  directory = new FakeAuthDirectory(true);
  authCore = new FakeAuthCore(true);
  service = new VotersService(
    voters,
    new ElectionsService(elections),
    directory,
    authCore,
  );
  electionId = elections.seed().electionId;
});

const expectError = async (
  fn: () => Promise<unknown>,
  code: string,
  status: number,
) => {
  await expect(fn()).rejects.toMatchObject({ code, status });
};

describe("grant", () => {
  test("creates a voter + eligibility and links the account id", async () => {
    directory.add("voter@example.com", "acct-1");
    const eligibility = await service.grant(electionId, {
      email: "voter@example.com",
    });
    expect(eligibility).toMatchObject({
      electionId,
      hasVoted: false,
      deleted: false,
      accountId: "acct-1",
    });
  });

  test("404 when the account is not found and verification is enforced", async () => {
    await expectError(
      () => service.grant(electionId, { email: "ghost@example.com" }),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("lenient mode grants without an account when not enforced", async () => {
    const lenient = new VotersService(
      voters,
      new ElectionsService(elections),
      new FakeAuthDirectory(false),
    );
    const eligibility = await lenient.grant(electionId, {
      email: "x@example.com",
    });
    expect(eligibility.accountId).toBeNull();
  });

  test("409 ALREADY_ELIGIBLE on a second grant", async () => {
    directory.add("voter@example.com");
    await service.grant(electionId, { email: "voter@example.com" });
    await expectError(
      () => service.grant(electionId, { email: "voter@example.com" }),
      "ALREADY_ELIGIBLE",
      409,
    );
  });

  test("re-grants a previously revoked eligibility", async () => {
    directory.add("voter@example.com");
    const first = await service.grant(electionId, {
      email: "voter@example.com",
    });
    await service.remove(electionId, first.voterId);
    const again = await service.grant(electionId, {
      email: "voter@example.com",
    });
    expect(again.eligibilityId).toBe(first.eligibilityId);
    expect(again.deleted).toBe(false);
  });

  test("grants by voterUserId, resolving email + accountId from auth core", async () => {
    authCore.add({
      id: "auth-user-1",
      email: "Voter@Example.com",
      name: "Ada",
    });
    const eligibility = await service.grant(electionId, {
      voterUserId: "auth-user-1",
    });
    expect(eligibility.accountId).toBe("auth-user-1");
    // The voter is stored under the normalized email from the auth service.
    expect(await voters.findVoterByEmail("voter@example.com")).not.toBeNull();
  });

  test("404 when the voterUserId is unknown to auth core", async () => {
    await expectError(
      () => service.grant(electionId, { voterUserId: "ghost" }),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });

  test("400 when neither email nor voterUserId is provided", async () => {
    await expectError(
      () => service.grant(electionId, {}),
      "VALIDATION_ERROR",
      400,
    );
  });
});

describe("list (cursor)", () => {
  test("walks pages via nextCursor", async () => {
    const dir = new FakeAuthDirectory(false);
    const svc = new VotersService(voters, new ElectionsService(elections), dir);
    for (let i = 0; i < 3; i++) {
      await svc.grant(electionId, { email: `v${i}@example.com` });
    }
    const page1 = await svc.list(electionId, { limit: 2 });
    expect(page1.data).toHaveLength(2);
    expect(page1.pagination.nextCursor).toBeTypeOf("string");

    const page2 = await svc.list(electionId, {
      limit: 2,
      cursor: page1.pagination.nextCursor!,
    });
    expect(page2.data).toHaveLength(1);
    expect(page2.pagination.nextCursor).toBeNull();
  });
});

describe("patch / remove after voting", () => {
  test("patch rejects email change after voting with 422 ALREADY_VOTED", async () => {
    const voter = voters.seedVoter({ email: "v@example.com" });
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId,
      hasVoted: true,
    });
    await expectError(
      () =>
        service.patch(electionId, voter.voterId, { email: "n@example.com" }),
      "ALREADY_VOTED",
      422,
    );
  });

  test("remove rejects revoking after voting with 409 ALREADY_VOTED", async () => {
    const voter = voters.seedVoter();
    voters.seedEligibility({
      voterId: voter.voterId,
      electionId,
      hasVoted: true,
    });
    await expectError(
      () => service.remove(electionId, voter.voterId),
      "ALREADY_VOTED",
      409,
    );
  });

  test("get returns 404 when the voter has no eligibility", async () => {
    await expectError(
      () => service.get(electionId, "88888888-8888-8888-8888-888888888888"),
      "RESOURCE_NOT_FOUND",
      404,
    );
  });
});
