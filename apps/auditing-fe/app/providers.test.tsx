import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

const replace = vi.fn();
const usePathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => usePathname(),
}));

const useAudit = vi.fn();
vi.mock("./lib/audit-context", () => ({
  // Passthrough provider so OrgGate renders; useAudit is controlled per-test.
  AuditProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAudit: () => useAudit(),
}));

vi.mock("@tora-chain/fe-common", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  RequireAuth: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("./components/app-nav", () => ({
  AppNav: () => <nav data-testid="app-nav" />,
}));

vi.mock("./lib/config.ts", () => ({
  AUTH_API: "https://idp/auditors/api",
  USER_TYPE: "auditors",
  loginUrl: (r: string) => `login?${r}`,
  ONBOARDING_URL: "https://idp/onboarding",
  PENDING_URL: "https://idp/pending",
}));

import { Providers } from "./providers";

function renderProviders(children: ReactNode = <div>content</div>) {
  return render(<Providers>{children}</Providers>);
}

describe("Providers / OrgGate", () => {
  let hrefSetter: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    replace.mockReset();
    useAudit.mockReset();
    usePathname.mockReturnValue("/");
    hrefSetter = vi.fn();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: {
        set href(v: string) {
          hrefSetter(v);
        },
        get href() {
          return "";
        },
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("renders a loading state while auth resolves", () => {
    useAudit.mockReturnValue({ auditStatus: null, loading: true });
    renderProviders();
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(screen.queryByText("content")).not.toBeInTheDocument();
  });

  test("does nothing when there is no audit status yet", () => {
    useAudit.mockReturnValue({ auditStatus: null, loading: false });
    renderProviders();
    expect(hrefSetter).not.toHaveBeenCalled();
    expect(screen.getByText("content")).toBeInTheDocument();
  });

  test("redirects to onboarding when the auditor has no org", async () => {
    useAudit.mockReturnValue({
      auditStatus: { org: null },
      loading: false,
    });
    renderProviders();
    await waitFor(() =>
      expect(hrefSetter).toHaveBeenCalledWith("https://idp/onboarding"),
    );
  });

  test("redirects to pending when the org is not yet approved", async () => {
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "pending" } },
      loading: false,
    });
    renderProviders();
    await waitFor(() =>
      expect(hrefSetter).toHaveBeenCalledWith("https://idp/pending"),
    );
  });

  test("redirects to pending when the org was rejected", async () => {
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "rejected" } },
      loading: false,
    });
    renderProviders();
    await waitFor(() =>
      expect(hrefSetter).toHaveBeenCalledWith("https://idp/pending"),
    );
  });

  test("sends approved auditors from / to the dashboard", async () => {
    usePathname.mockReturnValue("/");
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "approved" } },
      loading: false,
    });
    renderProviders();
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });

  test("renders the nav and content for an approved auditor already in-app", () => {
    usePathname.mockReturnValue("/dashboard");
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "approved" } },
      loading: false,
    });
    renderProviders();
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getByTestId("app-nav")).toBeInTheDocument();
    expect(screen.getByText("content")).toBeInTheDocument();
  });
});
