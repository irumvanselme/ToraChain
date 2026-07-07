import { render, screen } from "@testing-library/react";
import { describe, test, expect } from "vitest";
import {
  ElectionStatusBadge,
  electionStatusLabel,
} from "./election-status-badge.tsx";

describe("electionStatusLabel", () => {
  test("title-cases a single word", () => {
    expect(electionStatusLabel("active")).toBe("Active");
  });

  test("title-cases each underscore-separated word", () => {
    expect(electionStatusLabel("scheduled")).toBe("Scheduled");
    expect(electionStatusLabel("some_new_status")).toBe("Some New Status");
  });

  test("uses the label override when present", () => {
    expect(electionStatusLabel("enrolling_voters")).toBe("Enrollment");
  });

  test("handles an empty string without throwing", () => {
    expect(electionStatusLabel("")).toBe("");
  });
});

describe("ElectionStatusBadge", () => {
  test("maps a known status to its tone and label", () => {
    render(<ElectionStatusBadge status="active" />);
    const badge = screen.getByText("Active");
    expect(badge).toHaveClass("badge-success", "whitespace-nowrap");
  });

  test("uses the short label override for enrolling_voters", () => {
    render(<ElectionStatusBadge status="enrolling_voters" />);
    expect(screen.getByText("Enrollment")).toHaveClass("badge-info");
  });

  test("falls back to neutral tone for an unknown status", () => {
    render(<ElectionStatusBadge status="mystery" />);
    const badge = screen.getByText("Mystery");
    expect(badge).toHaveClass("badge-neutral");
  });

  test("merges a custom className and forwards props", () => {
    render(
      <ElectionStatusBadge status="draft" className="extra" data-testid="s" />,
    );
    const badge = screen.getByTestId("s");
    expect(badge).toHaveClass("badge-ghost", "whitespace-nowrap", "extra");
  });
});
