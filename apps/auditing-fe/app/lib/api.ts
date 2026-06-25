/** Thrown for non-OK HTTP responses. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Thrown when the network itself fails. */
export class NetworkError extends Error {
  constructor(message = "Network request failed") {
    super(message);
    this.name = "NetworkError";
  }
}

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
