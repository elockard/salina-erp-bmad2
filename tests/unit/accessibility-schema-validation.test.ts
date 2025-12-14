/**
 * Unit tests for Accessibility Zod Schema Validation
 *
 * Story 14.3 - AC1, AC2, AC3: Accessibility metadata validation
 * Task 2.5: Write schema validation tests
 */

import { describe, expect, it } from "vitest";
import {
  accessibilitySchema,
  HAZARD_CONFLICTS,
  VALID_CONFORMANCE,
  VALID_FEATURES,
  VALID_HAZARDS,
} from "@/modules/titles/schema";

describe("accessibilitySchema", () => {
  describe("epub_accessibility_conformance", () => {
    it("accepts all valid conformance codes (00-11)", () => {
      for (const code of VALID_CONFORMANCE) {
        const result = accessibilitySchema.safeParse({
          epub_accessibility_conformance: code,
        });
        expect(result.success, `Expected ${code} to be valid`).toBe(true);
      }
    });

    it("accepts null for conformance", () => {
      const result = accessibilitySchema.safeParse({
        epub_accessibility_conformance: null,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid conformance codes", () => {
      const invalidCodes = ["12", "99", "AA", "", "invalid"];
      for (const code of invalidCodes) {
        const result = accessibilitySchema.safeParse({
          epub_accessibility_conformance: code,
        });
        expect(result.success, `Expected ${code} to be invalid`).toBe(false);
      }
    });
  });

  describe("accessibility_features", () => {
    it("accepts all valid feature codes (10-26)", () => {
      for (const code of VALID_FEATURES) {
        const result = accessibilitySchema.safeParse({
          accessibility_features: [code],
        });
        expect(result.success, `Expected ${code} to be valid`).toBe(true);
      }
    });

    it("accepts multiple valid features", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_features: ["10", "14", "22", "25"],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessibility_features).toEqual([
          "10",
          "14",
          "22",
          "25",
        ]);
      }
    });

    it("accepts empty array", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_features: [],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid feature codes", () => {
      const invalidCodes = ["09", "23", "27", "00", "99"];
      for (const code of invalidCodes) {
        const result = accessibilitySchema.safeParse({
          accessibility_features: [code],
        });
        expect(result.success, `Expected ${code} to be invalid`).toBe(false);
      }
    });

    it("rejects array with mix of valid and invalid codes", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_features: ["10", "invalid", "14"],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("accessibility_hazards", () => {
    it("accepts all valid hazard codes (00-07)", () => {
      // Test each individually (some can't coexist)
      for (const code of VALID_HAZARDS) {
        const result = accessibilitySchema.safeParse({
          accessibility_hazards: [code],
        });
        expect(result.success, `Expected ${code} to be valid`).toBe(true);
      }
    });

    it("accepts empty array", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: [],
      });
      expect(result.success).toBe(true);
    });

    it("accepts non-conflicting hazard combinations", () => {
      // "05" (no flashing) + "06" (no motion) + "07" (no sound) are all compatible
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["05", "06", "07"],
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid hazard codes", () => {
      const invalidCodes = ["08", "09", "99", "invalid"];
      for (const code of invalidCodes) {
        const result = accessibilitySchema.safeParse({
          accessibility_hazards: [code],
        });
        expect(result.success, `Expected ${code} to be invalid`).toBe(false);
      }
    });
  });

  describe("hazard mutual exclusivity", () => {
    it("rejects flashing hazard with no flashing hazard (02 + 05)", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["02", "05"],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("Conflicting");
      }
    });

    it("rejects motion hazard with no motion hazard (03 + 06)", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["03", "06"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects sound hazard with no sound hazard (04 + 07)", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["04", "07"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects no hazards with specific hazard (01 + 02)", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["01", "02"],
      });
      expect(result.success).toBe(false);
    });

    it("rejects unknown with any other code (00 + 01)", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_hazards: ["00", "01"],
      });
      expect(result.success).toBe(false);
    });

    it("HAZARD_CONFLICTS covers all documented conflicts", () => {
      // Verify conflict map is complete
      expect(HAZARD_CONFLICTS["00"]).toContain("01");
      expect(HAZARD_CONFLICTS["01"]).toContain("02");
      expect(HAZARD_CONFLICTS["02"]).toContain("05");
      expect(HAZARD_CONFLICTS["03"]).toContain("06");
      expect(HAZARD_CONFLICTS["04"]).toContain("07");
    });
  });

  describe("accessibility_summary", () => {
    it("accepts valid summary string", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_summary: "EPUB Accessibility 1.1 + WCAG 2.1 AA compliant",
      });
      expect(result.success).toBe(true);
    });

    it("accepts null for summary", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_summary: null,
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty string for summary", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_summary: "",
      });
      expect(result.success).toBe(true);
    });

    it("rejects summary exceeding 1000 characters", () => {
      const result = accessibilitySchema.safeParse({
        accessibility_summary: "A".repeat(1001),
      });
      expect(result.success).toBe(false);
    });
  });

  describe("complete accessibility input", () => {
    it("accepts valid complete input", () => {
      const result = accessibilitySchema.safeParse({
        epub_accessibility_conformance: "07",
        accessibility_features: ["10", "14", "22"],
        accessibility_hazards: ["05", "06", "07"],
        accessibility_summary:
          "EPUB Accessibility 1.1 compliant with WCAG 2.1 Level AA",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.epub_accessibility_conformance).toBe("07");
        expect(result.data.accessibility_features).toEqual(["10", "14", "22"]);
        expect(result.data.accessibility_hazards).toEqual(["05", "06", "07"]);
        expect(result.data.accessibility_summary).toBe(
          "EPUB Accessibility 1.1 compliant with WCAG 2.1 Level AA",
        );
      }
    });

    it("accepts empty/default input", () => {
      const result = accessibilitySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial input", () => {
      const result = accessibilitySchema.safeParse({
        epub_accessibility_conformance: "04",
      });
      expect(result.success).toBe(true);
    });
  });
});
