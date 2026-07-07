import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ApiError } from "api/error";
import type { Eligibility, CursorEnvelope } from "api/voters";
import { ElectionVotersTable } from "./election-voters-table.tsx";

const listVoters = vi.fn();
const grantVoter = vi.fn();
const revokeVoter = vi.fn();

vi.mock("api/voters.ts", () => ({
  listVoters: (...a: unknown[]) => listVoters(...a),
  grantVoter: (...a: unknown[]) => grantVoter(...a),
  revokeVoter: (...a: unknown[]) => revokeVoter(...a),
}));

function voter(over: Partial<Eligibility> = {}): Eligibility {
  return {
    eligibilityId: "el-1",
    voterId: "voter-1",
    accountId: null,
    electionId: "e1",
    hasVoted: false,
    deleted: false,
    externalVoterId: null,
    ...over,
  };
}

function envelope(
  data: Eligibility[],
  nextCursor: string | null = null,
): CursorEnvelope<Eligibility> {
  return { data, pagination: { limit: 20, nextCursor } };
}

// jsdom does not implement the native <dialog> methods the Modal relies on.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});

beforeEach(() => {
  listVoters.mockReset();
  grantVoter.mockReset();
  revokeVoter.mockReset();
  listVoters.mockResolvedValue(envelope([]));
  grantVoter.mockResolvedValue(voter());
  revokeVoter.mockResolvedValue({ eligibilityId: "el-1", deleted: true });
});

function renderTable(electionId = "e1") {
  return render(<ElectionVotersTable electionId={electionId} />);
}

