import { hash } from "./hashing.ts";
import { describe, test, expect } from "vitest";

describe("Hash", () => {
  test.each([
    ["a simple string", "hello-world"],
    ["a number", 10],
    ["an object", { name: "Alice" }],
    ["one megabyte of data", "a".repeat(1024 * 1024)],
    ["bigint", 1n],
  ])("should hash %s", (_, input) => {
    // GIVEN some hashable data
    // WHEN we hash it
    const hashed = hash(input);

    // THEN we get a hash
    expect(hashed).toBeDefined();

    // AND it should be a big int
    expect(hashed).toBeTypeOf("bigint");

    // AND it should not change (should match snapshot)
    expect(hashed).toMatchSnapshot();
  });
});
