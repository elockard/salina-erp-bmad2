# Story 15.3: Implement Rate Limiting

Status: done

## Story

**As a** platform administrator,
**I want** to enforce API rate limits,
**So that** no single tenant can overload the system.

## Context

Epic 15 (REST API & Webhooks) provides third-party integrations through a public REST API. Stories 15.1 and 15.2 established OAuth2 authentication and core API endpoints. This story implements rate limiting enforcement to protect the platform from abuse and ensure fair usage.

### Dependencies
- **Story 15.1** (COMPLETE): OAuth2 authentication with API keys and JWT tokens
- **Story 15.2** (COMPLETE): Core REST API endpoints with rate limit headers (headers present, enforcement not implemented)

### Business Value
- Prevents single tenant from degrading service for others
- Protects backend infrastructure from abuse
- Enables fair usage enforcement across all API consumers
- Foundation for tiered API access (higher limits for premium tiers)

### Existing Infrastructure
| File | Purpose |
|------|---------|
| `src/modules/api/utils/rate-limit-headers.ts` | Header utilities, `rateLimitExceeded()`, `addRateLimitHeaders(response, state)` |
| `src/modules/api/utils/response.ts` | `apiError()` with `rate_limited` code |
| `src/modules/api/middleware/auth-middleware.ts` | `authenticateApiRequest()`, `ApiContext` with `tenantId`, `keyId` |
| `src/modules/api/auth/api-key-service.ts` | Key prefixes: `sk_live_`, `sk_test_` |

### Architecture Constraints
- Token Bucket Algorithm (per `docs/architecture.md`)
- Per-tenant, per-API-key limits
- Default: 100 requests/minute, 1000 requests/hour
- In-memory storage with Redis upgrade path

## Acceptance Criteria

### AC1: Rate Limit Enforcement
- **Given** a tenant has API access
- **When** API calls exceed rate limit
- **Then** system returns 429 Too Many Requests with Retry-After header
- **And** response body: `{"error":{"code":"rate_limited","message":"Rate limit exceeded. Please retry after the reset time."}}`

### AC2: Per-Tenant, Per-API-Key Limits
- Limits tracked per `tenantId:keyId` combination
- Different API keys from same tenant have independent limits
- Revoking a key clears its rate limit state

### AC3: Default Rate Limits
- 100 requests/minute (burst protection)
- 1000 requests/hour (sustained usage)
- Both limits must pass for request to proceed

### AC4: Rate Limit Headers (All Responses)
- `X-RateLimit-Limit`: requests allowed per window
- `X-RateLimit-Remaining`: requests remaining
- `X-RateLimit-Reset`: Unix timestamp when window resets
- `Retry-After`: seconds until reset (429 responses only)

### AC5: Configurable Per-Tenant Limits
- Custom limits stored in `rate_limit_overrides` table
- Changes take effect immediately
- Overrides cached for 60 seconds to reduce DB queries

### AC6: Token Bucket Algorithm
- Bucket refills at steady rate (tokens/second)
- Burst capacity up to bucket size
- Empty bucket = 429 rejection

### AC7: Auth Endpoint Protection
- `/api/v1/auth/token` has stricter limit: 10 requests/minute
- Prevents credential stuffing attacks

## Tasks

- [x] **Task 1**: Create rate limiter service (`src/modules/api/middleware/rate-limiter.ts`)
- [x] **Task 2**: Create rate limit overrides schema + migration
- [x] **Task 3**: Integrate rate limiter into all API endpoints
- [x] **Task 4**: Create admin API for limit management
- [x] **Task 5**: Add stricter auth endpoint rate limiting
- [x] **Task 6**: Write tests

## Dev Notes

### Task 1: Rate Limiter Service

Create `src/modules/api/middleware/rate-limiter.ts`:

