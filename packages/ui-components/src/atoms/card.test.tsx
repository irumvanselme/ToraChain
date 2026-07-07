import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Card } from "./card.tsx";

describe("Card", () => {
  test("renders children with base card classes", () => {
    const { container } = render(<Card>body</Card>);
    expect(screen.getByText("body")).toBeInTheDocument();
    expect(container.querySelector(".card")).toHaveClass(
      "border",
      "bg-base-100",
      "rounded-none",
    );
    expect(container.querySelector(".card-body")).not.toBeNull();
  });

  test("does not render the header row without title or actions", () => {
    const { container } = render(<Card>only body</Card>);
    expect(container.querySelector(".card-title")).toBeNull();
  });

  test("renders the title in the header", () => {
    render(<Card title="My Title">body</Card>);
    const heading = screen.getByText("My Title");
    expect(heading).toHaveClass("card-title");
    expect(heading.tagName).toBe("H2");
  });

  test("renders actions in the header even without a title", () => {
    render(<Card actions={<button>Do</button>}>body</Card>);
    expect(screen.getByRole("button", { name: "Do" })).toBeInTheDocument();
  });

  test("applies className and bodyClassName", () => {
    const { container } = render(
      <Card className="outer" bodyClassName="inner">
        b
      </Card>,
    );
    expect(container.querySelector(".card")).toHaveClass("outer");
    expect(container.querySelector(".card-body")).toHaveClass("inner");
  });

  test("forwards extra props to the root element", () => {
    render(
      <Card data-testid="card" id="c1">
        b
      </Card>,
    );
    expect(screen.getByTestId("card")).toHaveAttribute("id", "c1");
  });
});
