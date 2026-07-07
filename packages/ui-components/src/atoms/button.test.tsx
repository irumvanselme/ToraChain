import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { Button } from "./button.tsx";

describe("Button", () => {
  test("renders with default primary variant and base classes", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn).toHaveClass("btn", "rounded-none", "btn-primary");
    expect(btn).not.toBeDisabled();
  });

  test("applies variant and size classes", () => {
    render(
      <Button variant="ghost" size="lg">
        g
      </Button>,
    );
    const btn = screen.getByRole("button");
    expect(btn).toHaveClass("btn-ghost", "btn-lg");
  });

  test("md size adds no size class", () => {
    render(<Button size="md">m</Button>);
    const btn = screen.getByRole("button");
    expect(btn.className).not.toContain("btn-sm");
    expect(btn.className).not.toContain("btn-lg");
  });

  test("adds outline and block classes when set", () => {
    render(
      <Button outline block>
        b
      </Button>,
    );
    expect(screen.getByRole("button")).toHaveClass("btn-outline", "btn-block");
  });

  test("shows a spinner and is disabled while loading", () => {
    const { container } = render(<Button loading>Save</Button>);
    const btn = screen.getByRole("button");
    expect(btn).toBeDisabled();
    expect(container.querySelector(".loading.loading-spinner")).not.toBeNull();
  });

  test("respects an explicit disabled prop", () => {
    render(<Button disabled>d</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  test("fires onClick when enabled", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>go</Button>);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledOnce();
  });

  test("does not fire onClick while loading", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        go
      </Button>,
    );
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).not.toHaveBeenCalled();
  });

  test("forwards type and other button attributes", () => {
    render(<Button type="submit">s</Button>);
    expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
  });
});
