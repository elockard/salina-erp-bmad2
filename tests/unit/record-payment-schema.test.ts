import { describe, expect, it } from "vitest";
import {
  paymentMethodSchema,
  type RecordPaymentInput,
  recordPaymentSchema,
} from "@/modules/invoices/schema";

/**
 * Unit tests for Record Payment Schema
 *
 * Story 8.4 - Implement Payment Recording
 *
 * AC-8.4.2: Client-side validation - amount > 0, method required
 * AC-8.4.3: Valid payment methods (check, wire, credit_card, ach, other)
 *
 * Note: These are schema validation tests, not integration tests.
 */

describe("recordPaymentSchema", () => {
  describe("valid inputs (AC-8.4.2)", () => {
    it("accepts valid payment with all required fields", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "100.00",
        payment_method: "check" as const,
        reference_number: "CHK-12345",
        notes: "Payment received",
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts payment without optional fields", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "500.00",
        payment_method: "wire" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("accepts decimal amounts", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "123.45",
        payment_method: "credit_card" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("coerces date strings to Date objects", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: "2024-12-06",
        amount: "100.00",
        payment_method: "ach" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.payment_date instanceof Date).toBe(true);
      }
    });
  });

  describe("invalid inputs (AC-8.4.2)", () => {
    it("rejects negative amount", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "-100.00",
        payment_method: "check" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects zero amount", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "0.00",
        payment_method: "check" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid invoice_id format", () => {
      const input = {
        invoice_id: "not-a-uuid",
        payment_date: new Date("2024-12-06"),
        amount: "100.00",
        payment_method: "check" as const,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects missing payment_method", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "100.00",
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid payment_method", () => {
      const input = {
        invoice_id: "550e8400-e29b-41d4-a716-446655440000",
        payment_date: new Date("2024-12-06"),
        amount: "100.00",
        payment_method: "bitcoin" as never,
      };

      const result = recordPaymentSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("paymentMethodSchema (AC-8.4.3)", () => {
  describe("valid payment methods", () => {
    it("accepts 'check'", () => {
      const result = paymentMethodSchema.safeParse("check");
      expect(result.success).toBe(true);
    });

    it("accepts 'wire'", () => {
      const result = paymentMethodSchema.safeParse("wire");
      expect(result.success).toBe(true);
    });

    it("accepts 'credit_card'", () => {
      const result = paymentMethodSchema.safeParse("credit_card");
      expect(result.success).toBe(true);
    });

    it("accepts 'ach'", () => {
      const result = paymentMethodSchema.safeParse("ach");
      expect(result.success).toBe(true);
    });

    it("accepts 'other'", () => {
      const result = paymentMethodSchema.safeParse("other");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid payment methods", () => {
    it("rejects invalid method 'cash'", () => {
      const result = paymentMethodSchema.safeParse("cash");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = paymentMethodSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = paymentMethodSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe("RecordPaymentInput type", () => {
  it("has all required fields", () => {
    const input: RecordPaymentInput = {
      invoice_id: "550e8400-e29b-41d4-a716-446655440000",
      payment_date: new Date("2024-12-06"),
      amount: "100.00",
      payment_method: "check",
      reference_number: null,
      notes: null,
    };

    expect(input.invoice_id).toBeDefined();
    expect(input.payment_date).toBeDefined();
    expect(input.amount).toBeDefined();
    expect(input.payment_method).toBeDefined();
  });

  it("supports optional reference_number", () => {
    const inputWithRef: RecordPaymentInput = {
      invoice_id: "550e8400-e29b-41d4-a716-446655440000",
      payment_date: new Date("2024-12-06"),
      amount: "100.00",
      payment_method: "wire",
      reference_number: "WIRE-2024-001",
      notes: null,
    };

    expect(inputWithRef.reference_number).toBe("WIRE-2024-001");
  });

  it("supports optional notes", () => {
    const inputWithNotes: RecordPaymentInput = {
      invoice_id: "550e8400-e29b-41d4-a716-446655440000",
      payment_date: new Date("2024-12-06"),
      amount: "100.00",
      payment_method: "ach",
      reference_number: null,
      notes: "Quarterly payment",
    };

    expect(inputWithNotes.notes).toBe("Quarterly payment");
  });
});
