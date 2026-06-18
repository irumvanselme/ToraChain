import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn.ts";

type Variant =
  | "primary"
  | "secondary"
  | "accent"
  | "neutral"
  | "ghost"
  | "link"
  | "error"
  | "success"
  | "warning";

type Size = "xs" | "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  accent: "btn-accent",
  neutral: "btn-neutral",
  ghost: "btn-ghost",
  link: "btn-link",
  error: "btn-error",
  success: "btn-success",
  warning: "btn-warning",
};

const SIZES: Record<Size, string> = {
  xs: "btn-xs",
  sm: "btn-sm",
  md: "",
  lg: "btn-lg",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  outline?: boolean;
  block?: boolean;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  outline = false,
  block = false,
  loading = false,
  disabled,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cn(
        "btn rounded-none",
        VARIANTS[variant],
        SIZES[size],
        outline && "btn-outline",
        block && "btn-block",
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className="loading loading-spinner loading-sm" />}
      {children}
    </button>
  );
}
