/**
 * Standard error shape used by every endpoint:
 *
 * ```json
 * { "code": "RESOURCE_NOT_FOUND", "message": "...", "details": null }
 * ```
 *
 * There is intentionally no `error` field — success vs failure is conveyed by
 * the HTTP status code (2xx = success, otherwise an error body like above).
 */

export type ErrorCode =
  // Cross-cutting (can occur on any endpoint).
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "RESOURCE_NOT_FOUND"
  | "INTERNAL_ERROR"
  // Elections.
  | "DUPLICATE_TITLE"
  | "INVALID_STATUS_TRANSITION"
  | "ELECTION_LOCKED"
  | "CANNOT_DELETE_ACTIVE"
  // Candidates.
  | "CANDIDATES_LOCKED"
  // Voters / eligibility.
  | "ALREADY_ELIGIBLE"
  | "ALREADY_VOTED"
  // Voting.
  | "NOT_ELIGIBLE"
  | "ELECTION_NOT_OPEN"
  | "CANDIDATE_NOT_IN_ELECTION";

export interface ErrorBody {
  code: ErrorCode;
  message: string;
  details: unknown;
}

/** Application error carrying an HTTP status, a stable code, and a message. */
export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: unknown;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    details: unknown = null,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  toBody(): ErrorBody {
    return { code: this.code, message: this.message, details: this.details };
  }

  // ---- Cross-cutting -----------------------------------------------------

  static validation(message: string, details: unknown = null): AppError {
    return new AppError("VALIDATION_ERROR", 400, message, details);
  }

  static unauthenticated(
    message = "Authentication is required.",
    details: unknown = null,
  ): AppError {
    return new AppError("UNAUTHENTICATED", 401, message, details);
  }

  static forbidden(message: string, details: unknown = null): AppError {
    return new AppError("FORBIDDEN", 403, message, details);
  }

  static notFound(message: string, details: unknown = null): AppError {
    return new AppError("RESOURCE_NOT_FOUND", 404, message, details);
  }

  static internal(
    message = "An unexpected error occurred.",
    details: unknown = null,
  ): AppError {
    return new AppError("INTERNAL_ERROR", 500, message, details);
  }

  // ---- Elections ---------------------------------------------------------

  static duplicateTitle(message: string, details: unknown = null): AppError {
    return new AppError("DUPLICATE_TITLE", 409, message, details);
  }

  static invalidStatusTransition(
    message: string,
    details: unknown = null,
  ): AppError {
    return new AppError("INVALID_STATUS_TRANSITION", 409, message, details);
  }

  static electionLocked(message: string, details: unknown = null): AppError {
    return new AppError("ELECTION_LOCKED", 422, message, details);
  }

  static cannotDeleteActive(
    message: string,
    details: unknown = null,
  ): AppError {
    return new AppError("CANNOT_DELETE_ACTIVE", 409, message, details);
  }

  // ---- Candidates --------------------------------------------------------

  static candidatesLocked(message: string, details: unknown = null): AppError {
    return new AppError("CANDIDATES_LOCKED", 409, message, details);
  }

  // ---- Voters / eligibility ----------------------------------------------

  static alreadyEligible(message: string, details: unknown = null): AppError {
    return new AppError("ALREADY_ELIGIBLE", 409, message, details);
  }

  /**
   * `ALREADY_VOTED` is a 422 when blocking an edit to a voter who has voted,
   * and a 409 when blocking a second ballot. Caller picks the status.
   */
  static alreadyVoted(
    message: string,
    status: 409 | 422 = 422,
    details: unknown = null,
  ): AppError {
    return new AppError("ALREADY_VOTED", status, message, details);
  }

  // ---- Voting ------------------------------------------------------------

  static notEligible(message: string, details: unknown = null): AppError {
    return new AppError("NOT_ELIGIBLE", 403, message, details);
  }

  static electionNotOpen(message: string, details: unknown = null): AppError {
    return new AppError("ELECTION_NOT_OPEN", 409, message, details);
  }

  static candidateNotInElection(
    message: string,
    details: unknown = null,
  ): AppError {
    return new AppError("CANDIDATE_NOT_IN_ELECTION", 422, message, details);
  }
}
