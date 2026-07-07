import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "api/error";
import { ElectionCandidatesTable } from "./election-candidates-table.tsx";
import type { Candidate } from "api/candidates";

const listCandidates = vi.fn();
const createCandidate = vi.fn();
const updateCandidate = vi.fn();
const deleteCandidate = vi.fn();

vi.mock("api/candidates", () => ({
  listCandidates: (...a: unknown[]) => listCandidates(...a),
  createCandidate: (...a: unknown[]) => createCandidate(...a),
  updateCandidate: (...a: unknown[]) => updateCandidate(...a),
  deleteCandidate: (...a: unknown[]) => deleteCandidate(...a),
}));

function candidate(over: Partial<Candidate> = {}): Candidate {
  return {
    candidateId: "c1",
    electionId: "e1",
    fullName: "Jane Doe",
    manifesto: "Better roads",
    deleted: false,
    ...over,
  };
}

function envelope(
  data: Candidate[],
  over: Partial<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }> = {},
) {
  return {
    data,
    pagination: {
      page: 1,
      limit: 10,
      total: data.length,
      totalPages: 1,
      ...over,
    },
  };
}

// jsdom doesn't implement the native <dialog> methods the Modal relies on.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

beforeEach(() => {
  listCandidates.mockReset();
  createCandidate.mockReset();
  updateCandidate.mockReset();
  deleteCandidate.mockReset();
  listCandidates.mockResolvedValue(envelope([]));
});

function renderTable() {
  return render(<ElectionCandidatesTable electionId="e1" />);
}

