/**
 * Unit Tests: Ingram Inventory Parser
 *
 * Story 16.4 - AC4: Import Ingram Inventory Snapshot
 * Story 16.4 - AC6: Status Mismatch Alerts
 *
 * Tests the parseIngramInventoryFile and compareInventoryStatus functions.
 */

import { describe, expect, it } from "vitest";
import {
  compareInventoryStatus,
  type IngramInventoryRecord,
  parseIngramInventoryFile,
} from "@/modules/channels/adapters/ingram/inventory-parser";

describe("parseIngramInventoryFile", () => {
  describe("CSV format", () => {
    it("parses valid CSV with standard headers", () => {
      const content = `isbn,availability,quantity
9781234567890,20,100
9780987654321,40,0`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.format).toBe("csv");
      expect(result.records).toHaveLength(2);
      expect(result.records[0]).toEqual({
        isbn: "9781234567890",
        availabilityCode: "20",
        quantityOnHand: 100,
        lastUpdated: undefined,
        rawLine: "9781234567890,20,100",
      });
      expect(result.records[1]).toEqual({
        isbn: "9780987654321",
        availabilityCode: "40",
        quantityOnHand: 0,
        lastUpdated: undefined,
        rawLine: "9780987654321,40,0",
      });
    });

    it("parses CSV with ISBN-13 column name", () => {
      const content = `isbn13,status
9781234567890,20`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
    });

    it("parses CSV with EAN column name", () => {
      const content = `ean,availability_code
9781234567890,10`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
      expect(result.records[0].availabilityCode).toBe("10");
    });

    it("parses CSV with product_id column", () => {
      const content = `product_id,product_availability
9781234567890,40`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
      expect(result.records[0].availabilityCode).toBe("40");
    });

    it("handles quoted values correctly", () => {
      const content = `isbn,availability,notes
"9781234567890",20,"Some, notes here"`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
    });
  });

  describe("TSV format", () => {
    it("parses valid TSV file", () => {
      const content = `isbn\tavailability\tquantity
9781234567890\t20\t50
9780987654321\t10\t0`;

      const result = parseIngramInventoryFile(content, "test.tsv");

      expect(result.success).toBe(true);
      expect(result.format).toBe("tsv");
      expect(result.records).toHaveLength(2);
      expect(result.records[0].availabilityCode).toBe("20");
      expect(result.records[1].availabilityCode).toBe("10");
    });
  });

  describe("ISBN normalization", () => {
    it("normalizes ISBNs with hyphens", () => {
      const content = `isbn,availability
978-1-234-56789-0,20`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
    });

    it("normalizes ISBNs with spaces", () => {
      const content = `isbn,availability
978 1 234 56789 0,20`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("9781234567890");
    });

    it("handles ISBN-10 with X check digit", () => {
      const content = `isbn,availability
012345678X,20`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].isbn).toBe("012345678X");
    });
  });

  describe("error handling", () => {
    it("fails when ISBN column is missing", () => {
      const content = `title,availability
Test Book,20`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toBe("ISBN column not found");
    });

    it("fails when file has no data rows", () => {
      const content = `isbn,availability`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(false);
      expect(result.errors[0].message).toBe("No data rows");
    });

    it("records error for rows with missing ISBN", () => {
      const content = `isbn,availability
9781234567890,20
,40`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe("Missing ISBN");
    });

    it("defaults availability to 20 when column missing", () => {
      const content = `isbn
9781234567890`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].availabilityCode).toBe("20");
    });
  });

  describe("date parsing", () => {
    it("parses last_updated column", () => {
      const content = `isbn,availability,last_updated
9781234567890,20,2024-01-15`;

      const result = parseIngramInventoryFile(content, "test.csv");

      expect(result.success).toBe(true);
      expect(result.records[0].lastUpdated).toBeInstanceOf(Date);
    });
  });
});

