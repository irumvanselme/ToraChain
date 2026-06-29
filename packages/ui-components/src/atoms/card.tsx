import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../cn.ts";

export interface CardProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  "title"
> {
  title?: ReactNode;
  actions?: ReactNode;
  bodyClassName?: string;
}

export function Card({
  title,
  actions,
  className,
  bodyClassName,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        "card border border-base-300 bg-base-100 rounded-none",
        className,
      )}
      {...rest}
    >
      <div className={cn("card-body", bodyClassName)}>
        {(title || actions) && (
          <div className="mb-2 flex items-center justify-between gap-4">
            {title && <h2 className="card-title">{title}</h2>}
            {actions && <div className="flex gap-2">{actions}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
