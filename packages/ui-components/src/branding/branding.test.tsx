import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { LogoSquare, LogoText } from "./index.tsx";

describe("LogoSquare", () => {
  test("renders an img pointing at the square logo asset", () => {
    render(<LogoSquare />);
    const img = screen.getByAltText("Logo square");
    expect(img).toHaveAttribute("src", "/_assets/logo-square.svg");
    expect(img).toHaveClass("max-w-6");
  });
});

describe("LogoText", () => {
  test("renders an img pointing at the text logo asset with a fixed width", () => {
    render(<LogoText />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/_assets/logo-text.svg");
    expect(img).toHaveAttribute("width", "200");
  });
});
