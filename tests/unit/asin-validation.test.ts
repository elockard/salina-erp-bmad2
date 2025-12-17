import { describe, expect, it } from "vitest";
import { asinSchema, isValidAsin } from "@/modules/titles/schema";

/**
 * Unit tests for ASIN validation utilities
 *
 * Story 17.4 - Link Titles to ASINs
 *
 * ASIN Format:
 * - 10 characters, alphanumeric (A-Z, 0-9)
 * - Books often start with "B0" or match ISBN-10
 * - Case-insensitive (stored uppercase)
 *
 * Test ASINs used:
 * - B07VGRJDFY - Valid (common "B0" prefix format)
 * - 0812511816 - Valid (ISBN-10 format)
 * - B0CN6V3NKV - Valid (current format)
 * - b07vgrjdfy - Valid (lowercase, normalizes to uppercase)
 */

describe("isValidAsin", () => {
  describe("valid ASINs", () => {
    it("accepts 10-char alphanumeric with B0 prefix", () => {
      expect(isValidAsin("B07VGRJDFY")).toBe(true);
    });

    it("accepts ISBN-10 format", () => {
      expect(isValidAsin("0812511816")).toBe(true);
    });

    it("accepts mixed letters and numbers", () => {
      expect(isValidAsin("B0CN6V3NKV")).toBe(true);
    });

    it("accepts lowercase (case-insensitive)", () => {
      expect(isValidAsin("b07vgrjdfy")).toBe(true);
    });

    it("accepts all-numeric", () => {
      expect(isValidAsin("1234567890")).toBe(true);
    });

    it("accepts all-uppercase letters", () => {
      expect(isValidAsin("ABCDEFGHIJ")).toBe(true);
    });
  });

  describe("invalid ASINs", () => {
    it("rejects empty string", () => {
      expect(isValidAsin("")).toBe(false);
    });

    it("rejects too short (9 chars)", () => {
      expect(isValidAsin("B07VGRJDF")).toBe(false);
    });

    it("rejects too long (11 chars)", () => {
      expect(isValidAsin("B07VGRJDFYY")).toBe(false);
    });

    it("rejects special characters", () => {
      expect(isValidAsin("B07VGRJ-FY")).toBe(false);
    });

    it("rejects spaces", () => {
      expect(isValidAsin("B07V GRJDF")).toBe(false);
    });

    it("rejects underscores", () => {
      expect(isValidAsin("B07V_GRJDF")).toBe(false);
    });
  });
});

describe("asinSchema", () => {
  describe("valid inputs", () => {
    it("accepts valid 10-char ASIN", () => {
      const result = asinSchema.parse("B07VGRJDFY");
      expect(result).toBe("B07VGRJDFY");
    });

    it("normalizes lowercase to uppercase", () => {
      const result = asinSchema.parse("b07vgrjdfy");
      expect(result).toBe("B07VGRJDFY");
    });

    it("accepts null (optional field)", () => {
      const result = asinSchema.parse(null);
      expect(result).toBe(null);
    });

    it("accepts undefined (optional field)", () => {
      const result = asinSchema.parse(undefined);
      expect(result).toBe(undefined);
    });
  });

  describe("invalid inputs", () => {
    it("rejects too short", () => {
      expect(() => asinSchema.parse("B07VGRJDF")).toThrow(
        "ASIN must be exactly 10 characters",
      );
    });

    it("rejects too long", () => {
      expect(() => asinSchema.parse("B07VGRJDFYY")).toThrow(
        "ASIN must be exactly 10 characters",
      );
    });

    it("rejects non-alphanumeric", () => {
      expect(() => asinSchema.parse("B07VGRJ-FY")).toThrow(
        "ASIN must be alphanumeric",
      );
    });

    it("rejects spaces", () => {
      expect(() => asinSchema.parse("B07V GRJDF")).toThrow();
    });
  });

  describe("edge cases", () => {
    it("handles mixed case normalization", () => {
      const result = asinSchema.parse("AbCdEfGhIj");
      expect(result).toBe("ABCDEFGHIJ");
    });

    it("handles all numeric", () => {
      const result = asinSchema.parse("0123456789");
      expect(result).toBe("0123456789");
    });
  });
});
