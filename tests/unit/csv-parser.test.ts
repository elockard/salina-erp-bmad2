/**
 * CSV Parser Unit Tests
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 1 & 7.1: Unit tests for CSV parser
 *
 * Tests:
 * - Valid CSV parsing with headers
 * - Quoted fields with commas
 * - Tab-delimited file detection
 * - Oversized file rejection
 * - Empty row handling
 * - Header auto-detection
 */

import { describe, expect, it } from "vitest";

import {
  getSampleValues,
  MAX_FILE_SIZE,
  MAX_ROWS,
  parseCsvString,
  validateCsvFile,
} from "@/modules/import-export/parsers/csv-parser";
import {
  HEADER_AUTO_MAP,
  IMPORTABLE_TITLE_FIELDS,
  TITLE_FIELD_METADATA,
} from "@/modules/import-export/types";

describe("CSV Parser", () => {
  describe("parseCsvString", () => {
    it("parses valid CSV with headers", () => {
      const csv = `title,author,isbn
The Great Gatsby,F. Scott Fitzgerald,9780743273565
1984,George Orwell,9780451524935`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.headersDetected).toBe(true);
      expect(result.headers).toEqual(["title", "author", "isbn"]);
      expect(result.rowCount).toBe(2);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual([
        "The Great Gatsby",
        "F. Scott Fitzgerald",
        "9780743273565",
      ]);
    });

    it("handles quoted fields with commas", () => {
      const csv = `title,author,description
"The Great Gatsby","Fitzgerald, F. Scott","A novel about wealth, love, and the American Dream"
"1984","Orwell, George","A dystopian tale"`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.rows[0][1]).toBe("Fitzgerald, F. Scott");
      expect(result.rows[0][2]).toBe(
        "A novel about wealth, love, and the American Dream",
      );
    });

    it("detects tab-delimited files", () => {
      const csv = `title\tauthor\tisbn
The Great Gatsby\tF. Scott Fitzgerald\t9780743273565
1984\tGeorge Orwell\t9780451524935`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.delimiter).toBe("\t");
      expect(result.headers).toEqual(["title", "author", "isbn"]);
      expect(result.rowCount).toBe(2);
    });

    it("handles empty rows gracefully", () => {
      const csv = `title,author,isbn
The Great Gatsby,F. Scott Fitzgerald,9780743273565

1984,George Orwell,9780451524935

`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.rowCount).toBe(2);
      expect(result.rows).toHaveLength(2);
    });

    it("returns error for empty content", () => {
      const csv = "";

      const result = parseCsvString(csv);

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain("empty");
    });

    it("returns error for content with only whitespace", () => {
      const csv = "   \n  \n   ";

      const result = parseCsvString(csv);

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toContain("empty");
    });

    it("rejects files exceeding row limit", () => {
      // Create CSV with more than MAX_ROWS
      const headers = "title,author,isbn";
      const rows = Array.from(
        { length: MAX_ROWS + 10 },
        (_, i) => `Book ${i},Author ${i},978000000000${i % 10}`,
      );
      const csv = [headers, ...rows].join("\n");

      const result = parseCsvString(csv);

      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("Too many rows")),
      ).toBe(true);
      expect(result.rowCount).toBe(MAX_ROWS + 10);
      // Should still return truncated data
      expect(result.rows).toHaveLength(MAX_ROWS);
    });

    it("handles custom row limit", () => {
      const csv = `title,author
Book 1,Author 1
Book 2,Author 2
Book 3,Author 3
Book 4,Author 4
Book 5,Author 5`;

      const result = parseCsvString(csv, { maxRows: 3 });

      expect(result.success).toBe(false);
      expect(
        result.errors.some((e) => e.message.includes("Too many rows")),
      ).toBe(true);
      expect(result.rows).toHaveLength(3);
    });

    it("generates generic headers when none detected", () => {
      // Data that doesn't look like headers
      const csv = `9780743273565,The Great Gatsby,25.99
9780451524935,1984,19.99`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.headersDetected).toBe(false);
      expect(result.headers).toEqual(["Column 1", "Column 2", "Column 3"]);
      expect(result.rowCount).toBe(2);
    });

    it("detects headers with common field names", () => {
      const csv = `Title,Author Name,ISBN-13,Genre
The Great Gatsby,F. Scott Fitzgerald,9780743273565,Fiction`;

      const result = parseCsvString(csv);

      expect(result.headersDetected).toBe(true);
      expect(result.headers).toEqual([
        "Title",
        "Author Name",
        "ISBN-13",
        "Genre",
      ]);
    });

    it("handles quoted fields with newlines", () => {
      const csv = `title,description
"Book Title","This is a description
that spans multiple lines"`;

      const result = parseCsvString(csv);

      expect(result.success).toBe(true);
      expect(result.rows[0][1]).toContain("multiple lines");
    });

    it("can skip header detection", () => {
      const csv = `title,author
The Great Gatsby,F. Scott Fitzgerald`;

      const result = parseCsvString(csv, { detectHeaders: false });

      // Should treat first row as data
      expect(result.headers).toEqual(["Column 1", "Column 2"]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(["title", "author"]);
    });

    it("can force specific delimiter", () => {
      // CSV with commas but force tab delimiter
      const csv = "title,author\nBook,Author";

      const result = parseCsvString(csv, { delimiter: "\t" });

      // With tab delimiter, each line is one field
      expect(result.headers).toEqual(["Column 1"]);
    });
  });

  describe("getSampleValues", () => {
    it("extracts sample values from a column", () => {
      const rows = [
        ["Book 1", "Author 1", "ISBN 1"],
        ["Book 2", "Author 2", "ISBN 2"],
        ["Book 3", "Author 3", "ISBN 3"],
      ];

      const samples = getSampleValues(rows, 1); // Author column

      expect(samples).toEqual(["Author 1", "Author 2", "Author 3"]);
    });

    it("respects maxSamples limit", () => {
      const rows = Array.from({ length: 10 }, (_, i) => [`Book ${i}`]);

      const samples = getSampleValues(rows, 0, 3);

      expect(samples).toHaveLength(3);
      expect(samples).toEqual(["Book 0", "Book 1", "Book 2"]);
    });

    it("handles empty values", () => {
      const rows = [
        ["Book 1", ""],
        ["Book 2", "  "],
        ["Book 3", "Author 3"],
      ];

      const samples = getSampleValues(rows, 1);

      expect(samples).toEqual(["", "", "Author 3"]);
    });

    it("handles out of bounds column index", () => {
      const rows = [["Book 1", "Author 1"]];

      const samples = getSampleValues(rows, 5);

      expect(samples).toEqual([]);
    });
  });
});

