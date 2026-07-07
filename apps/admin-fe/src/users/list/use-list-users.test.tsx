import { describe, test, expect, vi, beforeEach } from "vitest";
import type { ReactNode } from "react";
import { renderHook, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listUsers = vi.fn();
vi.mock("api/users.ts", async () => {
  const actual =
    await vi.importActual<typeof import("api/users.ts")>("api/users.ts");
  return { ...actual, listUsers: (...a: unknown[]) => listUsers(...a) };
});

import { useListUsers } from "./use-list-users.ts";

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

function wrapper(entries = ["/users"]) {
  return ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={entries}>{children}</MemoryRouter>
  );
}

beforeEach(() => {
  listUsers.mockReset();
  listUsers.mockResolvedValue({
    data: [user],
    pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
  });
});

describe("useListUsers", () => {
  test("defaults to the voters domain", async () => {
    const { result } = renderHook(() => useListUsers(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userType).toBe("voters");
    expect(listUsers).toHaveBeenCalledWith(
      "voters",
      { page: 1, limit: 10, q: undefined },
      expect.any(AbortSignal),
    );
  });

  test("reads a valid userType from the URL", async () => {
    const { result } = renderHook(() => useListUsers(), {
      wrapper: wrapper(["/users?type=admins&page=3&q=foo"]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userType).toBe("admins");
    expect(listUsers).toHaveBeenCalledWith(
      "admins",
      { page: 3, limit: 10, q: "foo" },
      expect.any(AbortSignal),
    );
  });

  test("falls back to voters for an unknown userType", async () => {
    const { result } = renderHook(() => useListUsers(), {
      wrapper: wrapper(["/users?type=bogus"]),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.userType).toBe("voters");
  });

  test("sets an error on failure", async () => {
    listUsers.mockRejectedValueOnce(new Error("nope"));
    const { result } = renderHook(() => useListUsers(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.error).toBe("nope"));
  });

  test("ignores AbortError", async () => {
    listUsers.mockRejectedValueOnce(new DOMException("a", "AbortError"));
    const { result } = renderHook(() => useListUsers(), { wrapper: wrapper() });
    await Promise.resolve();
    expect(result.current.error).toBeNull();
  });

  test("patchParams updates the query", async () => {
    const { result } = renderHook(() => useListUsers(), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.patchParams({ q: "abc", page: "" }));
    await waitFor(() =>
      expect(listUsers).toHaveBeenLastCalledWith(
        "voters",
        { page: 1, limit: 10, q: "abc" },
        expect.any(AbortSignal),
      ),
    );
  });
});
