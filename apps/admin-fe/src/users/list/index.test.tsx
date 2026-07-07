import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listUsers = vi.fn();
const createAdmin = vi.fn();

vi.mock("api/users.ts", async () => {
  const actual =
    await vi.importActual<typeof import("api/users.ts")>("api/users.ts");
  return {
    ...actual,
    listUsers: (...a: unknown[]) => listUsers(...a),
    createAdmin: (...a: unknown[]) => createAdmin(...a),
  };
});

import { UsersListPage } from "./index.tsx";

const user = {
  id: "u1",
  name: "User One",
  email: "u1@example.com",
  emailVerified: true,
  image: null,
  role: null,
  banned: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

const bannedUnverified = {
  ...user,
  id: "u2",
  name: "User Two",
  email: "u2@example.com",
  emailVerified: false,
  banned: true,
};

function renderPage(entries = ["/users"]) {
  return render(
    <MemoryRouter initialEntries={entries}>
      <UsersListPage />
    </MemoryRouter>,
  );
}

function envelope(
  data: unknown[],
  total = data.length,
  totalPages = 1,
  page = 1,
) {
  return { data, pagination: { page, limit: 10, total, totalPages } };
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
  listUsers.mockReset();
  createAdmin.mockReset();
  listUsers.mockResolvedValue(envelope([user]));
});

describe("UsersListPage", () => {
  test("renders the voters tab with a data row", async () => {
    renderPage();
    await screen.findByText("User One");
    expect(screen.getByText("u1@example.com")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    // Singular count label ("voter").
    expect(listUsers).toHaveBeenCalledWith(
      "voters",
      { page: 1, limit: 10, q: undefined },
      expect.any(AbortSignal),
    );
  });

  test("renders banned and unverified badges", async () => {
    listUsers.mockResolvedValue(envelope([bannedUnverified], 2, 1));
    renderPage();
    await screen.findByText("User Two");
    expect(screen.getByText("Banned")).toBeInTheDocument();
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  test("shows an error and retries", async () => {
    listUsers.mockRejectedValueOnce(new Error("kaboom"));
    renderPage();
    await screen.findByText("kaboom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("User One");
  });

  test("submits a search and offers to clear it when empty", async () => {
    renderPage();
    await screen.findByText("User One");
    const input = screen.getByLabelText("Search by email");
    fireEvent.change(input, { target: { value: "  alice  " } });
    // Now the reload will return nothing for that query.
    listUsers.mockResolvedValue(envelope([], 0));
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(
        "voters",
        { page: 1, limit: 10, q: "alice" },
        expect.any(AbortSignal),
      ),
    );
    // Empty-with-query state offers a Clear search action.
    await screen.findByText(/No voters match/);
    listUsers.mockResolvedValue(envelope([user]));
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    await screen.findByText("User One");
  });

  test("shows the voters empty state without a query", async () => {
    listUsers.mockResolvedValue(envelope([], 0));
    renderPage();
    await screen.findByText("No voters found");
    expect(
      screen.getByText(/Nobody has registered a voter account yet/),
    ).toBeInTheDocument();
  });

  test("paginates to the next page", async () => {
    listUsers.mockResolvedValue(envelope([user], 25, 3, 1));
    renderPage();
    await screen.findByText("User One");
    // Plural count label with total > 1.
    expect(screen.getByText(/25\s+voters/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Page 1 of 3"));
    const next = screen
      .getAllByRole("button")
      .find(
        (b) =>
          b.classList.contains("join-item") &&
          !b.hasAttribute("disabled") &&
          b.querySelector("svg"),
      );
    fireEvent.click(next!);
    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(
        "voters",
        { page: 2, limit: 10, q: undefined },
        expect.any(AbortSignal),
      ),
    );
  });

  test("switches to the admins tab", async () => {
    renderPage();
    await screen.findByText("User One");
    listUsers.mockResolvedValue(envelope([], 0));
    fireEvent.click(screen.getByLabelText("Admins"));
    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(
        "admins",
        { page: 1, limit: 10, q: undefined },
        expect.any(AbortSignal),
      ),
    );
    // Admins empty state offers an Add admin action.
    await screen.findByText("No admins found");
    expect(screen.getByText(/add one here/)).toBeInTheDocument();
  });

  test("opens the add-admin modal from the empty state and creates an admin", async () => {
    createAdmin.mockResolvedValueOnce(user);
    listUsers.mockResolvedValue(envelope([], 0));
    renderPage(["/users?type=admins"]);
    await screen.findByText("No admins found");

    // The empty-state "Add admin" button opens the modal.
    fireEvent.click(
      within(
        screen.getByText("No admins found").closest("div")!.parentElement!,
      ).getByRole("button", { name: /Add admin/ }),
    );

    const form = document.getElementById(
      "create-admin-form",
    ) as HTMLFormElement;
    const inputs = form.querySelectorAll("input");
    fireEvent.change(inputs[0]!, { target: { value: "New Admin" } });
    fireEvent.change(inputs[1]!, { target: { value: "new@admin.dev" } });
    fireEvent.change(inputs[2]!, { target: { value: "password123" } });

    listUsers.mockResolvedValue(envelope([user]));
    fireEvent.submit(form);

    await waitFor(() =>
      expect(createAdmin).toHaveBeenCalledWith({
        name: "New Admin",
        email: "new@admin.dev",
        password: "password123",
      }),
    );
    // onCreated triggers a reload.
    await screen.findByText("User One");
  });

  test("opens the add-admin modal from the header action", async () => {
    listUsers.mockResolvedValue(envelope([user]));
    renderPage(["/users?type=admins"]);
    await screen.findByText("User One");
    // Header shows an Add admin button for the admins tab.
    fireEvent.click(screen.getByRole("button", { name: /Add admin/ }));
    expect(
      screen.getByRole("heading", { name: "Add admin" }),
    ).toBeInTheDocument();
  });
});
