import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { decryptTaxId, encryptTaxId, maskTaxId } from "@/lib/encryption";

/**
 * Unit tests for Tax ID encryption utility
 *
 * Story 2.2 - AC 30: Tax ID encrypted before storage using app-level AES-256-GCM
 * Story 2.2 - AC 31: Tax ID decrypted only when displayed to authorized roles
 */

describe("Tax ID Encryption", () => {
  // Valid 32-byte encryption key (64 hex chars)
  const VALID_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  beforeEach(() => {
    // Set up valid encryption key
    vi.stubEnv("ENCRYPTION_KEY", VALID_KEY);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("encryptTaxId", () => {
    it("encrypts tax ID and returns base64 format iv:authTag:ciphertext", () => {
      const plainText = "123-45-6789";
      const encrypted = encryptTaxId(plainText);

      // Should have 3 parts separated by colons
      const parts = encrypted.split(":");
      expect(parts).toHaveLength(3);

      // Each part should be base64 encoded
      for (const part of parts) {
        expect(part).toMatch(/^[A-Za-z0-9+/]+=*$/);
      }

      // Encrypted value should be different from plain text
      expect(encrypted).not.toBe(plainText);
      expect(encrypted).not.toContain(plainText);
    });

    it("produces different ciphertext for same input (due to random IV)", () => {
      const plainText = "123-45-6789";
      const encrypted1 = encryptTaxId(plainText);
      const encrypted2 = encryptTaxId(plainText);

      // Random IV means each encryption produces different output
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe("decryptTaxId", () => {
    it("decrypts encrypted tax ID back to original", () => {
      const originalTaxId = "123-45-6789";
      const encrypted = encryptTaxId(originalTaxId);
      const decrypted = decryptTaxId(encrypted);

      expect(decrypted).toBe(originalTaxId);
    });

    it("handles various tax ID formats", () => {
      const testCases = [
        "123-45-6789", // SSN format
        "12-3456789", // EIN format
        "123456789", // No dashes
        "AB-1234567", // International format
        "Special !@# Characters", // Special chars
      ];

      for (const taxId of testCases) {
        const encrypted = encryptTaxId(taxId);
        const decrypted = decryptTaxId(encrypted);
        expect(decrypted).toBe(taxId);
      }
    });

    it("throws error for invalid format", () => {
      expect(() => decryptTaxId("invalid-format")).toThrow(
        "Invalid encrypted data format"
      );
    });

    it("throws error for tampered ciphertext", () => {
      const encrypted = encryptTaxId("123-45-6789");
      const parts = encrypted.split(":");

      // Tamper with the ciphertext
      const tamperedParts = [parts[0], parts[1], `tampered${parts[2]}`];
      const tampered = tamperedParts.join(":");

      // Should throw during decryption due to auth tag mismatch
      expect(() => decryptTaxId(tampered)).toThrow();
    });
  });

  describe("encrypt/decrypt round-trip", () => {
    it("maintains data integrity through encryption cycle", () => {
      const taxIds = [
        "123-45-6789",
        "98-7654321",
        "000-00-0000",
        "999-99-9999",
      ];

      for (const taxId of taxIds) {
        const encrypted = encryptTaxId(taxId);
        const decrypted = decryptTaxId(encrypted);
        expect(decrypted).toBe(taxId);
      }
    });

    it("handles empty string", () => {
      const encrypted = encryptTaxId("");
      const decrypted = decryptTaxId(encrypted);
      expect(decrypted).toBe("");
    });

    it("handles unicode characters", () => {
      const taxId = "税号-12345-日本";
      const encrypted = encryptTaxId(taxId);
      const decrypted = decryptTaxId(encrypted);
      expect(decrypted).toBe(taxId);
    });
  });

  describe("error handling", () => {
    it("throws error when ENCRYPTION_KEY is not set", () => {
      vi.stubEnv("ENCRYPTION_KEY", "");

      expect(() => encryptTaxId("123-45-6789")).toThrow(
        "ENCRYPTION_KEY environment variable is not set"
      );
    });

    it("throws error when ENCRYPTION_KEY is invalid length", () => {
      vi.stubEnv("ENCRYPTION_KEY", "tooshort");

      expect(() => encryptTaxId("123-45-6789")).toThrow(
        "ENCRYPTION_KEY must be 64 hex characters"
      );
    });
  });
});

describe("maskTaxId", () => {
  it("masks tax ID showing only last 4 digits", () => {
    expect(maskTaxId("123-45-6789")).toBe("***-**-6789");
    expect(maskTaxId("987654321")).toBe("***-**-4321");
  });

  it("handles short tax IDs", () => {
    expect(maskTaxId("123")).toBe("****");
    expect(maskTaxId("1234")).toBe("***-**-1234");
  });

  it("handles empty/null tax ID", () => {
    expect(maskTaxId("")).toBe("****");
    expect(maskTaxId(null as unknown as string)).toBe("****");
  });
});
