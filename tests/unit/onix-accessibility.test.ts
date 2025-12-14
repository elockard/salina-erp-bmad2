/**
 * Unit tests for ONIX Accessibility Builder
 *
 * Story 14.3 - AC4: ONIX XML includes ProductFormFeature elements for accessibility
 * Task 3.5: Write unit tests for accessibility XML generation
 */

import { describe, expect, it } from "vitest";
import {
  type AccessibilityMetadata,
  buildAccessibilityFeatures,
  CONFORMANCE_DESCRIPTIONS,
  hasAccessibilityMetadata,
} from "@/modules/onix/builder/accessibility";

describe("buildAccessibilityFeatures", () => {
  describe("conformance level generation", () => {
    it("generates ProductFormFeature for conformance with Type 09", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: "07",
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toContain(
        "<ProductFormFeatureType>09</ProductFormFeatureType>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>07</ProductFormFeatureValue>",
      );
    });

    it("includes default description for conformance", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: "07",
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toContain("<ProductFormFeatureDescription>");
      expect(xml).toContain(CONFORMANCE_DESCRIPTIONS["07"]);
    });

    it("uses custom summary as description when provided", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: "07",
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: "Custom accessibility statement for this ebook",
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toContain(
        "<ProductFormFeatureDescription>Custom accessibility statement for this ebook</ProductFormFeatureDescription>",
      );
      expect(xml).not.toContain(CONFORMANCE_DESCRIPTIONS["07"]);
    });

    it("generates conformance for all valid codes (00-11)", () => {
      const validCodes = [
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
      ];

      for (const code of validCodes) {
        const metadata: AccessibilityMetadata = {
          epub_accessibility_conformance: code,
          accessibility_features: null,
          accessibility_hazards: null,
          accessibility_summary: null,
        };

        const xml = buildAccessibilityFeatures(metadata);
        expect(xml).toContain(
          `<ProductFormFeatureValue>${code}</ProductFormFeatureValue>`,
        );
      }
    });
  });

  describe("accessibility features generation", () => {
    it("generates ProductFormFeature for each feature with Type 09", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: ["10", "14", "22"],
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      // Should have three separate ProductFormFeature elements
      expect(xml.match(/<ProductFormFeature>/g)?.length).toBe(3);
      expect(xml).toContain(
        "<ProductFormFeatureValue>10</ProductFormFeatureValue>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>14</ProductFormFeatureValue>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>22</ProductFormFeatureValue>",
      );
    });

    it("does not include description for feature elements", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: ["10"],
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      // Feature elements don't have descriptions
      expect(xml).not.toContain("<ProductFormFeatureDescription>");
    });

    it("handles empty features array", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: [],
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toBe("");
    });
  });

  describe("accessibility hazards generation", () => {
    it("generates ProductFormFeature for hazards with Type 12", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: null,
        accessibility_hazards: ["05", "06", "07"],
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toContain(
        "<ProductFormFeatureType>12</ProductFormFeatureType>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>05</ProductFormFeatureValue>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>06</ProductFormFeatureValue>",
      );
      expect(xml).toContain(
        "<ProductFormFeatureValue>07</ProductFormFeatureValue>",
      );
    });

    it("uses Type 12 for hazards, not Type 09", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: null,
        accessibility_hazards: ["01"],
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);
      const lines = xml.split("\n");

      // Find the line with hazard value
      const valueIndex = lines.findIndex((l) =>
        l.includes("<ProductFormFeatureValue>01"),
      );
      // The type line should be just before it and contain 12
      expect(lines[valueIndex - 1]).toContain(
        "<ProductFormFeatureType>12</ProductFormFeatureType>",
      );
    });
  });

  describe("complete accessibility metadata", () => {
    it("generates all elements in correct order", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: "07",
        accessibility_features: ["10", "14"],
        accessibility_hazards: ["05", "06"],
        accessibility_summary: "Full accessibility compliance",
      };

      const xml = buildAccessibilityFeatures(metadata);

      // Should have 5 ProductFormFeature elements total
      expect(xml.match(/<ProductFormFeature>/g)?.length).toBe(5);

      // Order should be: conformance (1), features (2), hazards (2)
      const type09Matches = [
        ...xml.matchAll(
          /<ProductFormFeatureType>09<\/ProductFormFeatureType>/g,
        ),
      ];
      const type12Matches = [
        ...xml.matchAll(
          /<ProductFormFeatureType>12<\/ProductFormFeatureType>/g,
        ),
      ];

      expect(type09Matches.length).toBe(3); // 1 conformance + 2 features
      expect(type12Matches.length).toBe(2); // 2 hazards
    });

    it("escapes XML special characters in summary", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: "07",
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: "WCAG 2.1 AA & MathML support <for math>",
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toContain("&amp;");
      expect(xml).toContain("&lt;for math&gt;");
      expect(xml).not.toContain("& ");
      expect(xml).not.toContain("<for");
    });
  });

  describe("empty/null handling", () => {
    it("returns empty string for completely empty metadata", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toBe("");
    });

    it("returns empty string for empty arrays", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: [],
        accessibility_hazards: [],
        accessibility_summary: null,
      };

      const xml = buildAccessibilityFeatures(metadata);

      expect(xml).toBe("");
    });

    it("handles only summary without conformance (no output)", () => {
      const metadata: AccessibilityMetadata = {
        epub_accessibility_conformance: null,
        accessibility_features: null,
        accessibility_hazards: null,
        accessibility_summary: "Some summary",
      };

      const xml = buildAccessibilityFeatures(metadata);

      // Summary alone doesn't generate output - needs conformance
      expect(xml).toBe("");
    });
  });
});

