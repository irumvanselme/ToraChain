import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthProvider } from "./auth-provider";
import { useAuth } from "./context";
import { getSession, signOut } from "./session";
import { clearStoredToken, getTokenManager } from "../token/manager";
import type { AuthConfig, AuthUser } from "./types";

vi.mock("./session", () => ({
  getSession: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock("../token/manager", () => ({
  getTokenManager: vi.fn(),
  clearStoredToken: vi.fn(),
}));

const mockGetSession = getSession as unknown as ReturnType<typeof vi.fn>;
const mockSignOut = signOut as unknown as ReturnType<typeof vi.fn>;
const mockGetTokenManager = getTokenManager as unknown as ReturnType<
  typeof vi.fn
>;
const mockClearStoredToken = clearStoredToken as unknown as ReturnType<
  typeof vi.fn
>;

const user: AuthUser = {
  id: "u1",
  email: "voter@example.com",
  name: "Voter",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function Consumer() {
  const { user, loading, tokenReady, refresh, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="token-ready">{String(tokenReady)}</span>
      <span data-testid="user">{user ? user.email : "none"}</span>
      <button onClick={() => void refresh()}>refresh</button>
      <button onClick={() => void logout()}>logout</button>
    </div>
  );
}

function baseConfig(overrides: Partial<AuthConfig> = {}): AuthConfig {
  return {
    authApi: "https://idp.localhost/api",
    loginUrl: (redirectTo) =>
      `https://idp.localhost/login?redirect=${redirectTo}`,
    ...overrides,
  };
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockGetTokenManager.mockReset();
    mockClearStoredToken.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("starts in a loading state and resolves to the session user", async () => {
    mockGetSession.mockResolvedValue(user);

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    expect(screen.getByTestId("loading").textContent).toBe("true");

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    expect(screen.getByTestId("user").textContent).toBe(user.email);
    expect(screen.getByTestId("token-ready").textContent).toBe("true");
  });

  test("resolves to no user when there is no session", async () => {
    mockGetSession.mockResolvedValue(null);

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("token-ready").textContent).toBe("true");
  });

  test("stays loading when the session fetch is aborted", async () => {
    mockGetSession.mockRejectedValue(new DOMException("aborted", "AbortError"));

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(screen.getByTestId("loading").textContent).toBe("true");
  });

  test("stops loading when the session fetch fails with a non-abort error", async () => {
    mockGetSession.mockRejectedValue(new Error("network down"));

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    expect(screen.getByTestId("user").textContent).toBe("none");
  });

  test("waits for the token, retrying transient failures, before marking ready", async () => {
    vi.useFakeTimers();
    mockGetSession.mockResolvedValue(user);
    const getToken = vi
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce("jwt-token");
    mockGetTokenManager.mockReturnValue({ getToken });

    render(
      <AuthProvider
        config={baseConfig({
          tokenKey: "voters",
          tokenEndpoint: "https://idp.localhost/api/token",
        })}
      >
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("token-ready").textContent).toBe("false");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getToken).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("token-ready").textContent).toBe("true");
  });

  test("marks ready after exhausting retries even if the token never resolves", async () => {
    vi.useFakeTimers();
    mockGetSession.mockResolvedValue(user);
    const getToken = vi.fn().mockResolvedValue(null);
    mockGetTokenManager.mockReturnValue({ getToken });

    render(
      <AuthProvider
        config={baseConfig({
          tokenKey: "voters",
          tokenEndpoint: "https://idp.localhost/api/token",
        })}
      >
        <Consumer />
      </AuthProvider>,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(getToken).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId("token-ready").textContent).toBe("true");
  });

  test("token stays not-ready when there is no signed-in user", async () => {
    mockGetSession.mockResolvedValue(null);
    const getToken = vi.fn();
    mockGetTokenManager.mockReturnValue({ getToken });

    render(
      <AuthProvider
        config={baseConfig({
          tokenKey: "voters",
          tokenEndpoint: "https://idp.localhost/api/token",
        })}
      >
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    expect(screen.getByTestId("token-ready").textContent).toBe("false");
    expect(getToken).not.toHaveBeenCalled();
  });

  test("logout signs out, clears the token, and resets state", async () => {
    mockGetSession.mockResolvedValue(user);
    const getToken = vi.fn().mockResolvedValue("jwt-token");
    mockGetTokenManager.mockReturnValue({ getToken });

    render(
      <AuthProvider
        config={baseConfig({
          tokenKey: "voters",
          tokenEndpoint: "https://idp.localhost/api/token",
        })}
      >
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("token-ready").textContent).toBe("true"),
    );

    await act(async () => {
      screen.getByText("logout").click();
    });

    expect(mockSignOut).toHaveBeenCalledWith("https://idp.localhost/api");
    expect(mockClearStoredToken).toHaveBeenCalledWith("voters");
    expect(screen.getByTestId("user").textContent).toBe("none");
    expect(screen.getByTestId("token-ready").textContent).toBe("false");
  });

  test("logout without a configured token key skips clearing storage", async () => {
    mockGetSession.mockResolvedValue(user);

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("loading").textContent).toBe("false"),
    );

    await act(async () => {
      screen.getByText("logout").click();
    });

    expect(mockClearStoredToken).not.toHaveBeenCalled();
    expect(screen.getByTestId("token-ready").textContent).toBe("true");
  });

  test("refresh re-fetches the session", async () => {
    mockGetSession.mockResolvedValueOnce(user);

    render(
      <AuthProvider config={baseConfig()}>
        <Consumer />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId("user").textContent).toBe(user.email),
    );

    mockGetSession.mockResolvedValueOnce(null);

    await act(async () => {
      screen.getByText("refresh").click();
    });

    expect(screen.getByTestId("user").textContent).toBe("none");
  });
});
