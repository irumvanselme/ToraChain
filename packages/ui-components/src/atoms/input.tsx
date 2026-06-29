import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn.ts";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: ReactNode;
  hint?: ReactNode;
}

export function Input({
  label,
  error,
  hint,
  className,
  id,
  ...rest
}: InputProps) {
  const control = (
    <input
      id={id}
      className={cn(
        "input input-bordered w-full",
        error && "input-error",
        className,
      )}
      {...rest}
    />
  );

  if (!label && !error && !hint) return control;

  return (
    <label className="form-control w-full">
      {label && (
        <span
          className="label-text mb-1 font-medium"
          id={id ? `${id}-label` : undefined}
        >
          {label}
        </span>
      )}
      {control}
      {error ? (
        <span className="label-text-alt mt-1 text-error">{error}</span>
      ) : hint ? (
        <span className="label-text-alt mt-1 text-base-content/60">{hint}</span>
      ) : null}
    </label>
  );
}
