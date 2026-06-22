import { describe, test, expect } from "vitest";
import { okResponse } from "./constants.ts";

describe("constants", () => {
  describe("ok", () => {
    test("response should match snapshots", () => {
      expect(okResponse).toMatchSnapshot();
    });
  });
});
