import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "api/error";

const listAuditOrgs = vi.fn();
const approveAuditOrg = vi.fn();
const rejectAuditOrg = vi.fn();

vi.mock("api/audit-orgs.ts", async () => {
  const actual =
    await vi.importActual<typeof import("api/audit-orgs.ts")>(
      "api/audit-orgs.ts",
    );
  return {
    ...actual,
    listAuditOrgs: (...a: unknown[]) => listAuditOrgs(...a),
    approveAuditOrg: (...a: unknown[]) => approveAuditOrg(...a),
    rejectAuditOrg: (...a: unknown[]) => rejectAuditOrg(...a),
  };
});

import { PendingApprovalsPage } from "./index.tsx";

// jsdom does not implement the native <dialog> methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  });
});

const pendingOrg = {
  orgId: "o1",
  name: "Pending Org",
  slug: "pending-org",
  approvalStatus: "pending" as const,
  approvedAt: null,
  rejectionReason: null,
  createdAt: "2024-01-01T00:00:00.000Z",
  memberUserId: "m1",
};

const approvedOrg = {
  orgId: "o2",
  name: "Approved Org",
  slug: "approved-org",
  approvalStatus: "approved" as const,
  approvedAt: "2024-02-01T00:00:00.000Z",
  rejectionReason: null,
  createdAt: "2024-01-15T00:00:00.000Z",
  memberUserId: "m2",
};

const rejectedOrg = {
  orgId: "o3",
  name: "Rejected Org",
  slug: "rejected-org",
  approvalStatus: "rejected" as const,
  approvedAt: null,
  rejectionReason: "Insufficient documentation",
  createdAt: "2024-01-20T00:00:00.000Z",
  memberUserId: "m3",
};

function renderPage(entries = ["/audit-orgs"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <PendingApprovalsPage />
    </MemoryRouter>,
  );
}

function modalBox(title: string) {
  return screen
    .getByRole("heading", { name: title })
    .closest(".modal-box")! as HTMLElement;
}

beforeEach(() => {
  listAuditOrgs.mockReset();
  approveAuditOrg.mockReset();
  rejectAuditOrg.mockReset();
  listAuditOrgs.mockResolvedValue([pendingOrg]);
});

describe("PendingApprovalsPage", () => {
  test("shows the spinner while loading", () => {
    listAuditOrgs.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("shows an empty state for the pending filter", async () => {
    listAuditOrgs.mockResolvedValue([]);
    renderPage();
    expect(
      await screen.findByText("No pending applications"),
    ).toBeInTheDocument();
  });

  test("shows an empty state for the all filter", async () => {
    listAuditOrgs.mockResolvedValue([]);
    renderPage(["/audit-orgs?filter=all"]);
    expect(
      await screen.findByText("No auditor organizations yet"),
    ).toBeInTheDocument();
  });

  test("shows an error state and retries", async () => {
    listAuditOrgs.mockRejectedValueOnce(new Error("boom"));
    renderPage();
    expect(await screen.findByText("boom")).toBeInTheDocument();
    listAuditOrgs.mockResolvedValueOnce([pendingOrg]);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Pending Org")).toBeInTheDocument();
  });

  test("renders rows for each approval status", async () => {
    listAuditOrgs.mockResolvedValue([pendingOrg, approvedOrg, rejectedOrg]);
    renderPage(["/audit-orgs?filter=all"]);
    expect(await screen.findByText("Pending Org")).toBeInTheDocument();
    expect(screen.getByText("Approved Org")).toBeInTheDocument();
    expect(screen.getByText("Rejected Org")).toBeInTheDocument();
    // approved shows the "on <date>" line
    expect(screen.getByText(/^on /)).toBeInTheDocument();
    // rejected shows the reason
    expect(screen.getByText("Insufficient documentation")).toBeInTheDocument();
    // non-pending rows render the em dash placeholder
    expect(screen.getAllByText("—").length).toBe(2);
  });

  test("changes the filter when a chip is clicked", async () => {
    renderPage();
    await screen.findByText("Pending Org");
    const approvedChip = screen.getByRole("button", { name: "Approved" });
    fireEvent.click(approvedChip);
    await waitFor(() =>
      expect(listAuditOrgs).toHaveBeenCalledWith(
        "approved",
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByRole("button", { name: /Approved/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("approves an organization through the dialog", async () => {
    approveAuditOrg.mockResolvedValueOnce({
      ...pendingOrg,
      approvalStatus: "approved",
    });
    renderPage();
    await screen.findByText("Pending Org");
    // open the approve dialog from the row action
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const box = modalBox("Approve organization");
    expect(within(box).getByText("Pending Org")).toBeInTheDocument();
    fireEvent.click(within(box).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(approveAuditOrg).toHaveBeenCalledWith("o1"));
  });

  test("surfaces an approve error in the dialog", async () => {
    approveAuditOrg.mockRejectedValueOnce(new ApiError(400, "BAD", "cannot"));
    renderPage();
    await screen.findByText("Pending Org");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const box = modalBox("Approve organization");
    fireEvent.click(within(box).getByRole("button", { name: "Approve" }));
    expect(await within(box).findByText("cannot")).toBeInTheDocument();
  });

  test("cancels the approve dialog", async () => {
    renderPage();
    await screen.findByText("Pending Org");
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    const box = modalBox("Approve organization");
    fireEvent.click(within(box).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(box.closest("dialog")!.open).toBe(false));
    expect(approveAuditOrg).not.toHaveBeenCalled();
  });

  test("rejects an organization with a reason", async () => {
    rejectAuditOrg.mockResolvedValueOnce({
      ...pendingOrg,
      approvalStatus: "rejected",
    });
    renderPage();
    await screen.findByText("Pending Org");
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const box = modalBox("Reject organization");
    const rejectBtn = within(box).getByRole("button", { name: "Reject" });
    // disabled until a reason is provided
    expect(rejectBtn).toBeDisabled();
    fireEvent.change(
      screen.getByPlaceholderText(
        "Explain why this application is being rejected",
      ),
      { target: { value: "  spam  " } },
    );
    expect(rejectBtn).not.toBeDisabled();
    fireEvent.click(rejectBtn);
    await waitFor(() =>
      expect(rejectAuditOrg).toHaveBeenCalledWith("o1", "spam"),
    );
  });

  test("surfaces a reject error in the dialog", async () => {
    rejectAuditOrg.mockRejectedValueOnce(new ApiError(400, "BAD", "nope"));
    renderPage();
    await screen.findByText("Pending Org");
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const box = modalBox("Reject organization");
    fireEvent.change(
      screen.getByPlaceholderText(
        "Explain why this application is being rejected",
      ),
      { target: { value: "bad" } },
    );
    fireEvent.click(within(box).getByRole("button", { name: "Reject" }));
    expect(await within(box).findByText("nope")).toBeInTheDocument();
  });

  test("cancels the reject dialog", async () => {
    renderPage();
    await screen.findByText("Pending Org");
    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const box = modalBox("Reject organization");
    fireEvent.click(within(box).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(box.closest("dialog")!.open).toBe(false));
    expect(rejectAuditOrg).not.toHaveBeenCalled();
  });
});
