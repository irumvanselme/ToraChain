import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Spinner } from "./spinner.tsx";

describe("Spinner", () => {
  test("renders a status role with the default md size and label", () => {
    render(<Spinner />);
    const spinner = screen.getByRole("status");
    expect(spinner).toHaveClass("loading", "loading-spinner", "loading-md");
    expect(spinner).toHaveAttribute("aria-label", "Loading");
  });

  test("applies the size class for sm and lg", () => {
    const { rerender } = render(<Spinner size="sm" />);
    expect(screen.getByRole("status")).toHaveClass("loading-sm");

    rerender(<Spinner size="lg" />);
    expect(screen.getByRole("status")).toHaveClass("loading-lg");
  });

  test("uses a custom aria-label when a label is given", () => {
    render(<Spinner label="Saving" />);
    expect(screen.getByRole("status")).toHaveAttribute("aria-label", "Saving");
  });

  test("merges a custom className", () => {
    render(<Spinner className="text-primary" />);
    expect(screen.getByRole("status")).toHaveClass("text-primary");
  });
});
