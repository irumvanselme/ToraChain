import { render, screen } from "@testing-library/react";
import { describe, test, expect, vi, beforeAll } from "vitest";
import { Modal } from "./modal.tsx";

// jsdom does not implement the native <dialog> methods; emulate them so the
// component's open/close syncing can be exercised.
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

describe("Modal", () => {
  test("opens the dialog when the open prop is true", () => {
    const { container } = render(
      <Modal open onClose={() => {}} title="Confirm">
        body
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    expect(dialog.showModal).toHaveBeenCalled();
    expect(dialog.open).toBe(true);
  });

  test("does not open the dialog when open is false", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>,
    );
    expect(container.querySelector("dialog")!.open).toBe(false);
  });

  test("renders the title, children and actions", () => {
    render(
      <Modal
        open
        onClose={() => {}}
        title="Title"
        actions={<button>OK</button>}
      >
        Some content
      </Modal>,
    );
    expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
    expect(screen.getByText("Some content")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "OK" })).toBeInTheDocument();
  });

  test("omits the title, body and action blocks when not provided", () => {
    const { container } = render(<Modal open onClose={() => {}} />);
    expect(container.querySelector("h3")).toBeNull();
    expect(container.querySelector(".modal-action")).toBeNull();
  });

  test("closes the dialog when open flips to false", () => {
    const { container, rerender } = render(
      <Modal open onClose={() => {}}>
        body
      </Modal>,
    );
    const dialog = container.querySelector("dialog")!;
    expect(dialog.open).toBe(true);

    rerender(
      <Modal open={false} onClose={() => {}}>
        body
      </Modal>,
    );
    expect(dialog.close).toHaveBeenCalled();
    expect(dialog.open).toBe(false);
  });

  test("reports dismissal through onClose when the dialog closes", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <Modal open onClose={onClose}>
        body
      </Modal>,
    );
    rerender(
      <Modal open={false} onClose={onClose}>
        body
      </Modal>,
    );
    expect(onClose).toHaveBeenCalled();
  });

  test("merges a custom className onto the modal box", () => {
    const { container } = render(
      <Modal open onClose={() => {}} className="max-w-2xl">
        body
      </Modal>,
    );
    expect(container.querySelector(".modal-box")).toHaveClass("max-w-2xl");
  });
});
