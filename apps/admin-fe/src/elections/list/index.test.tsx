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

const listElections = vi.fn();
const deleteElection = vi.fn();
const updateElectionStatus = vi.fn();

vi.mock("api/elections.ts", async () => {
  const actual =
    await vi.importActual<typeof import("api/elections.ts")>(
      "api/elections.ts",
    );
  return {
    ...actual,
    listElections: (...a: unknown[]) => listElections(...a),
    deleteElection: (...a: unknown[]) => deleteElection(...a),
    updateElectionStatus: (...a: unknown[]) => updateElectionStatus(...a),
  };
});

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => navigate };
});

import { ElectionsListPage } from "./index.tsx";

const draftElection = {
  electionId: "e1",
  title: "Draft Election",
  description: null,
  status: "draft" as const,
  startTime: "2024-01-02T10:00:00.000Z",
  endTime: "2024-01-03T10:00:00.000Z",
  deleted: false,
};

const archivedElection = {
  electionId: "e2",
  title: "Archived Election",
  description: null,
  status: "archived" as const,
  startTime: null,
  endTime: null,
  deleted: false,
};

function renderPage(entries = ["/elections"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <ElectionsListPage />
    </MemoryRouter>,
  );
}

function envelope(data: unknown[], totalPages = 1, page = 1) {
  return {
    data,
    pagination: { page, limit: 10, total: data.length, totalPages },
  };
}

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

beforeEach(() => {
  listElections.mockReset();
  deleteElection.mockReset();
  updateElectionStatus.mockReset();
  navigate.mockReset();
  listElections.mockResolvedValue(envelope([draftElection]));
});

describe("ElectionsListPage", () => {
  test("renders the loading spinner initially, then rows", async () => {
    renderPage();
    // Loading state: no rows yet.
    expect(screen.queryByText("Draft Election")).toBeNull();
    await screen.findByText("Draft Election");
    // Formatted times are shown for an election that has them.
    expect(screen.getByTitle("Start")).toBeInTheDocument();
    expect(screen.getByTitle("End")).toBeInTheDocument();
  });

  test("renders the empty state when there are no elections", async () => {
    listElections.mockResolvedValue(envelope([]));
    renderPage();
    await screen.findByText("No elections yet");
    // Both header and empty-state offer a New election button.
    const newButtons = screen.getAllByRole("button", { name: "New election" });
    fireEvent.click(newButtons[newButtons.length - 1]!);
    expect(navigate).toHaveBeenCalledWith("/elections/new");
  });

  test("renders 'not specified' when start/end times are missing", async () => {
    listElections.mockResolvedValue(envelope([archivedElection]));
    renderPage();
    await screen.findByText("Archived Election");
    expect(screen.getByText("Start time not specified")).toBeInTheDocument();
    expect(screen.getByText("End time not specified")).toBeInTheDocument();
  });

  test("shows an error and retries", async () => {
    listElections.mockRejectedValueOnce(new Error("boom"));
    renderPage();
    await screen.findByText("boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("Draft Election");
  });

  test("navigates from the New election header button", async () => {
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(
      screen.getAllByRole("button", { name: "New election" })[0]!,
    );
    expect(navigate).toHaveBeenCalledWith("/elections/new");
  });

  test("navigates when a card is clicked and via the edit button", async () => {
    renderPage();
    const title = await screen.findByText("Draft Election");
    fireEvent.click(title);
    expect(navigate).toHaveBeenCalledWith("/elections/e1");
    fireEvent.click(screen.getByRole("button", { name: "Edit election" }));
    expect(navigate).toHaveBeenCalledWith("/elections/e1/edit");
  });

  test("applies a status filter chip and clears it on re-select", async () => {
    const { container } = renderPage();
    await screen.findByText("Draft Election");

    fireEvent.click(container.querySelector("#active")!);
    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: "active" }),
        expect.any(AbortSignal),
      ),
    );

    // The active chip is now selected; clicking it again clears the filter.
    const activeChip = container.querySelector("#active")!;
    expect(activeChip).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(activeChip);
    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
        expect.any(AbortSignal),
      ),
    );
  });

  test("paginates to the next page", async () => {
    listElections.mockResolvedValue(envelope([draftElection], 3, 1));
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(screen.getByText("Page 1 of 3"));
    // Click the next-page arrow (last join-item button).
    const buttons = screen.getAllByRole("button");
    const next = buttons.find(
      (b) =>
        b.classList.contains("join-item") &&
        !b.hasAttribute("disabled") &&
        b.querySelector("svg"),
    );
    fireEvent.click(next!);
    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal),
      ),
    );
  });

  test("opens the delete dialog and confirms deletion", async () => {
    deleteElection.mockResolvedValueOnce({ electionId: "e1", deleted: true });
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(screen.getByRole("button", { name: "Delete election" }));
    const dialog = screen.getByRole("heading", { name: "Delete election" });
    expect(dialog).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(deleteElection).toHaveBeenCalledWith("e1"));
  });

  test("surfaces an ApiError in the delete dialog", async () => {
    deleteElection.mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "cannot delete active"),
    );
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(screen.getByRole("button", { name: "Delete election" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await screen.findByText("cannot delete active");
  });

  test("cancels the delete dialog", async () => {
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(screen.getByRole("button", { name: "Delete election" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(deleteElection).not.toHaveBeenCalled();
  });

  test("opens the status dialog and applies a transition", async () => {
    updateElectionStatus.mockResolvedValueOnce({
      ...draftElection,
      status: "enrolling_voters",
    });
    renderPage();
    await screen.findByText("Draft Election");
    // The dropdown item is always in the DOM.
    fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
    const heading = await screen.findByRole("heading", {
      name: "Update Status",
    });
    const modal = heading.closest(".modal-box") as HTMLElement;
    const transition = within(modal).getByText("Enrollment");
    fireEvent.click(transition);
    await waitFor(() =>
      expect(updateElectionStatus).toHaveBeenCalledWith(
        "e1",
        "enrolling_voters",
      ),
    );
  });

  test("cancels the status dialog", async () => {
    renderPage();
    await screen.findByText("Draft Election");
    fireEvent.click(screen.getByRole("button", { name: "Update Status" }));
    const heading = await screen.findByRole("heading", {
      name: "Update Status",
    });
    const modal = heading.closest(".modal-box") as HTMLElement;
    fireEvent.click(within(modal).getByRole("button", { name: "Cancel" }));
    expect(updateElectionStatus).not.toHaveBeenCalled();
  });

  test("hides the status dropdown for terminal statuses", async () => {
    listElections.mockResolvedValue(envelope([archivedElection]));
    renderPage();
    await screen.findByText("Archived Election");
    expect(screen.queryByRole("button", { name: "Update Status" })).toBeNull();
  });
});
