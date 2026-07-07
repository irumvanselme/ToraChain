import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ApiError } from "api/error";

const createElection = vi.fn();
vi.mock("api/elections", async () => {
  const actual =
    await vi.importActual<typeof import("api/elections")>("api/elections");
  return {
    ...actual,
    createElection: (...a: unknown[]) => createElection(...a),
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

import { ElectionCreatePage } from "./create.tsx";

function renderPage() {
  return render(
    <MemoryRouter>
      <ElectionCreatePage />
    </MemoryRouter>,
  );
}

/** Fill title, dates (via the calendar web components) and times so the form is valid. */
function fillValidForm() {
  fireEvent.change(screen.getByLabelText("Title"), {
    target: { value: "New Election" },
  });
  const calendars = document.querySelectorAll("calendar-date");
  calendars.forEach((cal, i) => {
    (cal as HTMLElement & { value: string }).value =
      i === 0 ? "2024-01-01" : "2024-01-02";
    cal.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const timeInputs = screen.getAllByLabelText(/\(time\)/);
  fireEvent.change(timeInputs[0], { target: { value: "10:00" } });
  fireEvent.change(timeInputs[1], { target: { value: "11:00" } });
}

beforeEach(() => {
  createElection.mockReset();
  navigate.mockReset();
});

describe("ElectionCreatePage", () => {
  test("renders the form", () => {
    renderPage();
    expect(
      screen.getByRole("button", { name: "Create election" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Title")).toBeInTheDocument();
  });

  test("validation blocks submit when required fields are missing", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(createElection).not.toHaveBeenCalled();
  });

  test("submits a valid form and navigates to the new detail page", async () => {
    createElection.mockResolvedValue({ electionId: "new-1" });
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    await waitFor(() => expect(createElection).toHaveBeenCalledTimes(1));
    expect(createElection.mock.calls[0][0].title).toBe("New Election");
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith("/elections/new-1", {
        replace: true,
      }),
    );
  });

  test("shows an ApiError message when creation fails", async () => {
    createElection.mockRejectedValue(new ApiError(400, "bad", "Create broke"));
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(await screen.findByText("Create broke")).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  test("shows a generic message when creation fails with non-ApiError", async () => {
    createElection.mockRejectedValue(new Error("boom"));
    renderPage();
    fillValidForm();
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(
      await screen.findByText("Could not create the election."),
    ).toBeInTheDocument();
  });

  test("cancel navigates back to the list", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(navigate).toHaveBeenCalledWith("/elections");
  });
});
