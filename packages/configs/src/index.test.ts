import { describe, it, expect } from "vitest";

import * as configs from "./index.ts";

describe("package entry point", () => {
  it("re-exports env, links, auth, banner, constants, and credentials", () => {
    expect(configs.getEnv).toBeDefined();
    expect(configs.isDevelopment).toBeDefined();
    expect(configs.adminFeLink).toBeDefined();
    expect(configs.authApiUrl).toBeDefined();
    expect(configs.DEV_BANNER).toBeDefined();
    expect(configs.APP_NAME).toBeDefined();
    expect(configs.DEV_CREDENTIALS).toBeDefined();
  });
});
