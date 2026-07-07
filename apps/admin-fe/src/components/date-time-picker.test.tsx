import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DateTimePicker } from "./date-time-picker.tsx";

const onChange = vi.fn();

beforeEach(() => {
  onChange.mockReset();
});

describe("DateTimePicker", () => {
  test("renders 'Pick a date' when there is no value", () => {
    render(<DateTimePicker value="" onChange={onChange} label="Start" />);
    expect(
      screen.getByRole("button", { name: "Pick a date" }),
    ).toBeInTheDocument();
  });

  test("formats an existing date value on the button", () => {
    render(
      <DateTimePicker
        value="2024-03-15T09:30"
        onChange={onChange}
        label="Start"
      />,
    );
    // Date button shows the formatted date (medium style) rather than the raw value.
    const button = screen.getByRole("button");
    expect(button.textContent).not.toBe("Pick a date");
    expect(button.textContent).toMatch(/2024|Mar/);
  });

  test("shows the time value in the time input", () => {
    render(
      <DateTimePicker
        value="2024-03-15T09:30"
        onChange={onChange}
        label="Start"
      />,
    );
    const timeInput = screen.getByLabelText("Start (time)") as HTMLInputElement;
    expect(timeInput.value).toBe("09:30");
  });

  test("changing the time input calls onChange with a combined value", () => {
    render(
      <DateTimePicker
        value="2024-03-15T09:30"
        onChange={onChange}
        label="Start"
      />,
    );
    fireEvent.change(screen.getByLabelText("Start (time)"), {
      target: { value: "14:45" },
    });
    expect(onChange).toHaveBeenCalledWith("2024-03-15T14:45");
  });

  test("changing the time when no date is set yields an empty combined value", () => {
    render(<DateTimePicker value="" onChange={onChange} label="Start" />);
    fireEvent.change(screen.getByLabelText("Start (time)"), {
      target: { value: "14:45" },
    });
    // joinDateTime("", "14:45") returns "" because there is no date.
    expect(onChange).toHaveBeenCalledWith("");
  });

  test("renders an error message and marks inputs invalid", () => {
    render(
      <DateTimePicker
        value=""
        onChange={onChange}
        label="Start"
        error="Required field"
      />,
    );
    expect(screen.getByText("Required field")).toBeInTheDocument();
    expect(screen.getByRole("button").className).toContain("input-error");
  });

  test("uses a generic time label when the label is not a string", () => {
    render(
      <DateTimePicker
        value=""
        onChange={onChange}
        label={<span>Node label</span>}
      />,
    );
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
  });

  test("renders without a label", () => {
    render(<DateTimePicker value="" onChange={onChange} />);
    expect(screen.getByLabelText("Time")).toBeInTheDocument();
  });

  test("passes the min prop to the calendar element", () => {
    render(
      <DateTimePicker
        value=""
        onChange={onChange}
        label="Start"
        min="2024-01-01"
      />,
    );
    // React 19 assigns to the custom element's `min` property (not attribute)
    // because the registered <calendar-date> element exposes one.
    const calendar = document.querySelector("calendar-date") as
      (HTMLElement & { min: string }) | null;
    expect(calendar?.min).toBe("2024-01-01");
  });

  test("selecting a date from the calendar calls onChange with the picked date", () => {
    render(
      <DateTimePicker
        value="2024-03-15T09:30"
        onChange={onChange}
        label="Start"
      />,
    );
    const calendar = document.querySelector("calendar-date") as HTMLElement & {
      value: string;
    };
    calendar.value = "2024-06-20";
    calendar.dispatchEvent(new Event("change", { bubbles: true }));
    expect(onChange).toHaveBeenCalledWith("2024-06-20T09:30");
  });

  test("formatDate falls back to the raw value for malformed dates", () => {
    render(
      <DateTimePicker value="not-a-date" onChange={onChange} label="Start" />,
    );
    // splitDateTime -> date="not-a-date"; formatDate returns it unchanged.
    expect(screen.getByRole("button")).toHaveTextContent("not-a-date");
  });
});