describe("ElectionVotersTable", () => {
  test("shows a spinner while loading, then the empty state", async () => {
    let resolve!: (v: CursorEnvelope<Eligibility>) => void;
    listVoters.mockReturnValue(
      new Promise<CursorEnvelope<Eligibility>>((r) => {
        resolve = r;
      }),
    );
    const { container } = renderTable();
    expect(container.querySelector(".loading")).toBeTruthy();

    resolve(envelope([]));
    expect(
      await screen.findByText("No eligible voters yet"),
    ).toBeInTheDocument();
    expect(listVoters).toHaveBeenCalledWith(
      "e1",
      { limit: 20 },
      expect.any(AbortSignal),
    );
  });

  test("renders voter rows with voted / not-yet badges", async () => {
    listVoters.mockResolvedValue(
      envelope([
        voter({ eligibilityId: "el-1", voterId: "abc", hasVoted: false }),
        voter({ eligibilityId: "el-2", voterId: "xyz", hasVoted: true }),
      ]),
    );
    renderTable();
    expect(await screen.findByText("abc")).toBeInTheDocument();
    expect(screen.getByText("xyz")).toBeInTheDocument();
    expect(screen.getByText("Not yet")).toBeInTheDocument();
    // "Voted" appears as both the column header and the row badge.
    expect(screen.getAllByText("Voted").length).toBeGreaterThanOrEqual(2);
  });

  test("shows the ApiError message and retries on click", async () => {
    listVoters.mockRejectedValueOnce(
      new ApiError(500, "SERVER", "Server exploded"),
    );
    renderTable();
    expect(await screen.findByText("Server exploded")).toBeInTheDocument();

    listVoters.mockResolvedValue(envelope([voter({ voterId: "reloaded" })]));
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText("reloaded")).toBeInTheDocument();
  });

  test("shows a generic message for non-ApiError load failures", async () => {
    listVoters.mockRejectedValueOnce(new Error("boom"));
    renderTable();
    expect(
      await screen.findByText("Failed to load voters."),
    ).toBeInTheDocument();
  });

  test("ignores AbortError and stays in loading state", async () => {
    listVoters.mockRejectedValueOnce(new DOMException("aborted", "AbortError"));
    const { container } = renderTable();
    await waitFor(() => expect(listVoters).toHaveBeenCalled());
    // No error alert, still loading.
    expect(screen.queryByText("Failed to load voters.")).toBeNull();
    await waitFor(() =>
      expect(container.querySelector(".loading")).toBeTruthy(),
    );
  });

  test("loads more rows and appends them", async () => {
    listVoters.mockResolvedValueOnce(
      envelope(
        [voter({ eligibilityId: "el-1", voterId: "first" })],
        "cursor-2",
      ),
    );
    renderTable();
    expect(await screen.findByText("first")).toBeInTheDocument();

    listVoters.mockResolvedValueOnce(
      envelope([voter({ eligibilityId: "el-2", voterId: "second" })], null),
    );
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("second")).toBeInTheDocument();
    expect(screen.getByText("first")).toBeInTheDocument();
    expect(listVoters).toHaveBeenLastCalledWith("e1", {
      limit: 20,
      cursor: "cursor-2",
    });
    // No more cursor -> button gone.
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Load more" })).toBeNull(),
    );
  });

  test("surfaces an error when loadMore fails", async () => {
    listVoters.mockResolvedValueOnce(
      envelope([voter({ voterId: "first" })], "cursor-2"),
    );
    renderTable();
    await screen.findByText("first");

    listVoters.mockRejectedValueOnce(
      new ApiError(500, "SERVER", "no more voters"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(await screen.findByText("no more voters")).toBeInTheDocument();
  });

  test("revoke button is disabled for voters who already voted", async () => {
    listVoters.mockResolvedValue(
      envelope([voter({ voterId: "voted-one", hasVoted: true })]),
    );
    renderTable();
    await screen.findByText("voted-one");
    expect(
      screen.getByRole("button", { name: "Revoke eligibility" }),
    ).toBeDisabled();
  });

  test("opens the revoke dialog, cancels, then confirms a revoke", async () => {
    listVoters.mockResolvedValue(envelope([voter({ voterId: "target" })]));
    renderTable();
    await screen.findByText("target");

    // Open dialog.
    await userEvent.click(
      screen.getByRole("button", { name: "Revoke eligibility" }),
    );
    expect(
      await screen.findByText(
        "Revoke this voter's eligibility for the election?",
      ),
    ).toBeInTheDocument();

    // Cancel closes it.
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Reopen and confirm.
    await userEvent.click(
      screen.getByRole("button", { name: "Revoke eligibility" }),
    );
    listVoters.mockResolvedValue(envelope([]));
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));

    await waitFor(() =>
      expect(revokeVoter).toHaveBeenCalledWith("e1", "target"),
    );
    // List reloaded -> empty state.
    expect(
      await screen.findByText("No eligible voters yet"),
    ).toBeInTheDocument();
  });

  test("shows an error inside the revoke dialog when revoke fails", async () => {
    listVoters.mockResolvedValue(envelope([voter({ voterId: "target" })]));
    renderTable();
    await screen.findByText("target");

    await userEvent.click(
      screen.getByRole("button", { name: "Revoke eligibility" }),
    );
    revokeVoter.mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "already voted"),
    );
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(await screen.findByText("already voted")).toBeInTheDocument();
  });

  test("shows a generic message when revoke fails with a non-ApiError", async () => {
    listVoters.mockResolvedValue(envelope([voter({ voterId: "target" })]));
    renderTable();
    await screen.findByText("target");

    await userEvent.click(
      screen.getByRole("button", { name: "Revoke eligibility" }),
    );
    revokeVoter.mockRejectedValueOnce(new Error("kaboom"));
    await userEvent.click(screen.getByRole("button", { name: "Revoke" }));
    expect(
      await screen.findByText("Could not revoke eligibility."),
    ).toBeInTheDocument();
  });

  // The GrantVoterModal is always mounted (open=false), so its <dialog> is
  // hidden — query it by placeholder/text and drive it with fireEvent.
  describe("GrantVoterModal (rendered as part of the table)", () => {
    const emailInput = () => screen.getByPlaceholderText("voter@example.com");
    const addButton = () =>
      screen.getByRole("button", { name: "Add", hidden: true });

    test("validates a required email", async () => {
      renderTable();
      await screen.findByText("No eligible voters yet");

      fireEvent.click(addButton());
      expect(await screen.findByText("Email is required.")).toBeInTheDocument();
      expect(grantVoter).not.toHaveBeenCalled();
    });

    test("grants a voter and reloads the list", async () => {
      renderTable();
      await screen.findByText("No eligible voters yet");

      fireEvent.change(emailInput(), {
        target: { value: "  new@voter.com  " },
      });
      listVoters.mockResolvedValue(envelope([voter({ voterId: "granted" })]));
      fireEvent.click(addButton());

      await waitFor(() =>
        expect(grantVoter).toHaveBeenCalledWith("e1", {
          email: "new@voter.com",
        }),
      );
      expect(await screen.findByText("granted")).toBeInTheDocument();
    });

    test("shows the ApiError message when granting fails", async () => {
      renderTable();
      await screen.findByText("No eligible voters yet");

      fireEvent.change(emailInput(), { target: { value: "dup@voter.com" } });
      grantVoter.mockRejectedValueOnce(
        new ApiError(409, "CONFLICT", "Voter already eligible"),
      );
      fireEvent.click(addButton());
      expect(
        await screen.findByText("Voter already eligible"),
      ).toBeInTheDocument();
    });

    test("shows a generic message when granting fails with a non-ApiError", async () => {
      renderTable();
      await screen.findByText("No eligible voters yet");

      fireEvent.change(emailInput(), { target: { value: "x@voter.com" } });
      grantVoter.mockRejectedValueOnce(new Error("network"));
      fireEvent.click(addButton());
      expect(
        await screen.findByText("Could not grant eligibility."),
      ).toBeInTheDocument();
    });
  });
});
