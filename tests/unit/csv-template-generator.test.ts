/**
 * CSV Template Generator Tests
 *
 * Story: 19.2 - Download CSV Templates
 * Task 4: Unit tests for template generation
 *
 * Tests AC-1, AC-2, AC-3, AC-4
 */

import { describe, expect, it } from "vitest";
import { generateTitlesTemplate } from "@/modules/import-export/templates/csv-template-generator";
import {
  IMPORTABLE_TITLE_FIELDS,
  TITLE_FIELD_METADATA,
} from "@/modules/import-export/types";

describe("CSV Template Generator", () => {
  describe("generateTitlesTemplate", () => {
    // Task 4.4 - UTF-8 BOM presence
    it("starts with UTF-8 BOM for Excel compatibility", () => {
      const template = generateTitlesTemplate();
      expect(template.charCodeAt(0)).toBe(0xfeff);
    });

    // Task 4.1 - Headers match TITLE_FIELD_METADATA
    it("includes all importable field headers (AC-2)", () => {
      const template = generateTitlesTemplate();
      // Remove BOM and find header line
      const content = template.slice(1); // Remove BOM
      const lines = content.split("\n");
      // Find first non-comment, non-empty line
      const headerLine = lines.find(
        (l) => !l.startsWith("#") && l.trim().length > 0,
      );
      expect(headerLine).toBe(IMPORTABLE_TITLE_FIELDS.join(","));
    });

    // Task 4.2 - Example row with valid sample data
    it("includes example row with valid sample data (AC-3)", () => {
      const template = generateTitlesTemplate();
      // Verify example values from TITLE_FIELD_METADATA
      expect(template).toContain("The Great Gatsby");
      expect(template).toContain("A Novel");
      expect(template).toContain("F. Scott Fitzgerald");
      expect(template).toContain("978-0-7432-7356-5");
      expect(template).toContain("Fiction");
      expect(template).toContain("2024-01-15");
      expect(template).toContain("published");
      expect(template).toContain("47094");
      expect(template).toContain("B08N5WRWNW");
    });

    // Task 4.3 - Format notes for each field
    it("includes validation rules for each field (AC-4)", () => {
      const template = generateTitlesTemplate();
      IMPORTABLE_TITLE_FIELDS.forEach((field) => {
        expect(template).toContain(`# ${field}:`);
      });
    });

    it("marks required fields correctly", () => {
      const template = generateTitlesTemplate();
      // Title is the only required field
      expect(template).toContain("# title: Required");
      // Other fields should be optional
      expect(template).toContain("# subtitle: Optional");
      expect(template).toContain("# author_name: Optional");
      expect(template).toContain("# isbn: Optional");
    });

    it("includes generation timestamp", () => {
      const template = generateTitlesTemplate();
      expect(template).toMatch(/# Generated: \d{4}-\d{2}-\d{2}/);
    });

    it("includes empty cell guidance", () => {
      const template = generateTitlesTemplate();
      expect(template).toContain("Empty cells are allowed for optional fields");
    });

    it("includes header comment identifying the template", () => {
      const template = generateTitlesTemplate();
      expect(template).toContain("# Salina ERP Title Import Template");
    });

    it("has correct number of columns in header and example row", () => {
      const template = generateTitlesTemplate();
      const content = template.slice(1); // Remove BOM
      const lines = content.split("\n");

      // Find header and example row (first two non-comment, non-empty lines)
      const dataLines = lines.filter(
        (l) => !l.startsWith("#") && l.trim().length > 0,
      );
      expect(dataLines.length).toBeGreaterThanOrEqual(2);

      const headerCols = dataLines[0].split(",").length;
      const exampleCols = dataLines[1].split(",").length;

      expect(headerCols).toBe(IMPORTABLE_TITLE_FIELDS.length);
      expect(exampleCols).toBe(IMPORTABLE_TITLE_FIELDS.length);
    });

    it("example row values can be parsed back to match metadata", () => {
      const template = generateTitlesTemplate();
      const content = template.slice(1); // Remove BOM
      const lines = content.split("\n");

      const dataLines = lines.filter(
        (l) => !l.startsWith("#") && l.trim().length > 0,
      );
      const exampleValues = dataLines[1].split(",");

      // Verify each example matches the metadata
      IMPORTABLE_TITLE_FIELDS.forEach((field, index) => {
        const meta = TITLE_FIELD_METADATA.find((m) => m.field === field);
        expect(exampleValues[index]).toBe(meta?.example || "");
      });
    });
  });
});