```typescript
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { rateLimitOverrides } from "@/db/schema/rate-limit-overrides";
import type { ApiContext } from "./auth-middleware";
import { rateLimitExceeded, type RateLimitState } from "../utils/rate-limit-headers";

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

// In-memory store with cleanup
const rateLimitStore = new Map<string, RateLimitEntry>();
const OVERRIDE_CACHE_TTL_MS = 60_000; // 60 seconds
const ENTRY_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_STORE_SIZE = 10_000;

// Periodic cleanup (memory leak prevention)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now - entry.minuteBucket.lastRefill > ENTRY_TTL_MS) {
      rateLimitStore.delete(key);
    }
  }
  // LRU eviction if too large
  if (rateLimitStore.size > MAX_STORE_SIZE) {
    const entries = [...rateLimitStore.entries()]
      .sort((a, b) => a[1].minuteBucket.lastRefill - b[1].minuteBucket.lastRefill);
    for (let i = 0; i < entries.length - MAX_STORE_SIZE * 0.8; i++) {
      rateLimitStore.delete(entries[i][0]);
    }
  }
}, 60_000);

function createBucket(capacity: number, refillRate: number): TokenBucket {
  return { tokens: capacity, capacity, refillRate, lastRefill: Date.now() };
}

function consumeToken(bucket: TokenBucket): { allowed: boolean; bucket: TokenBucket } {
  const now = Date.now();
  const elapsed = (now - bucket.lastRefill) / 1000;
  const newTokens = Math.min(bucket.capacity, bucket.tokens + elapsed * bucket.refillRate);

  if (newTokens < 1) {
    return { allowed: false, bucket: { ...bucket, tokens: newTokens, lastRefill: now } };
  }
  return { allowed: true, bucket: { ...bucket, tokens: newTokens - 1, lastRefill: now } };
}

async function loadTenantOverrides(tenantId: string): Promise<{ perMinute: number; perHour: number } | null> {
  const override = await adminDb.query.rateLimitOverrides.findFirst({
    where: eq(rateLimitOverrides.tenantId, tenantId),
  });
  if (!override) return null;
  return { perMinute: override.requestsPerMinute, perHour: override.requestsPerHour };
}

export async function checkRateLimit(
  ctx: ApiContext,
  isAuthEndpoint = false
): Promise<{ allowed: true; state: RateLimitState } | { allowed: false; response: Response }> {
  const key = `${ctx.tenantId}:${ctx.keyId}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  // Load or refresh custom limits from DB (cached 60s)
  if (!entry || now - entry.limitsLoadedAt > OVERRIDE_CACHE_TTL_MS) {
    const customLimits = await loadTenantOverrides(ctx.tenantId);
    const limits = customLimits || RATE_LIMITS;

    if (!entry) {
      entry = {
        minuteBucket: createBucket(limits.perMinute.capacity || limits.perMinute, limits.perMinute.refillRate || limits.perMinute / 60),
        hourBucket: createBucket(limits.perHour.capacity || limits.perHour, limits.perHour.refillRate || limits.perHour / 3600),
        customLimits: customLimits ? customLimits : undefined,
        limitsLoadedAt: now,
      };
    } else {
      entry.customLimits = customLimits || undefined;
      entry.limitsLoadedAt = now;
      // Update bucket capacities if limits changed
      if (customLimits) {
        entry.minuteBucket.capacity = customLimits.perMinute;
        entry.minuteBucket.refillRate = customLimits.perMinute / 60;
        entry.hourBucket.capacity = customLimits.perHour;
        entry.hourBucket.refillRate = customLimits.perHour / 3600;
      }
    }
  }

  // Use stricter limits for auth endpoint (AC7)
  const minuteLimit = isAuthEndpoint ? AUTH_RATE_LIMITS.perMinute.capacity : entry.minuteBucket.capacity;

  // Check minute limit
  const minuteResult = consumeToken(entry.minuteBucket);
  entry.minuteBucket = minuteResult.bucket;

  if (!minuteResult.allowed) {
    rateLimitStore.set(key, entry);
    const state: RateLimitState = {
      limit: minuteLimit,
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

  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    state: {
      limit: minuteLimit,
      remaining: Math.floor(entry.minuteBucket.tokens),
      reset: Math.floor(now / 1000) + 60,
    },
  };
}

export function clearRateLimitState(tenantId: string, keyId: string): void {
  rateLimitStore.delete(`${tenantId}:${keyId}`);
}
```

### Task 2: Rate Limit Overrides Schema

Create `src/db/schema/rate-limit-overrides.ts`:

```typescript
import { pgTable, uuid, integer, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { tenants } from "./tenants";

export const rateLimitOverrides = pgTable(
  "rate_limit_overrides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" })
      .unique(),
    requestsPerMinute: integer("requests_per_minute").notNull().default(100),
    requestsPerHour: integer("requests_per_hour").notNull().default(1000),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
    updatedBy: uuid("updated_by"),
  },
  (table) => ({
    tenantIdx: index("rate_limit_overrides_tenant_idx").on(table.tenantId),
  }),
);

