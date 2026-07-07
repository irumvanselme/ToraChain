import { describe, test, expect } from "vitest";
import { asset } from "./asset";

describe("asset", () => {
  test("prefixes the name with the assets path", () => {
    expect(asset("logo.svg")).toBe("/_assets/logo.svg");
  });

  test("does not dedupe leading slashes in the name", () => {
    expect(asset("/logo.svg")).toBe("/_assets//logo.svg");
  });
});
