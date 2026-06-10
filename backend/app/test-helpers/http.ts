/** Minimal structural type for an Elysia app under test. */
export interface TestApp {
  handle(request: Request): Promise<Response>;
}

/** Read a JSON response body with a caller-supplied shape. */
export async function readJson<T = Record<string, unknown>>(
  res: Response,
): Promise<T> {
  return (await res.json()) as T;
}
