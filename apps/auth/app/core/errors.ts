/** An error carrying the HTTP status + stable code the /core API should return. */
export class CoreHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "CoreHttpError";
  }

  static unauthorized(message: string): CoreHttpError {
    return new CoreHttpError(401, "UNAUTHORIZED", message);
  }

  static notFound(message: string): CoreHttpError {
    return new CoreHttpError(404, "RESOURCE_NOT_FOUND", message);
  }

  static conflict(message: string): CoreHttpError {
    return new CoreHttpError(409, "CONFLICT", message);
  }

  static badRequest(message: string): CoreHttpError {
    return new CoreHttpError(400, "BAD_REQUEST", message);
  }
}
