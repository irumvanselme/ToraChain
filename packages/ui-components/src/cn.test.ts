import { describe, test, expect } from "vitest";
import { cn } from "./cn.ts";

describe("cn", () => {
  test("joins truthy string values with a single space", () => {
    expect(cn("a", "b", "c")).toBe("a b c");
  });

  test("drops falsy values (false, null, undefined, empty string)", () => {
    expect(cn("a", false, null, undefined, "", "b")).toBe("a b");
  });

  test("keeps the number 0 but drops other falsy numbers", () => {
    expect(cn(0, "a")).toBe("0 a");
  });

  test("stringifies non-zero numbers and bigints", () => {
    expect(cn(1, 2n, "x")).toBe("1 2 x");
  });

  test("flattens nested arrays recursively", () => {
    expect(cn("a", ["b", ["c", false, "d"]], "e")).toBe("a b c d e");
  });

  test("omits empty nested arrays entirely", () => {
    expect(cn("a", [], [false, null], "b")).toBe("a b");
  });

  test("returns an empty string when given nothing truthy", () => {
    expect(cn(false, null, undefined)).toBe("");
    expect(cn()).toBe("");
  });
});
