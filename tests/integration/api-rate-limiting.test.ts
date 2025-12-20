/**
 * @vitest-environment node
 *
 * API Rate Limiting Integration Tests
 *
 * Story 15.3 - Rate Limiting Implementation
 * Tests rate limiting behavior across API endpoints
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database
const mockFindFirst = vi.fn();
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      apiKeys: { findFirst: vi.fn() },
      rateLimitOverrides: { findFirst: mockFindFirst },
      tenants: { findFirst: vi.fn() },
    },
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue({}),
        }),
      }),
    }),
  },
}));

vi.mock("@/db/schema/rate-limit-overrides", () => ({
  rateLimitOverrides: { tenantId: "tenantId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
}));

import type { ApiContext } from "@/modules/api/middleware/auth-middleware";
import {
  AUTH_RATE_LIMITS,
  checkAuthEndpointRateLimit,
  checkRateLimit,
  RATE_LIMITS,
  resetAllRateLimitState,
} from "@/modules/api/middleware/rate-limiter";
import { addRateLimitHeaders } from "@/modules/api/utils/rate-limit-headers";
import { apiSuccess } from "@/modules/api/utils/response";

describe("API Rate Limiting Integration", () => {
  const mockContext: ApiContext = {
    tenantId: "tenant-integration-123",
    keyId: "key-integration-456",
    scopes: ["read", "write"],
  };

  beforeEach(() => {
    resetAllRateLimitState();
    vi.clearAllMocks();
    mockFindFirst.mockResolvedValue(null);
  });

  describe("Rate Limit Headers Integration", () => {
    it("should add rate limit headers to successful responses", async () => {
      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(true);
      if (result.allowed) {
        const baseResponse = apiSuccess({ data: { test: true } });
        const response = addRateLimitHeaders(baseResponse, result.state);

        expect(response.headers.get("X-RateLimit-Limit")).toBe(
          RATE_LIMITS.perMinute.capacity.toString(),
        );
        expect(response.headers.get("X-RateLimit-Remaining")).toBeDefined();
        expect(response.headers.get("X-RateLimit-Reset")).toBeDefined();
      }
    });

    it("should include Retry-After header when rate limited", async () => {
      // Exhaust the limit
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(mockContext);
      }

      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        expect(result.response.headers.get("Retry-After")).toBeDefined();
        expect(result.response.headers.get("X-RateLimit-Remaining")).toBe("0");
      }
    });
  });

  describe("IP-Based Auth Endpoint Rate Limiting", () => {
    it("should apply stricter limits to auth endpoint", async () => {
      const testIp = "10.0.0.100";

      // Auth endpoint allows only 10 requests per minute
      for (let i = 0; i < AUTH_RATE_LIMITS.perMinute.capacity; i++) {
        const result = await checkAuthEndpointRateLimit(testIp);
        expect(result.allowed).toBe(true);
      }

      // 11th request should be blocked
      const blocked = await checkAuthEndpointRateLimit(testIp);
      expect(blocked.allowed).toBe(false);
    });

    it("should isolate rate limits between different IPs", async () => {
      const ip1 = "192.168.1.100";
      const ip2 = "192.168.1.200";

      // Exhaust ip1
      for (let i = 0; i < AUTH_RATE_LIMITS.perMinute.capacity; i++) {
        await checkAuthEndpointRateLimit(ip1);
      }

      // ip1 should be blocked
      const result1 = await checkAuthEndpointRateLimit(ip1);
      expect(result1.allowed).toBe(false);

      // ip2 should still be allowed
      const result2 = await checkAuthEndpointRateLimit(ip2);
      expect(result2.allowed).toBe(true);
    });
  });

  describe("Multi-Tenant Rate Limit Isolation", () => {
    it("should isolate rate limits between tenants", async () => {
      const tenant1Context: ApiContext = {
        tenantId: "tenant-A",
        keyId: "key-A",
        scopes: ["read"],
      };
      const tenant2Context: ApiContext = {
        tenantId: "tenant-B",
        keyId: "key-B",
        scopes: ["read"],
      };

      // Exhaust tenant1's limit
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(tenant1Context);
      }

      // tenant1 should be blocked
      const result1 = await checkRateLimit(tenant1Context);
      expect(result1.allowed).toBe(false);

      // tenant2 should still have full capacity
      const result2 = await checkRateLimit(tenant2Context);
      expect(result2.allowed).toBe(true);
      if (result2.allowed) {
        expect(result2.state.remaining).toBe(
          RATE_LIMITS.perMinute.capacity - 1,
        );
      }
    });

    it("should isolate rate limits between API keys for same tenant", async () => {
      const key1Context: ApiContext = {
        tenantId: "shared-tenant",
        keyId: "key-1",
        scopes: ["read"],
      };
      const key2Context: ApiContext = {
        tenantId: "shared-tenant",
        keyId: "key-2",
        scopes: ["read"],
      };

      // Exhaust key1's limit
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(key1Context);
      }

      // key1 should be blocked
      const result1 = await checkRateLimit(key1Context);
      expect(result1.allowed).toBe(false);

      // key2 should still have full capacity
      const result2 = await checkRateLimit(key2Context);
      expect(result2.allowed).toBe(true);
    });
  });

  describe("Custom Rate Limits", () => {
    it("should apply custom tenant rate limits", async () => {
      const customContext: ApiContext = {
        tenantId: "custom-tenant",
        keyId: "custom-key",
        scopes: ["read"],
      };

      // Mock custom limits (lower than default)
      mockFindFirst.mockResolvedValue({
        id: "override-1",
        tenantId: customContext.tenantId,
        requestsPerMinute: 5, // Much lower than default 100
        requestsPerHour: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Use up custom limit
      for (let i = 0; i < 5; i++) {
        const result = await checkRateLimit(customContext);
        expect(result.allowed).toBe(true);
      }

      // 6th request should be blocked
      const result = await checkRateLimit(customContext);
      expect(result.allowed).toBe(false);
    });
  });

  describe("429 Response Format", () => {
    it("should return proper error response when rate limited", async () => {
      // Exhaust limits
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(mockContext);
      }

      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        const body = await result.response.json();

        expect(result.response.status).toBe(429);
        expect(body).toHaveProperty("error");
        expect(body.error).toHaveProperty("code", "rate_limited");
        expect(body.error).toHaveProperty("message");
        expect(body.error.message).toContain("Rate limit exceeded");
      }
    });

    it("should include rate limit headers in 429 response", async () => {
      // Exhaust limits
      for (let i = 0; i < RATE_LIMITS.perMinute.capacity; i++) {
        await checkRateLimit(mockContext);
      }

      const result = await checkRateLimit(mockContext);

      expect(result.allowed).toBe(false);
      if (!result.allowed) {
        const headers = result.response.headers;

        expect(headers.get("X-RateLimit-Limit")).toBe(
          RATE_LIMITS.perMinute.capacity.toString(),
        );
        expect(headers.get("X-RateLimit-Remaining")).toBe("0");
        expect(headers.get("Retry-After")).toBeDefined();
      }
    });
  });

  describe("Rate Limit Consistency", () => {
    it("should decrement remaining count consistently", async () => {
      const results: number[] = [];

      // Make 10 requests and track remaining counts
      for (let i = 0; i < 10; i++) {
        const result = await checkRateLimit(mockContext);
        if (result.allowed) {
          results.push(result.state.remaining);
        }
      }

      // Each remaining count should be lower than the previous
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeLessThan(results[i - 1]);
      }
    });
  });
});
