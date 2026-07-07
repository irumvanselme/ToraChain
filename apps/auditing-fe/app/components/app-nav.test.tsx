import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const usePathname = vi.fn(() => "/dashboard");
vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    className,
  }: {
    children: ReactNode;
    href: string;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

const useAuth = vi.fn();
vi.mock("@tora-chain/fe-common", () => ({
  useAuth: () => useAuth(),
}));

const useAudit = vi.fn();
vi.mock("../lib/audit-context", () => ({
  useAudit: () => useAudit(),
}));

vi.mock("@tora-chain/ui-components", () => ({
  AppHeader: ({
    brand,
    account,
    nav,
  }: {
    brand: ReactNode;
    account: ReactNode;
    nav: ReactNode;
  }) => (
    <header>
      <div data-testid="brand">{brand}</div>
      <div data-testid="account">{account}</div>
      <div data-testid="nav">{nav}</div>
    </header>
  ),
  AccountMenu: ({
    user,
    onLogout,
    children,
  }: {
    user: { name?: string };
    onLogout: () => void;
    children: ReactNode;
  }) => (
    <div data-testid="account-menu">
      <span>{user.name}</span>
      <button onClick={onLogout}>logout</button>
      {children}
    </div>
  ),
  LogoSquare: () => <span data-testid="logo" />,
  appNavItemClass: (active: boolean) => (active ? "active" : "inactive"),
}));

vi.mock("../lib/config.ts", () => ({ AUTH_BASE: "https://idp/auditors" }));

import { AppNav } from "./app-nav";

describe("AppNav", () => {
  beforeEach(() => {
    usePathname.mockReturnValue("/dashboard");
    useAuth.mockReset();
    useAudit.mockReset();
  });

  test("shows the org name when available", () => {
    useAudit.mockReturnValue({ auditStatus: { org: { name: "Acme Audit" } } });
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(<AppNav />);
    expect(screen.getByText("Acme Audit")).toBeInTheDocument();
    expect(screen.getByText("Auditing")).toBeInTheDocument();
  });

  test("omits the org name when there is no org", () => {
    useAudit.mockReturnValue({ auditStatus: { org: null } });
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(<AppNav />);
    expect(screen.queryByText("Acme Audit")).not.toBeInTheDocument();
    // No account menu without a user.
    expect(screen.queryByTestId("account-menu")).not.toBeInTheDocument();
  });

  test("renders the account menu and wires logout when signed in", () => {
    const logout = vi.fn();
    useAudit.mockReturnValue({ auditStatus: null });
    useAuth.mockReturnValue({ user: { name: "Auditor" }, logout });
    render(<AppNav />);

    expect(screen.getByTestId("account-menu")).toBeInTheDocument();
    expect(screen.getByText("Auditor")).toBeInTheDocument();
    screen.getByText("logout").click();
    expect(logout).toHaveBeenCalled();
  });

  test("marks Elections active on election detail routes", () => {
    usePathname.mockReturnValue("/elections/abc");
    useAudit.mockReturnValue({ auditStatus: null });
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(<AppNav />);
    expect(screen.getByText("Elections")).toHaveClass("active");
  });

  test("marks Elections inactive on unrelated routes", () => {
    usePathname.mockReturnValue("/somewhere");
    useAudit.mockReturnValue({ auditStatus: null });
    useAuth.mockReturnValue({ user: null, logout: vi.fn() });
    render(<AppNav />);
    expect(screen.getByText("Elections")).toHaveClass("inactive");
  });
});
