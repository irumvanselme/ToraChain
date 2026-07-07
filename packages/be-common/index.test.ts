import { describe, it, expect } from "vitest";

import * as beCommon from "./index.ts";

describe("package entry point", () => {
  it("re-exports logging, database, and config utilities", () => {
    expect(beCommon.Logger).toBeDefined();
    expect(beCommon.logger).toBeDefined();
    expect(beCommon.Database).toBeDefined();
    expect(beCommon.getEnv).toBeDefined();
    expect(beCommon.requireEnv).toBeDefined();
    expect(beCommon.isProduction).toBeDefined();
  });
});
