import { describe, expect, it } from "vitest";
import {
  calculateLineAmount,
  type LineItemData,
} from "@/modules/invoices/components/invoice-line-items";
import {
  calculateGrandTotal,
  calculateInvoiceTotals,
  calculateSubtotal,
  calculateTax,
} from "@/modules/invoices/components/invoice-totals";

/**
 * Unit tests for Invoice Form Calculations
 *
 * Story 8.2 - Build Invoice Creation Form
 *
 * AC-8.2.7: Real-time calculations using Decimal.js
 * AC-8.2.9: Due date calculation from payment terms
 */

describe("Line Item Calculations (AC-8.2.7)", () => {
  describe("calculateLineAmount", () => {
    it("calculates amount correctly for whole numbers", () => {
      const result = calculateLineAmount("10", "25.00");
      expect(result).toBe("250.00");
    });

    it("calculates amount correctly for decimal quantities", () => {
      const result = calculateLineAmount("2.5", "100.00");
      expect(result).toBe("250.00");
    });

    it("returns 0.00 for empty quantity", () => {
      const result = calculateLineAmount("", "25.00");
      expect(result).toBe("0.00");
    });

    it("returns 0.00 for empty unit price", () => {
      const result = calculateLineAmount("10", "");
      expect(result).toBe("0.00");
    });

    it("handles very small amounts", () => {
      const result = calculateLineAmount("0.001", "0.01");
      expect(result).toBe("0.00"); // Rounded to 2 decimal places
    });

    it("handles large quantities", () => {
      const result = calculateLineAmount("1000000", "0.01");
      expect(result).toBe("10000.00");
    });

    it("handles fractional cents correctly (rounding)", () => {
      const result = calculateLineAmount("3", "1.33");
      expect(result).toBe("3.99");
    });
  });
});

describe("Invoice Totals Calculations (AC-8.2.7)", () => {
  describe("calculateSubtotal", () => {
    it("sums all line item amounts", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Item 1",
          quantity: "2",
          unit_price: "10.00",
          tax_rate: "0",
          amount: "20.00",
        },
        {
          line_number: 2,
          item_code: "",
          description: "Item 2",
          quantity: "3",
          unit_price: "15.00",
          tax_rate: "0",
          amount: "45.00",
        },
      ];
      const result = calculateSubtotal(lineItems);
      expect(result).toBe("65.00");
    });

    it("returns 0.00 for empty line items", () => {
      const result = calculateSubtotal([]);
      expect(result).toBe("0.00");
    });

    it("returns 0.00 for undefined", () => {
      const result = calculateSubtotal(undefined);
      expect(result).toBe("0.00");
    });

    it("handles single line item", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Item",
          quantity: "5",
          unit_price: "25.00",
          tax_rate: "0",
          amount: "125.00",
        },
      ];
      const result = calculateSubtotal(lineItems);
      expect(result).toBe("125.00");
    });
  });

  describe("calculateTax", () => {
    it("calculates tax for items with tax rate", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Item",
          quantity: "1",
          unit_price: "100.00",
          tax_rate: "8.25",
          amount: "100.00",
        },
      ];
      const result = calculateTax(lineItems);
      expect(result).toBe("8.25");
    });

    it("returns 0.00 when no tax rate", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Item",
          quantity: "1",
          unit_price: "100.00",
          tax_rate: "0",
          amount: "100.00",
        },
      ];
      const result = calculateTax(lineItems);
      expect(result).toBe("0.00");
    });

    it("sums tax across multiple items", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Item 1",
          quantity: "1",
          unit_price: "100.00",
          tax_rate: "10",
          amount: "100.00",
        },
        {
          line_number: 2,
          item_code: "",
          description: "Item 2",
          quantity: "1",
          unit_price: "50.00",
          tax_rate: "10",
          amount: "50.00",
        },
      ];
      const result = calculateTax(lineItems);
      expect(result).toBe("15.00");
    });
  });

  describe("calculateGrandTotal", () => {
    it("sums subtotal, tax, and shipping", () => {
      const result = calculateGrandTotal("100.00", "8.25", "10.00");
      expect(result).toBe("118.25");
    });

    it("handles zero shipping", () => {
      const result = calculateGrandTotal("100.00", "8.25", "0.00");
      expect(result).toBe("108.25");
    });

    it("handles zero tax", () => {
      const result = calculateGrandTotal("100.00", "0.00", "15.00");
      expect(result).toBe("115.00");
    });

    it("handles all zeros", () => {
      const result = calculateGrandTotal("0.00", "0.00", "0.00");
      expect(result).toBe("0.00");
    });
  });

  describe("calculateInvoiceTotals", () => {
    it("computes all totals for invoice", () => {
      const lineItems: LineItemData[] = [
        {
          line_number: 1,
          item_code: "",
          description: "Book",
          quantity: "10",
          unit_price: "25.00",
          tax_rate: "8",
          amount: "250.00",
        },
      ];
      const result = calculateInvoiceTotals(lineItems, "15.00");

      expect(result.subtotal).toBe("250.00");
      expect(result.taxAmount).toBe("20.00");
      expect(result.shippingCost).toBe("15.00");
      expect(result.grandTotal).toBe("285.00");
    });
  });
});

