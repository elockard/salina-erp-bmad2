/**
 * Unit Tests: Amazon Sales Report Parser
 *
 * Story 17.3 - Import Amazon Sales Data
 * Task 2: Create Amazon sales report parser
 *
 * Tests AC3 (Download/Parse Sales Report)
 */

import { describe, expect, it } from "vitest";
import {
  getSalesParseStats,
  parseAmazonSalesReport,
} from "@/modules/channels/adapters/amazon/sales-parser";

describe("Amazon Sales Report Parser", () => {
  describe("parseAmazonSalesReport", () => {
    describe("tab-separated format", () => {
      it("parses standard Amazon flat file format - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tproduct-name\tsku\tasin\titem-price\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15T10:30:00+00:00\tTest Book Title\t9781234567890\tB001ABC123\t29.99\t2",
          "222-2345678-2345678\t2024-01-16T14:45:00+00:00\tAnother Book\t9780987654321\tB002DEF456\t15.50\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(2);
        expect(result.errors).toHaveLength(0);

        // First record
        expect(result.sales[0].orderId).toBe("111-1234567-1234567");
        expect(result.sales[0].asin).toBe("B001ABC123");
        expect(result.sales[0].isbn).toBe("9781234567890");
        expect(result.sales[0].quantity).toBe(2);
        expect(result.sales[0].itemPrice).toBe(29.99);
        expect(result.sales[0].unitPrice).toBeCloseTo(14.995);

        // Second record
        expect(result.sales[1].orderId).toBe("222-2345678-2345678");
        expect(result.sales[1].quantity).toBe(1);
        expect(result.sales[1].unitPrice).toBe(15.5);
      });

      it("extracts ISBN from SKU field when in ISBN format - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tsku\tasin\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t978-1-234-56789-0\tB001ABC123\t1",
          "222-2345678-2345678\t2024-01-16\t0123456789\tB002DEF456\t1", // ISBN-10
          "333-3456789-3456789\t2024-01-17\tNOT-AN-ISBN\tB003GHI789\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(3);

        // ISBN-13 with hyphens - normalized
        expect(result.sales[0].isbn).toBe("9781234567890");

        // ISBN-10 - converted to ISBN-13
        expect(result.sales[1].isbn).toHaveLength(13);
        expect(result.sales[1].isbn).toMatch(/^978/);

        // Non-ISBN SKU - empty
        expect(result.sales[2].isbn).toBe("");
      });
    });

    describe("comma-separated format", () => {
      it("parses CSV format - AC3", () => {
        const content = [
          "amazon-order-id,purchase-date,sku,asin,item-price,quantity-purchased",
          "111-1234567-1234567,2024-01-15,9781234567890,B001ABC123,19.99,1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(1);
        expect(result.sales[0].orderId).toBe("111-1234567-1234567");
      });

      it("handles quoted fields with commas - AC3", () => {
        const content = [
          "amazon-order-id,purchase-date,product-name,sku,quantity-purchased",
          '111-1234567-1234567,2024-01-15,"Book Title, With Comma",9781234567890,1',
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales[0].productName).toBe("Book Title, With Comma");
      });
    });

    describe("error handling", () => {
      it("returns error for empty content - AC3", () => {
        const result = parseAmazonSalesReport("");

        expect(result.success).toBe(false);
        expect(result.sales).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain("No data rows");
      });

      it("returns error for header-only content - AC3", () => {
        const content =
          "amazon-order-id\tpurchase-date\tsku\tasin\tquantity-purchased";

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(false);
        expect(result.sales).toHaveLength(0);
      });

      it("returns error when required columns missing - AC3", () => {
        const content = [
          "sku\tasin\tquantity-purchased",
          "9781234567890\tB001ABC123\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(false);
        expect(result.errors[0].message).toContain("Required columns");
      });

      it("logs error for invalid quantity and continues - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t5",
          "222-2345678-2345678\t2024-01-16\t-1", // Invalid
          "333-3456789-3456789\t2024-01-17\t3",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(2);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain("Invalid quantity");
      });

      it("logs error for missing order ID and continues - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t5",
          "\t2024-01-16\t2", // Missing order ID
          "333-3456789-3456789\t2024-01-17\t3",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(2);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain("Missing order ID");
      });

      it("tracks line numbers for errors - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t5",
          "\t2024-01-16\t2", // Line 3 (index 2)
          "333-3456789-3456789\t2024-01-17\t3",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.errors[0].line).toBe(3); // 1-indexed
      });
    });

    describe("date parsing", () => {
      it("parses ISO date format - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date",
          "111-1234567-1234567\t2024-01-15T10:30:00+00:00",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.sales[0].purchaseDate.toISOString()).toContain(
          "2024-01-15",
        );
      });

      it("parses simple date format - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date",
          "111-1234567-1234567\t2024-01-15",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.sales[0].purchaseDate.getFullYear()).toBe(2024);
        expect(result.sales[0].purchaseDate.getMonth()).toBe(0); // January
        expect(result.sales[0].purchaseDate.getDate()).toBe(15);
      });

      it("handles MM/DD/YYYY date format - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date",
          "111-1234567-1234567\t01/15/2024",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.sales[0].purchaseDate.getFullYear()).toBe(2024);
      });
    });

    describe("price calculations", () => {
      it("calculates unit price from item price and quantity - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\titem-price\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t30.00\t3",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.sales[0].itemPrice).toBe(30.0);
        expect(result.sales[0].unitPrice).toBe(10.0);
      });

      it("handles zero price (free promotions) - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\titem-price\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t0.00\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales[0].itemPrice).toBe(0);
        expect(result.sales[0].unitPrice).toBe(0);
      });

      it("handles missing price column - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales[0].itemPrice).toBe(0);
        expect(result.sales[0].unitPrice).toBe(0);
      });
    });

    describe("column detection", () => {
      it("detects columns case-insensitively - AC3", () => {
        const content = [
          "AMAZON-ORDER-ID\tPURCHASE-DATE\tQUANTITY-PURCHASED",
          "111-1234567-1234567\t2024-01-15\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(1);
      });

      it("supports alternate column names - AC3", () => {
        const content = [
          "order-id\tpurchasedate\tqty",
          "111-1234567-1234567\t2024-01-15\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.success).toBe(true);
        expect(result.sales).toHaveLength(1);
      });

      it("supports seller-sku column name - AC3", () => {
        const content = [
          "amazon-order-id\tpurchase-date\tseller-sku\tquantity-purchased",
          "111-1234567-1234567\t2024-01-15\t9781234567890\t1",
        ].join("\n");

        const result = parseAmazonSalesReport(content);

        expect(result.sales[0].sku).toBe("9781234567890");
        expect(result.sales[0].isbn).toBe("9781234567890");
      });
    });
  });

  describe("getSalesParseStats", () => {
    it("returns correct statistics - AC3", () => {
      const content = [
        "amazon-order-id\tpurchase-date\tsku\tasin\titem-price\tquantity-purchased",
        "111-1234567-1234567\t2024-01-15\t9781234567890\tB001ABC123\t29.99\t2",
        "111-1234567-1234567\t2024-01-15\t9780987654321\tB002DEF456\t15.50\t1",
        "222-2345678-2345678\t2024-01-16\tNON-ISBN-SKU\tB003GHI789\t10.00\t3",
      ].join("\n");

      const result = parseAmazonSalesReport(content);
      const stats = getSalesParseStats(result);

      expect(stats.totalRecords).toBe(3);
      expect(stats.validRecords).toBe(3);
      expect(stats.errorCount).toBe(0);
      expect(stats.recordsWithIsbn).toBe(2);
      expect(stats.recordsWithoutIsbn).toBe(1);
      expect(stats.uniqueOrderIds).toBe(2); // Two unique orders
      expect(stats.totalQuantity).toBe(6); // 2 + 1 + 3
      expect(stats.totalValue).toBeCloseTo(55.49); // 29.99 + 15.50 + 10.00
    });

    it("counts errors correctly", () => {
      const content = [
        "amazon-order-id\tpurchase-date\tquantity-purchased",
        "111-1234567-1234567\t2024-01-15\t2",
        "\t2024-01-16\t1", // Missing order ID
        "333-3456789-3456789\t2024-01-17\t-1", // Invalid quantity
      ].join("\n");

      const result = parseAmazonSalesReport(content);
      const stats = getSalesParseStats(result);

      expect(stats.totalRecords).toBe(3); // 1 valid + 2 errors
      expect(stats.validRecords).toBe(1);
      expect(stats.errorCount).toBe(2);
    });
  });

  describe("ISBN normalization", () => {
    it("normalizes ISBN-13 with hyphens - AC3", () => {
      const content = [
        "amazon-order-id\tpurchase-date\tsku",
        "111-1234567-1234567\t2024-01-15\t978-1-234-56789-0",
      ].join("\n");

      const result = parseAmazonSalesReport(content);

      expect(result.sales[0].isbn).toBe("9781234567890");
    });

    it("converts ISBN-10 to ISBN-13 - AC3", () => {
      const content = [
        "amazon-order-id\tpurchase-date\tsku",
        "111-1234567-1234567\t2024-01-15\t0-321-12521-5", // Clean Code ISBN-10
      ].join("\n");

      const result = parseAmazonSalesReport(content);

      expect(result.sales[0].isbn).toHaveLength(13);
      expect(result.sales[0].isbn).toMatch(/^978/);
    });

    it("handles ISBN-10 with X check digit - AC3", () => {
      const content = [
        "amazon-order-id\tpurchase-date\tsku",
        "111-1234567-1234567\t2024-01-15\t097522980X",
      ].join("\n");

      const result = parseAmazonSalesReport(content);

      expect(result.sales[0].isbn).toHaveLength(13);
    });
  });
});
