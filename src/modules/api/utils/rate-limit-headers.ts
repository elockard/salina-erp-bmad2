/**
 * Rate Limit Header Utilities
 *
 * Story 15.2 - Task 1: Rate limit header injection
 * AC10: Rate limit headers on all responses
 *
 * Note: Actual rate limiting enforcement is in Story 15.3.
 * This module handles header injection for rate limit information.
 */

import type { NextResponse } from "next/server";

/**
 * Default rate limit configuration
 * Per AC10: 100 requests/minute default
 */
export const DEFAULT_RATE_LIMIT = {
  limit: 100,
  windowMs: 60 * 1000, // 1 minute in milliseconds
};

/**
 * Rate limit state for a request
 */
export interface RateLimitState {
  /** Total requests allowed per window */
  limit: number;
  /** Requests remaining in current window */
  remaining: number;
  /** Unix timestamp when window resets */
  reset: number;
}

/**
 * Get default rate limit state (for pre-enforcement period)
 *
 * Returns a state indicating full limit available.
 * Used before Story 15.3 rate limiting is implemented.
 */
export function getDefaultRateLimitState(): RateLimitState {
  const resetTime = Math.floor(Date.now() / 1000) + 60; // Reset in 1 minute

  return {
    limit: DEFAULT_RATE_LIMIT.limit,
    remaining: DEFAULT_RATE_LIMIT.limit - 1, // Assume this request counts
    reset: resetTime,
  };
}

/**
 * Add rate limit headers to response
 *
 * @param response - Response to add headers to
 * @param state - Rate limit state
 * @returns Response with headers added
 */
export function addRateLimitHeaders(
  response: NextResponse,
  state: RateLimitState = getDefaultRateLimitState(),
): NextResponse {
  response.headers.set("X-RateLimit-Limit", state.limit.toString());
  response.headers.set("X-RateLimit-Remaining", state.remaining.toString());
  response.headers.set("X-RateLimit-Reset", state.reset.toString());
  return response;
}

/**
 * Create rate limit exceeded response
 *
 * Used when rate limit is exceeded (Story 15.3 enforcement).
 * Returns 429 Too Many Requests with appropriate headers.
 */
export function rateLimitExceeded(state: RateLimitState): Response {
  return new Response(
    JSON.stringify({
      error: {
        code: "rate_limited",
        message: "Rate limit exceeded. Please retry after the reset time.",
      },
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "X-RateLimit-Limit": state.limit.toString(),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": state.reset.toString(),
        "Retry-After": Math.max(
          0,
          state.reset - Math.floor(Date.now() / 1000),
        ).toString(),
      },
    },
  );
}
