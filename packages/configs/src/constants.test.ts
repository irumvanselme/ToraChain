import { describe, it, expect } from "vitest";

import { APP_NAME } from "./constants.ts";

describe("APP_NAME", () => {
  it("is the app's display name", () => {
    expect(APP_NAME).toBe("Tora-Chain");
  });
});
