import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { Alert } from "./alert.tsx";

describe("Alert", () => {
  test("renders children inside an alert role with the default info tone", () => {
    render(<Alert>Heads up</Alert>);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Heads up");
    expect(alert).toHaveClass("alert", "alert-info");
  });

  test("applies the tone class for each tone", () => {
    const { rerender } = render(<Alert tone="success">ok</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("alert-success");

    rerender(<Alert tone="warning">warn</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("alert-warning");

    rerender(<Alert tone="error">err</Alert>);
    expect(screen.getByRole("alert")).toHaveClass("alert-error");
  });

  test("merges custom className and forwards extra props", () => {
    render(
      <Alert className="extra" data-testid="a" id="my-alert">
        x
      </Alert>,
    );
    const alert = screen.getByTestId("a");
    expect(alert).toHaveClass("alert", "alert-info", "extra");
    expect(alert).toHaveAttribute("id", "my-alert");
  });
});
