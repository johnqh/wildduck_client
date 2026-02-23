/**
 * Typed error class for WildDuck API errors.
 *
 * Provides structured access to HTTP status codes, application-level error codes,
 * and human-readable messages returned by the WildDuck API. Consumers can use
 * `instanceof WildduckApiError` to distinguish API errors from network or
 * client-side errors and handle specific conditions (e.g., quota exceeded,
 * rate limited, not found) without string parsing.
 *
 * @example
 * ```ts
 * try {
 *   await api.getUser(auth);
 * } catch (err) {
 *   if (err instanceof WildduckApiError) {
 *     if (err.statusCode === 404) {
 *       // Handle not found
 *     } else if (err.statusCode === 429) {
 *       // Handle rate limit
 *     }
 *   }
 * }
 * ```
 */
export class WildduckApiError extends Error {
  /** HTTP status code returned by the API (e.g., 400, 401, 404, 429, 500) */
  readonly statusCode: number;

  /** Application-level error code from the WildDuck response (e.g., "UserNotFoundError", "ValidationError") */
  readonly errorCode: string;

  /**
   * Create a new WildduckApiError.
   *
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code from the API response
   * @param errorCode - Application-level error code string (defaults to "UnknownError")
   */
  constructor(
    message: string,
    statusCode: number,
    errorCode: string = "UnknownError",
  ) {
    super(message);
    this.name = "WildduckApiError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
  }

  /**
   * Check if this error represents a "not found" condition (HTTP 404).
   *
   * @returns true if the status code is 404
   */
  get isNotFound(): boolean {
    return this.statusCode === 404;
  }

  /**
   * Check if this error represents an authentication failure (HTTP 401).
   *
   * @returns true if the status code is 401
   */
  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  /**
   * Check if this error represents a forbidden/access denied condition (HTTP 403).
   *
   * @returns true if the status code is 403
   */
  get isForbidden(): boolean {
    return this.statusCode === 403;
  }

  /**
   * Check if this error represents a rate limiting condition (HTTP 429).
   *
   * @returns true if the status code is 429
   */
  get isRateLimited(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if this error represents a validation failure (HTTP 400).
   *
   * @returns true if the status code is 400
   */
  get isValidationError(): boolean {
    return this.statusCode === 400;
  }

  /**
   * Check if this error represents a server-side failure (HTTP 5xx).
   *
   * @returns true if the status code is in the 500 range
   */
  get isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }
}
