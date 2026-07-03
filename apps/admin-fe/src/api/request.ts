import { getTokenManager } from "@tora-chain/fe-common";

import { ApiError, NetworkError, type RequestOptions } from "api/error";
import { AUTH_API, USER_TYPE } from "lib/config";

// Backend routes are protected by admin JWTs. The manager exchanges the admin
// session cookie for a token, caches it, and refreshes/retries on 401. Auth
// `/core` endpoints ignore the extra Bearer header and keep using the cookie.
const tokens = getTokenManager({
  key: USER_TYPE,
  tokenEndpoint: `${AUTH_API}/token`,
});

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, signal, query } = options;

  let res: Response;
  try {
    res = await tokens.authFetch(buildUrl(path, query), {
      method,
      credentials: "include",
      signal,
      headers:
        body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new NetworkError(
      "Could not reach the server. Check that the backend is running.",
    );
  }

  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const code =
      (data && typeof data.code === "string" && data.code) || "UNKNOWN_ERROR";
    const message =
      (data && typeof data.message === "string" && data.message) ||
      `Request failed (${res.status})`;
    throw new ApiError(res.status, code, message, data?.details ?? null);
  }

  return data as T;
}