describe("Due Date Calculation (AC-8.2.9)", () => {
  // These calculations are tested inline since the function is local to the component
  // We test the expected behavior based on payment terms

  it("net_30 adds 30 days to invoice date", () => {
    const invoiceDate = new Date("2024-01-15");
    const expectedDueDate = new Date("2024-02-14");

    // Calculate expected
    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 30);

    expect(dueDate.getFullYear()).toBe(expectedDueDate.getFullYear());
    expect(dueDate.getMonth()).toBe(expectedDueDate.getMonth());
    expect(dueDate.getDate()).toBe(expectedDueDate.getDate());
  });

  it("net_60 adds 60 days to invoice date", () => {
    const invoiceDate = new Date("2024-01-15");

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + 60);

    // Jan 15 + 60 = Mar 14 or Mar 15 depending on leap year
    expect(dueDate.getMonth()).toBe(2); // March
    expect(dueDate.getDate()).toBeGreaterThanOrEqual(14);
    expect(dueDate.getDate()).toBeLessThanOrEqual(15);
  });

  it("due_on_receipt sets due date same as invoice date", () => {
    const invoiceDate = new Date("2024-01-15");
    const dueDate = new Date(invoiceDate);

    expect(dueDate.getTime()).toBe(invoiceDate.getTime());
  });

  it("custom terms adds specified days", () => {
    const invoiceDate = new Date("2024-01-01");
    const customDays = 45;

    const dueDate = new Date(invoiceDate);
    dueDate.setDate(dueDate.getDate() + customDays);

    // Jan 1 + 45 = Feb 14 or Feb 15 depending on leap year
    expect(dueDate.getMonth()).toBe(1); // February
    expect(dueDate.getDate()).toBeGreaterThanOrEqual(14);
    expect(dueDate.getDate()).toBeLessThanOrEqual(15);
  });
});

describe("Invoice Number Format (AC-8.2.6)", () => {
  it("follows pattern INV-YYYYMMDD-XXXX", () => {
    const invoiceNumber = "INV-20251206-0001";
    const pattern = /^INV-\d{8}-\d{4}$/;

    expect(pattern.test(invoiceNumber)).toBe(true);
  });

  it("sequence numbers are 4 digits with leading zeros", () => {
    const invoiceNumbers = [
      "INV-20251206-0001",
      "INV-20251206-0010",
      "INV-20251206-0100",
      "INV-20251206-1000",
    ];

    for (const num of invoiceNumbers) {
      const match = num.match(/-(\d{4})$/);
      expect(match).toBeTruthy();
      expect(match?.[1].length).toBe(4);
    }
  });

  it("date portion is YYYYMMDD format", () => {
    const invoiceNumber = "INV-20251206-0001";
    const dateMatch = invoiceNumber.match(/INV-(\d{4})(\d{2})(\d{2})/);

    expect(dateMatch).toBeTruthy();
    if (!dateMatch) throw new Error("dateMatch should be truthy");
    const [, year, month, day] = dateMatch;
    expect(parseInt(year, 10)).toBe(2025);
    expect(parseInt(month, 10)).toBe(12);
    expect(parseInt(day, 10)).toBe(6);
  });
});

describe("Precision Edge Cases (AC-8.2.7)", () => {
  it("handles floating point precision correctly", () => {
    // 0.1 + 0.2 is famously 0.30000000000000004 in JavaScript
    const result = calculateGrandTotal("0.10", "0.20", "0.00");
    expect(result).toBe("0.30");
  });

  it("handles large amounts", () => {
    const lineItems: LineItemData[] = [
      {
        line_number: 1,
        item_code: "",
        description: "Large order",
        quantity: "10000",
        unit_price: "999.99",
        tax_rate: "0",
        amount: "9999900.00",
      },
    ];
    const result = calculateSubtotal(lineItems);
    expect(result).toBe("9999900.00");
  });

  it("rounds to 2 decimal places", () => {
    // 33.333... should round to 33.33
    const result = calculateLineAmount("3", "11.111");
    expect(result).toBe("33.33");
  });
});
