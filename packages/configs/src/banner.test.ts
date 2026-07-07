import { describe, it, expect } from "vitest";

import { DEV_BANNER } from "./banner.ts";

describe("DEV_BANNER", () => {
  it("carries the dev-mode ribbon copy and colors", () => {
    expect(DEV_BANNER.ribbonLabel).toBe("DEV");
    expect(DEV_BANNER.tooltipHeading).toBe("Under Development");
    expect(DEV_BANNER.tooltipBody).toMatch(/work in progress/i);
    expect(DEV_BANNER.ribbonColor).toBe("#f59e0b");
    expect(DEV_BANNER.ribbonTextColor).toBe("#1c1917");
  });
});