describe("ElectionCandidatesTable", () => {
  test("shows spinner while loading, then empty state", async () => {
    let resolve!: (v: unknown) => void;
    listCandidates.mockReturnValue(new Promise((r) => (resolve = r)));
    renderTable();

    // Loading state: header label falls back to "Candidates".
    expect(screen.getByText("Candidates")).toBeInTheDocument();

    resolve(envelope([]));
    expect(await screen.findByText("No candidates yet")).toBeInTheDocument();
    expect(listCandidates).toHaveBeenCalledWith(
      "e1",
      { page: 1, limit: 10 },
      expect.anything(),
    );
  });

  test("renders data rows including manifesto and the em-dash fallback", async () => {
    listCandidates.mockResolvedValue(
      envelope(
        [
          candidate({
            candidateId: "c1",
            fullName: "Jane Doe",
            manifesto: "Better roads",
          }),
          candidate({
            candidateId: "c2",
            fullName: "John Roe",
            manifesto: null,
          }),
        ],
        { total: 2 },
      ),
    );
    renderTable();

    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("John Roe")).toBeInTheDocument();
    expect(screen.getByText("Better roads")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("2 candidate(s)")).toBeInTheDocument();
  });

  test("shows ApiError message and retries on click", async () => {
    listCandidates.mockRejectedValueOnce(
      new ApiError(500, "SERVER_ERROR", "Boom from server"),
    );
    renderTable();

    expect(await screen.findByText("Boom from server")).toBeInTheDocument();

    listCandidates.mockResolvedValue(envelope([candidate()], { total: 1 }));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("Jane Doe")).toBeInTheDocument();
  });

  test("shows generic message for non-ApiError load failure", async () => {
    listCandidates.mockRejectedValueOnce(new Error("network down"));
    renderTable();
    expect(
      await screen.findByText("Failed to load candidates."),
    ).toBeInTheDocument();
  });

  test("pagination changes page and reloads", async () => {
    listCandidates.mockResolvedValue(
      envelope([candidate()], { total: 25, totalPages: 3 }),
    );
    renderTable();
    await screen.findByText("Jane Doe");

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    // The forward nav button is the last square join-item button.
    const squares = screen
      .getAllByRole("button")
      .filter(
        (b) =>
          b.className.includes("btn-square") &&
          b.className.includes("join-item"),
      );
    await userEvent.click(squares[squares.length - 1]);

    await waitFor(() =>
      expect(listCandidates).toHaveBeenLastCalledWith(
        "e1",
        { page: 2, limit: 10 },
        expect.anything(),
      ),
    );
  });

  test("adds a candidate through the form modal", async () => {
    listCandidates.mockResolvedValue(envelope([]));
    createCandidate.mockResolvedValue(candidate());
    renderTable();
    await screen.findByText("No candidates yet");

    // header add button (first of the add-candidate buttons)
    const addButtons = screen.getAllByRole("button", { name: "Add candidate" });
    await userEvent.click(addButtons[0]);

    await userEvent.type(screen.getByLabelText("Full name"), "Alice Smith");
    await userEvent.type(screen.getByLabelText("Manifesto"), "Vote for me");

    listCandidates.mockResolvedValue(
      envelope([candidate({ fullName: "Alice Smith" })], { total: 1 }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(createCandidate).toHaveBeenCalledWith("e1", {
        fullName: "Alice Smith",
        manifesto: "Vote for me",
      }),
    );
  });

  test("validates required name in the form", async () => {
    renderTable();
    await screen.findByText("No candidates yet");
    const addButtons = screen.getAllByRole("button", { name: "Add candidate" });
    await userEvent.click(addButtons[0]);

    await userEvent.click(screen.getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(createCandidate).not.toHaveBeenCalled();
  });

  test("shows ApiError from create in the form", async () => {
    createCandidate.mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "Duplicate candidate"),
    );
    renderTable();
    await screen.findByText("No candidates yet");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Add candidate" })[0],
    );
    await userEvent.type(screen.getByLabelText("Full name"), "Bob");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(await screen.findByText("Duplicate candidate")).toBeInTheDocument();
  });

  test("shows generic message for non-ApiError create failure", async () => {
    createCandidate.mockRejectedValueOnce(new Error("boom"));
    renderTable();
    await screen.findByText("No candidates yet");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Add candidate" })[0],
    );
    await userEvent.type(screen.getByLabelText("Full name"), "Bob");
    await userEvent.click(screen.getByRole("button", { name: "Add" }));

    expect(
      await screen.findByText("Could not save candidate."),
    ).toBeInTheDocument();
  });

  test("edits an existing candidate (prefilled + updateCandidate)", async () => {
    listCandidates.mockResolvedValue(
      envelope(
        [
          candidate({
            candidateId: "c9",
            fullName: "Old Name",
            manifesto: "Old plan",
          }),
        ],
        { total: 1 },
      ),
    );
    updateCandidate.mockResolvedValue(candidate({ candidateId: "c9" }));
    renderTable();
    await screen.findByText("Old Name");

    await userEvent.click(
      screen.getByRole("button", { name: "Edit candidate" }),
    );

    const nameInput = screen.getByLabelText("Full name") as HTMLInputElement;
    await waitFor(() => expect(nameInput.value).toBe("Old Name"));

    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, "New Name");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(updateCandidate).toHaveBeenCalledWith("e1", "c9", {
        fullName: "New Name",
        manifesto: "Old plan",
      }),
    );
  });

  test("cancel button closes the add form without saving", async () => {
    renderTable();
    await screen.findByText("No candidates yet");
    await userEvent.click(
      screen.getAllByRole("button", { name: "Add candidate" })[0],
    );
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(createCandidate).not.toHaveBeenCalled();
  });

  test("deletes a candidate after confirming", async () => {
    listCandidates.mockResolvedValue(
      envelope([candidate({ candidateId: "cx", fullName: "Doomed" })], {
        total: 1,
      }),
    );
    deleteCandidate.mockResolvedValue({ candidateId: "cx", deleted: true });
    renderTable();
    await screen.findByText("Doomed");

    await userEvent.click(
      screen.getByRole("button", { name: "Delete candidate" }),
    );

    const dialog = screen.getByText(/Remove/).closest("div");
    expect(dialog).toBeTruthy();
    // Confirm delete.
    listCandidates.mockResolvedValue(envelope([]));
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() =>
      expect(deleteCandidate).toHaveBeenCalledWith("e1", "cx"),
    );
    expect(await screen.findByText("No candidates yet")).toBeInTheDocument();
  });

  test("shows ApiError from delete", async () => {
    listCandidates.mockResolvedValue(
      envelope([candidate({ candidateId: "cx", fullName: "Doomed" })], {
        total: 1,
      }),
    );
    deleteCandidate.mockRejectedValueOnce(
      new ApiError(423, "LOCKED", "Voting already open"),
    );
    renderTable();
    await screen.findByText("Doomed");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete candidate" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(await screen.findByText("Voting already open")).toBeInTheDocument();
  });

  test("shows generic message for non-ApiError delete failure", async () => {
    listCandidates.mockResolvedValue(
      envelope([candidate({ candidateId: "cx", fullName: "Doomed" })], {
        total: 1,
      }),
    );
    deleteCandidate.mockRejectedValueOnce(new Error("boom"));
    renderTable();
    await screen.findByText("Doomed");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete candidate" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    expect(
      await screen.findByText("Could not delete candidate."),
    ).toBeInTheDocument();
  });

  test("cancel in delete modal keeps the candidate", async () => {
    listCandidates.mockResolvedValue(
      envelope([candidate({ candidateId: "cx", fullName: "Doomed" })], {
        total: 1,
      }),
    );
    renderTable();
    await screen.findByText("Doomed");
    await userEvent.click(
      screen.getByRole("button", { name: "Delete candidate" }),
    );
    const cancels = screen.getAllByRole("button", { name: "Cancel" });
    await userEvent.click(cancels[cancels.length - 1]);
    expect(deleteCandidate).not.toHaveBeenCalled();
  });
});
