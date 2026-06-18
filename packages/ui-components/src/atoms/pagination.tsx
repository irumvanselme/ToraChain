import { cn } from "../cn.ts";
import { ChevronsLeft, ChevronsRight } from "lucide-react";

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
        className="btn btn-sm btn-square join-item"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronsLeft size={18} />
      </button>
      <button
        type="button"
        className="btn btn-sm join-item pointer-events-none"
      >
        Page {page} of {totalPages}
      </button>
      <button
        type="button"
        className="btn btn-sm btn-square join-item"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronsRight size={18} />
      </button>
    </div>
  );
}
