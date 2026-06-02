export class MissingEnvError extends Error {
  constructor(key: string) {
    super(`Missing required environment variable: ${key}`);
    this.name = "MissingEnvError";
  }
}

export function getEnv(key: string, fallback?: string): string | undefined {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return value;
}

export function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value === "") throw new MissingEnvError(key);
  return value;
}

export function getNumberEnv(key: string, fallback: number): number {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function getBoolEnv(key: string, fallback = false): boolean {
  const value = process.env[key];
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export function getNodeEnv(): "development" | "test" | "production" {
  const value = (process.env.NODE_ENV ?? "development").toLowerCase();
  if (value === "production" || value === "test") return value;
  return "development";
}

export const isProduction = (): boolean => getNodeEnv() === "production";