export const rateLimitOverridesRelations = relations(rateLimitOverrides, ({ one }) => ({
  tenant: one(tenants, {
    fields: [rateLimitOverrides.tenantId],
    references: [tenants.id],
  }),
}));

export type RateLimitOverride = typeof rateLimitOverrides.$inferSelect;
export type InsertRateLimitOverride = typeof rateLimitOverrides.$inferInsert;
```

**Update `src/db/schema/index.ts`:**
```typescript
export * from "./rate-limit-overrides";
```

**Update `src/db/schema/relations.ts`:**
```typescript
export { rateLimitOverridesRelations } from "./rate-limit-overrides";
```

**Generate migration:**
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Task 3: Integrate into API Endpoints

**Pattern for all routes:**

```typescript
import { checkRateLimit } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";

export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Authenticate
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  // 2. Check rate limit - MUST pass state to headers
  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  // 3. Check scope
  const scopeError = requireScope(authResult.context, "read");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  // 4. Business logic...
  const response = apiSuccess({ data: result });

  // 5. CRITICAL: Pass actual state, not defaults
  return addRateLimitHeaders(response, rateLimit.state);
}
```

**Files to update (add rate limit check + pass state to headers):**
- `src/app/api/v1/titles/route.ts` - Lines 260, 324: pass `rateLimit.state`
- `src/app/api/v1/titles/[id]/route.ts`
- `src/app/api/v1/contacts/route.ts`
- `src/app/api/v1/contacts/[id]/route.ts`
- `src/app/api/v1/sales/route.ts`
- `src/app/api/v1/sales/[id]/route.ts`
- `src/app/api/v1/onix/export/route.ts`

### Task 4: Admin Rate Limit API

Create `src/app/api/v1/admin/rate-limits/[tenantId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { rateLimitOverrides } from "@/db/schema/rate-limit-overrides";
import { tenants } from "@/db/schema/tenants";
import { authenticateApiRequest, requireScope } from "@/modules/api/middleware/auth-middleware";
import { checkRateLimit, RATE_LIMITS } from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess, notFound, validationError, apiError } from "@/modules/api/utils/response";

const updateSchema = z.object({
  requests_per_minute: z.number().int().min(1).max(10000).optional(),
  requests_per_hour: z.number().int().min(1).max(100000).optional(),
});

