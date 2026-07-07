import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
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
vi.mock("@/app/lib/audit-context", () => ({ useAudit: () => useAudit() }));

const useParams = vi.fn();
vi.mock("next/navigation", () => ({ useParams: () => useParams() }));

const getElection = vi.fn();
const getElectionResults = vi.fn();
const getBlockchainData = vi.fn();
vi.mock("@/app/api/elections", () => ({
  getElection: (...a: unknown[]) => getElection(...a),
  getElectionResults: (...a: unknown[]) => getElectionResults(...a),
  getBlockchainData: (...a: unknown[]) => getBlockchainData(...a),
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
  electionStatusLabel: (status: string) => `label:${status}`,
}));

import ElectionDetailPage from "./page";

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

const results = {
  electionId: "e1",
  title: "Mayor 2026",
  status: "active",
  totalVotes: 3,
  candidates: [
    { candidateId: "c1", fullName: "Alice", voteCount: 1 },
    { candidateId: "c2", fullName: "Bob", voteCount: 2 },
  ],
};

const block = {
  index: 1,
  electionId: "e1",
  data: { voter: "v1", commitment: "commitment123456" },
  timestamp: 1700000000000,
  prevHash: "prevhash1234567890",
  hash: "hash1234567890abcdef",
};

describe("ElectionDetailPage", () => {
  beforeEach(() => {
    useAudit.mockReset();
    useParams.mockReset();
    getElection.mockReset();
    getElectionResults.mockReset();
    getBlockchainData.mockReset();
    useParams.mockReturnValue({ id: "e1" });
  });

  test("stays in the loading state without a token", () => {
    useAudit.mockReturnValue({ token: null });
    render(<ElectionDetailPage />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
    expect(getElection).not.toHaveBeenCalled();
  });

  test("renders the election overview on success", async () => {
    useAudit.mockReturnValue({ token: "t" });
    getElection.mockResolvedValue(election);
    render(<ElectionDetailPage />);

    await waitFor(() =>
      expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
    );
    expect(screen.getByText("City mayor race")).toBeInTheDocument();
    expect(screen.getByText("1,234 total votes")).toBeInTheDocument();
    expect(getElection).toHaveBeenCalledWith("t", "e1");
    // overview tab is default and uses electionStatusLabel
    expect(screen.getByText("label:active")).toBeInTheDocument();
    expect(screen.getByText("e1")).toBeInTheDocument();
  });

  test("renders an election with no optional metadata", async () => {
    useAudit.mockReturnValue({ token: "t" });
    getElection.mockResolvedValue({
      ...election,
      description: null,
      startTime: null,
      endTime: null,
    });
    render(<ElectionDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
    );
    expect(screen.queryByText("City mayor race")).not.toBeInTheDocument();
    // start/end time render em dashes in overview
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  test("surfaces an ApiError message", async () => {
    useAudit.mockReturnValue({ token: "t" });
    getElection.mockRejectedValue(new ApiError(500, "ERR", "boom"));
    render(<ElectionDetailPage />);
    await waitFor(() => expect(screen.getByText("boom")).toBeInTheDocument());
  });

  test("shows a generic message for non-ApiError failures", async () => {
    useAudit.mockReturnValue({ token: "t" });
    getElection.mockRejectedValue(new Error("network"));
    render(<ElectionDetailPage />);
    await waitFor(() =>
      expect(screen.getByText("Failed to load election.")).toBeInTheDocument(),
    );
  });

  describe("Results tab", () => {
    test("renders candidate results sorted by votes", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getElectionResults.mockResolvedValue(results);
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Results").click();
      });

      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument(),
      );
      expect(screen.getByText("Bob")).toBeInTheDocument();
      expect(screen.getByText("3 total votes")).toBeInTheDocument();
      expect(getElectionResults).toHaveBeenCalledWith("t", "e1");
    });

    test("handles zero total votes", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getElectionResults.mockResolvedValue({
        ...results,
        totalVotes: 0,
        candidates: [{ candidateId: "c1", fullName: "Alice", voteCount: 0 }],
      });
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Results").click();
      });

      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument(),
      );
      expect(screen.getByText(/0 votes \(0%\)/)).toBeInTheDocument();
    });

    test("surfaces an ApiError message", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getElectionResults.mockRejectedValue(new ApiError(500, "ERR", "kaboom"));
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Results").click();
      });

      await waitFor(() =>
        expect(screen.getByText("kaboom")).toBeInTheDocument(),
      );
    });

    test("shows a generic message for non-ApiError failures", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getElectionResults.mockRejectedValue(new Error("network"));
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Results").click();
      });

      await waitFor(() =>
        expect(screen.getByText("Failed to load results.")).toBeInTheDocument(),
      );
    });
  });

  describe("Blockchain tab", () => {
    test("renders the block table", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getBlockchainData.mockResolvedValue([block]);
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Blockchain").click();
      });

      await waitFor(() =>
        expect(screen.getByText("1 block")).toBeInTheDocument(),
      );
      expect(getBlockchainData).toHaveBeenCalledWith("t", "e1");
      expect(screen.getByText("Commitment")).toBeInTheDocument();
    });

    test("shows an empty state when there are no blocks", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getBlockchainData.mockResolvedValue([]);
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Blockchain").click();
      });

      await waitFor(() =>
        expect(screen.getByText("0 blocks")).toBeInTheDocument(),
      );
      expect(
        screen.getByText(/No blocks found for this election/),
      ).toBeInTheDocument();
    });

    test("surfaces an ApiError message", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getBlockchainData.mockRejectedValue(
        new ApiError(500, "ERR", "chainfail"),
      );
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Blockchain").click();
      });

      await waitFor(() =>
        expect(screen.getByText("chainfail")).toBeInTheDocument(),
      );
    });

    test("shows a generic message for non-ApiError failures", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getBlockchainData.mockRejectedValue(new Error("network"));
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Blockchain").click();
      });

      await waitFor(() =>
        expect(
          screen.getByText("Failed to load blockchain data."),
        ).toBeInTheDocument(),
      );
    });
  });

  describe("DownloadButton", () => {
    const createObjectURL = vi.fn(() => "blob:url");
    const revokeObjectURL = vi.fn();
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => {});

    beforeEach(() => {
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      anchorClick.mockClear();
      // jsdom does not implement these
      (URL as unknown as { createObjectURL: unknown }).createObjectURL =
        createObjectURL;
      (URL as unknown as { revokeObjectURL: unknown }).revokeObjectURL =
        revokeObjectURL;
    });

    afterEach(() => {
      anchorClick.mockRestore();
    });

    test("triggers a JSON download from the results tab", async () => {
      useAudit.mockReturnValue({ token: "t" });
      getElection.mockResolvedValue(election);
      getElectionResults.mockResolvedValue(results);
      render(<ElectionDetailPage />);
      await waitFor(() =>
        expect(screen.getByText("Mayor 2026")).toBeInTheDocument(),
      );

      await act(async () => {
        screen.getByText("Results").click();
      });
      await waitFor(() =>
        expect(screen.getByText("Alice")).toBeInTheDocument(),
      );

      fireEvent.click(screen.getByText(/Download results/));

      expect(createObjectURL).toHaveBeenCalledTimes(1);
      expect(anchorClick).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:url");
    });
  });
});