describe("compareInventoryStatus", () => {
  const createIngramRecord = (
    isbn: string,
    code: string,
  ): IngramInventoryRecord => ({
    isbn,
    availabilityCode: code,
  });

  const createLocalTitle = (isbn: string, status: string) => ({
    isbn,
    publication_status: status,
  });

  it("identifies matched records correctly", () => {
    const ingram = [createIngramRecord("9781234567890", "20")];
    const local = [createLocalTitle("9781234567890", "published")];

    const result = compareInventoryStatus(ingram, local);

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0]).toEqual({
      isbn: "9781234567890",
      localStatus: "published",
      ingramCode: "20",
    });
    expect(result.mismatched).toHaveLength(0);
  });

  it("identifies mismatched records correctly", () => {
    const ingram = [createIngramRecord("9781234567890", "40")];
    const local = [createLocalTitle("9781234567890", "published")];

    const result = compareInventoryStatus(ingram, local);

    expect(result.matched).toHaveLength(0);
    expect(result.mismatched).toHaveLength(1);
    expect(result.mismatched[0]).toEqual({
      isbn: "9781234567890",
      localStatus: "published",
      ingramCode: "40",
      localExpectedCode: "20",
    });
  });

  it("identifies Ingram-only records", () => {
    const ingram = [createIngramRecord("9781234567890", "20")];
    const local: { isbn: string; publication_status: string }[] = [];

    const result = compareInventoryStatus(ingram, local);

    expect(result.ingramOnly).toHaveLength(1);
    expect(result.ingramOnly[0]).toEqual({
      isbn: "9781234567890",
      ingramCode: "20",
    });
  });

  it("identifies local-only records", () => {
    const ingram: IngramInventoryRecord[] = [];
    const local = [createLocalTitle("9781234567890", "published")];

    const result = compareInventoryStatus(ingram, local);

    expect(result.localOnly).toHaveLength(1);
    expect(result.localOnly[0]).toEqual({
      isbn: "9781234567890",
      localStatus: "published",
    });
  });

  describe("status mapping", () => {
    it("maps draft to code 10", () => {
      const ingram = [createIngramRecord("9781234567890", "10")];
      const local = [createLocalTitle("9781234567890", "draft")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });

    it("maps pending to code 10", () => {
      const ingram = [createIngramRecord("9781234567890", "10")];
      const local = [createLocalTitle("9781234567890", "pending")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });

    it("maps published to code 20", () => {
      const ingram = [createIngramRecord("9781234567890", "20")];
      const local = [createLocalTitle("9781234567890", "published")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });

    it("maps out_of_print to code 40", () => {
      const ingram = [createIngramRecord("9781234567890", "40")];
      const local = [createLocalTitle("9781234567890", "out_of_print")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });

    it("maps unknown status to code 20 (default)", () => {
      const ingram = [createIngramRecord("9781234567890", "20")];
      const local = [createLocalTitle("9781234567890", "unknown_status")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });
  });

  describe("ISBN normalization in comparison", () => {
    it("normalizes local ISBNs for comparison", () => {
      const ingram = [createIngramRecord("9781234567890", "20")];
      const local = [createLocalTitle("978-1-234-56789-0", "published")];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
    });
  });

  describe("multiple records", () => {
    it("handles complex mix of records", () => {
      const ingram = [
        createIngramRecord("9781111111111", "20"), // matched
        createIngramRecord("9782222222222", "40"), // mismatched (local says published)
        createIngramRecord("9783333333333", "10"), // Ingram only
      ];
      const local = [
        createLocalTitle("9781111111111", "published"), // matched
        createLocalTitle("9782222222222", "published"), // mismatched
        createLocalTitle("9784444444444", "draft"), // local only
      ];

      const result = compareInventoryStatus(ingram, local);

      expect(result.matched).toHaveLength(1);
      expect(result.mismatched).toHaveLength(1);
      expect(result.ingramOnly).toHaveLength(1);
      expect(result.localOnly).toHaveLength(1);
    });
  });
});
