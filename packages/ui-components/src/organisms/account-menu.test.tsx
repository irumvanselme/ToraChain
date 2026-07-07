import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { AccountMenu } from "./account-menu.tsx";

describe("AccountMenu", () => {
  test("shows the display name from the user's name", () => {
    render(<AccountMenu user={{ name: "Ada Lovelace", email: "a@x.io" }} />);
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
  });

  test("shows initials derived from the name", () => {
    render(<AccountMenu user={{ name: "Ada Lovelace" }} />);
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  test("falls back to the email as the display name when no name", () => {
    render(<AccountMenu user={{ email: "bob@example.com" }} />);
    // trigger label + email in the header
    expect(screen.getAllByText("bob@example.com").length).toBeGreaterThan(0);
  });

  test("renders the User icon fallback when there are no initials", () => {
    const { container } = render(<AccountMenu user={{ name: "" }} />);
    // lucide renders an svg for the User icon
    expect(container.querySelector("svg")).not.toBeNull();
  });

  test("does not show the account name row when name is absent", () => {
    render(<AccountMenu user={{ email: "bob@example.com" }} />);
    // header only shows email; no separate semibold name element
    expect(screen.queryByText("Ada")).not.toBeInTheDocument();
  });

  test("hides the log-out item when no onLogout handler is given", () => {
    render(<AccountMenu user={{ name: "Ada" }} />);
    expect(screen.queryByText("Log out")).not.toBeInTheDocument();
  });

  test("shows the log-out item with a custom label", () => {
    render(
      <AccountMenu
        user={{ name: "Ada" }}
        onLogout={() => {}}
        logoutLabel="Sign out"
      />,
    );
    expect(screen.getByText("Sign out")).toBeInTheDocument();
  });

  test("renders extra children menu items", () => {
    render(
      <AccountMenu user={{ name: "Ada" }}>
        <li>
          <a href="/account">Account</a>
        </li>
      </AccountMenu>,
    );
    expect(screen.getByRole("link", { name: "Account" })).toBeInTheDocument();
  });

  test("calls onLogout and disables the item while pending", async () => {
    let resolve!: () => void;
    const onLogout = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r;
        }),
    );
    render(<AccountMenu user={{ name: "Ada" }} onLogout={onLogout} />);

    const logoutBtn = screen.getByText("Log out").closest("button")!;
    fireEvent.click(logoutBtn);

    expect(onLogout).toHaveBeenCalledOnce();
    expect(logoutBtn).toBeDisabled();

    resolve();
    await waitFor(() => expect(logoutBtn).not.toBeDisabled());
  });

  test("ignores repeated clicks while a logout is in flight", () => {
    const onLogout = vi.fn(() => new Promise<void>(() => {}));
    render(<AccountMenu user={{ name: "Ada" }} onLogout={onLogout} />);

    const logoutBtn = screen.getByText("Log out").closest("button")!;
    fireEvent.click(logoutBtn);
    fireEvent.click(logoutBtn);

    expect(onLogout).toHaveBeenCalledOnce();
  });

  test("applies a custom className to the trigger button", () => {
    render(<AccountMenu user={{ name: "Ada" }} className="extra" />);
    expect(screen.getByRole("button", { name: "Account menu" })).toHaveClass(
      "extra",
    );
  });
});
