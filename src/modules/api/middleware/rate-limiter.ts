/**
 * API Rate Limiter
 *
 * Story 15.3 - AC1-7: Rate Limiting Enforcement
 *
 * Implements Token Bucket algorithm for API rate limiting.
 * Supports per-tenant custom limits with DB-backed overrides.
 * In-memory storage with Redis upgrade path for multi-instance deployment.
 */

import {
  type RateLimitState,
  rateLimitExceeded,
} from "../utils/rate-limit-headers";
import type { ApiContext } from "./auth-middleware";

// Default limits (AC3)
export const RATE_LIMITS = {
  perMinute: { capacity: 100, refillRate: 100 / 60 },
  perHour: { capacity: 1000, refillRate: 1000 / 3600 },
};

// Stricter auth endpoint limits (AC7)
export const AUTH_RATE_LIMITS = {
  perMinute: { capacity: 10, refillRate: 10 / 60 },
};

interface TokenBucket {
  tokens: number;
  capacity: number;
  refillRate: number;
  lastRefill: number;
}

interface RateLimitEntry {
  minuteBucket: TokenBucket;
  hourBucket: TokenBucket;
  customLimits?: { perMinute: number; perHour: number };
  limitsLoadedAt: number;
}

// In-memory stores with cleanup
const rateLimitStore = new Map<string, RateLimitEntry>();
const ipRateLimitStore = new Map<string, TokenBucket>(); // For IP-based auth endpoint limiting
const OVERRIDE_CACHE_TTL_MS = 60_000; // 60 seconds
const ENTRY_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_STORE_SIZE = 10_000;

// Periodic cleanup (memory leak prevention) - only in non-test environments
let cleanupInterval: ReturnType<typeof setInterval> | null = null;

function startCleanupInterval(): void {
  if (cleanupInterval) return;

  cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now - entry.minuteBucket.lastRefill > ENTRY_TTL_MS) {
        rateLimitStore.delete(key);
      }
    }
    // LRU eviction if too large
    if (rateLimitStore.size > MAX_STORE_SIZE) {
      const entries = [...rateLimitStore.entries()].sort(
        (a, b) => a[1].minuteBucket.lastRefill - b[1].minuteBucket.lastRefill,
      );
      for (let i = 0; i < entries.length - MAX_STORE_SIZE * 0.8; i++) {
        rateLimitStore.delete(entries[i][0]);
      }
    }
  }, 60_000);
}

// Start cleanup in production
if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  startCleanupInterval();
}

function createBucket(capacity: number, refillRate: number): TokenBucket {
  return { tokens: capacity, capacity, refillRate, lastRefill: Date.now() };
}

function consumeToken(bucket: TokenBucket): {
  allowed: boolean;
  bucket: TokenBucket;
} {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const newTokens = Math.min(
    bucket.capacity,
    bucket.tokens + elapsed * bucket.refillRate,
  );

  if (newTokens < 1) {
    return {
      allowed: false,
      bucket: { ...bucket, tokens: newTokens, lastRefill: now },
    };
  }
  return {
    allowed: true,
    bucket: { ...bucket, tokens: newTokens - 1, lastRefill: now },
  };
}

/**
 * Load custom rate limit overrides for a tenant from database
 *
 * AC5: Configurable Per-Tenant Limits
 */
async function loadTenantOverrides(
  tenantId: string,
): Promise<{ perMinute: number; perHour: number } | null> {
  try {
    // Dynamic import to avoid circular dependency and allow graceful failure
    // when rate_limit_overrides table doesn't exist yet
    const { adminDb } = await import("@/db");
    const { rateLimitOverrides } = await import(
      "@/db/schema/rate-limit-overrides"
    );
    const { eq } = await import("drizzle-orm");

    const override = await adminDb.query.rateLimitOverrides.findFirst({
      where: eq(rateLimitOverrides.tenantId, tenantId),
    });
    if (!override) return null;
    return {
      perMinute: override.requestsPerMinute,
      perHour: override.requestsPerHour,
    };
  } catch {
    // Table may not exist yet - use defaults
    return null;
  }
}

