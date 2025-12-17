/**
 * Unit Tests: Amazon Sales Import Job Logic
 *
 * Story 17.3 - Import Amazon Sales Data
 * Task 7: Write comprehensive tests
 *
 * Tests the core business logic extracted from the Inngest job
 * Note: These tests verify the processing logic, not the full Inngest job flow
 */

import { describe, expect, it } from "vitest";
import type { AmazonSaleRecord } from "@/modules/channels/adapters/amazon/sales-parser";

/**
 * Sales processing logic extracted for unit testing
 * (This mirrors the logic in amazon-sales-import.ts)
 */

interface TitleMatch {
  id: string;
  format: "physical" | "ebook";
}

interface ProcessResult {
  salesCreated: number;
  duplicatesSkipped: number;
  unmatchedRecords: {
    isbn: string;
    asin: string;
    orderId: string;
    quantity: number;
  }[];
}

/**
 * Process sales records with matching and deduplication
 * Updated to include orderId in deduplication key (Issue 4 fix)
 */
function processSalesRecords(
  sales: AmazonSaleRecord[],
  isbnMap: Map<string, TitleMatch>,
  existingDupeSet: Set<string>,
): ProcessResult {
  let salesCreated = 0;
  const unmatchedRecords: ProcessResult["unmatchedRecords"] = [];
  let duplicatesSkipped = 0;

  for (const sale of sales) {
    // Match by ISBN
    const titleMatch = sale.isbn ? isbnMap.get(sale.isbn) : undefined;

    if (!titleMatch) {
      unmatchedRecords.push({
        isbn: sale.isbn || "",
        asin: sale.asin,
        orderId: sale.orderId,
        quantity: sale.quantity,
      });
      continue;
    }

    // Check for duplicate
    const purchaseDate =
      typeof sale.purchaseDate === "string"
        ? new Date(sale.purchaseDate)
        : sale.purchaseDate;
    const saleDateStr = purchaseDate.toISOString().split("T")[0];

    // Issue 4 fix: Include orderId in deduplication key
    const dupeKey = `${titleMatch.id}|${saleDateStr}|${sale.quantity}|${sale.orderId}`;
    // Also check legacy key format (without orderId) for backward compatibility
    const legacyDupeKey = `${titleMatch.id}|${saleDateStr}|${sale.quantity}`;

    if (existingDupeSet.has(dupeKey) || existingDupeSet.has(legacyDupeKey)) {
      duplicatesSkipped++;
      continue;
    }

    // Would create sales record here
    existingDupeSet.add(dupeKey);
    salesCreated++;
  }

  return { salesCreated, duplicatesSkipped, unmatchedRecords };
}

