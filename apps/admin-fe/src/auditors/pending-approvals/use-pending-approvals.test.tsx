import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "api/error";

const listAuditOrgs = vi.fn();
const approveAuditOrg = vi.fn();
const rejectAuditOrg = vi.fn();

vi.mock("api/audit-orgs.ts", () => ({
  listAuditOrgs: (...a: unknown[]) => listAuditOrgs(...a),
  approveAuditOrg: (...a: unknown[]) => approveAuditOrg(...a),
  rejectAuditOrg: (...a: unknown[]) => rejectAuditOrg(...a),
}));

import { usePendingApprovals } from "./use-pending-approvals.ts";

const org = {
  orgId: "o1",
  name: "Org One",
  slug: "org-one",
  approvalStatus: "pending" as const,
  approvedAt: null,
  rejectionReason: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  memberUserId: "m1",
};

function wrapper(entries = ["/audit-orgs"]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  listAuditOrgs.mockReset();
  approveAuditOrg.mockReset();
  rejectAuditOrg.mockReset();
  listAuditOrgs.mockResolvedValue([org]);
});

describe("usePendingApprovals", () => {
  test("defaults to the pending filter", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filter).toBe("pending");
    expect(listAuditOrgs).toHaveBeenCalledWith(
      "pending",
      expect.any(AbortSignal),
    );
    expect(result.current.rows).toEqual([org]);
  });

  test("passes undefined for the 'all' filter", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(["/audit-orgs?filter=all"]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filter).toBe("all");
    expect(listAuditOrgs).toHaveBeenCalledWith(
      undefined,
      expect.any(AbortSignal),
    );
  });

  test("reads approved/rejected filters", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(["/audit-orgs?filter=approved"]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.filter).toBe("approved");
  });

  test("sets an error on failure", async () => {
    listAuditOrgs.mockRejectedValueOnce(new Error("down"));
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.error).toBe("down"));
  });

  test("ignores AbortError", async () => {
    listAuditOrgs.mockRejectedValueOnce(new DOMException("a", "AbortError"));
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await Promise.resolve();
    expect(result.current.error).toBeNull();
  });

  test("setFilter clears the param for pending and sets it otherwise", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setFilter("approved"));
    await waitFor(() => expect(result.current.filter).toBe("approved"));
    act(() => result.current.setFilter("pending"));
    await waitFor(() => expect(result.current.filter).toBe("pending"));
  });

  test("confirmApprove no-ops without a selection", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.confirmApprove();
    });
    expect(approveAuditOrg).not.toHaveBeenCalled();
  });

  test("confirmApprove approves the selected org", async () => {
    approveAuditOrg.mockResolvedValueOnce({
      ...org,
      approvalStatus: "approved",
    });
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToApprove(org));
    await act(async () => {
      await result.current.confirmApprove();
    });
    expect(approveAuditOrg).toHaveBeenCalledWith("o1");
    expect(result.current.toApprove).toBeNull();
  });

  test("confirmApprove surfaces ApiError messages", async () => {
    approveAuditOrg.mockRejectedValueOnce(new ApiError(400, "BAD", "nope"));
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToApprove(org));
    await act(async () => {
      await result.current.confirmApprove();
    });
    expect(result.current.approveError).toBe("nope");
  });

  test("confirmApprove uses fallback for unknown errors", async () => {
    approveAuditOrg.mockRejectedValueOnce(new Error("weird"));
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToApprove(org));
    await act(async () => {
      await result.current.confirmApprove();
    });
    expect(result.current.approveError).toBe(
      "Could not approve this organization.",
    );
  });

  test("confirmReject no-ops without a selection", async () => {
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.confirmReject("reason");
    });
    expect(rejectAuditOrg).not.toHaveBeenCalled();
  });

  test("confirmReject rejects the selected org", async () => {
    rejectAuditOrg.mockResolvedValueOnce({
      ...org,
      approvalStatus: "rejected",
    });
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToReject(org));
    await act(async () => {
      await result.current.confirmReject("spam");
    });
    expect(rejectAuditOrg).toHaveBeenCalledWith("o1", "spam");
    expect(result.current.toReject).toBeNull();
  });

  test("confirmReject surfaces fallback errors", async () => {
    rejectAuditOrg.mockRejectedValueOnce(new Error("weird"));
    const { result } = renderHook(() => usePendingApprovals(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToReject(org));
    await act(async () => {
      await result.current.confirmReject("spam");
    });
    expect(result.current.rejectError).toBe(
      "Could not reject this organization.",
    );
  });
});
