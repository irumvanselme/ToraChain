import { describe, test, expect } from "vitest";
import { ApiError, NetworkError } from "./error.ts";

describe("ApiError", () => {
  test("carries status, code, message and details", () => {
    const err = new ApiError(404, "NOT_FOUND", "missing", { id: 1 });
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("ApiError");
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("missing");
    expect(err.details).toEqual({ id: 1 });
  });

  test("defaults details to null", () => {
    const err = new ApiError(500, "BOOM", "server error");
    expect(err.details).toBeNull();
  });
});

describe("NetworkError", () => {
  test("is an Error with a name", () => {
    const err = new NetworkError("offline");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("NetworkError");
    expect(err.message).toBe("offline");
  });
});
