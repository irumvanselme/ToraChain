import type { HTMLAttributes } from "react";
import { cn } from "../cn.ts";

type Tone =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "ghost";

const TONES: Record<Tone, string> = {
  neutral: "badge-neutral",
  primary: "badge-primary",
  secondary: "badge-secondary",
  accent: "badge-accent",
  info: "badge-info",
  success: "badge-success",
  warning: "badge-warning",
  error: "badge-error",
  ghost: "badge-ghost",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  outline?: boolean;
}

export function Badge({
  tone = "neutral",
  outline = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "badge",
        TONES[tone],
        outline && "badge-outline",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
