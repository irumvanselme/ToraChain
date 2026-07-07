import { renderHook } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import {
  AuthContext,
  useAuth,
  useAuthContext,
  type AuthContextValue,
} from "./context";
import type { AuthConfig } from "./types";

const config: AuthConfig = {
  authApi: "https://idp.localhost/api",
  loginUrl: (redirectTo) =>
    `https://idp.localhost/login?redirect=${redirectTo}`,
};

const value: AuthContextValue = {
  user: null,
  loading: false,
  tokenReady: true,
  refresh: async () => {},
  logout: async () => {},
  config,
};

describe("useAuth", () => {
  test("throws when used outside an AuthProvider", () => {
    const { result } = renderHook(() => {
      try {
        return useAuth();
      } catch (err) {
        return err;
      }
    });

    expect(result.current).toBeInstanceOf(Error);
    expect((result.current as Error).message).toBe(
      "useAuth must be used within <AuthProvider>",
    );
  });

  test("returns the context state when inside an AuthProvider", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthContext value={value}>{children}</AuthContext>
      ),
    });

    expect(result.current).toEqual(value);
  });
});

describe("useAuthContext", () => {
  test("also exposes the config", () => {
    const { result } = renderHook(() => useAuthContext(), {
      wrapper: ({ children }) => (
        <AuthContext value={value}>{children}</AuthContext>
      ),
    });

    expect(result.current.config).toBe(config);
  });
});
