import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "api/error";

const listElections = vi.fn();
const deleteElection = vi.fn();
const updateElectionStatus = vi.fn();

vi.mock("api/elections.ts", () => ({
  listElections: (...a: unknown[]) => listElections(...a),
  deleteElection: (...a: unknown[]) => deleteElection(...a),
  updateElectionStatus: (...a: unknown[]) => updateElectionStatus(...a),
}));

import { useListElections } from "./use-list-elections.ts";

const election = {
  electionId: "e1",
  title: "Election 1",
  description: null,
  status: "draft" as const,
  startTime: null,
  endTime: null,
  deleted: false,
};

function wrapper(initialEntries = ["/elections"]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  listElections.mockReset();
  deleteElection.mockReset();
  updateElectionStatus.mockReset();
  listElections.mockResolvedValue({
    data: [election],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
});

describe("useListElections", () => {
  test("loads rows on mount", async () => {
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.rows).toEqual([election]);
    expect(result.current.pagination?.total).toBe(1);
    expect(listElections).toHaveBeenCalledWith(
      { page: 1, limit: 10, status: undefined, q: undefined },
      expect.any(AbortSignal),
    );
  });

  test("reads page/status/q from the URL", async () => {
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(["/elections?page=2&status=active&q=hi"]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(listElections).toHaveBeenCalledWith(
      { page: 2, limit: 10, status: "active", q: "hi" },
      expect.any(AbortSignal),
    );
    expect(result.current.search).toBe("hi");
  });

  test("sets an error message when loading fails", async () => {
    listElections.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.loading).toBe(false);
  });

  test("ignores AbortError", async () => {
    listElections.mockRejectedValueOnce(
      new DOMException("aborted", "AbortError"),
    );
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    // Give the rejected promise a tick; error must stay null.
    await Promise.resolve();
    expect(result.current.error).toBeNull();
  });

  test("patchParams sets and clears query params", async () => {
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.patchParams({ q: "term", page: "" }));
    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "term" }),
        expect.any(AbortSignal),
      ),
    );
  });

  test("confirmDelete no-ops without a selection", async () => {
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(deleteElection).not.toHaveBeenCalled();
  });

  test("confirmDelete deletes the selected election", async () => {
    deleteElection.mockResolvedValueOnce({ electionId: "e1", deleted: true });
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToDelete(election));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(deleteElection).toHaveBeenCalledWith("e1");
    expect(result.current.toDelete).toBeNull();
  });

  test("confirmDelete surfaces ApiError messages", async () => {
    deleteElection.mockRejectedValueOnce(
      new ApiError(409, "CONFLICT", "cannot delete"),
    );
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToDelete(election));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(result.current.deleteError).toBe("cannot delete");
  });

  test("confirmDelete uses a fallback message for unknown errors", async () => {
    deleteElection.mockRejectedValueOnce(new Error("weird"));
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToDelete(election));
    await act(async () => {
      await result.current.confirmDelete();
    });
    expect(result.current.deleteError).toBe("Could not delete this election.");
  });

  test("confirmStatusUpdate no-ops without a selection", async () => {
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.confirmStatusUpdate("active");
    });
    expect(updateElectionStatus).not.toHaveBeenCalled();
  });

  test("confirmStatusUpdate updates the status", async () => {
    updateElectionStatus.mockResolvedValueOnce({
      ...election,
      status: "active",
    });
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToUpdateStatus(election));
    await act(async () => {
      await result.current.confirmStatusUpdate("enrolling_voters");
    });
    expect(updateElectionStatus).toHaveBeenCalledWith("e1", "enrolling_voters");
    expect(result.current.toUpdateStatus).toBeNull();
  });

  test("confirmStatusUpdate surfaces errors", async () => {
    updateElectionStatus.mockRejectedValueOnce(new Error("no"));
    const { result } = renderHook(() => useListElections(), {
      wrapper: wrapper(),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setToUpdateStatus(election));
    await act(async () => {
      await result.current.confirmStatusUpdate("active");
    });
    expect(result.current.statusUpdateError).toBe(
      "Could not update the election status.",
    );
  });
});
