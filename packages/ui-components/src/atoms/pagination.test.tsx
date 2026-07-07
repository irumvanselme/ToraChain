import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { Pagination } from "./pagination.tsx";

describe("Pagination", () => {
  test("renders nothing when there is a single page or fewer", () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("shows the current page and total", () => {
    render(<Pagination page={2} totalPages={5} onPageChange={() => {}} />);
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  test("disables the previous button on the first page", () => {
    render(<Pagination page={1} totalPages={3} onPageChange={() => {}} />);
    const [prev, , next] = screen.getAllByRole("button");
    expect(prev).toBeDisabled();
    expect(next).not.toBeDisabled();
  });

  test("disables the next button on the last page", () => {
    render(<Pagination page={3} totalPages={3} onPageChange={() => {}} />);
    const [prev, , next] = screen.getAllByRole("button");
    expect(prev).not.toBeDisabled();
    expect(next).toBeDisabled();
  });

  test("calls onPageChange with the previous page", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    const prev = screen.getAllByRole("button")[0]!;
    fireEvent.click(prev);
    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test("calls onPageChange with the next page", () => {
    const onPageChange = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={onPageChange} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]!);
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  test("applies a custom className to the join container", () => {
    const { container } = render(
      <Pagination
        page={1}
        totalPages={2}
        onPageChange={() => {}}
        className="mt-4"
      />,
    );
    expect(container.querySelector(".join")).toHaveClass("mt-4");
  });
});
