import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { EmptyState } from "./empty-state.tsx";

describe("EmptyState", () => {
  test("renders the title as a heading", () => {
    render(<EmptyState title="Nothing here" />);
    expect(
      screen.getByRole("heading", { name: "Nothing here" }),
    ).toBeInTheDocument();
  });

  test("renders optional description, icon, and action when provided", () => {
    render(
      <EmptyState
        title="Empty"
        description="No elections yet"
        icon={<span data-testid="icon">📭</span>}
        action={<button>Create</button>}
      />,
    );
    expect(screen.getByText("No elections yet")).toBeInTheDocument();
    expect(screen.getByTestId("icon")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });

  test("omits optional slots when not provided", () => {
    const { container } = render(<EmptyState title="Empty" />);
    expect(container.querySelector("p")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  test("merges a custom className onto the root", () => {
    const { container } = render(
      <EmptyState title="Empty" className="mt-10" />,
    );
    expect(container.firstChild).toHaveClass("mt-10");
  });
});
