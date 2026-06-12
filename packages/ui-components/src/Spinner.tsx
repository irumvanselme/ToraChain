import { cn } from "./cn.ts";

export interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}

const SIZES = {
  sm: "loading-sm",
  md: "loading-md",
  lg: "loading-lg",
} as const;

export function Spinner({ size = "md", className, label }: SpinnerProps) {
  return (
    <span
      className={cn("loading loading-spinner", SIZES[size], className)}
      role="status"
      aria-label={label ?? "Loading"}
    />
  );
}
