import { describe, test, expect } from "vitest";
import { ApiError, NetworkError } from "./errors";

describe("ApiError", () => {
  test("captures status, code, and message", () => {
    const err = new ApiError(404, "NOT_FOUND", "Not found");
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Not found");
    expect(err.name).toBe("ApiError");
  });
});

describe("NetworkError", () => {
  test("uses a default message", () => {
    const err = new NetworkError();
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe("Network request failed");
    expect(err.name).toBe("NetworkError");
  });

  test("accepts a custom message", () => {
    expect(new NetworkError("boom").message).toBe("boom");
  });
});
