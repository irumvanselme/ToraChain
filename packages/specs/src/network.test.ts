import { describe, it, expect } from "vitest";

import {
  ALL_ELECTIONS,
  TOPICS,
  newBlockFilter,
  type BlockData,
  type SerializedBlock,
  type NewBlockPayload,
} from "./network.ts";

describe("ALL_ELECTIONS", () => {
  it('is the sentinel value "all"', () => {
    expect(ALL_ELECTIONS).toBe("all");
  });
});

describe("TOPICS", () => {
  it("defines the NEW_BLOCK topic name", () => {
    expect(TOPICS.NEW_BLOCK).toBe("torachain-new-block");
  });

  it("only exposes the known topics", () => {
    expect(Object.keys(TOPICS)).toEqual(["NEW_BLOCK"]);
  });
});

describe("newBlockFilter", () => {
  it("returns undefined (no filter) for ALL_ELECTIONS", () => {
    expect(newBlockFilter(ALL_ELECTIONS)).toBeUndefined();
  });

  it('returns undefined when passed the literal "all"', () => {
    expect(newBlockFilter("all")).toBeUndefined();
  });

  it("builds an attribute filter for a specific election id", () => {
    expect(newBlockFilter("election-123")).toBe(
      'attributes.electionId = "election-123"',
    );
  });

  it("interpolates the election id verbatim, including special characters", () => {
    expect(newBlockFilter("abc-DEF_42")).toBe(
      'attributes.electionId = "abc-DEF_42"',
    );
  });

  it("treats an empty string as a concrete (non-all) election id", () => {
    expect(newBlockFilter("")).toBe('attributes.electionId = ""');
  });

  it("is case-sensitive and does not treat other casings as all", () => {
    expect(newBlockFilter("ALL")).toBe('attributes.electionId = "ALL"');
  });
});

describe("payload type shapes", () => {
  it("accepts a well-formed BlockData", () => {
    const data: BlockData = {
      voter: "12345678901234567890",
      commitment: "00ab".padEnd(64, "f"),
    };
    expect(data.voter).toBe("12345678901234567890");
    expect(data.commitment).toHaveLength(64);
  });

  it("accepts a well-formed SerializedBlock and NewBlockPayload", () => {
    const block: SerializedBlock = {
      index: 0,
      electionId: "election-123",
      data: { voter: "42", commitment: "deadbeef" },
      timestamp: 1_700_000_000_000,
      prevHash: "0",
      hash: "0",
    };
    // NewBlockPayload is structurally identical to SerializedBlock.
    const payload: NewBlockPayload = block;
    expect(payload).toEqual(block);
    expect(payload.prevHash).toBe("0");
  });
});