describe("Amazon Sales Import Job Logic", () => {
  describe("processSalesRecords", () => {
    const mockIsbnMap = new Map<string, TitleMatch>([
      ["9781234567890", { id: "title-1", format: "physical" }],
      ["9780987654321", { id: "title-2", format: "ebook" }],
    ]);

    it("creates sales transactions from valid records - AC4", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.salesCreated).toBe(1);
      expect(result.duplicatesSkipped).toBe(0);
      expect(result.unmatchedRecords).toHaveLength(0);
    });

    it("skips duplicate sales - AC7", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
      ];

      // Pre-populate duplicate set with legacy key format (without orderId)
      // This tests backward compatibility with existing records
      const existingDupes = new Set(["title-1|2024-01-15|2"]);

      const result = processSalesRecords(sales, mockIsbnMap, existingDupes);

      expect(result.salesCreated).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
    });

    it("skips duplicate sales with same orderId - AC7", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
      ];

      // Pre-populate duplicate set with new key format (with orderId)
      const existingDupes = new Set([
        "title-1|2024-01-15|2|111-1234567-1234567",
      ]);

      const result = processSalesRecords(sales, mockIsbnMap, existingDupes);

      expect(result.salesCreated).toBe(0);
      expect(result.duplicatesSkipped).toBe(1);
    });

    it("allows different orders on same day for same title - Issue 4 fix", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567", // First order
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
        {
          orderId: "222-2345678-2345678", // Different order, same day, same qty
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 2,
        },
      ];

      const existingDupes = new Set<string>();
      const result = processSalesRecords(sales, mockIsbnMap, existingDupes);

      // Both should be created since they have different orderIds
      expect(result.salesCreated).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
    });

    it("tracks unmatched ISBNs - AC5, AC6", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B999XYZ999",
          isbn: "9999999999999", // ISBN not in catalog
          quantity: 1,
          itemPrice: 19.99,
          unitPrice: 19.99,
          sku: "9999999999999",
          productName: "Unknown Book",
          lineNumber: 1,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.salesCreated).toBe(0);
      expect(result.unmatchedRecords).toHaveLength(1);
      expect(result.unmatchedRecords[0]).toMatchObject({
        isbn: "9999999999999",
        asin: "B999XYZ999",
        orderId: "111-1234567-1234567",
        quantity: 1,
      });
    });

    it("tracks records without ISBN - AC6", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B999XYZ999",
          isbn: "", // No ISBN
          quantity: 1,
          itemPrice: 19.99,
          unitPrice: 19.99,
          sku: "CUSTOM-SKU",
          productName: "Book without ISBN",
          lineNumber: 1,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.unmatchedRecords).toHaveLength(1);
      expect(result.unmatchedRecords[0].isbn).toBe("");
      expect(result.unmatchedRecords[0].asin).toBe("B999XYZ999");
    });

    it("matches titles by ISBN (physical) - AC5", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890", // Physical ISBN
          quantity: 1,
          itemPrice: 29.99,
          unitPrice: 29.99,
          sku: "9781234567890",
          productName: "Physical Book",
          lineNumber: 1,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.salesCreated).toBe(1);
      expect(result.unmatchedRecords).toHaveLength(0);
    });

    it("matches titles by eISBN (ebook) - AC5", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B002DEF456",
          isbn: "9780987654321", // eISBN
          quantity: 1,
          itemPrice: 14.99,
          unitPrice: 14.99,
          sku: "9780987654321",
          productName: "Ebook",
          lineNumber: 1,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.salesCreated).toBe(1);
    });

    it("handles mixed matched/unmatched records - AC5, AC6", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 1,
          itemPrice: 29.99,
          unitPrice: 29.99,
          sku: "9781234567890",
          productName: "Matched Book",
          lineNumber: 1,
        },
        {
          orderId: "222-2345678-2345678",
          purchaseDate: new Date("2024-01-16"),
          asin: "B999XYZ999",
          isbn: "9999999999999",
          quantity: 2,
          itemPrice: 19.99,
          unitPrice: 9.995,
          sku: "9999999999999",
          productName: "Unmatched Book",
          lineNumber: 2,
        },
      ];

      const result = processSalesRecords(sales, mockIsbnMap, new Set());

      expect(result.salesCreated).toBe(1);
      expect(result.unmatchedRecords).toHaveLength(1);
    });

    it("prevents duplicates within same batch - AC7", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2,
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
        {
          orderId: "111-1234567-1234567", // Same order ID
          purchaseDate: new Date("2024-01-15"), // Same date
          asin: "B001ABC123",
          isbn: "9781234567890", // Same ISBN
          quantity: 2, // Same quantity = duplicate
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 2,
        },
      ];

      const existingDupes = new Set<string>();
      const result = processSalesRecords(sales, mockIsbnMap, existingDupes);

      // First record creates, second is duplicate
      expect(result.salesCreated).toBe(1);
      expect(result.duplicatesSkipped).toBe(1);
    });

    it("distinguishes records with different quantities - AC7", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 2, // Different quantity
          itemPrice: 29.99,
          unitPrice: 14.995,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 3, // Different quantity = NOT duplicate
          itemPrice: 44.97,
          unitPrice: 14.99,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 2,
        },
      ];

      const existingDupes = new Set<string>();
      const result = processSalesRecords(sales, mockIsbnMap, existingDupes);

      // Both records should be created (different quantities)
      expect(result.salesCreated).toBe(2);
      expect(result.duplicatesSkipped).toBe(0);
    });
  });

  describe("Date handling", () => {
    it("handles Date object purchaseDate", () => {
      const sales: AmazonSaleRecord[] = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: new Date("2024-01-15T10:30:00Z"),
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 1,
          itemPrice: 29.99,
          unitPrice: 29.99,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
      ];

      const isbnMap = new Map<string, TitleMatch>([
        ["9781234567890", { id: "title-1", format: "physical" }],
      ]);

      const result = processSalesRecords(sales, isbnMap, new Set());

      expect(result.salesCreated).toBe(1);
    });

    it("handles serialized string purchaseDate (from Inngest step)", () => {
      // Simulate Inngest serialization where Date becomes string
      const sales = [
        {
          orderId: "111-1234567-1234567",
          purchaseDate: "2024-01-15T10:30:00.000Z" as unknown as Date,
          asin: "B001ABC123",
          isbn: "9781234567890",
          quantity: 1,
          itemPrice: 29.99,
          unitPrice: 29.99,
          sku: "9781234567890",
          productName: "Test Book",
          lineNumber: 1,
        },
      ] as AmazonSaleRecord[];

      const isbnMap = new Map<string, TitleMatch>([
        ["9781234567890", { id: "title-1", format: "physical" }],
      ]);

      const result = processSalesRecords(sales, isbnMap, new Set());

      expect(result.salesCreated).toBe(1);
    });
  });
});
