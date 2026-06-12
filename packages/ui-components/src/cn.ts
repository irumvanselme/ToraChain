/**
 * Tiny className combiner. Accepts strings, falsy values, and arrays; joins the
 * truthy parts with a single space. Keeps the package dependency-free (no clsx).
 */
export type ClassValue =
  | string
  | number
  | bigint
  | false
  | null
  | undefined
  | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value && value !== 0) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(" ");
}
