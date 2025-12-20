/**
 * CSV Import Schema Unit Tests
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 7.2: Unit tests for schema validation
 *
 * Tests:
 * - Title field validation
 * - ISBN validation
 * - ASIN validation
 * - Date validation
 * - Word count validation
 * - Row validation with mappings
 */

import { describe, expect, it } from "vitest";

import {
  autoMapColumns,
  csvTitleRowSchema,
  validateCsvData,
  validateCsvRow,
} from "@/modules/import-export/schema";
import type {
  ColumnMapping,
  CsvParseResult,
} from "@/modules/import-export/types";

describe("CSV Import Schema Validation", () => {
  describe("csvTitleRowSchema", () => {
    it("validates a complete valid row", () => {
      const data = {
        title: "The Great Gatsby",
        subtitle: "A Novel",
        author_name: "F. Scott Fitzgerald",
        isbn: "9780743273565",
        genre: "Fiction",
        publication_date: "2004-09-30",
        publication_status: "published",
        word_count: "50000",
        asin: "B08H8GJH9K",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("validates row with only required title field", () => {
      const data = {
        title: "Minimal Book",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const data = {
        title: "",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects whitespace-only title", () => {
      const data = {
        title: "   ",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates ISBN-13 format", () => {
      const validData = {
        title: "Test",
        isbn: "9780743273565",
      };

      const result = csvTitleRowSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts ISBN with dashes", () => {
      const data = {
        title: "Test",
        isbn: "978-0-7432-7356-5",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects invalid ISBN checksum", () => {
      const data = {
        title: "Test",
        isbn: "9780743273569", // Invalid checksum
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects ISBN with wrong length", () => {
      const data = {
        title: "Test",
        isbn: "12345678901", // 11 digits
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates ASIN format", () => {
      const data = {
        title: "Test",
        asin: "B08H8GJH9K",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects ASIN with wrong length", () => {
      const data = {
        title: "Test",
        asin: "B08H8",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates publication date format", () => {
      const validDate = {
        title: "Test",
        publication_date: "2023-12-25",
      };

      const result = csvTitleRowSchema.safeParse(validDate);
      expect(result.success).toBe(true);
    });

    it("rejects invalid date format", () => {
      const invalidDate = {
        title: "Test",
        publication_date: "12/25/2023", // Wrong format
      };

      const result = csvTitleRowSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it("rejects invalid date values", () => {
      const invalidDate = {
        title: "Test",
        publication_date: "2023-13-45", // Invalid month/day
      };

      const result = csvTitleRowSchema.safeParse(invalidDate);
      expect(result.success).toBe(false);
    });

    it("validates publication status values", () => {
      const statuses = ["draft", "pending", "published", "out_of_print"];

      for (const status of statuses) {
        const data = { title: "Test", publication_status: status };
        const result = csvTitleRowSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid publication status", () => {
      const data = {
        title: "Test",
        publication_status: "invalid_status",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("validates positive word count", () => {
      const data = {
        title: "Test",
        word_count: "50000",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it("rejects negative word count", () => {
      const data = {
        title: "Test",
        word_count: "-100",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects zero word count", () => {
      const data = {
        title: "Test",
        word_count: "0",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric word count", () => {
      const data = {
        title: "Test",
        word_count: "many",
      };

      const result = csvTitleRowSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe("validateCsvRow", () => {
    const createMappings = (fields: string[]): ColumnMapping[] => {
      return fields.map((field, index) => ({
        csvColumnIndex: index,
        csvColumnHeader: field,
        targetField: field as any,
        sampleValues: [],
      }));
    };

    it("validates a row with valid data", () => {
      const mappings = createMappings(["title", "isbn"]);
      const row = ["Test Book", "9780743273565"];

      const result = validateCsvRow(row, 1, mappings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data.title).toBe("Test Book");
      expect(result.data.isbn).toBe("9780743273565");
    });

    it("returns errors for invalid data", () => {
      const mappings = createMappings(["title", "isbn"]);
      const row = ["", "invalid-isbn"];

      const result = validateCsvRow(row, 1, mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("extracts author_name for linking", () => {
      const mappings = createMappings(["title", "author_name"]);
      const row = ["Test Book", "John Doe"];

      const result = validateCsvRow(row, 1, mappings);

      expect(result.authorName).toBe("John Doe");
    });

    it("handles missing optional fields", () => {
      const mappings = createMappings(["title"]);
      const row = ["Test Book"];

      const result = validateCsvRow(row, 1, mappings);

      expect(result.valid).toBe(true);
      expect(result.data.subtitle).toBeUndefined();
    });
  });

  describe("validateCsvData", () => {
    it("validates all rows and returns summary", () => {
      const parseResult: CsvParseResult = {
        success: true,
        rows: [
          ["Book 1", "9780743273565"],
          ["Book 2", "9780451524935"],
        ],
        headers: ["title", "isbn"],
        headersDetected: true,
        rowCount: 2,
        errors: [],
        delimiter: ",",
      };

      const mappings: ColumnMapping[] = [
        {
          csvColumnIndex: 0,
          csvColumnHeader: "title",
          targetField: "title",
          sampleValues: [],
        },
        {
          csvColumnIndex: 1,
          csvColumnHeader: "isbn",
          targetField: "isbn",
          sampleValues: [],
        },
      ];

      const result = validateCsvData(parseResult, mappings);

      expect(result.totalRows).toBe(2);
      expect(result.validCount).toBe(2);
      expect(result.invalidCount).toBe(0);
    });

    it("detects duplicate ISBNs within file", () => {
      const parseResult: CsvParseResult = {
        success: true,
        rows: [
          ["Book 1", "9780743273565"],
          ["Book 2", "9780743273565"], // Duplicate ISBN
        ],
        headers: ["title", "isbn"],
        headersDetected: true,
        rowCount: 2,
        errors: [],
        delimiter: ",",
      };

      const mappings: ColumnMapping[] = [
        {
          csvColumnIndex: 0,
          csvColumnHeader: "title",
          targetField: "title",
          sampleValues: [],
        },
        {
          csvColumnIndex: 1,
          csvColumnHeader: "isbn",
          targetField: "isbn",
          sampleValues: [],
        },
      ];

      const result = validateCsvData(parseResult, mappings);

      expect(result.stats.duplicateIsbns).toContain("9780743273565");
    });

    it("counts rows with author and isbn", () => {
      const parseResult: CsvParseResult = {
        success: true,
        rows: [
          ["Book 1", "Author 1", "9780743273565"],
          ["Book 2", "", ""],
          ["Book 3", "Author 3", ""],
        ],
        headers: ["title", "author_name", "isbn"],
        headersDetected: true,
        rowCount: 3,
        errors: [],
        delimiter: ",",
      };

      const mappings: ColumnMapping[] = [
        {
          csvColumnIndex: 0,
          csvColumnHeader: "title",
          targetField: "title",
          sampleValues: [],
        },
        {
          csvColumnIndex: 1,
          csvColumnHeader: "author_name",
          targetField: "author_name",
          sampleValues: [],
        },
        {
          csvColumnIndex: 2,
          csvColumnHeader: "isbn",
          targetField: "isbn",
          sampleValues: [],
        },
      ];

      const result = validateCsvData(parseResult, mappings);

      expect(result.stats.withAuthor).toBe(2);
      expect(result.stats.withIsbn).toBe(1);
    });
  });

  describe("autoMapColumns", () => {
    it("auto-maps common header names", () => {
      const headers = ["Title", "Author", "ISBN"];
      const rows = [["Book", "Author", "9780743273565"]];

      const mappings = autoMapColumns(headers, rows);

      expect(mappings[0].targetField).toBe("title");
      expect(mappings[1].targetField).toBe("author_name");
      expect(mappings[2].targetField).toBe("isbn");
    });

    it("handles case-insensitive header matching", () => {
      const headers = ["TITLE", "AUTHOR NAME", "ISBN-13"];
      const rows = [["Book", "Author", "9780743273565"]];

      const mappings = autoMapColumns(headers, rows);

      expect(mappings[0].targetField).toBe("title");
      expect(mappings[1].targetField).toBe("author_name");
      expect(mappings[2].targetField).toBe("isbn");
    });

    it("leaves unknown headers unmapped", () => {
      const headers = ["Title", "Random Column", "Custom Field"];
      const rows = [["Book", "Value", "Other"]];

      const mappings = autoMapColumns(headers, rows);

      expect(mappings[0].targetField).toBe("title");
      expect(mappings[1].targetField).toBeNull();
      expect(mappings[2].targetField).toBeNull();
    });

    it("includes sample values from rows", () => {
      const headers = ["Title"];
      const rows = [["Book 1"], ["Book 2"], ["Book 3"]];

      const mappings = autoMapColumns(headers, rows);

      expect(mappings[0].sampleValues).toContain("Book 1");
      expect(mappings[0].sampleValues).toContain("Book 2");
      expect(mappings[0].sampleValues).toContain("Book 3");
    });
  });
});
