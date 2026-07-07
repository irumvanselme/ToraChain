import { describe, test, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  waitFor,
  fireEvent,
  act,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { ApiError } from "@/app/api/errors";

const useAudit = vi.fn();
vi.mock("../lib/audit-context", () => ({ useAudit: () => useAudit() }));

const listElections = vi.fn();
vi.mock("../api/elections.ts", () => ({
  listElections: (...a: unknown[]) => listElections(...a),
}));

vi.mock("next/link", () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@tora-chain/ui-components", () => ({
  ElectionStatusBadge: ({ status }: { status: string }) => (
    <span data-testid="status">{status}</span>
  ),
  Input: (props: Record<string, unknown>) => <input {...props} />,
}));

import DashboardPage from "./page";

const envelope = (data: unknown[], totalPages = 1) => ({
  data,
  pagination: { page: 1, limit: 12, total: data.length, totalPages },
});

const election = {
  electionId: "e1",
  title: "Mayor 2026",
  description: "City mayor race",
  status: "active",
  startTime: "2026-01-01T00:00:00Z",
  endTime: "2026-02-01T00:00:00Z",
  deleted: false,
  totalVotes: 1234,
};

describe("DashboardPage", () => {
  beforeEach(() => {
    useAudit.mockReset();
    listElections.mockReset();
  });

  test("stays in the loading state without a token", () => {
    useAudit.mockReturnValue({ token: null });
    render(<DashboardPage />);
    expect(screen.getByText("Loading elections…")).toBeInTheDocument();
    expect(listElections).not.toHaveBeenCalled();
  });

  test("renders election cards on success", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockResolvedValue(envelope([election]));
    render(<DashboardPage />);

    await waitFor(() =>
      expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
    );
    expect(screen.getByText("City mayor race")).toBeInTheDocument();
    expect(screen.getByText("1,234 votes")).toBeInTheDocument();
    expect(listElections).toHaveBeenCalledWith("t", {
      page: 1,
      limit: 12,
      q: undefined,
    });
  });

  test("shows an empty state when there are no elections", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockResolvedValue(envelope([]));
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("No elections found.")).toBeInTheDocument(),
    );
  });

  test("surfaces an ApiError message", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockRejectedValue(new ApiError(500, "ERR", "boom"));
    render(<DashboardPage />);
    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });

  test("shows a generic message for non-ApiError failures", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockRejectedValue(new Error("network"));
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load elections.")).toBeInTheDocument(),
    );
  });

  test("re-queries with the search term", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockResolvedValue(envelope([election]));
    render(<DashboardPage />);
    await waitFor(() => expect(listElections).toHaveBeenCalledTimes(1));

    fireEvent.change(screen.getByLabelText("Search elections"), {
      target: { value: "mayor" },
    });

    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith("t", {
        page: 1,
        limit: 12,
        q: "mayor",
      }),
    );
  });

  test("paginates to the next page", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockResolvedValue(envelope([election], 3));
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument(),
    );

    await act(async () => {
      screen.getByText("Next").click();
    });

    await waitFor(() =>
      expect(listElections).toHaveBeenLastCalledWith("t", {
        page: 2,
        limit: 12,
        q: undefined,
      }),
    );
  });

  test("renders an election with no optional metadata", async () => {
    useAudit.mockReturnValue({ token: "t" });
    listElections.mockResolvedValue(
      envelope([
        {
          ...election,
          description: null,
          startTime: null,
          endTime: null,
        },
      ]),
    );
    render(<DashboardPage />);
    await waitFor(() =>
      expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
    );
    expect(screen.queryByText("City mayor race")).not.toBeInTheDocument();
  });
});
