import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { PageHeader } from "./page-header.tsx";

describe("PageHeader", () => {
  test("renders the title as an h1", () => {
    render(<PageHeader title="Elections" />);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Elections");
  });

  test("does not render a description paragraph when omitted", () => {
    const { container } = render(<PageHeader title="T" />);
    expect(container.querySelector("p")).toBeNull();
  });

  test("renders the description when provided", () => {
    render(<PageHeader title="T" description="Manage elections" />);
    expect(screen.getByText("Manage elections")).toBeInTheDocument();
  });

  test("does not render the actions wrapper when omitted", () => {
    const { container } = render(<PageHeader title="T" />);
    expect(container.querySelector(".flex-wrap")).toBeNull();
  });

  test("renders actions when provided", () => {
    render(<PageHeader title="T" actions={<button>New</button>} />);
    expect(screen.getByRole("button", { name: "New" })).toBeInTheDocument();
  });

  test("applies a custom className to the root", () => {
    const { container } = render(<PageHeader title="T" className="mb-4" />);
    expect(container.firstChild).toHaveClass("mb-4");
  });
});
