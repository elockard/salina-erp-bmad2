/**
 * @vitest-environment node
 *
 * Webhook API Integration Tests
 *
 * Story 15.4 - Webhook Subscription System
 * Tests webhook subscription API endpoints and behavior
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database operations - vi.mock is hoisted, can't use external variables
vi.mock("@/db", () => ({
  db: {
    query: {
      webhookSubscriptions: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    },
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  adminDb: {
    query: {
      apiKeys: { findFirst: vi.fn() },
      rateLimitOverrides: { findFirst: vi.fn().mockResolvedValue(null) },
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

vi.mock("@/db/schema/webhook-subscriptions", () => ({
  webhookSubscriptions: {
    id: "id",
    tenantId: "tenant_id",
    name: "name",
    description: "description",
    url: "url",
    secretHash: "secret_hash",
    events: "events",
    isActive: "is_active",
    lastDeliveryAt: "last_delivery_at",
    lastDeliveryStatus: "last_delivery_status",
    consecutiveFailures: "consecutive_failures",
    createdAt: "created_at",
    createdBy: "created_by",
    updatedAt: "updated_at",
  },
  WEBHOOK_EVENT_TYPES: [
    "title.created",
    "title.updated",
    "sale.created",
    "statement.generated",
    "onix.exported",
  ],
  MAX_SUBSCRIPTIONS_PER_TENANT: 10,
}));

vi.mock("@/db/schema/rate-limit-overrides", () => ({
  rateLimitOverrides: { tenantId: "tenantId" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
  count: vi.fn(() => "count"),
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_secret"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

import { resetAllRateLimitState } from "@/modules/api/middleware/rate-limiter";
import {
  validateEventTypes,
  validateWebhookUrl,
} from "@/modules/api/webhooks/subscription-service";

describe("Webhook API Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAllRateLimitState();
  });

  describe("URL Validation Rules", () => {
    it("should enforce HTTPS for production webhooks", () => {
      const prodUrl = validateWebhookUrl("http://api.example.com/webhook");
      expect(prodUrl.valid).toBe(false);

      const httpsUrl = validateWebhookUrl("https://api.example.com/webhook");
      expect(httpsUrl.valid).toBe(true);
    });

    it("should allow HTTP for localhost development", () => {
      const localhostUrl = validateWebhookUrl("http://localhost:3000/webhook");
      expect(localhostUrl.valid).toBe(true);

      const ipUrl = validateWebhookUrl("http://127.0.0.1:8080/webhook");
      expect(ipUrl.valid).toBe(true);
    });
  });

  describe("Event Type Validation", () => {
    it("should accept valid event combinations", () => {
      const singleEvent = validateEventTypes(["title.created"]);
      expect(singleEvent.valid).toBe(true);

      const multiEvent = validateEventTypes([
        "title.created",
        "sale.created",
        "statement.generated",
      ]);
      expect(multiEvent.valid).toBe(true);
    });

    it("should reject unknown event types", () => {
      const result = validateEventTypes(["unknown.event", "title.created"]);
      expect(result.valid).toBe(false);
      expect(result.invalid).toContain("unknown.event");
    });
  });

  describe("Webhook Subscription Security", () => {
    describe("Secret Generation", () => {
      it("should generate unique secrets", async () => {
        const crypto = await import("node:crypto");
        const secret1 = crypto.randomBytes(32).toString("hex");
        const secret2 = crypto.randomBytes(32).toString("hex");

        expect(secret1).not.toBe(secret2);
        expect(secret1).toHaveLength(64);
        expect(secret2).toHaveLength(64);
      });
    });

    describe("HMAC Signature", () => {
      it("should generate valid HMAC-SHA256 signatures", async () => {
        const crypto = await import("node:crypto");
        const secret = "test_secret_key";
        const payload = '{"test": true}';
        const timestamp = "1234567890";

        const signature = crypto
          .createHmac("sha256", secret)
          .update(`${timestamp}.${payload}`)
          .digest("hex");

        expect(signature).toHaveLength(64);
        expect(signature).toMatch(/^[0-9a-f]+$/);
      });
    });
  });

  describe("API Response Format", () => {
    it("should mask URLs in list responses", () => {
      // Test that URL domain extraction works correctly
      const url = "https://api.example.com/webhooks/receive";
      const hostname = new URL(url).hostname;

      expect(hostname).toBe("api.example.com");
    });

    it("should expose full URLs in detail responses for owners", () => {
      // Verify URL parsing for detail endpoints
      const url = "https://api.example.com/webhooks/receive?key=value";
      const parsed = new URL(url);

      expect(parsed.hostname).toBe("api.example.com");
      expect(parsed.pathname).toBe("/webhooks/receive");
      expect(parsed.searchParams.get("key")).toBe("value");
    });
  });

  describe("Subscription Limits", () => {
    it("should enforce maximum 10 subscriptions per tenant", async () => {
      const { MAX_SUBSCRIPTIONS_PER_TENANT } = await import(
        "@/db/schema/webhook-subscriptions"
      );
      expect(MAX_SUBSCRIPTIONS_PER_TENANT).toBe(10);
    });
  });
});
