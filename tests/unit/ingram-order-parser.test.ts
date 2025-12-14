/**
 * Ingram Order Parser Unit Tests
 *
 * Story 16.3 - AC2: Parse Ingram Order File Format
 * Tests for EDI X12 850 and delimited file parsing
 */

import { describe, expect, it } from "vitest";
import {
  normalizeIsbn,
  parseIngramOrderFile,
} from "@/modules/channels/adapters/ingram/order-parser";

describe("Ingram Order Parser", () => {
  describe("parseIngramOrderFile", () => {
    describe("Format Detection", () => {
      it("should detect EDI X12 format when content starts with ISA", () => {
        const ediContent = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231201*1200*U*00401*000000001*0*P*>~
GS*PO*SENDER*RECEIVER*20231201*1200*1*X*004010~
ST*850*0001~
BEG*00*SA*PO123456**20231201~
PO1*1*10*EA*9.99*PE**IB*9780123456789~
SE*4*0001~
GE*1*1~
IEA*1*000000001~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");
        expect(result.format).toBe("edi");
      });

      it("should detect EDI X12 format when content contains ~ delimiter", () => {
        const ediContent = `BEG*00*SA*PO123~PO1*1*5*EA*15.99*PE**IB*9780123456789~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");
        expect(result.format).toBe("edi");
      });

      it("should detect delimited CSV format", () => {
        const csvContent = `order_id,isbn,quantity,unit_price,order_date
PO123,978-0-123-45678-9,5,15.99,2023-12-01`;

        const result = parseIngramOrderFile(csvContent, "test.csv");
        expect(result.format).toBe("delimited");
      });

      it("should detect delimited TSV format", () => {
        const tsvContent = `order_id\tisbn\tquantity\tunit_price\torder_date
PO123\t978-0-123-45678-9\t5\t15.99\t2023-12-01`;

        const result = parseIngramOrderFile(tsvContent, "test.tsv");
        expect(result.format).toBe("delimited");
      });

      it("should return unknown format for unrecognized content", () => {
        const content = "This is just some random text";

        const result = parseIngramOrderFile(content, "test.txt");
        expect(result.format).toBe("unknown");
        expect(result.success).toBe(false);
      });

      it("should handle empty files", () => {
        const result = parseIngramOrderFile("", "empty.txt");
        expect(result.success).toBe(false);
        expect(result.errors[0].message).toBe("Empty file");
      });
    });

    describe("EDI X12 850 Parsing", () => {
      it("should parse valid EDI X12 850 order", () => {
        const ediContent = `BEG*00*SA*PO123456**20231201~
PO1*1*10*EA*9.99*PE**IB*9780123456789~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].orderId).toBe("PO123456");
        expect(result.orders[0].isbn).toBe("9780123456789");
        expect(result.orders[0].quantity).toBe(10);
        expect(result.orders[0].unitPrice).toBe(9.99);
      });

      it("should parse multiple line items in EDI", () => {
        const ediContent = `BEG*00*SA*PO123456**20231201~
PO1*1*10*EA*9.99*PE**IB*9780123456789~
PO1*2*5*EA*14.99*PE**IB*9789876543210~
PO1*3*3*EA*19.99*PE**IB*9781111111111~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(3);
        expect(result.orders[0].quantity).toBe(10);
        expect(result.orders[1].quantity).toBe(5);
        expect(result.orders[2].quantity).toBe(3);
      });

      it("should handle EN qualifier for ISBN", () => {
        const ediContent = `BEG*00*SA*PO123**20231201~
PO1*1*5*EA*12.99*PE**EN*9780123456789~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");

        expect(result.success).toBe(true);
        expect(result.orders[0].isbn).toBe("9780123456789");
      });

      it("should handle missing ISBN in PO1 segment", () => {
        const ediContent = `BEG*00*SA*PO123**20231201~
PO1*1*5*EA*12.99*PE~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");

        expect(result.success).toBe(false);
        expect(result.orders).toHaveLength(0);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain("missing ISBN");
      });

      it("should parse date from BEG segment", () => {
        const ediContent = `BEG*00*SA*PO123**20231215~
PO1*1*5*EA*12.99*PE**IB*9780123456789~`;

        const result = parseIngramOrderFile(ediContent, "test.edi");

        expect(result.orders[0].orderDate.getFullYear()).toBe(2023);
        expect(result.orders[0].orderDate.getMonth()).toBe(11); // December (0-indexed)
        expect(result.orders[0].orderDate.getDate()).toBe(15);
      });
    });

    describe("Delimited File Parsing", () => {
      it("should parse valid CSV with all columns", () => {
        const csvContent = `order_id,isbn,quantity,unit_price,order_date
PO123,9780123456789,5,15.99,2023-12-01`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(1);
        expect(result.orders[0].orderId).toBe("PO123");
        expect(result.orders[0].isbn).toBe("9780123456789");
        expect(result.orders[0].quantity).toBe(5);
        expect(result.orders[0].unitPrice).toBe(15.99);
      });

      it("should handle alternate column names", () => {
        const csvContent = `po_number,isbn13,qty,price,date
PO456,9780123456789,10,9.99,2023-12-01`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders[0].orderId).toBe("PO456");
        expect(result.orders[0].quantity).toBe(10);
      });

      it("should handle TSV format", () => {
        const tsvContent = `order_id\tisbn\tquantity\tunit_price\torder_date
PO789\t9780123456789\t3\t25.00\t2023-12-15`;

        const result = parseIngramOrderFile(tsvContent, "test.tsv");

        expect(result.success).toBe(true);
        expect(result.orders[0].orderId).toBe("PO789");
        expect(result.orders[0].quantity).toBe(3);
        expect(result.orders[0].unitPrice).toBe(25.0);
      });

      it("should handle quoted fields", () => {
        const csvContent = `order_id,isbn,quantity,unit_price,order_date
"PO123,Special",9780123456789,5,15.99,2023-12-01`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders[0].orderId).toBe("PO123,Special");
      });

      it("should fail when ISBN column is missing", () => {
        const csvContent = `order_id,quantity,unit_price,order_date
PO123,5,15.99,2023-12-01`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(false);
        expect(result.errors[0].message).toContain("ISBN column not found");
      });

      it("should generate order ID from filename when missing", () => {
        const csvContent = `isbn,quantity,unit_price
9780123456789,5,15.99`;

        const result = parseIngramOrderFile(csvContent, "orders-2023-12.csv");

        expect(result.success).toBe(true);
        expect(result.orders[0].orderId).toBe("orders-2023-12.csv-1");
      });

      it("should handle missing optional columns", () => {
        const csvContent = `isbn,quantity
9780123456789,5`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders[0].unitPrice).toBe(0);
      });

      it("should skip rows with invalid ISBN", () => {
        const csvContent = `isbn,quantity,unit_price
9780123456789,5,15.99
,3,10.00
9789876543210,2,12.99`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(2);
        expect(result.errors).toHaveLength(1);
      });

      it("should parse multiple date formats", () => {
        const csvContent = `isbn,quantity,order_date
9780123456789,5,12/01/2023
9789876543210,3,12/15/2023
9781111111111,2,06/30/2023`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(3);

        // MM/DD/YYYY format
        expect(result.orders[0].orderDate.getMonth()).toBe(11); // December
        expect(result.orders[1].orderDate.getMonth()).toBe(11); // December
        expect(result.orders[1].orderDate.getDate()).toBe(15);
        expect(result.orders[2].orderDate.getMonth()).toBe(5); // June
      });
    });

    describe("Error Handling", () => {
      it("should continue processing after individual row errors", () => {
        const csvContent = `isbn,quantity,unit_price
9780123456789,5,15.99
invalid,bad,data
9789876543210,3,12.99`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.success).toBe(true);
        expect(result.orders).toHaveLength(2);
        expect(result.errors).toHaveLength(1);
      });

      it("should track line numbers in errors", () => {
        const csvContent = `isbn,quantity,unit_price
9780123456789,5,15.99
,invalid,
9789876543210,3,12.99`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.errors[0].line).toBe(3);
      });

      it("should include raw line in error details", () => {
        const csvContent = `isbn,quantity,unit_price
,0,invalid`;

        const result = parseIngramOrderFile(csvContent, "test.csv");

        expect(result.errors[0].raw).toBe(",0,invalid");
      });
    });
  });

  describe("normalizeIsbn", () => {
    it("should return ISBN-13 unchanged", () => {
      expect(normalizeIsbn("9780123456789")).toBe("9780123456789");
    });

    it("should remove hyphens from ISBN-13", () => {
      expect(normalizeIsbn("978-0-123-45678-9")).toBe("9780123456789");
    });

    it("should remove spaces from ISBN", () => {
      expect(normalizeIsbn("978 0 123 45678 9")).toBe("9780123456789");
    });

    it("should convert ISBN-10 to ISBN-13", () => {
      // ISBN-10: 0-306-40615-2 -> ISBN-13: 978-0-306-40615-7
      expect(normalizeIsbn("0306406152")).toBe("9780306406157");
    });

    it("should handle ISBN-10 with hyphens", () => {
      expect(normalizeIsbn("0-306-40615-2")).toBe("9780306406157");
    });

    it("should handle ISBN-10 with X check digit", () => {
      // ISBN-10: 155404295X -> ISBN-13: 9781554042951
      expect(normalizeIsbn("155404295X")).toBe("9781554042951");
    });

    it("should handle lowercase x check digit", () => {
      expect(normalizeIsbn("155404295x")).toBe("9781554042951");
    });

    it("should be case-insensitive for formatting", () => {
      expect(normalizeIsbn("978-0-123-45678-9")).toBe(
        normalizeIsbn("978 0 123 45678 9"),
      );
    });
  });
});
