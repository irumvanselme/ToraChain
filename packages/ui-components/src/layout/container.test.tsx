import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Container } from "./container.tsx";

describe("Container", () => {
  test("renders children with base container classes", () => {
    render(<Container>content</Container>);
    const el = screen.getByText("content");
    expect(el).toHaveClass("container", "mx-auto", "px-1");
  });

  test("merges a custom className", () => {
    render(<Container className="max-w-lg">c</Container>);
    expect(screen.getByText("c")).toHaveClass("container", "max-w-lg");
  });
});
