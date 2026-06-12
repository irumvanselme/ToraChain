import type { SelectHTMLAttributes, ReactNode } from "react";
import { cn } from "./cn.ts";

export interface SelectOption {
  label: string;
  value: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: ReactNode;
  options: SelectOption[];
  placeholder?: string;
}

export function Select({
  label,
  error,
  options,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  const control = (
    <select
      id={id}
      className={cn(
        "select select-bordered w-full",
        error && "select-error",
        className,
      )}
      {...rest}
    >
      {placeholder !== undefined && (
        <option value="" disabled={rest.required}>
          {placeholder}
        </option>
      )}
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );

  if (!label && !error) return control;

  return (
    <label className="form-control w-full">
      {label && <span className="label-text mb-1 font-medium">{label}</span>}
      {control}
      {error && <span className="label-text-alt mt-1 text-error">{error}</span>}
    </label>
  );
}
