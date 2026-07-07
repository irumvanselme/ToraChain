import { describe, test, expect, vi, beforeEach, beforeAll } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ApiError } from "api/error";

const createAdmin = vi.fn();

vi.mock("api/users.ts", async () => {
  const actual =
    await vi.importActual<typeof import("api/users.ts")>("api/users.ts");
  return {
    ...actual,
    createAdmin: (...a: unknown[]) => createAdmin(...a),
  };
});

import { CreateAdminModal } from "./create-admin-modal.tsx";

// jsdom does not implement the native <dialog> methods.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (
    this: HTMLDialogElement,
  ) {
    this.open = true;
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event("close"));
  });
});

beforeEach(() => {
  createAdmin.mockReset();
  createAdmin.mockResolvedValue({ id: "a1" });
});

function fill(
  container: HTMLElement,
  values: {
    name?: string;
    email?: string;
    password?: string;
  },
) {
  const inputs = container.querySelectorAll("input");
  if (values.name !== undefined)
    fireEvent.change(inputs[0]!, { target: { value: values.name } });
  if (values.email !== undefined)
    fireEvent.change(inputs[1]!, { target: { value: values.email } });
  if (values.password !== undefined)
    fireEvent.change(inputs[2]!, { target: { value: values.password } });
}

function submitForm(container: HTMLElement) {
  fireEvent.submit(container.querySelector("#create-admin-form")!);
}

describe("CreateAdminModal", () => {
  test("does not open the dialog when closed", () => {
    const { container } = render(
      <CreateAdminModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />,
    );
    expect(container.querySelector("dialog")!.open).toBe(false);
  });

  test("renders the form fields when open", () => {
    render(<CreateAdminModal open onClose={vi.fn()} onCreated={vi.fn()} />);
    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Initial password")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Create admin" }),
    ).toBeInTheDocument();
  });

  test("submits trimmed values and calls onCreated on success", async () => {
    const onCreated = vi.fn();
    const { container } = render(
      <CreateAdminModal open onClose={vi.fn()} onCreated={onCreated} />,
    );
    fill(container, {
      name: "  Alice  ",
      email: "  alice@example.com  ",
      password: "supersecret",
    });
    submitForm(container);
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
    expect(createAdmin).toHaveBeenCalledWith({
      name: "Alice",
      email: "alice@example.com",
      password: "supersecret",
    });
  });

  test("shows the error message when creation fails", async () => {
    createAdmin.mockRejectedValueOnce(new ApiError(409, "DUP", "Email taken"));
    const onCreated = vi.fn();
    const { container } = render(
      <CreateAdminModal open onClose={vi.fn()} onCreated={onCreated} />,
    );
    fill(container, {
      name: "Bob",
      email: "bob@example.com",
      password: "supersecret",
    });
    submitForm(container);
    expect(await screen.findByText("Email taken")).toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
  });

  test("falls back to a generic message for non-Error rejections", async () => {
    createAdmin.mockRejectedValueOnce("weird");
    const { container } = render(
      <CreateAdminModal open onClose={vi.fn()} onCreated={vi.fn()} />,
    );
    fill(container, {
      name: "Bob",
      email: "bob@example.com",
      password: "supersecret",
    });
    submitForm(container);
    expect(await screen.findByText("Failed to create.")).toBeInTheDocument();
  });

  test("disables actions while saving", async () => {
    let resolve!: (v: unknown) => void;
    createAdmin.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const { container } = render(
      <CreateAdminModal open onClose={vi.fn()} onCreated={vi.fn()} />,
    );
    fill(container, {
      name: "Bob",
      email: "bob@example.com",
      password: "supersecret",
    });
    submitForm(container);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create admin" }),
      ).toBeDisabled(),
    );
    resolve({ id: "a1" });
  });

  test("resets and calls onClose when cancelled", () => {
    const onClose = vi.fn();
    const { container } = render(
      <CreateAdminModal open onClose={onClose} onCreated={vi.fn()} />,
    );
    fill(container, { name: "Typed" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    const inputs = container.querySelectorAll("input");
    expect((inputs[0] as HTMLInputElement).value).toBe("");
  });

  test("ignores cancel while saving", async () => {
    let resolve!: (v: unknown) => void;
    createAdmin.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    const onClose = vi.fn();
    const { container } = render(
      <CreateAdminModal open onClose={onClose} onCreated={vi.fn()} />,
    );
    fill(container, {
      name: "Bob",
      email: "bob@example.com",
      password: "supersecret",
    });
    submitForm(container);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Create admin" }),
      ).toBeDisabled(),
    );
    // Cancel is disabled while saving; the close() guard also returns early
    // when the dialog reports a backdrop/Escape dismissal mid-save.
    const cancel = screen.getByRole("button", { name: "Cancel" });
    fireEvent.click(cancel);
    fireEvent(container.querySelector("dialog")!, new Event("close"));
    expect(onClose).not.toHaveBeenCalled();
    resolve({ id: "a1" });
  });
});
