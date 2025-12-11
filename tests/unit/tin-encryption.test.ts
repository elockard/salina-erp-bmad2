/**
 * Unit tests for TIN Encryption Utilities
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.4: TIN Encryption and Security
 *
 * Tests verify:
 * - AES-256-GCM encryption implementation
 * - Encrypt/decrypt roundtrip integrity
 * - Proper handling of encryption key
 * - Error handling for missing key
 * - Base64 encoding of ciphertext
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock process.env before importing the module
const originalEnv = process.env;

describe("TIN Encryption Utilities (AC-11.1.4)", () => {
  // Valid 32-byte hex key for testing (64 hex characters = 32 bytes)
  const TEST_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv, TIN_ENCRYPTION_KEY: TEST_KEY };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe("encryptTIN", () => {
    it("encrypts a SSN value", async () => {
      const { encryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext = encryptTIN(plaintext);

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe("string");
      expect(ciphertext).not.toBe(plaintext);
    });

    it("encrypts an EIN value", async () => {
      const { encryptTIN } = await import("@/lib/encryption");
      const plaintext = "12-3456789";

      const ciphertext = encryptTIN(plaintext);

      expect(ciphertext).toBeDefined();
      expect(typeof ciphertext).toBe("string");
      expect(ciphertext).not.toBe(plaintext);
    });

    it("returns base64-encoded ciphertext", async () => {
      const { encryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext = encryptTIN(plaintext);

      // Base64 regex pattern
      const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
      expect(ciphertext).toMatch(base64Pattern);
    });

    it("produces different ciphertext for same plaintext (random IV)", async () => {
      const { encryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext1 = encryptTIN(plaintext);
      const ciphertext2 = encryptTIN(plaintext);

      expect(ciphertext1).not.toBe(ciphertext2);
    });

    it("throws error when encryption key is not set", async () => {
      process.env = { ...originalEnv };
      delete process.env.TIN_ENCRYPTION_KEY;

      vi.resetModules();
      const { encryptTIN } = await import("@/lib/encryption");

      expect(() => encryptTIN("123-45-6789")).toThrow(
        "TIN_ENCRYPTION_KEY environment variable is not set",
      );
    });

    it("throws error when encryption key is invalid length", async () => {
      process.env = { ...originalEnv, TIN_ENCRYPTION_KEY: "tooshort" };

      vi.resetModules();
      const { encryptTIN } = await import("@/lib/encryption");

      expect(() => encryptTIN("123-45-6789")).toThrow();
    });
  });

  describe("decryptTIN", () => {
    it("decrypts an encrypted SSN value", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext = encryptTIN(plaintext);
      const decrypted = decryptTIN(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("decrypts an encrypted EIN value", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const plaintext = "12-3456789";

      const ciphertext = encryptTIN(plaintext);
      const decrypted = decryptTIN(ciphertext);

      expect(decrypted).toBe(plaintext);
    });

    it("throws error when encryption key is not set", async () => {
      // First encrypt with valid key
      const { encryptTIN } = await import("@/lib/encryption");
      const ciphertext = encryptTIN("123-45-6789");

      // Now try to decrypt without key
      process.env = { ...originalEnv };
      delete process.env.TIN_ENCRYPTION_KEY;

      vi.resetModules();
      const { decryptTIN } = await import("@/lib/encryption");

      expect(() => decryptTIN(ciphertext)).toThrow(
        "TIN_ENCRYPTION_KEY environment variable is not set",
      );
    });

    it("throws error for tampered ciphertext", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext = encryptTIN(plaintext);
      // Tamper with the ciphertext
      const tamperedCiphertext = `${ciphertext.slice(0, -4)}XXXX`;

      expect(() => decryptTIN(tamperedCiphertext)).toThrow();
    });

    it("throws error for invalid base64 input", async () => {
      const { decryptTIN } = await import("@/lib/encryption");

      expect(() => decryptTIN("not-valid-base64!!!")).toThrow();
    });
  });

  describe("encrypt/decrypt roundtrip", () => {
    it("preserves various SSN formats", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const testCases = [
        "123-45-6789",
        "000-00-0000",
        "999-99-9999",
        "111-22-3333",
      ];

      for (const ssn of testCases) {
        const ciphertext = encryptTIN(ssn);
        const decrypted = decryptTIN(ciphertext);
        expect(decrypted).toBe(ssn);
      }
    });

    it("preserves various EIN formats", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const testCases = [
        "12-3456789",
        "00-0000000",
        "99-9999999",
        "11-2233344",
      ];

      for (const ein of testCases) {
        const ciphertext = encryptTIN(ein);
        const decrypted = decryptTIN(ciphertext);
        expect(decrypted).toBe(ein);
      }
    });

    it("preserves special characters and whitespace", async () => {
      const { encryptTIN, decryptTIN } = await import("@/lib/encryption");
      const testCases = ["123-45-6789", "123 45 6789", "123456789"];

      for (const tin of testCases) {
        const ciphertext = encryptTIN(tin);
        const decrypted = decryptTIN(ciphertext);
        expect(decrypted).toBe(tin);
      }
    });
  });

  describe("ciphertext structure", () => {
    it("ciphertext decodes to IV + encrypted + authTag", async () => {
      const { encryptTIN } = await import("@/lib/encryption");
      const plaintext = "123-45-6789";

      const ciphertext = encryptTIN(plaintext);
      const decoded = Buffer.from(ciphertext, "base64");

      // IV (16 bytes) + encrypted data (at least 1 byte) + authTag (16 bytes)
      expect(decoded.length).toBeGreaterThanOrEqual(33);

      // IV should be 16 bytes
      const iv = decoded.subarray(0, 16);
      expect(iv.length).toBe(16);

      // Auth tag should be last 16 bytes
      const authTag = decoded.subarray(-16);
      expect(authTag.length).toBe(16);
    });
  });
});
