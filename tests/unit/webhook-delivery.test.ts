/**
 * Webhook Delivery Unit Tests
 *
 * Story 15.5 - FR148/FR149: Webhook delivery with HMAC signatures
 */

import { describe, expect, it } from "vitest";
import {
  deriveSigningKey,
  signWebhookPayload,
  verifyWebhookSignature,
} from "@/modules/api/webhooks/dispatcher";

describe("Webhook Delivery", () => {
  describe("deriveSigningKey", () => {
    it("should derive consistent keys for same subscription ID", () => {
      const subscriptionId = "test-subscription-123";
      const key1 = deriveSigningKey(subscriptionId);
      const key2 = deriveSigningKey(subscriptionId);
      expect(key1).toBe(key2);
    });

    it("should derive different keys for different subscription IDs", () => {
      const key1 = deriveSigningKey("sub-1");
      const key2 = deriveSigningKey("sub-2");
      expect(key1).not.toBe(key2);
    });

    it("should return a hex string", () => {
      const key = deriveSigningKey("test-subscription");
      expect(key).toMatch(/^[a-f0-9]+$/);
      expect(key.length).toBe(64); // SHA256 produces 64 hex chars
    });
  });

  describe("signWebhookPayload", () => {
    const secret = deriveSigningKey("test-subscription");
    const payload = JSON.stringify({ test: "data" });

    it("should generate signature in correct format", () => {
      const timestamp = 1234567890;
      const signature = signWebhookPayload(payload, secret, timestamp);

      expect(signature).toMatch(/^t=\d+,v1=[a-f0-9]+$/);
      expect(signature).toContain("t=1234567890");
    });

    it("should generate consistent signatures for same input", () => {
      const timestamp = 1234567890;
      const sig1 = signWebhookPayload(payload, secret, timestamp);
      const sig2 = signWebhookPayload(payload, secret, timestamp);
      expect(sig1).toBe(sig2);
    });

    it("should generate different signatures for different timestamps", () => {
      const sig1 = signWebhookPayload(payload, secret, 1000);
      const sig2 = signWebhookPayload(payload, secret, 2000);
      expect(sig1).not.toBe(sig2);
    });

    it("should generate different signatures for different payloads", () => {
      const timestamp = 1234567890;
      const sig1 = signWebhookPayload('{"a": 1}', secret, timestamp);
      const sig2 = signWebhookPayload('{"b": 2}', secret, timestamp);
      expect(sig1).not.toBe(sig2);
    });
  });

  describe("verifyWebhookSignature", () => {
    const secret = deriveSigningKey("test-subscription");
    const payload = JSON.stringify({ event: "test.created", data: {} });

    it("should verify valid signature", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(payload, secret, timestamp);

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should reject signature with wrong secret", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(payload, secret, timestamp);

      const wrongSecret = deriveSigningKey("wrong-subscription");
      const isValid = verifyWebhookSignature(payload, signature, wrongSecret);
      expect(isValid).toBe(false);
    });

    it("should reject signature with modified payload", () => {
      const timestamp = Math.floor(Date.now() / 1000);
      const signature = signWebhookPayload(payload, secret, timestamp);

      const modifiedPayload = JSON.stringify({
        event: "test.created",
        data: { modified: true },
      });
      const isValid = verifyWebhookSignature(
        modifiedPayload,
        signature,
        secret,
      );
      expect(isValid).toBe(false);
    });

    it("should reject expired signature (beyond tolerance)", () => {
      // Timestamp from 10 minutes ago (beyond 5 minute default tolerance)
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600;
      const signature = signWebhookPayload(payload, secret, oldTimestamp);

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(false);
    });

    it("should accept signature within tolerance", () => {
      // Timestamp from 4 minutes ago (within 5 minute tolerance)
      const recentTimestamp = Math.floor(Date.now() / 1000) - 240;
      const signature = signWebhookPayload(payload, secret, recentTimestamp);

      const isValid = verifyWebhookSignature(payload, signature, secret);
      expect(isValid).toBe(true);
    });

    it("should reject malformed signature", () => {
      const isValid = verifyWebhookSignature(payload, "invalid", secret);
      expect(isValid).toBe(false);
    });

    it("should reject signature missing timestamp", () => {
      const isValid = verifyWebhookSignature(payload, "v1=abc123", secret);
      expect(isValid).toBe(false);
    });

    it("should reject signature missing version", () => {
      const isValid = verifyWebhookSignature(payload, "t=1234567890", secret);
      expect(isValid).toBe(false);
    });

    it("should respect custom tolerance", () => {
      // Timestamp from 2 minutes ago
      const timestamp = Math.floor(Date.now() / 1000) - 120;
      const signature = signWebhookPayload(payload, secret, timestamp);

      // Should fail with 60 second tolerance
      const isValidStrict = verifyWebhookSignature(
        payload,
        signature,
        secret,
        60,
      );
      expect(isValidStrict).toBe(false);

      // Should pass with 180 second tolerance
      const isValidLenient = verifyWebhookSignature(
        payload,
        signature,
        secret,
        180,
      );
      expect(isValidLenient).toBe(true);
    });
  });
});
