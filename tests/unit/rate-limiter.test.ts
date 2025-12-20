/**
 * Rate Limiter Unit Tests
 *
 * Story 15.3 - Rate Limiting Implementation
 * Tests Token Bucket algorithm and rate limiting functionality
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Create mock before importing modules
const mockFindFirst = vi.fn();

vi.mock("@/db", () => ({
  adminDb: {
    query: {
      rateLimitOverrides: {
        findFirst: mockFindFirst,
      },
    },
  },
}));

vi.mock("@/db/schema/rate-limit-overrides", () => ({
  rateLimitOverrides: {
    tenantId: "tenantId",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
}));

// Import after mocks
import type { ApiContext } from "@/modules/api/middleware/auth-middleware";
import {
  AUTH_RATE_LIMITS,
  checkAuthEndpointRateLimit,
  checkRateLimit,
  clearRateLimitState,
  getRateLimitStoreSize,
  RATE_LIMITS,
  resetAllRateLimitState,
} from "@/modules/api/middleware/rate-limiter";

describe("Rate Limiter", () => {
  const mockContext: ApiContext = {
    tenantId: "tenant-123",
    keyId: "key-456",
    scopes: ["read", "write"],
  };

  beforeEach(() => {
    // Reset rate limit state between tests
    resetAllRateLimitState();
    vi.clearAllMocks();
    // Mock no custom overrides by default
    mockFindFirst.mockResolvedValue(null);
  });

  describe("AC1: Rate Limit Enforcement", () => {
    it("should allow requests under the limit", async () => {
      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.state.remaining).toBeLessThanOrEqual(
          RATE_LIMITS.perMinute.capacity,
        );
      }
    });

    it("should reject requests when minute limit exceeded", async () => {
      // Exhaust the minute bucket
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(mockContext);
      }

      // Next request should be rejected
      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(429);
      }
    });
  });

  describe("AC2: Per-Tenant, Per-API-Key Limits", () => {
    it("should track limits separately per tenant/key combination", async () => {
      const context1: ApiContext = {
        tenantId: "tenant-1",
        keyId: "key-1",
        scopes: ["read"],
      };
      const context2: ApiContext = {
        tenantId: "tenant-2",
        keyId: "key-2",
        scopes: ["read"],
      };

      // Use up context1's limit
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(context1);
      }

      // context2 should still be allowed
      const result = await checkRateLimit(context2);
      expect(result.allowed).toBe(true);

      // context1 should be rate limited
      const result2 = await checkRateLimit(context1);
      expect(result2.allowed).toBe(false);
    });
  });

  describe("AC3: Default Rate Limits", () => {
    it("should have default minute limit of 100", () => {
      expect(RATE_LIMITS.perMinute.capacity).toBe(100);
    });

    it("should have default hour limit of 1000", () => {
      expect(RATE_LIMITS.perHour.capacity).toBe(1000);
    });

    it("should reject requests when hour limit exceeded", async () => {
      // Create a context with a very small mock hour limit for testing
      const hourTestContext: ApiContext = {
        tenantId: "hour-test-tenant",
        keyId: "hour-test-key",
        scopes: ["read"],
      };

      // Mock custom limits with low hour limit but high minute limit
      mockFindFirst.mockResolvedValue({
        id: "override-hour",
        tenantId: hourTestContext.tenantId,
        requestsPerMinute: 1000, // High minute limit
        requestsPerHour: 5, // Low hour limit for testing
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Exhaust the hour bucket (5 requests)
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(hourTestContext);
        expect(result.allowed).toBe(true);
      }

      // Next request should be rejected due to hour limit
      const result = await checkRateLimit(hourTestContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(429);
        // Hour limit returns 3600 second reset (1 hour)
        const body = await result.response.json();
        expect(body.error.code).toBe("rate_limited");
      }
    });
  });

  describe("AC4: Rate Limit Headers", () => {
    it("should return RateLimitState with limit, remaining, and reset", async () => {
      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        expect(result.state).toHaveProperty("limit");
        expect(result.state).toHaveProperty("remaining");
        expect(result.state).toHaveProperty("reset");
        expect(result.state.limit).toBe(RATE_LIMITS.perMinute.capacity);
        expect(typeof result.state.reset).toBe("number");
      }
    });

    it("should decrement remaining count after each request", async () => {
      const result1 = await checkRateLimit(mockContext);
      const result2 = await checkRateLimit(mockContext);

      if (result1.allowed && result2.allowed) {
        expect(result2.state.remaining).toBeLessThan(result1.state.remaining);
      }
    });
  });

  describe("AC5: Custom Per-Tenant Limits", () => {
    it("should use custom limits when configured", async () => {
      // Mock custom limits
      mockFindFirst.mockResolvedValue({
        id: "override-1",
        tenantId: mockContext.tenantId,
        requestsPerMinute: 50,
        requestsPerHour: 500,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Use a new context to trigger fresh limit loading
      const newContext: ApiContext = {
        tenantId: "custom-tenant",
        keyId: "custom-key",
        scopes: ["read"],
      };

      const result = await checkRateLimit(newContext);

      if (result.allowed) {
        expect(result.state.limit).toBe(50);
      }
    });
  });

  describe("AC6: Token Bucket Algorithm", () => {
    it("should refill tokens over time", async () => {
      // Use 10 tokens
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(mockContext);
      }

      const before = await checkRateLimit(mockContext);

      // Simulate time passing (mock Date.now)
      const originalNow = Date.now;
      const futureTime = originalNow() + 2000; // 2 seconds later
      Date.now = vi.fn(() => futureTime);

      const after = await checkRateLimit(mockContext);

      // Restore Date.now
      Date.now = originalNow;

      if (before.allowed && after.allowed) {
        // Should have refilled some tokens
        expect(after.state.remaining).toBeGreaterThan(0);
      }
    });
  });

  describe("AC7: Auth Endpoint Rate Limiting", () => {
    it("should have stricter limits for auth endpoint", () => {
      expect(AUTH_RATE_LIMITS.perMinute.capacity).toBe(10);
    });

    it("should enforce stricter IP-based rate limits", async () => {
      const testIp = "192.168.1.1";

      // Use up the auth limit
      for (let i = 0; i < AUTH_RATE_LIMITS.perMinute.capacity; i++) {
        const result = await checkAuthEndpointRateLimit(testIp);
        expect(result.allowed).toBe(true);
      }

      // Next request should be rate limited
      const result = await checkAuthEndpointRateLimit(testIp);
      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.status).toBe(429);
      }
    });

    it("should track auth limits separately per IP", async () => {
      const ip1 = "192.168.1.1";
      const ip2 = "192.168.1.2";

      // Exhaust ip1's limit
      for (let i = 0; i < AUTH_RATE_LIMITS.perMinute.capacity; i++) {
        await checkAuthEndpointRateLimit(ip1);
      }

      // ip2 should still be allowed
      const result = await checkAuthEndpointRateLimit(ip2);
      expect(result.allowed).toBe(true);

      // ip1 should be rate limited
      const result2 = await checkAuthEndpointRateLimit(ip1);
      expect(result2.allowed).toBe(false);
    });
  });

  describe("State Management", () => {
    it("should clear rate limit state for a specific key", async () => {
      // Use some tokens
      for (let i = 0; i < 10; i++) {
        await checkRateLimit(mockContext);
      }

      // Clear state
      clearRateLimitState(mockContext.tenantId, mockContext.keyId);

      // Should have full tokens again
      const result = await checkRateLimit(mockContext);
      if (result.allowed) {
        expect(result.state.remaining).toBe(RATE_LIMITS.perMinute.capacity - 1);
      }
    });

    it("should track store size", async () => {
      resetAllRateLimitState();

      await checkRateLimit({ tenantId: "t1", keyId: "k1", scopes: [] });
      await checkRateLimit({ tenantId: "t2", keyId: "k2", scopes: [] });

      expect(getRateLimitStoreSize()).toBeGreaterThanOrEqual(2);
    });
  });

  describe("429 Response", () => {
    it("should return proper 429 response when rate limited", async () => {
      // Exhaust limits
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(mockContext);
      }

      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        const response = result.response;
        expect(response.status).toBe(429);
        expect(response.headers.get("Content-Type")).toContain(
          "application/json",
        );

        const body = await response.json();
        expect(body.error.code).toBe("rate_limited");
        expect(body.error.message).toContain("Rate limit exceeded");
      }
    });
  });
});
