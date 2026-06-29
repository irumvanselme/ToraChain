import type { TextareaHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn.ts";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
}

export function Textarea({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: TextareaProps) {
  const control = (
    <textarea
      id={id}
      className={cn(
        "textarea textarea-bordered w-full",
        error && "textarea-error",
        className,
      )}
      {...rest}
    />
  );

  if (!label && !error && !hint) return control;

  return (
    <label className="form-control w-full">
      {label && <span className="label-text mb-1 font-medium">{label}</span>}
      {control}
      {error ? (
        <span className="label-text-alt mt-1 text-error">{error}</span>
      ) : hint ? (
        <span className="label-text-alt mt-1 text-base-content/60">{hint}</span>
      ) : null}
    </label>
  );
}
