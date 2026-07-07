import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { AppHeader, appNavItemClass } from "./app-header.tsx";

describe("AppHeader", () => {
  test("renders as a banner with the brand slot", () => {
    render(<AppHeader brand={<span>ToraChain</span>} />);
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByText("ToraChain")).toBeInTheDocument();
  });

  test("renders actions and account in the top-end region", () => {
    render(
      <AppHeader actions={<button>Act</button>} account={<span>Acct</span>} />,
    );
    expect(screen.getByRole("button", { name: "Act" })).toBeInTheDocument();
    expect(screen.getByText("Acct")).toBeInTheDocument();
  });

  test("does not render the top-end region without actions or account", () => {
    const { container } = render(<AppHeader brand={<span>B</span>} />);
    // only one flex child region (the brand wrapper) inside the top bar
    const topBar = container.querySelector("header > div");
    expect(topBar?.children.length).toBe(1);
  });

  test("renders the nav bar only when nav is provided", () => {
    const { container, rerender } = render(
      <AppHeader brand={<span>B</span>} />,
    );
    expect(container.querySelector("nav")).toBeNull();

    rerender(<AppHeader nav={<a href="/x">Tab</a>} />);
    expect(container.querySelector("nav")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Tab" })).toBeInTheDocument();
  });

  test("applies className and containerClassName", () => {
    const { container } = render(
      <AppHeader
        nav={<a href="/x">Tab</a>}
        className="shadow"
        containerClassName="max-w-6xl"
      />,
    );
    expect(container.querySelector("header")).toHaveClass("shadow");
    // both the top bar and nav use containerClassName
    expect(container.querySelectorAll(".max-w-6xl").length).toBe(2);
  });
});

describe("appNavItemClass", () => {
  test("returns active styling when isActive is true", () => {
    const cls = appNavItemClass(true);
    expect(cls).toContain("border-primary");
    expect(cls).toContain("text-primary");
  });

  test("returns inactive styling when isActive is false", () => {
    const cls = appNavItemClass(false);
    expect(cls).toContain("border-transparent");
    expect(cls).toContain("hover:text-base-content");
  });
});
