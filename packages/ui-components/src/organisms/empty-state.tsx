import type { ReactNode } from "react";
import { cn } from "../cn.ts";

export interface EmptyStateProps {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-box border border-dashed border-base-300 p-12 text-center",
        className,
      )}
    >
      {icon && <div className="text-4xl opacity-50">{icon}</div>}
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="max-w-md text-base-content/60">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
