import { describe, test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

const logout = vi.fn();
let mockUser: { name: string; email: string } | null = {
  name: "Admin",
  email: "a@b.c",
};

vi.mock("@tora-chain/fe-common", async () => {
  const actual = await vi.importActual<typeof import("@tora-chain/fe-common")>(
    "@tora-chain/fe-common",
  );
  return {
    ...actual,
    useAuth: () => ({ user: mockUser, logout }),
  };
});

import { Layout } from "./layout.tsx";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/elections"]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/elections" element={<div>Outlet content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  test("renders the nav items and the outlet", () => {
    mockUser = { name: "Admin", email: "a@b.c" };
    renderLayout();
    expect(screen.getByRole("link", { name: "Elections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Auditor approvals" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Outlet content")).toBeInTheDocument();
  });

  test("renders the account menu when a user is present", () => {
    mockUser = { name: "Admin", email: "a@b.c" };
    renderLayout();
    // The name shows in both the menu trigger and the open dropdown.
    expect(screen.getAllByText("Admin").length).toBeGreaterThan(0);
  });

  test("renders without an account menu when the user is null", () => {
    mockUser = null;
    renderLayout();
    // Nav still renders; the account slot is empty (no crash).
    expect(screen.getByRole("link", { name: "Elections" })).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });
});
