import { describe, expect, test } from "vitest";

import { decodeCursor } from "../common/pagination.ts";
import { serializeEligibility, type EligibilityWithVoter } from "./model.ts";
import { normalizeEmail, paginateRows } from "./utils.ts";

const row: EligibilityWithVoter = {
  eligibilityId: "55555555-5555-5555-5555-555555555555",
  votingNumber: "5001",
  voterId: "66666666-6666-6666-6666-666666666666",
  electionId: "11111111-1111-1111-1111-111111111111",
  hasVoted: false,
  deleted: false,
  externalVoterId: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
  email: "voter@example.com",
  accountId: "acct-1",
};

describe("serializeEligibility", () => {
  test("maps to the documented DTO including accountId", () => {
    expect(serializeEligibility(row)).toEqual({
      eligibilityId: "55555555-5555-5555-5555-555555555555",
      voterId: "66666666-6666-6666-6666-666666666666",
      accountId: "acct-1",
      electionId: "11111111-1111-1111-1111-111111111111",
      hasVoted: false,
      deleted: false,
      externalVoterId: null,
    });
  });

  test("omits server-side votingNumber and email", () => {
    const dto = serializeEligibility(row) as unknown as Record<string, unknown>;
    expect(dto).not.toHaveProperty("votingNumber");
    expect(dto).not.toHaveProperty("email");
  });
});

describe("normalizeEmail", () => {
  test("trims and lowercases", () => {
    expect(normalizeEmail("  Voter@Example.COM ")).toBe("voter@example.com");
  });
});

describe("paginateRows", () => {
  test("returns null cursor when within limit", () => {
    const { page, nextCursor } = paginateRows([row], 50);
    expect(page).toHaveLength(1);
    expect(nextCursor).toBeNull();
  });

  test("emits a decodable cursor at the page boundary", () => {
    const extra = {
      ...row,
      eligibilityId: "77777777-7777-7777-7777-777777777777",
    };
    const { page, nextCursor } = paginateRows([row, extra], 1);
    expect(page).toHaveLength(1);
    expect(nextCursor).toBeTypeOf("string");
    const decoded = decodeCursor(nextCursor!);
    expect(decoded.id).toBe(row.eligibilityId);
  });
});
