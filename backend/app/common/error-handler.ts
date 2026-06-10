import { Elysia } from "elysia";
import { Logger } from "@tora-chain/be-common/logging";

import { AppError, type ErrorBody } from "./errors.ts";

const logger = new Logger({ name: "backend.errors" });

/**
 * Normalises Elysia's built-in error codes and our `AppError`s into the
 * standard `{ code, message, details }` body with an appropriate HTTP status.
 */
function normalise(
  code: string | number,
  error: unknown,
): {
  status: number;
  body: ErrorBody;
} {
  if (error instanceof AppError) {
    return { status: error.status, body: error.toBody() };
  }

  switch (code) {
    case "VALIDATION": {
      // Elysia's ValidationError exposes per-field issues via `.all`.
      const all = (error as { all?: unknown }).all ?? null;
      return {
        status: 400,
        body: {
          code: "VALIDATION_ERROR",
          message: "Request failed schema validation.",
          details: all,
        },
      };
    }
    case "PARSE":
      return {
        status: 400,
        body: {
          code: "VALIDATION_ERROR",
          message: "Request body could not be parsed.",
          details: null,
        },
      };
    case "NOT_FOUND":
      return {
        status: 404,
        body: {
          code: "RESOURCE_NOT_FOUND",
          message: "The requested route was not found.",
          details: null,
        },
      };
    default:
      return {
        status: 500,
        body: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred.",
          details: null,
        },
      };
  }
}

/** Elysia plugin installing the global error handler. */
export const errorHandler = new Elysia({ name: "error-handler" }).onError(
  { as: "global" },
  ({ code, error, set, path }) => {
    const { status, body } = normalise(code, error);

    if (status >= 500) {
      logger.error("Request error", {
        code,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
    } else {
      logger.debug("Handled error", { code: body.code, path, status });
    }

    set.status = status;
    return body;
  },
);
