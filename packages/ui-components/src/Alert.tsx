import type { HTMLAttributes } from "react";
import { cn } from "./cn.ts";

type Tone = "info" | "success" | "warning" | "error";

const TONES: Record<Tone, string> = {
  info: "alert-info",
  success: "alert-success",
  warning: "alert-warning",
  error: "alert-error",
};

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
}

export function Alert({
  tone = "info",
  className,
  children,
  ...rest
}: AlertProps) {
  return (
    <div role="alert" className={cn("alert", TONES[tone], className)} {...rest}>
      {children}
    </div>
  );
}
