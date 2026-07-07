import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ApiError } from "api/error";
import type { Election } from "api/elections";

const getElection = vi.fn();
vi.mock("api/elections", async () => {
  const actual =
    await vi.importActual<typeof import("api/elections")>("api/elections");
  return { ...actual, getElection: (...a: unknown[]) => getElection(...a) };
});

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual =
    await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("../candidates/election-candidates-table.tsx", () => ({
  ElectionCandidatesTable: ({ electionId }: { electionId: string }) => (
    <div data-testid="candidates">candidates:{electionId}</div>
  ),
}));
vi.mock("../voters/election-voters-table.tsx", () => ({
  ElectionVotersTable: ({ electionId }: { electionId: string }) => (
    <div data-testid="voters">voters:{electionId}</div>
  ),
}));
vi.mock("../integrations/election-integration-form.tsx", () => ({
  ElectionIntegrationForm: ({ electionId }: { electionId: string }) => (
    <div data-testid="integrations">integrations:{electionId}</div>
  ),
}));

import { ElectionDetailPage } from "./detail.tsx";

const election: Election = {
  electionId: "e1",
  title: "Student Council",
  description: "A description",
  status: "draft",
  startTime: "2024-01-01T10:00:00.000Z",
  endTime: "2024-01-02T10:00:00.000Z",
  deleted: false,
};

function renderPage(id = "e1") {
  return render(
    <MemoryRouter initialEntries={[`/elections/${id}`]}>
      <Routes>
        <Route path="/elections/:id" element={<ElectionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getElection.mockReset();
  navigate.mockReset();
});

describe("ElectionDetailPage", () => {
  test("shows a spinner while loading", () => {
    getElection.mockReturnValue(new Promise(() => {}));
    const { container } = renderPage();
    expect(
      container.querySelector(".loading, [class*='loading']"),
    ).toBeTruthy();
  });

  test("renders election details and child tabs on success", async () => {
    getElection.mockResolvedValue(election);
    renderPage();

    expect(await screen.findByText("e1")).toBeInTheDocument();
    expect(screen.getByText("Student Council")).toBeInTheDocument();
    expect(screen.getByText("A description")).toBeInTheDocument();
    expect(screen.getByTestId("candidates")).toHaveTextContent("candidates:e1");
    expect(screen.getByTestId("voters")).toHaveTextContent("voters:e1");
    expect(screen.getByTestId("integrations")).toHaveTextContent(
      "integrations:e1",
    );
  });

  test("shows 'No description' when description is empty", async () => {
    getElection.mockResolvedValue({ ...election, description: "" });
    renderPage();
    expect(await screen.findByText("No description")).toBeInTheDocument();
  });

  test("shows the trash badge when deleted", async () => {
    getElection.mockResolvedValue({ ...election, deleted: true });
    renderPage();
    expect(await screen.findByText("In trash")).toBeInTheDocument();
  });

  test("Edit button navigates to the edit route", async () => {
    getElection.mockResolvedValue(election);
    renderPage();
    await screen.findByText("e1");
    await userEvent.click(screen.getByRole("button", { name: "Edit" }));
    expect(navigate).toHaveBeenCalledWith("/elections/e1/edit");
  });

  test("Back button navigates to the list", async () => {
    getElection.mockResolvedValue(election);
    renderPage();
    await screen.findByText("e1");
    await userEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(navigate).toHaveBeenCalledWith("/elections");
  });

  test("renders an ApiError message", async () => {
    getElection.mockRejectedValue(new ApiError(404, "not_found", "Nope"));
    renderPage();
    expect(await screen.findByText("Nope")).toBeInTheDocument();
  });

  test("renders a generic error for non-ApiError failures", async () => {
    getElection.mockRejectedValue(new Error("boom"));
    renderPage();
    expect(
      await screen.findByText("Could not load election."),
    ).toBeInTheDocument();
  });

  test("ignores AbortError rejections", async () => {
    getElection.mockRejectedValue(new DOMException("aborted", "AbortError"));
    renderPage();
    // stays in loading; no error alert appears
    await waitFor(() => expect(getElection).toHaveBeenCalled());
    expect(
      screen.queryByText("Could not load election."),
    ).not.toBeInTheDocument();
  });
});
