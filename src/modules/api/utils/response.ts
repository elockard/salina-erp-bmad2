/**
 * API Response Utilities
 *
 * Story 15.2 - Task 1: Response helpers
 * AC9: Consistent error response format
 * AC10: Rate limit headers
 */

import { NextResponse } from "next/server";

/**
 * Standard API error codes per AC9
 */
export type ApiErrorCode =
  | "validation_error"
  | "not_found"
  | "unauthorized"
  | "forbidden"
  | "rate_limited"
  | "server_error";

/**
 * Standard API error response structure
 */
interface ApiErrorResponse {
  error: {
    code: ApiErrorCode;
    message: string;
    details?: Record<string, string>;
  };
}

/**
 * Return success response with data
 *
 * @param data - Response payload
 * @param status - HTTP status code (default 200)
 */
export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Return error response with standard format
 *
 * AC9: Error Response Format
 *
 * @param code - Error code from ApiErrorCode
 * @param message - Human-readable description
 * @param status - HTTP status code
 * @param details - Optional field-level error details
 */
export function apiError(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: Record<string, string>,
): NextResponse {
  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(details && { details }),
    },
  };
  return NextResponse.json(body, { status });
}

/**
 * Return 404 not found error
 *
 * AC8: Return 404 for not found OR wrong tenant (prevents enumeration)
 *
 * @param resource - Resource name for message
 */
export function notFound(resource: string): NextResponse {
  return apiError("not_found", `${resource} not found`, 404);
}

/**
 * Return 400 validation error with field details
 *
 * @param details - Field-level error messages
 */
export function validationError(details: Record<string, string>): NextResponse {
  return apiError("validation_error", "Validation failed", 400, details);
}

/**
 * Return 401 unauthorized error
 */
export function unauthorized(
  message = "Authentication required",
): NextResponse {
  return apiError("unauthorized", message, 401);
}

/**
 * Return 403 forbidden error
 */
export function forbidden(message = "Insufficient permissions"): NextResponse {
  return apiError("forbidden", message, 403);
}

/**
 * Return 500 server error
 */
export function serverError(message = "Internal server error"): NextResponse {
  return apiError("server_error", message, 500);
}

/**
 * Add rate limit headers to response
 *
 * AC10: Rate Limit Headers
 *
 * @param response - Original response
 * @param limit - Requests allowed per window
 * @param remaining - Requests remaining
 * @param reset - Unix timestamp when window resets
 */
export function withRateLimitHeaders(
  response: NextResponse,
  limit: number,
  remaining: number,
  reset: number,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set("X-RateLimit-Reset", reset.toString());
  return response;
}
