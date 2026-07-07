import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Select, type SelectOption } from "./select.tsx";

const options: SelectOption[] = [
  { label: "One", value: "1" },
  { label: "Two", value: "2" },
];

describe("Select", () => {
  test("renders a bare select (no label wrapper) when no label/error", () => {
    const { container } = render(<Select options={options} />);
    expect(container.querySelector("label")).toBeNull();
    const select = screen.getByRole("combobox");
    expect(select).toHaveClass("select", "select-bordered");
  });

  test("renders one option per entry", () => {
    render(<Select options={options} />);
    expect(screen.getByRole("option", { name: "One" })).toHaveValue("1");
    expect(screen.getByRole("option", { name: "Two" })).toHaveValue("2");
  });

  test("renders a placeholder option when provided", () => {
    render(<Select options={options} placeholder="Choose…" />);
    const placeholder = screen.getByRole("option", { name: "Choose…" });
    expect(placeholder).toHaveValue("");
    expect(placeholder).not.toBeDisabled();
  });

  test("disables the placeholder option when the select is required", () => {
    render(<Select options={options} placeholder="Choose…" required />);
    expect(screen.getByRole("option", { name: "Choose…" })).toBeDisabled();
  });

  test("wraps in a label and shows label text", () => {
    const { container } = render(<Select options={options} label="Pick" />);
    expect(container.querySelector("label.form-control")).not.toBeNull();
    expect(screen.getByText("Pick")).toBeInTheDocument();
  });

  test("shows the error and applies the error class", () => {
    render(<Select options={options} error="Required" />);
    expect(screen.getByText("Required")).toHaveClass("text-error");
    expect(screen.getByRole("combobox")).toHaveClass("select-error");
  });

  test("forwards value and other select props", () => {
    render(
      <Select
        options={options}
        defaultValue="2"
        name="pick"
        className="extra"
      />,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("2");
    expect(select).toHaveAttribute("name", "pick");
    expect(select).toHaveClass("extra");
  });
});
