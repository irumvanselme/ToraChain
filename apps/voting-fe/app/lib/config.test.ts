import { describe, test, expect } from "vitest";

describe("Config", () => {
  test("should match snapshot", async () => {
    const config = await import("./config.ts");
    expect(config).toMatchSnapshot();
  });
});
