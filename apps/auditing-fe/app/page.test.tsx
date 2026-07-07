import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const replace = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

const useAudit = vi.fn();
vi.mock("./lib/audit-context", () => ({
  useAudit: () => useAudit(),
}));

import RootPage from "./page";

describe("RootPage", () => {
  beforeEach(() => {
    replace.mockReset();
    useAudit.mockReset();
  });

  test("shows a redirecting placeholder", () => {
    useAudit.mockReturnValue({ auditStatus: null, loading: true });
    render(<RootPage />);
    expect(screen.getByText("Redirecting…")).toBeInTheDocument();
  });

  test("does not redirect while loading", () => {
    useAudit.mockReturnValue({ auditStatus: null, loading: true });
    render(<RootPage />);
    expect(replace).not.toHaveBeenCalled();
  });

  test("does not redirect when the org is not approved", () => {
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "pending" } },
      loading: false,
    });
    render(<RootPage />);
    expect(replace).not.toHaveBeenCalled();
  });

  test("redirects approved auditors to the dashboard", async () => {
    useAudit.mockReturnValue({
      auditStatus: { org: { approvalStatus: "approved" } },
      loading: false,
    });
    render(<RootPage />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/dashboard"));
  });
});
