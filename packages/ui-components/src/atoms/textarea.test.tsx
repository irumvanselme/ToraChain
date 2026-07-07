import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Textarea } from "./textarea.tsx";

describe("Textarea", () => {
  test("renders a bare textarea when no label/error/hint", () => {
    const { container } = render(<Textarea placeholder="Bio" />);
    expect(container.querySelector("label")).toBeNull();
    const el = screen.getByPlaceholderText("Bio");
    expect(el).toHaveClass("textarea", "textarea-bordered", "w-full");
  });

  test("wraps in a form-control label when a label is provided", () => {
    const { container } = render(<Textarea label="Notes" />);
    expect(container.querySelector("label.form-control")).not.toBeNull();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  test("shows the error message and applies the error class", () => {
    render(<Textarea label="Notes" error="Too short" />);
    expect(screen.getByText("Too short")).toHaveClass("text-error");
    expect(screen.getByRole("textbox")).toHaveClass("textarea-error");
  });

  test("shows the hint when there is no error", () => {
    render(<Textarea hint="Optional" />);
    expect(screen.getByText("Optional")).toHaveClass("text-base-content/60");
  });

  test("prefers the error over the hint when both are given", () => {
    render(<Textarea error="Bad" hint="help" />);
    expect(screen.getByText("Bad")).toBeInTheDocument();
    expect(screen.queryByText("help")).not.toBeInTheDocument();
  });

  test("forwards value, name and other props", () => {
    render(<Textarea defaultValue="hi" name="bio" className="extra" />);
    const el = screen.getByRole("textbox");
    expect(el).toHaveValue("hi");
    expect(el).toHaveAttribute("name", "bio");
    expect(el).toHaveClass("extra");
  });
});
