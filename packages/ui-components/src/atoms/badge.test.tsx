import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Badge } from "./badge.tsx";

describe("Badge", () => {
  test("renders children with the default neutral tone and no outline", () => {
    render(<Badge>Live</Badge>);
    const badge = screen.getByText("Live");
    expect(badge).toHaveClass("badge", "badge-neutral");
    expect(badge).not.toHaveClass("badge-outline");
  });

  test("applies the requested tone", () => {
    render(<Badge tone="success">ok</Badge>);
    expect(screen.getByText("ok")).toHaveClass("badge-success");
  });

  test("adds the outline class when outline is true", () => {
    render(<Badge outline>o</Badge>);
    expect(screen.getByText("o")).toHaveClass("badge-outline");
  });

  test("merges className and forwards extra props", () => {
    render(
      <Badge className="extra" data-testid="b" title="hi">
        x
      </Badge>,
    );
    const badge = screen.getByTestId("b");
    expect(badge).toHaveClass("badge", "extra");
    expect(badge).toHaveAttribute("title", "hi");
  });
});
