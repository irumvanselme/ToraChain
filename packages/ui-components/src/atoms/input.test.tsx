import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Input } from "./input.tsx";

describe("Input", () => {
  test("renders a bare input (no wrapping label) when no label/error/hint", () => {
    const { container } = render(<Input placeholder="Name" />);
    expect(container.querySelector("label")).toBeNull();
    const input = screen.getByPlaceholderText("Name");
    expect(input).toHaveClass("input", "input-bordered", "w-full");
  });

  test("wraps in a form-control label when a label is provided", () => {
    const { container } = render(<Input label="Email" id="email" />);
    expect(container.querySelector("label.form-control")).not.toBeNull();
    const labelText = screen.getByText("Email");
    expect(labelText).toHaveAttribute("id", "email-label");
  });

  test("omits the label id when no id is set", () => {
    render(<Input label="Email" />);
    expect(screen.getByText("Email")).not.toHaveAttribute("id");
  });

  test("shows the error message and applies the error class", () => {
    render(<Input label="Email" error="Required" />);
    const err = screen.getByText("Required");
    expect(err).toHaveClass("text-error");
    expect(screen.getByRole("textbox")).toHaveClass("input-error");
  });

  test("shows the hint when there is no error", () => {
    render(<Input hint="Optional field" />);
    expect(screen.getByText("Optional field")).toHaveClass(
      "text-base-content/60",
    );
  });

  test("prefers the error over the hint when both are given", () => {
    render(<Input error="Bad" hint="help" />);
    expect(screen.getByText("Bad")).toBeInTheDocument();
    expect(screen.queryByText("help")).not.toBeInTheDocument();
  });

  test("forwards value, onChange and other input props", () => {
    render(<Input defaultValue="hi" name="field" className="extra" />);
    const input = screen.getByRole("textbox");
    expect(input).toHaveValue("hi");
    expect(input).toHaveAttribute("name", "field");
    expect(input).toHaveClass("extra");
  });
});
