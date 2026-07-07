import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, expect, vi } from "vitest";
import { Table, type Column } from "./table.tsx";

interface Row {
  id: string;
  name: string;
  age: number;
}

const rows: Row[] = [
  { id: "a", name: "Ada", age: 30 },
  { id: "b", name: "Bob", age: 25 },
];

const columns: Column<Row>[] = [
  { key: "name", header: "Name", cell: (r) => r.name },
  { key: "age", header: "Age", cell: (r) => r.age, className: "text-right" },
];

describe("Table", () => {
  test("renders column headers", () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(
      screen.getByRole("columnheader", { name: "Name" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Age" }),
    ).toBeInTheDocument();
  });

  test("renders a cell for every row via the cell renderer", () => {
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Bob")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
  });

  test("applies zebra styling by default and can disable it", () => {
    const { container, rerender } = render(
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />,
    );
    expect(container.querySelector("table")).toHaveClass("table-zebra");

    rerender(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        zebra={false}
      />,
    );
    expect(container.querySelector("table")).not.toHaveClass("table-zebra");
  });

  test("applies column className to header and body cells", () => {
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />,
    );
    const rightCells = container.querySelectorAll(".text-right");
    // one header + two body cells
    expect(rightCells.length).toBe(3);
  });

  test("does not mark rows clickable without onRowClick", () => {
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} />,
    );
    expect(container.querySelector("tbody tr.cursor-pointer")).toBeNull();
  });

  test("calls onRowClick with the clicked row", () => {
    const onRowClick = vi.fn();
    render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        onRowClick={onRowClick}
      />,
    );
    fireEvent.click(screen.getByText("Bob"));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  test("renders an empty tbody when there are no rows", () => {
    const { container } = render(
      <Table columns={columns} rows={[]} rowKey={(r) => r.id} />,
    );
    expect(container.querySelectorAll("tbody tr").length).toBe(0);
  });

  test("merges a custom className onto the table", () => {
    const { container } = render(
      <Table
        columns={columns}
        rows={rows}
        rowKey={(r) => r.id}
        className="extra"
      />,
    );
    expect(container.querySelector("table")).toHaveClass("table", "extra");
  });
});
