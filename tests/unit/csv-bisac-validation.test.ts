/**
 * CSV BISAC Validation Tests
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 * Task 11: Write tests for BISAC in CSV import
 *
 * Tests:
 * - BISAC code validation in CSV rows
 * - BISAC suggestion generation for CSV rows
 * - Accept/override BISAC suggestions
 */

import { describe, expect, it } from "vitest";
import {
  BISAC_CODE_REGEX,
  isValidBisacCode,
  searchBisacCodes,
  suggestBisacCodes,
} from "@/modules/import-export/bisac";

describe("CSV BISAC Validation", () => {
  describe("BISAC code format validation", () => {
    it("validates correct BISAC code format", () => {
      expect(isValidBisacCode("FIC000000")).toBe(true);
      expect(isValidBisacCode("BIO000000")).toBe(true);
      expect(isValidBisacCode("COM051360")).toBe(true);
      expect(isValidBisacCode("HIS000000")).toBe(true);
    });

    it("rejects invalid BISAC code formats", () => {
      expect(isValidBisacCode("")).toBe(false);
      expect(isValidBisacCode("FIC00000")).toBe(false); // Too short
      expect(isValidBisacCode("FIC0000000")).toBe(false); // Too long
      expect(isValidBisacCode("fic000000")).toBe(false); // Lowercase
      expect(isValidBisacCode("123000000")).toBe(false); // Starts with digits
      expect(isValidBisacCode("FIC-00000")).toBe(false); // Contains dash
    });

    it("BISAC_CODE_REGEX matches valid codes", () => {
      expect(BISAC_CODE_REGEX.test("FIC000000")).toBe(true);
      expect(BISAC_CODE_REGEX.test("BIO123456")).toBe(true);
      expect(BISAC_CODE_REGEX.test("invalid")).toBe(false);
    });
  });

  describe("BISAC code suggestions", () => {
    it("generates suggestions for mystery titles", () => {
      const suggestions = suggestBisacCodes({
        title: "The Mystery of the Missing Cat",
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0].confidence).toBeGreaterThan(0);
      expect(suggestions[0].code).toMatch(BISAC_CODE_REGEX);
    });

    it("generates suggestions for fiction titles", () => {
      const suggestions = suggestBisacCodes({
        title: "A Novel About Love",
        genre: "Fiction",
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.code.startsWith("FIC"))).toBe(true);
    });

    it("returns empty array for empty title", () => {
      const suggestions = suggestBisacCodes({ title: "" });
      expect(suggestions).toEqual([]);
    });

    it("includes confidence scores", () => {
      const suggestions = suggestBisacCodes({
        title: "Science Fiction Adventure",
        genre: "Science Fiction",
      });

      expect(suggestions.length).toBeGreaterThan(0);
      for (const suggestion of suggestions) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("includes matched keywords", () => {
      const suggestions = suggestBisacCodes({
        title: "Historical Fiction Novel",
      });

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions.some((s) => s.matchedKeywords.length > 0)).toBe(true);
    });
  });

  describe("BISAC code search", () => {
    it("searches by code prefix", () => {
      const results = searchBisacCodes("FIC", 10);

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.code.startsWith("FIC"))).toBe(true);
    });

    it("searches by description", () => {
      const results = searchBisacCodes("mystery", 10);

      expect(results.length).toBeGreaterThan(0);
      expect(
        results.some(
          (r) =>
            r.description.toLowerCase().includes("mystery") ||
            r.code.includes("022"),
        ),
      ).toBe(true);
    });

    it("returns limited results", () => {
      const results = searchBisacCodes("fiction", 3);
      expect(results.length).toBeLessThanOrEqual(3);
    });

    it("returns empty array for no matches", () => {
      const results = searchBisacCodes("xyznonexistent123", 10);
      expect(results).toEqual([]);
    });

    it("handles empty query", () => {
      const results = searchBisacCodes("", 10);
      expect(results).toEqual([]);
    });
  });

  describe("BISAC in CSV row validation", () => {
    it("validates row with valid BISAC code", () => {
      const csvRow = {
        title: "Test Book",
        author_name: "Test Author",
        isbn: "9780123456789",
        bisac_code: "FIC000000",
      };

      // BISAC code format is valid
      expect(isValidBisacCode(csvRow.bisac_code)).toBe(true);
    });

    it("flags row with invalid BISAC code", () => {
      const csvRow = {
        title: "Test Book",
        bisac_code: "INVALID",
      };

      expect(isValidBisacCode(csvRow.bisac_code)).toBe(false);
    });

    it("handles missing BISAC code gracefully", () => {
      const csvRow = {
        title: "Test Book",
        bisac_code: undefined,
      };

      expect(isValidBisacCode(csvRow.bisac_code || "")).toBe(false);
    });
  });
});
