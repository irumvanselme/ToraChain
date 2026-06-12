import { cn } from "./cn.ts";

export interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("join", className)}>
      <button
        type="button"
        className="btn btn-sm join-item"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        «
      </button>
      <button
        type="button"
        className="btn btn-sm join-item pointer-events-none"
      >
        Page {page} of {totalPages}
      </button>
      <button
        type="button"
        className="btn btn-sm join-item"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        »
      </button>
    </div>
  );
}
