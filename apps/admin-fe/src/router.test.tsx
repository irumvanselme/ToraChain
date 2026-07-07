import { describe, test, expect, vi } from "vitest";

// The router imports every page (and RequireAuth); stub the auth wrapper so the
// import graph stays light and deterministic.
vi.mock("@tora-chain/fe-common", async () => {
  const actual = await vi.importActual<typeof import("@tora-chain/fe-common")>(
    "@tora-chain/fe-common",
  );
  return {
    ...actual,
    RequireAuth: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  };
});

import { router } from "./router.tsx";

describe("router", () => {
  test("exposes the root and catch-all routes", () => {
    const paths = router.routes.map((r) => r.path);
    expect(paths).toContain("/");
    expect(paths).toContain("*");
  });

  test("root route declares the expected children", () => {
    const root = router.routes.find((r) => r.path === "/");
    const childPaths = (root?.children ?? []).map((c) => c.path);
    expect(childPaths).toEqual(
      expect.arrayContaining([
        "elections",
        "elections/new",
        "elections/:id",
        "elections/:id/edit",
        "users",
        "auditors/pending-approvals",
      ]),
    );
  });
});
