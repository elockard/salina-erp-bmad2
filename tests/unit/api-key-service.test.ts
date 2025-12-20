/**
 * API Key Service Unit Tests
 *
 * Story 15.1 - AC1: API Key Generation
 * Story 15.1 - AC6: Secure Storage
 *
 * @vitest-environment node
 */

import bcrypt from "bcryptjs";
import { describe, expect, it } from "vitest";
import {
  generateApiKeyPair,
  verifyApiSecret,
} from "@/modules/api/auth/api-key-service";

describe("API Key Service", () => {
  describe("generateApiKeyPair", () => {
    it("should generate key with sk_live_ prefix for production keys", async () => {
      const result = await generateApiKeyPair(false);

      expect(result.keyId).toMatch(/^sk_live_[a-zA-Z0-9]{20}$/);
      expect(result.plaintextSecret).toHaveLength(40);
      expect(result.secretHash).toMatch(/^\$2[aby]?\$/);
    });

    it("should generate key with sk_test_ prefix for test keys", async () => {
      const result = await generateApiKeyPair(true);

      expect(result.keyId).toMatch(/^sk_test_[a-zA-Z0-9]{20}$/);
    });

    it("should generate unique keys on each call", async () => {
      const results = await Promise.all([
        generateApiKeyPair(false),
        generateApiKeyPair(false),
        generateApiKeyPair(false),
      ]);

      const keyIds = results.map((r) => r.keyId);
      const secrets = results.map((r) => r.plaintextSecret);

      expect(new Set(keyIds).size).toBe(3);
      expect(new Set(secrets).size).toBe(3);
    });

    it("should generate cryptographically random alphanumeric values", async () => {
      const result = await generateApiKeyPair(false);

      // Key ID random part (after prefix)
      const keyIdRandom = result.keyId.replace(/^sk_(live|test)_/, "");
      expect(keyIdRandom).toMatch(/^[a-zA-Z0-9]+$/);

      // Secret should be alphanumeric
      expect(result.plaintextSecret).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it("should hash secret with bcrypt cost factor 12", async () => {
      const result = await generateApiKeyPair(false);

      // Verify it's a valid bcrypt hash
      const isValid = await bcrypt.compare(
        result.plaintextSecret,
        result.secretHash,
      );
      expect(isValid).toBe(true);

      // Check cost factor (bcrypt hash format: $2b$12$...)
      expect(result.secretHash).toMatch(/^\$2[aby]?\$12\$/);
    });
  });

  describe("verifyApiSecret", () => {
    it("should return true for valid secret/hash pair", async () => {
      const { plaintextSecret, secretHash } = await generateApiKeyPair(false);

      const isValid = await verifyApiSecret(plaintextSecret, secretHash);
      expect(isValid).toBe(true);
    });

    it("should return false for invalid secret", async () => {
      const { secretHash } = await generateApiKeyPair(false);

      const isValid = await verifyApiSecret("wrongsecret", secretHash);
      expect(isValid).toBe(false);
    });

    it("should return false for empty secret", async () => {
      const { secretHash } = await generateApiKeyPair(false);

      const isValid = await verifyApiSecret("", secretHash);
      expect(isValid).toBe(false);
    });

    // Note: bcrypt.compare is timing-safe by design, no explicit timing test needed
  });
});
