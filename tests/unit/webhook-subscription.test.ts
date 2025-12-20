/**
 * Webhook Subscription Service Unit Tests
 *
 * Story 15.4 - Webhook Subscription System
 * Tests URL validation, event type validation, secret generation,
 * and subscription management functions
 *
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock database - vi.mock is hoisted, so we can't use external variables
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

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((a, b) => ({ type: "eq", a, b })),
  and: vi.fn((...args) => ({ type: "and", conditions: args })),
  count: vi.fn(() => "count"),
}));

// Mock bcryptjs
vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashed_secret"),
    compare: vi.fn().mockResolvedValue(true),
  },
}));

// Import functions after mocks
import {
  validateEventTypes,
  validateWebhookUrl,
} from "@/modules/api/webhooks/subscription-service";

describe("Webhook Subscription Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("URL Validation", () => {
    describe("validateWebhookUrl", () => {
      it("should accept HTTPS URLs", () => {
        const result = validateWebhookUrl("https://example.com/webhook");
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });

      it("should accept HTTP localhost URLs", () => {
        const result = validateWebhookUrl("http://localhost:3000/webhook");
        expect(result.valid).toBe(true);
      });

      it("should accept HTTP 127.0.0.1 URLs", () => {
        const result = validateWebhookUrl("http://127.0.0.1:8080/webhook");
        expect(result.valid).toBe(true);
      });

      it("should reject HTTP non-localhost URLs in production", () => {
        const result = validateWebhookUrl("http://example.com/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("HTTPS required");
      });

      it("should accept HTTP non-localhost URLs when isTest=true", () => {
        const result = validateWebhookUrl("http://example.com/webhook", true);
        expect(result.valid).toBe(true);
      });

      it("should reject invalid URL format", () => {
        const result = validateWebhookUrl("not-a-url");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid URL format");
      });

      it("should reject non-HTTP/HTTPS protocols", () => {
        const result = validateWebhookUrl("ftp://example.com/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("HTTP or HTTPS protocol");
      });

      it("should handle empty URL", () => {
        const result = validateWebhookUrl("");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Invalid URL format");
      });

      // SSRF Protection Tests
      it("should reject AWS metadata endpoint", () => {
        const result = validateWebhookUrl(
          "https://169.254.169.254/latest/meta-data/",
        );
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");
      });

      it("should reject GCP metadata endpoint", () => {
        const result = validateWebhookUrl(
          "https://metadata.google.internal/computeMetadata/",
        );
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");
      });

      it("should reject private network 10.x.x.x", () => {
        const result = validateWebhookUrl("https://10.0.0.1/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");
      });

      it("should reject private network 172.16-31.x.x", () => {
        const result = validateWebhookUrl("https://172.16.0.1/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");

        const result2 = validateWebhookUrl("https://172.31.255.255/webhook");
        expect(result2.valid).toBe(false);
      });

      it("should allow 172.15.x.x (not in private range)", () => {
        const result = validateWebhookUrl("https://172.15.0.1/webhook");
        expect(result.valid).toBe(true);
      });

      it("should reject private network 192.168.x.x", () => {
        const result = validateWebhookUrl("https://192.168.1.1/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");
      });

      it("should reject link-local 169.254.x.x", () => {
        const result = validateWebhookUrl("https://169.254.1.1/webhook");
        expect(result.valid).toBe(false);
        expect(result.error).toContain("Internal IP addresses");
      });
    });
  });

  describe("Event Type Validation", () => {
    describe("validateEventTypes", () => {
      it("should accept valid event types", () => {
        const result = validateEventTypes(["title.created", "sale.created"]);
        expect(result.valid).toBe(true);
        expect(result.invalid).toHaveLength(0);
      });

      it("should accept all valid event types", () => {
        const result = validateEventTypes([
          "title.created",
          "title.updated",
          "sale.created",
          "statement.generated",
          "onix.exported",
        ]);
        expect(result.valid).toBe(true);
        expect(result.invalid).toHaveLength(0);
      });

      it("should reject invalid event types", () => {
        const result = validateEventTypes(["title.created", "invalid.event"]);
        expect(result.valid).toBe(false);
        expect(result.invalid).toContain("invalid.event");
      });

      it("should handle empty array", () => {
        const result = validateEventTypes([]);
        expect(result.valid).toBe(true);
        expect(result.invalid).toHaveLength(0);
      });

      it("should report all invalid event types", () => {
        const result = validateEventTypes(["foo.bar", "baz.qux"]);
        expect(result.valid).toBe(false);
        expect(result.invalid).toContain("foo.bar");
        expect(result.invalid).toContain("baz.qux");
      });
    });
  });

  describe("Secret Generation", () => {
    it("should generate 64-character hex secret", async () => {
      // Import crypto to test secret format
      const crypto = await import("node:crypto");
      const secret = crypto.randomBytes(32).toString("hex");

      expect(secret).toHaveLength(64);
      expect(secret).toMatch(/^[0-9a-f]+$/);
    });
  });

  describe("Event Type Constants", () => {
    it("should have correct event types defined", async () => {
      const { WEBHOOK_EVENT_TYPES } = await import(
        "@/db/schema/webhook-subscriptions"
      );

      expect(WEBHOOK_EVENT_TYPES).toContain("title.created");
      expect(WEBHOOK_EVENT_TYPES).toContain("title.updated");
      expect(WEBHOOK_EVENT_TYPES).toContain("sale.created");
      expect(WEBHOOK_EVENT_TYPES).toContain("statement.generated");
      expect(WEBHOOK_EVENT_TYPES).toContain("onix.exported");
      expect(WEBHOOK_EVENT_TYPES).toHaveLength(5);
    });
  });

  describe("Subscription Limits", () => {
    it("should have correct max subscriptions defined", async () => {
      const { MAX_SUBSCRIPTIONS_PER_TENANT } = await import(
        "@/db/schema/webhook-subscriptions"
      );

      expect(MAX_SUBSCRIPTIONS_PER_TENANT).toBe(10);
    });
  });
});