describe("hasAccessibilityMetadata", () => {
  it("returns true when conformance is set", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: "07",
      accessibility_features: null,
      accessibility_hazards: null,
      accessibility_summary: null,
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(true);
  });

  it("returns true when features are set", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: null,
      accessibility_features: ["10"],
      accessibility_hazards: null,
      accessibility_summary: null,
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(true);
  });

  it("returns true when hazards are set", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: null,
      accessibility_features: null,
      accessibility_hazards: ["01"],
      accessibility_summary: null,
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(true);
  });

  it("returns true when summary is set", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: null,
      accessibility_features: null,
      accessibility_hazards: null,
      accessibility_summary: "Some summary",
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(true);
  });

  it("returns false when all fields are null/empty", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: null,
      accessibility_features: null,
      accessibility_hazards: null,
      accessibility_summary: null,
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(false);
  });

  it("returns false for empty arrays", () => {
    const metadata: AccessibilityMetadata = {
      epub_accessibility_conformance: null,
      accessibility_features: [],
      accessibility_hazards: [],
      accessibility_summary: null,
    };

    expect(hasAccessibilityMetadata(metadata)).toBe(false);
  });
});

describe("CONFORMANCE_DESCRIPTIONS", () => {
  it("has descriptions for all valid codes (00-11)", () => {
    const expectedCodes = [
      "00",
      "01",
      "02",
      "03",
      "04",
      "05",
      "06",
      "07",
      "08",
      "09",
      "10",
      "11",
    ];

    for (const code of expectedCodes) {
      expect(CONFORMANCE_DESCRIPTIONS[code]).toBeDefined();
      expect(CONFORMANCE_DESCRIPTIONS[code].length).toBeGreaterThan(0);
    }
  });

  it("includes EPUB Accessibility version in descriptions", () => {
    expect(CONFORMANCE_DESCRIPTIONS["02"]).toContain("EPUB Accessibility 1.0");
    expect(CONFORMANCE_DESCRIPTIONS["06"]).toContain("EPUB Accessibility 1.1");
    expect(CONFORMANCE_DESCRIPTIONS["09"]).toContain("EPUB Accessibility 1.1");
  });

  it("includes WCAG level in descriptions where applicable", () => {
    expect(CONFORMANCE_DESCRIPTIONS["04"]).toContain("WCAG 2.0 Level AA");
    expect(CONFORMANCE_DESCRIPTIONS["07"]).toContain("WCAG 2.1 Level AA");
    expect(CONFORMANCE_DESCRIPTIONS["10"]).toContain("WCAG 2.2 Level AA");
  });
});