describe("Types and Constants", () => {
  describe("IMPORTABLE_TITLE_FIELDS", () => {
    it("contains all expected fields", () => {
      expect(IMPORTABLE_TITLE_FIELDS).toContain("title");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("subtitle");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("author_name");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("isbn");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("genre");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("publication_date");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("publication_status");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("word_count");
      expect(IMPORTABLE_TITLE_FIELDS).toContain("asin");
    });

    it("has 9 fields total", () => {
      expect(IMPORTABLE_TITLE_FIELDS).toHaveLength(9);
    });
  });

  describe("TITLE_FIELD_METADATA", () => {
    it("has metadata for all importable fields", () => {
      for (const field of IMPORTABLE_TITLE_FIELDS) {
        const meta = TITLE_FIELD_METADATA.find((m) => m.field === field);
        expect(meta).toBeDefined();
        expect(meta?.label).toBeTruthy();
        expect(meta?.description).toBeTruthy();
      }
    });

    it("marks title as required", () => {
      const titleMeta = TITLE_FIELD_METADATA.find((m) => m.field === "title");
      expect(titleMeta?.required).toBe(true);
    });

    it("marks other fields as not required", () => {
      const optionalFields = TITLE_FIELD_METADATA.filter(
        (m) => m.field !== "title",
      );
      for (const field of optionalFields) {
        expect(field.required).toBe(false);
      }
    });
  });

  describe("HEADER_AUTO_MAP", () => {
    it("maps common title variations", () => {
      expect(HEADER_AUTO_MAP.title).toBe("title");
      expect(HEADER_AUTO_MAP["book title"]).toBe("title");
      expect(HEADER_AUTO_MAP.name).toBe("title");
    });

    it("maps common author variations", () => {
      expect(HEADER_AUTO_MAP.author).toBe("author_name");
      expect(HEADER_AUTO_MAP["author name"]).toBe("author_name");
      expect(HEADER_AUTO_MAP.writer).toBe("author_name");
    });

    it("maps common ISBN variations", () => {
      expect(HEADER_AUTO_MAP.isbn).toBe("isbn");
      expect(HEADER_AUTO_MAP["isbn-13"]).toBe("isbn");
      expect(HEADER_AUTO_MAP.isbn13).toBe("isbn");
    });

    it("maps common date variations", () => {
      expect(HEADER_AUTO_MAP["publication date"]).toBe("publication_date");
      expect(HEADER_AUTO_MAP["pub date"]).toBe("publication_date");
      expect(HEADER_AUTO_MAP.published).toBe("publication_date");
    });

    it("maps ASIN", () => {
      expect(HEADER_AUTO_MAP.asin).toBe("asin");
      expect(HEADER_AUTO_MAP["amazon asin"]).toBe("asin");
    });
  });
});

describe("validateCsvFile", () => {
  it("returns null for valid CSV file", () => {
    const file = new File(["test,data"], "test.csv", { type: "text/csv" });
    const error = validateCsvFile(file);
    expect(error).toBeNull();
  });

  it("rejects non-CSV file type", () => {
    const file = new File(["test"], "test.txt", { type: "text/plain" });
    const error = validateCsvFile(file);
    expect(error).toContain("Invalid file type");
  });

  it("accepts file with .csv extension regardless of mime type", () => {
    const file = new File(["test,data"], "test.csv", {
      type: "application/octet-stream",
    });
    const error = validateCsvFile(file);
    expect(error).toBeNull();
  });

  it("rejects file exceeding max size", () => {
    // Create a file larger than max size
    const largeContent = "x".repeat(MAX_FILE_SIZE + 1000);
    const file = new File([largeContent], "large.csv", { type: "text/csv" });
    const error = validateCsvFile(file);
    expect(error).toContain("File too large");
  });

  it("respects custom max size config", () => {
    const content = "x".repeat(2000);
    const file = new File([content], "test.csv", { type: "text/csv" });

    // Should fail with small limit
    const error = validateCsvFile(file, { maxFileSize: 1000 });
    expect(error).toContain("File too large");

    // Should pass with large limit
    const noError = validateCsvFile(file, { maxFileSize: 3000 });
    expect(noError).toBeNull();
  });
});
