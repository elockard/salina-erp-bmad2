import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  decryptCredentials,
  encryptCredentials,
} from "@/lib/channel-encryption";

/**
 * Unit tests for Channel Credentials Encryption
 *
 * Story 16.1 - AC4: Secure Storage
 * - Credentials encrypted at rest using AES-256-GCM
 * - Missing CHANNEL_CREDENTIALS_KEY throws error
 * - Invalid key length throws error
 * - Encryption/decryption roundtrip works correctly
 */

describe("channel-encryption", () => {
  // Store original env value
  const originalEnv = process.env.CHANNEL_CREDENTIALS_KEY;

  beforeEach(() => {
    // Set a valid 32-byte hex key (64 hex characters)
    process.env.CHANNEL_CREDENTIALS_KEY =
      "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
  });

  afterEach(() => {
    // Restore original env value
    if (originalEnv !== undefined) {
      process.env.CHANNEL_CREDENTIALS_KEY = originalEnv;
    } else {
      delete process.env.CHANNEL_CREDENTIALS_KEY;
    }
  });

  describe("encryptCredentials", () => {
    it("encrypts a string and returns base64 encoded result", () => {
      const plaintext =
        '{"host":"test.com","username":"user","password":"pass"}';
      const encrypted = encryptCredentials(plaintext);

      expect(encrypted).toBeDefined();
      expect(typeof encrypted).toBe("string");
      // Base64 encoded should be different from plaintext
      expect(encrypted).not.toBe(plaintext);
      // Should be valid base64
      expect(() => Buffer.from(encrypted, "base64")).not.toThrow();
    });

    it("produces different ciphertext for same plaintext (due to random IV)", () => {
      const plaintext = '{"host":"test.com"}';
      const encrypted1 = encryptCredentials(plaintext);
      const encrypted2 = encryptCredentials(plaintext);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it("throws error when CHANNEL_CREDENTIALS_KEY is not set", () => {
      delete process.env.CHANNEL_CREDENTIALS_KEY;

      expect(() => encryptCredentials("test")).toThrow(
        "CHANNEL_CREDENTIALS_KEY environment variable is not set",
      );
    });

    it("throws error when CHANNEL_CREDENTIALS_KEY has invalid length", () => {
      // Set a key that's too short (only 32 hex chars = 16 bytes)
      process.env.CHANNEL_CREDENTIALS_KEY = "0123456789abcdef0123456789abcdef";

      expect(() => encryptCredentials("test")).toThrow(
        "CHANNEL_CREDENTIALS_KEY must be 64 hex characters",
      );
    });
  });

  describe("decryptCredentials", () => {
    it("decrypts encrypted content correctly", () => {
      const plaintext =
        '{"host":"ftps.ingramcontent.com","username":"testuser","password":"secret123","port":990}';
      const encrypted = encryptCredentials(plaintext);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("throws error for invalid ciphertext (too short)", () => {
      expect(() => decryptCredentials("dG9vIHNob3J0")).toThrow(
        "Invalid ciphertext: too short",
      );
    });

    it("throws error for tampered ciphertext", () => {
      const plaintext = '{"host":"test.com"}';
      const encrypted = encryptCredentials(plaintext);

      // Tamper with the ciphertext
      const tampered = `${encrypted.slice(0, -5)}XXXXX`;

      expect(() => decryptCredentials(tampered)).toThrow();
    });

    it("throws error when CHANNEL_CREDENTIALS_KEY is not set", () => {
      const encrypted = encryptCredentials("test");
      delete process.env.CHANNEL_CREDENTIALS_KEY;

      expect(() => decryptCredentials(encrypted)).toThrow(
        "CHANNEL_CREDENTIALS_KEY environment variable is not set",
      );
    });

    it("throws error when decrypting with wrong key", () => {
      const plaintext = '{"host":"test.com"}';
      const encrypted = encryptCredentials(plaintext);

      // Change the key
      process.env.CHANNEL_CREDENTIALS_KEY =
        "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

      expect(() => decryptCredentials(encrypted)).toThrow();
    });
  });

  describe("encryption roundtrip", () => {
    it("handles empty credentials object", () => {
      const plaintext = "{}";
      const encrypted = encryptCredentials(plaintext);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles complex credentials with special characters", () => {
      const plaintext = JSON.stringify({
        host: "ftps.example.com",
        username: "user@domain.com",
        password: "P@$$w0rd!#$%^&*()",
        port: 990,
        notes: "Special chars: <>\"'\\n\\t",
      });
      const encrypted = encryptCredentials(plaintext);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles unicode characters", () => {
      const plaintext = JSON.stringify({
        host: "test.com",
        username: "usuario",
        password: "contraseña123",
      });
      const encrypted = encryptCredentials(plaintext);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(plaintext);
    });

    it("handles large credentials payload", () => {
      const plaintext = JSON.stringify({
        host: "test.com",
        username: "user",
        password: "x".repeat(1000), // Long password
        metadata: {
          description: "A".repeat(5000), // Long metadata
        },
      });
      const encrypted = encryptCredentials(plaintext);
      const decrypted = decryptCredentials(encrypted);

      expect(decrypted).toBe(plaintext);
    });
  });
});
