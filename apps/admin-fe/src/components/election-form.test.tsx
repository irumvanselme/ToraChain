import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ElectionForm } from "./election-form.tsx";

const onSubmit = vi.fn();
const onCancel = vi.fn();

beforeEach(() => {
  onSubmit.mockReset();
  onCancel.mockReset();
});

function renderForm(props: Partial<Parameters<typeof ElectionForm>[0]> = {}) {
  return render(
    <ElectionForm
      submitLabel="Create election"
      submitting={false}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...props}
    />,
  );
}

describe("ElectionForm", () => {
  test("renders the submit label and an error banner", () => {
    renderForm({ error: "Something broke" });
    expect(
      screen.getByRole("button", { name: "Create election" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Something broke")).toBeInTheDocument();
  });

  test("requires a title", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(screen.getByText("Title is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("requires start and end times", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "My election" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(screen.getByText("Start time is required.")).toBeInTheDocument();
    expect(screen.getByText("End time is required.")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("rejects an end time that is not after the start time", () => {
    renderForm({
      initial: {
        title: "T",
        startTime: "2024-01-02T10:00:00.000Z",
        endTime: "2024-01-01T10:00:00.000Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(
      screen.getByText("End time must be after the start time."),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("submits a valid form", () => {
    renderForm({
      initial: {
        title: "Valid election",
        description: "desc",
        status: "draft",
        startTime: "2024-01-01T10:00:00.000Z",
        endTime: "2024-01-02T10:00:00.000Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.title).toBe("Valid election");
    expect(payload.description).toBe("desc");
    expect(payload.startTime).not.toBeNull();
    expect(payload.endTime).not.toBeNull();
  });

  test("cancel calls the handler", () => {
    renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("trims a blank description down to null", () => {
    renderForm({
      initial: {
        title: "Has title",
        startTime: "2024-01-01T10:00:00.000Z",
        endTime: "2024-01-02T10:00:00.000Z",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create election" }));
    expect(onSubmit.mock.calls[0][0].description).toBeNull();
  });
});
