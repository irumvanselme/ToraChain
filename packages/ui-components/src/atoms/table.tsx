import type { ReactNode } from "react";
import { cn } from "../cn.ts";

export interface Column<T> {
  key: string;
  header: ReactNode;
  /** Render the cell for a row. */
  cell: (row: T) => ReactNode;
  className?: string;
}

export interface TableProps<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  zebra?: boolean;
}

export function Table<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  className,
  zebra = true,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className={cn("table", zebra && "table-zebra", className)}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={onRowClick ? "cursor-pointer hover" : undefined}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={col.className}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