// NOTE: "admin" scope here means tenant admin with admin API key.
// For platform-wide admin, consider adding "platform_admin" scope in future.

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { tenantId } = await params;

  const tenant = await adminDb.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });
  if (!tenant) return addRateLimitHeaders(notFound("Tenant"), rateLimit.state);

  const override = await adminDb.query.rateLimitOverrides.findFirst({
    where: eq(rateLimitOverrides.tenantId, tenantId),
  });

  const response = apiSuccess({
    tenant_id: tenantId,
    limits: {
      requests_per_minute: override?.requestsPerMinute ?? RATE_LIMITS.perMinute.capacity,
      requests_per_hour: override?.requestsPerHour ?? RATE_LIMITS.perHour.capacity,
    },
    is_default: !override,
    updated_at: override?.updatedAt ?? null,
  });

  return addRateLimitHeaders(response, rateLimit.state);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  const authResult = await authenticateApiRequest(request);
  if ("error" in authResult) return authResult.error;

  const rateLimit = await checkRateLimit(authResult.context);
  if (!rateLimit.allowed) return rateLimit.response as NextResponse;

  const scopeError = requireScope(authResult.context, "admin");
  if (scopeError) return addRateLimitHeaders(scopeError, rateLimit.state);

  const { tenantId } = await params;

  try {
    const body = await request.json();
    const validation = updateSchema.safeParse(body);
    if (!validation.success) {
      return addRateLimitHeaders(
        validationError(Object.fromEntries(validation.error.errors.map(e => [e.path.join("."), e.message]))),
        rateLimit.state
      );
    }

    const tenant = await adminDb.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
    if (!tenant) return addRateLimitHeaders(notFound("Tenant"), rateLimit.state);

    const data = validation.data;
    const now = new Date();

    await adminDb
      .insert(rateLimitOverrides)
      .values({
        tenantId,
        requestsPerMinute: data.requests_per_minute ?? RATE_LIMITS.perMinute.capacity,
        requestsPerHour: data.requests_per_hour ?? RATE_LIMITS.perHour.capacity,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: rateLimitOverrides.tenantId,
        set: {
          ...(data.requests_per_minute && { requestsPerMinute: data.requests_per_minute }),
          ...(data.requests_per_hour && { requestsPerHour: data.requests_per_hour }),
          updatedAt: now,
        },
      });

    const response = apiSuccess({
      tenant_id: tenantId,
      limits: {
        requests_per_minute: data.requests_per_minute ?? RATE_LIMITS.perMinute.capacity,
        requests_per_hour: data.requests_per_hour ?? RATE_LIMITS.perHour.capacity,
      },
      updated_at: now.toISOString(),
    });

    return addRateLimitHeaders(response, rateLimit.state);
  } catch (error) {
    console.error("[API] Rate limit update error:", error);
    return addRateLimitHeaders(apiError("server_error", "Failed to update rate limits", 500), rateLimit.state);
  }
}
```

### Task 5: Auth Endpoint Rate Limiting

Update `src/app/api/v1/auth/token/route.ts`:

```typescript
// At top of POST handler, after authentication check:
const rateLimit = await checkRateLimit(authResult.context, true); // true = isAuthEndpoint
if (!rateLimit.allowed) return rateLimit.response as NextResponse;
```

The `isAuthEndpoint=true` flag triggers stricter 10/minute limit instead of 100/minute.

### Task 6: Tests

**Unit tests (`tests/unit/rate-limiter.test.ts`):**
- Token bucket creates with full capacity
- Bucket refills correctly over time
- Bucket rejects when empty
- Burst up to capacity allowed
- Minute and hour limits independent
- Per-key isolation
- `clearRateLimitState()` removes entry
- Custom tenant limits loaded from DB
- Override cache expires after 60s
- Memory cleanup removes stale entries
- Auth endpoint uses stricter limits

**Integration tests (`tests/integration/api-rate-limiting.test.ts`):**
- Request within limit returns 200 + headers
- 101st request in minute returns 429
- 429 includes Retry-After header
- Response body matches expected format
- Rate limit resets after window
- Different API keys have independent limits
- Custom tenant limits override defaults
- Admin can view/update rate limits
- Non-admin cannot access admin endpoints
- Auth endpoint limited to 10/minute

### Security Considerations

1. **Token bucket prevents burst abuse** - No "double burst" at window boundary
2. **Per-key isolation** - Compromised key doesn't affect others
3. **Admin-only configuration** - `admin` scope required
4. **Auth endpoint protection** - 10/min prevents credential stuffing
5. **Memory bounds** - TTL cleanup + LRU eviction prevents DoS via memory exhaustion

### File Summary

**New files:**
- `src/modules/api/middleware/rate-limiter.ts`
- `src/db/schema/rate-limit-overrides.ts`
- `src/app/api/v1/admin/rate-limits/[tenantId]/route.ts`
- `tests/unit/rate-limiter.test.ts`
- `tests/integration/api-rate-limiting.test.ts`
- `drizzle/migrations/XXXX_rate_limit_overrides.sql`

**Modified files:**
- `src/db/schema/index.ts` - Export rate-limit-overrides
- `src/db/schema/relations.ts` - Add rateLimitOverridesRelations
- `src/app/api/v1/titles/route.ts` - Add rate limit + pass state
- `src/app/api/v1/titles/[id]/route.ts` - Add rate limit + pass state
- `src/app/api/v1/contacts/route.ts` - Add rate limit + pass state
- `src/app/api/v1/contacts/[id]/route.ts` - Add rate limit + pass state
- `src/app/api/v1/sales/route.ts` - Add rate limit + pass state
- `src/app/api/v1/sales/[id]/route.ts` - Add rate limit + pass state
- `src/app/api/v1/onix/export/route.ts` - Add rate limit + pass state
- `src/app/api/v1/auth/token/route.ts` - Add stricter rate limit

### References

- [docs/architecture.md - API Rate Limiting: Token Bucket Algorithm]
- [docs/epics.md - Story 15.3, FR146]
- [src/modules/api/utils/rate-limit-headers.ts - Existing helpers]
- [src/modules/api/middleware/auth-middleware.ts - ApiContext]

## Test Scenarios

### Unit Tests
- Token bucket creates with full capacity
- Token bucket refills correctly over time
- Token bucket rejects when empty
- Token bucket allows burst up to capacity
- Minute and hour limits are independent
- Per-key isolation works correctly
- clearRateLimitState removes entry
- Custom tenant limits loaded from database
- Override cache expires after 60 seconds
- Memory cleanup removes stale entries
- Auth endpoint uses stricter 10/minute limits

### Integration Tests
- Request within limit returns 200 with rate limit headers
- Request exceeding minute limit returns 429
- Request exceeding hour limit returns 429
- 429 response includes Retry-After header
- 429 response body matches expected format
- Rate limit resets after window expires
- Different API keys have independent limits
- Admin can view tenant rate limits
- Admin can update tenant rate limits
- Custom tenant limits override defaults
- Non-admin cannot access rate limit admin endpoints
- Auth endpoint rate limited to 10/minute

### Manual Testing Checklist
- [ ] Make 100 requests in < 1 minute, verify 101st returns 429
- [ ] Verify X-RateLimit-Remaining decrements on each request
- [ ] Verify Retry-After header on 429 response
- [ ] Wait for reset, verify requests succeed again
- [ ] Create second API key, verify independent limits
- [ ] Set custom limits via admin API, verify they apply
- [ ] Test auth endpoint hits 429 after 10 requests/minute

## Dev Agent Record

### Agent Model Used

claude-opus-4-5-20251101

### Completion Notes List

1. Implemented Token Bucket rate limiting algorithm in `src/modules/api/middleware/rate-limiter.ts`
2. Created `rate_limit_overrides` schema for per-tenant custom limits with 60-second cache
3. Integrated rate limiting into all 7 API endpoints (titles, contacts, sales, onix export)
4. Created admin API at `/api/v1/admin/rate-limits/[tenantId]` for GET/PUT/DELETE operations
5. Added stricter IP-based rate limiting (10/min) for auth endpoint to prevent credential stuffing
6. Wrote 15 unit tests covering all acceptance criteria - all passing
7. TypeScript compiles cleanly, lint passes for new code

### Code Review Fixes Applied

1. **HIGH: Integration tests missing** - Created `tests/integration/api-rate-limiting.test.ts` with 10 integration tests covering rate limit headers, IP-based auth limiting, multi-tenant isolation, custom limits, 429 response format, and rate limit consistency
2. **HIGH: Validation errors missing rate limit headers** - Fixed GET endpoints in titles, contacts, sales, and onix/export routes to wrap validation errors with `addRateLimitHeaders()`
3. **MEDIUM: ipRateLimitStore not cleared in resetAllRateLimitState()** - Added `ipRateLimitStore.clear()` to `resetAllRateLimitState()` function and moved the store declaration to module level for proper initialization
4. **MEDIUM: clearRateLimitState not integrated with key revocation** - Added call to `clearRateLimitState(user.tenant_id, keyId)` in `revokeApiKey()` action (Story 15.3 AC2 compliance)
5. **MEDIUM: Admin API allows cross-tenant access** - Added tenant isolation checks to all three admin API endpoints (GET/PUT/DELETE) - admin can only manage their own tenant's rate limits
6. **MEDIUM: No hour limit exhaustion test** - Added test case "should reject requests when hour limit exceeded" in AC3 test suite using custom mock limits

### File List

New files:
- `src/modules/api/middleware/rate-limiter.ts`
- `src/db/schema/rate-limit-overrides.ts`
- `src/app/api/v1/admin/rate-limits/[tenantId]/route.ts`
- `tests/unit/rate-limiter.test.ts` (16 tests)
- `tests/integration/api-rate-limiting.test.ts` (10 tests)
- `drizzle/0009_create_rate_limit_overrides.sql`

Modified files:
- `src/db/schema/index.ts`
- `src/db/schema/relations.ts`
- `src/app/api/v1/titles/route.ts`
- `src/app/api/v1/titles/[id]/route.ts`
- `src/app/api/v1/contacts/route.ts`
- `src/app/api/v1/contacts/[id]/route.ts`
- `src/app/api/v1/sales/route.ts`
- `src/app/api/v1/sales/[id]/route.ts`
- `src/app/api/v1/onix/export/route.ts`
- `src/app/api/v1/auth/token/route.ts`
- `src/modules/api/actions.ts` (added clearRateLimitState on key revocation)
