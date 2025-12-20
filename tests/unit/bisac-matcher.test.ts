/**
 * BISAC Matcher Tests
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 *
 * Tests for the BISAC subject code suggestion engine.
 */

import { describe, expect, it } from "vitest";
import {
  getAllBisacCodes,
  getBisacCategories,
  getBisacCode,
  getBisacCodesByCategory,
  isValidBisacCode,
  searchBisacCodes,
  suggestBisacCodes,
} from "@/modules/import-export/bisac";

describe("BISAC Matcher", () => {
  describe("suggestBisacCodes", () => {
    it("returns empty array for empty title", () => {
      const result = suggestBisacCodes({ title: "" });
      expect(result).toEqual([]);
    });

    it("returns empty array for whitespace-only title", () => {
      const result = suggestBisacCodes({ title: "   " });
      expect(result).toEqual([]);
    });

    it("suggests fiction codes for fantasy-related title", () => {
      const result = suggestBisacCodes({
        title: "The Dragon's Quest",
        genre: "Fantasy",
      });

      expect(result.length).toBeGreaterThan(0);
      // Should suggest fantasy-related codes
      const hasFictionCode = result.some((s) => s.code.startsWith("FIC"));
      expect(hasFictionCode).toBe(true);
    });

    it("suggests mystery codes for mystery-related title", () => {
      const result = suggestBisacCodes({
        title: "Murder at the Manor",
        subtitle: "A Detective Novel",
      });

      expect(result.length).toBeGreaterThan(0);
      // Should have fiction codes with mystery matches
      const hasRelevantCode = result.some((s) =>
        s.matchedKeywords.some((k) =>
          ["murder", "detective", "mystery"].includes(k.toLowerCase()),
        ),
      );
      expect(hasRelevantCode).toBe(true);
    });

    it("suggests business codes for business-related title", () => {
      const result = suggestBisacCodes({
        title: "Leadership in the Digital Age",
        genre: "Business",
      });

      expect(result.length).toBeGreaterThan(0);
      const hasBusinessCode = result.some((s) => s.code.startsWith("BUS"));
      expect(hasBusinessCode).toBe(true);
    });

    it("returns max 5 suggestions by default", () => {
      const result = suggestBisacCodes({
        title: "A comprehensive guide to everything",
      });

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("respects custom maxSuggestions parameter", () => {
      const result = suggestBisacCodes(
        { title: "A comprehensive guide to everything" },
        3,
      );

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it("includes confidence scores between 0-100", () => {
      const result = suggestBisacCodes({ title: "Fantasy Magic Adventure" });

      for (const suggestion of result) {
        expect(suggestion.confidence).toBeGreaterThanOrEqual(0);
        expect(suggestion.confidence).toBeLessThanOrEqual(100);
      }
    });

    it("includes matched keywords in suggestions", () => {
      const result = suggestBisacCodes({ title: "Dragon Fantasy Magic" });

      const hasSuggestionWithKeywords = result.some(
        (s) => s.matchedKeywords.length > 0,
      );
      expect(hasSuggestionWithKeywords).toBe(true);
    });

    it("sets correct matchType based on match quality", () => {
      const result = suggestBisacCodes({ title: "Mystery thriller detective" });

      for (const suggestion of result) {
        expect(["exact", "partial", "fuzzy"]).toContain(suggestion.matchType);
      }
    });
  });

  describe("getAllBisacCodes", () => {
    it("returns all BISAC codes", () => {
      const codes = getAllBisacCodes();
      expect(codes.length).toBeGreaterThan(0);
    });

    it("each code has required properties", () => {
      const codes = getAllBisacCodes();
      for (const code of codes.slice(0, 10)) {
        expect(code).toHaveProperty("code");
        expect(code).toHaveProperty("description");
        expect(code).toHaveProperty("keywords");
        expect(code).toHaveProperty("category");
        expect(code).toHaveProperty("depth");
      }
    });
  });

  describe("getBisacCode", () => {
    it("returns code for valid BISAC code", () => {
      const codes = getAllBisacCodes();
      const firstCode = codes[0];
      const result = getBisacCode(firstCode.code);
      expect(result).toEqual(firstCode);
    });

    it("returns undefined for invalid code", () => {
      const result = getBisacCode("INVALID00");
      expect(result).toBeUndefined();
    });
  });

  describe("searchBisacCodes", () => {
    it("returns codes matching query in code", () => {
      const result = searchBisacCodes("FIC");
      expect(result.every((c) => c.code.includes("FIC"))).toBe(true);
    });

    it("returns codes matching query in description", () => {
      const result = searchBisacCodes("Fiction");
      expect(
        result.some((c) => c.description.toLowerCase().includes("fiction")),
      ).toBe(true);
    });

    it("returns limited results", () => {
      const result = searchBisacCodes("a", 5);
      expect(result.length).toBeLessThanOrEqual(5);
    });

    it("returns all codes when query is empty", () => {
      const result = searchBisacCodes("", 10);
      expect(result.length).toBe(10);
    });
  });

  describe("getBisacCodesByCategory", () => {
    it("returns codes for valid category prefix", () => {
      const result = getBisacCodesByCategory("FIC");
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((c) => c.category === "FIC")).toBe(true);
    });

    it("returns empty array for invalid category", () => {
      const result = getBisacCodesByCategory("XXX");
      expect(result).toEqual([]);
    });
  });

  describe("getBisacCategories", () => {
    it("returns unique categories with counts", () => {
      const categories = getBisacCategories();
      expect(categories.length).toBeGreaterThan(0);

      for (const cat of categories) {
        expect(cat).toHaveProperty("prefix");
        expect(cat).toHaveProperty("name");
        expect(cat).toHaveProperty("count");
        expect(cat.count).toBeGreaterThan(0);
      }
    });
  });

  describe("isValidBisacCode", () => {
    it("returns true for valid BISAC code format", () => {
      expect(isValidBisacCode("FIC000000")).toBe(true);
      expect(isValidBisacCode("BIO000000")).toBe(true);
      expect(isValidBisacCode("COM051360")).toBe(true);
    });

    it("returns false for invalid format", () => {
      expect(isValidBisacCode("")).toBe(false);
      expect(isValidBisacCode("FICTION")).toBe(false);
      expect(isValidBisacCode("123456789")).toBe(false);
      expect(isValidBisacCode("FIC00000")).toBe(false); // Too short
      expect(isValidBisacCode("FIC0000000")).toBe(false); // Too long
      expect(isValidBisacCode("fic000000")).toBe(false); // Lowercase
    });
  });
});
