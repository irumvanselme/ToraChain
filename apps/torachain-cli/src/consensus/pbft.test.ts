import { describe, test, expect, vi, afterEach } from "vitest";

import { quorumRequired, runPbftRound } from "./pbft.ts";

describe("pBFT", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test("quorumRequired is ⌈2n/3⌉", () => {
    expect(quorumRequired(3)).toBe(2);
    expect(quorumRequired(4)).toBe(3);
    expect(quorumRequired(6)).toBe(4);
  });

  test("reaches consensus as soon as a quorum agrees on one hash", async () => {
    // GIVEN a round over 3 nodes
    const { round, promise } = runPbftRound(3);

    // WHEN 2 of them respond with the same hash
    round.collect({ nodeId: "a", hash: "abc" });
    round.collect({ nodeId: "b", hash: "abc" });

    // THEN the round settles early without waiting for the third
    const result = await promise;
    expect(result.reached).toBe(true);
    expect(result.agreedHash).toBe("abc");
    expect(result.agreeingNodes).toEqual(["a", "b"]);
  });

  test("no quorum when responses disagree", async () => {
    vi.useFakeTimers();

    // GIVEN a round over 3 nodes
    const { round, promise } = runPbftRound(3);

    // WHEN all three disagree
    round.collect({ nodeId: "a", hash: "abc" });
    round.collect({ nodeId: "b", hash: "def" });
    round.collect({ nodeId: "c", hash: "ghi" });

    // THEN the round times out without agreement
    vi.advanceTimersByTime(5_000);
    const result = await promise;
    expect(result.reached).toBe(false);
    expect(result.agreedHash).toBeNull();
    expect(result.allResponses).toHaveLength(3);
  });
});