/**
 * Check rate limit for API request
 *
 * AC1: Rate Limit Enforcement
 * AC2: Per-Tenant, Per-API-Key Limits
 * AC6: Token Bucket Algorithm
 * AC7: Auth Endpoint Protection
 *
 * @param ctx - API context with tenantId and keyId
 * @param isAuthEndpoint - True for /api/v1/auth/token (stricter limits)
 * @returns Allowed with state, or 429 response
 */
export async function checkRateLimit(
  ctx: ApiContext,
  isAuthEndpoint = false,
): Promise<
  | { allowed: true; state: RateLimitState }
  | { allowed: false; response: Response }
> {
  const key = `${ctx.tenantId}:${ctx.keyId}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Load or refresh custom limits from DB (cached 60s) - AC5
  if (!entry || now - entry.limitsLoadedAt > OVERRIDE_CACHE_TTL_MS) {
    const customLimits = await loadTenantOverrides(ctx.tenantId);

    if (!entry) {
      // New entry - use custom limits or defaults
      const minuteCapacity =
        customLimits?.perMinute ?? RATE_LIMITS.perMinute.capacity;
      const hourCapacity =
        customLimits?.perHour ?? RATE_LIMITS.perHour.capacity;

      entry = {
        minuteBucket: createBucket(minuteCapacity, minuteCapacity / 60),
        hourBucket: createBucket(hourCapacity, hourCapacity / 3600),
        customLimits: customLimits ?? undefined,
        limitsLoadedAt: now,
      };
    } else {
      // Refresh cache - update limits if changed
      entry.limitsLoadedAt = now;

      if (customLimits) {
        entry.customLimits = customLimits;
        entry.minuteBucket.capacity = customLimits.perMinute;
        entry.minuteBucket.refillRate = customLimits.perMinute / 60;
        entry.hourBucket.capacity = customLimits.perHour;
        entry.hourBucket.refillRate = customLimits.perHour / 3600;
      } else {
        entry.customLimits = undefined;
        entry.minuteBucket.capacity = RATE_LIMITS.perMinute.capacity;
        entry.minuteBucket.refillRate = RATE_LIMITS.perMinute.refillRate;
        entry.hourBucket.capacity = RATE_LIMITS.perHour.capacity;
        entry.hourBucket.refillRate = RATE_LIMITS.perHour.refillRate;
      }
    }
  }

  // Use stricter limits for auth endpoint (AC7)
  const effectiveMinuteCapacity = isAuthEndpoint
    ? AUTH_RATE_LIMITS.perMinute.capacity
    : entry.minuteBucket.capacity;

  // For auth endpoint, use a separate bucket tracking
  let minuteBucketToCheck = entry.minuteBucket;
  if (isAuthEndpoint) {
    // Auth endpoint uses its own minute bucket with stricter limits
    const authKey = `${key}:auth`;
    let authEntry = rateLimitStore.get(authKey);
    if (!authEntry) {
      authEntry = {
        minuteBucket: createBucket(
          AUTH_RATE_LIMITS.perMinute.capacity,
          AUTH_RATE_LIMITS.perMinute.refillRate,
        ),
        hourBucket: createBucket(1000, 1000 / 3600), // Not used for auth
        limitsLoadedAt: now,
      };
      rateLimitStore.set(authKey, authEntry);
    }
    minuteBucketToCheck = authEntry.minuteBucket;
  }

  // Check minute limit
  const minuteResult = consumeToken(minuteBucketToCheck);

  if (isAuthEndpoint) {
    // Update auth-specific bucket
    const authKey = `${key}:auth`;
    const authEntry = rateLimitStore.get(authKey);
    if (authEntry) {
      authEntry.minuteBucket = minuteResult.bucket;
      rateLimitStore.set(authKey, authEntry);
    }
  } else {
    entry.minuteBucket = minuteResult.bucket;
  }

  if (!minuteResult.allowed) {
    if (!isAuthEndpoint) {
      rateLimitStore.set(key, entry);
    }
    const state: RateLimitState = {
      limit: effectiveMinuteCapacity,
      remaining: 0,
      reset: Math.floor(now / 1000) + 60,
    };
    return { allowed: false, response: rateLimitExceeded(state) };
  }

  // Check hour limit (skip for auth endpoint - minute limit sufficient)
  if (!isAuthEndpoint) {
    const hourResult = consumeToken(entry.hourBucket);
    entry.hourBucket = hourResult.bucket;

    if (!hourResult.allowed) {
      entry.minuteBucket.tokens += 1; // Refund minute token
      rateLimitStore.set(key, entry);
      const state: RateLimitState = {
        limit: entry.hourBucket.capacity,
        remaining: 0,
        reset: Math.floor(now / 1000) + 3600,
      };
      return { allowed: false, response: rateLimitExceeded(state) };
    }
  }

  if (!isAuthEndpoint) {
    rateLimitStore.set(key, entry);
  }

  return {
    allowed: true,
    state: {
      limit: effectiveMinuteCapacity,
      remaining: Math.floor(minuteResult.bucket.tokens),
      reset: Math.floor(now / 1000) + 60,
    },
  };
}

/**
 * Clear rate limit state for a key (on revocation)
 *
 * AC2: Revoking a key clears its rate limit state
 */
export function clearRateLimitState(tenantId: string, keyId: string): void {
  const key = `${tenantId}:${keyId}`;
  rateLimitStore.delete(key);
  rateLimitStore.delete(`${key}:auth`);
}

/**
 * Reset all rate limit state (for testing)
 */
export function resetAllRateLimitState(): void {
  rateLimitStore.clear();
  ipRateLimitStore.clear();
}

/**
 * Get current store size (for testing/monitoring)
 */
export function getRateLimitStoreSize(): number {
  return rateLimitStore.size;
}

/**
 * Check rate limit for authentication endpoint (IP-based)
 *
 * AC7: Stricter authentication endpoint protection (10 requests/minute per IP)
 * Used for /api/v1/auth/token before authentication
 *
 * @param ip - Client IP address
 * @returns Allowed with state, or 429 response
 */
export async function checkAuthEndpointRateLimit(
  ip: string,
): Promise<
  | { allowed: true; state: RateLimitState }
  | { allowed: false; response: Response }
> {
  const key = `auth:ip:${ip}`;
  const now = Date.now();

  let bucket = ipRateLimitStore.get(key);

  if (!bucket) {
    bucket = createBucket(
      AUTH_RATE_LIMITS.perMinute.capacity,
      AUTH_RATE_LIMITS.perMinute.refillRate,
    );
  }

  const result = consumeToken(bucket);
  ipRateLimitStore.set(key, result.bucket);

  // Cleanup old IP entries periodically
  if (ipRateLimitStore.size > MAX_STORE_SIZE / 2) {
    for (const [k, b] of ipRateLimitStore) {
      if (now - b.lastRefill > ENTRY_TTL_MS) {
        ipRateLimitStore.delete(k);
      }
    }
  }

  if (!result.allowed) {
    const state: RateLimitState = {
      limit: AUTH_RATE_LIMITS.perMinute.capacity,
      remaining: 0,
      reset: Math.floor(now / 1000) + 60,
    };
    return { allowed: false, response: rateLimitExceeded(state) };
  }

  return {
    allowed: true,
    state: {
      limit: AUTH_RATE_LIMITS.perMinute.capacity,
      remaining: Math.floor(result.bucket.tokens),
      reset: Math.floor(now / 1000) + 60,
    },
  };
}
