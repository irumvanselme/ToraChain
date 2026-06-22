import { describe, expect, test } from "vitest";

import { generateApiKey, hashApiKey } from "./keys.ts";

describe("api key generation", () => {
  test("mints a tck_-namespaced token with an embedded prefix", () => {
    const key = generateApiKey();
    expect(key.token.startsWith(`tck_${key.prefix}_`)).toBe(true);
    expect(key.hash).toBe(hashApiKey(key.token));
    expect(key.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  test("each key is unique", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.token).not.toBe(b.token);
    expect(a.hash).not.toBe(b.hash);
  });

  test("hashing is deterministic", () => {
    expect(hashApiKey("tck_abc_def")).toBe(hashApiKey("tck_abc_def"));
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});
