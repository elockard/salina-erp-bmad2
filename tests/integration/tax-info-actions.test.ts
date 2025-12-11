/**
 * Integration Tests for Tax Information Validation
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.5, AC-11.1.6: Tax Information Validation
 *
 * These tests verify the validation logic without requiring
 * full database integration. Server action tests require
 * full E2E testing with actual database.
 */

import { describe, expect, it } from "vitest";
import { decryptTIN, encryptTIN } from "@/lib/encryption";
import {
  extractLastFour,
  formatEIN,
  formatSSN,
  maskTIN,
  validateEIN,
  validateSSN,
  validateTIN,
} from "@/lib/tin-validation";
import { taxInfoSchema, updateTaxInfoSchema } from "@/modules/contacts/schema";

describe("Tax Information Integration (AC-11.1.5, AC-11.1.6)", () => {
  // Set up encryption key for tests
  const TEST_KEY =
    "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

  describe("End-to-end TIN processing", () => {
    it("validates, formats, and encrypts SSN correctly", () => {
      const rawInput = "123456789";

      // Format the SSN
      const formatted = formatSSN(rawInput);
      expect(formatted).toBe("123-45-6789");

      // Validate the formatted SSN
      expect(validateSSN(formatted)).toBe(true);
      expect(validateTIN(formatted, "ssn")).toBe(true);

      // Extract last 4 for storage
      const lastFour = extractLastFour(formatted);
      expect(lastFour).toBe("6789");

      // Mask for display
      const masked = maskTIN(lastFour, "ssn");
      expect(masked).toBe("***-**-6789");
    });

    it("validates, formats, and encrypts EIN correctly", () => {
      const rawInput = "123456789";

      // Format the EIN
      const formatted = formatEIN(rawInput);
      expect(formatted).toBe("12-3456789");

      // Validate the formatted EIN
      expect(validateEIN(formatted)).toBe(true);
      expect(validateTIN(formatted, "ein")).toBe(true);

      // Extract last 4 for storage
      const lastFour = extractLastFour(formatted);
      expect(lastFour).toBe("6789");

      // Mask for display
      const masked = maskTIN(lastFour, "ein");
      expect(masked).toBe("**-***6789");
    });

    it("encryption roundtrip preserves TIN value", () => {
      // Set encryption key
      process.env.TIN_ENCRYPTION_KEY = TEST_KEY;

      const ssn = "123-45-6789";
      const encrypted = encryptTIN(ssn);
      const decrypted = decryptTIN(encrypted);

      expect(decrypted).toBe(ssn);

      // Clean up
      delete process.env.TIN_ENCRYPTION_KEY;
    });
  });

  describe("Schema validation for tax info", () => {
    it("validates complete SSN tax info", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates complete EIN tax info", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "12-3456789",
        is_us_based: true,
        w9_received: true,
        w9_received_date: new Date(),
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects SSN with EIN format", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "12-3456789", // EIN format
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects EIN with SSN format", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "123-45-6789", // SSN format
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("requires W-9 date when W-9 received is true", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: true,
        // Missing w9_received_date
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("w9_received_date");
      }
    });
  });

  describe("Partial update schema validation", () => {
    it("allows updating only is_us_based", () => {
      const input = {
        is_us_based: false,
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows updating W-9 status with date", () => {
      const input = {
        w9_received: true,
        w9_received_date: new Date(),
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("requires tin_type when providing tin", () => {
      const input = {
        tin: "123-45-6789",
        // Missing tin_type
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("tin_type");
      }
    });

    it("validates TIN format in partial update", () => {
      const validInput = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
      };

      const invalidInput = {
        tin_type: "ssn" as const,
        tin: "12-3456789", // Wrong format
      };

      expect(updateTaxInfoSchema.safeParse(validInput).success).toBe(true);
      expect(updateTaxInfoSchema.safeParse(invalidInput).success).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("handles empty TIN gracefully", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("handles TIN with special characters", () => {
      // Should reject TINs with extra characters
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789!",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("defaults is_us_based to true when not provided", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_us_based).toBe(true);
      }
    });
  });
});
