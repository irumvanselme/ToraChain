import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import { DevBanner } from "./dev-banner.tsx";
import { DEV_BANNER } from "@tora-chain/configs";

describe("DevBanner", () => {
  test("renders the ribbon label by default", () => {
    render(<DevBanner />);
    expect(screen.getByText(DEV_BANNER.ribbonLabel)).toBeInTheDocument();
  });

  test("renders nothing when disabled", () => {
    const { container } = render(<DevBanner enabled={false} />);
    expect(container.firstChild).toBeNull();
  });

  test("does not show the tooltip until hovered", () => {
    render(<DevBanner />);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });

  test("shows the tooltip on hover and hides it on leave", () => {
    render(<DevBanner />);
    const ribbon = screen.getByText(DEV_BANNER.ribbonLabel);

    fireEvent.mouseEnter(ribbon);
    const tooltip = screen.getByRole("tooltip");
    expect(tooltip).toHaveTextContent(DEV_BANNER.tooltipHeading);
    expect(tooltip).toHaveTextContent(DEV_BANNER.tooltipBody);

    fireEvent.mouseLeave(ribbon);
    expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  });
});
