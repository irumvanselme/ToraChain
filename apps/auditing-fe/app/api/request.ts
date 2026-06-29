import { ApiError, NetworkError } from "@/app/api/errors.ts";

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.ok) {
    return res.json() as Promise<T>;
  }
  let code = "ERROR";
  let message = `HTTP ${res.status}`;
  try {
    const body = (await res.json()) as { code?: string; message?: string };
    code = body.code ?? code;
    message = body.message ?? message;
  } catch {
    // ignore parse failures
  }
  throw new ApiError(res.status, code, message);
}

/**
 * Fetch helper that automatically includes the auditor JWT as a Bearer token.
 * Pass `null` for `token` to make an unauthenticated request.
 */
export async function apiFetch<T>(
  url: string,
  token: string | null,
  options: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url, { ...options, headers });
    return handleResponse<T>(res);
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new NetworkError();
  }
}

/** Authenticated GET shorthand. */
export function apiGet<T>(url: string, token: string | null): Promise<T> {
  return apiFetch<T>(url, token);
}
