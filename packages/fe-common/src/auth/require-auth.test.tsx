import { render, screen } from "@testing-library/react";
import { describe, test, expect, beforeEach } from "vitest";
import { RequireAuth } from "./require-auth";
import { AuthContext, type AuthContextValue } from "./context";
import type { AuthConfig, AuthUser } from "./types";

const loginUrl = (redirectTo: string) =>
  `https://idp.localhost/login?redirect=${redirectTo}`;

const config: AuthConfig = {
  authApi: "https://idp.localhost/api",
  loginUrl,
};

const user: AuthUser = {
  id: "u1",
  email: "voter@example.com",
  name: "Voter",
  emailVerified: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function renderWith(value: Partial<AuthContextValue>) {
  const full: AuthContextValue = {
    user: null,
    loading: false,
    tokenReady: true,
    refresh: async () => {},
    logout: async () => {},
    config,
    ...value,
  };
  return render(
    <AuthContext value={full}>
      <RequireAuth>
        <div>protected content</div>
      </RequireAuth>
    </AuthContext>,
  );
}

describe("RequireAuth", () => {
  beforeEach(() => {
    Object.defineProperty(window, "location", {
      value: { href: "https://voting.localhost/ballot" },
      writable: true,
    });
  });

  test("shows the default fallback while the session check is loading", () => {
    renderWith({ loading: true, user: null });

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  test("shows the default fallback while the token is not ready", () => {
    renderWith({ loading: false, user, tokenReady: false });

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  test("renders the children once loaded, signed in, and token ready", () => {
    renderWith({ loading: false, user, tokenReady: true });

    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  test("redirects to the login page when there is no session", () => {
    renderWith({ loading: false, user: null });

    expect(window.location.href).toBe(
      loginUrl("https://voting.localhost/ballot"),
    );
  });

  test("does not redirect while still loading", () => {
    renderWith({ loading: true, user: null });

    expect(window.location.href).toBe("https://voting.localhost/ballot");
  });

  test("renders a custom fallback when provided", () => {
    render(
      <AuthContext
        value={{
          user: null,
          loading: true,
          tokenReady: false,
          refresh: async () => {},
          logout: async () => {},
          config,
        }}
      >
        <RequireAuth fallback={<div>custom loading</div>}>
          <div>protected content</div>
        </RequireAuth>
      </AuthContext>,
    );

    expect(screen.getByText("custom loading")).toBeInTheDocument();
  });
});
