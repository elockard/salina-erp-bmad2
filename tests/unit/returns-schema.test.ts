import { describe, expect, it } from "vitest";
import { returnStatusValues } from "@/db/schema/returns";
import { salesFormatValues } from "@/db/schema/sales";
import {
  approveReturnSchema,
  bulkReturnActionSchema,
  createReturnSchema,
  positiveCurrencySchema,
  positiveIntegerSchema,
  returnDateSchema,
  returnFilterSchema,
  returnFormatSchema,
  returnReasonSchema,
  returnReasonValues,
  returnStatusSchema,
} from "@/modules/returns/schema";

/**
 * Unit tests for Returns Zod schemas
 *
 * Story 3.4 - AC 1-9: Unit tests validate schema constraints
 * Story 3.5 - AC 4, 5, 6, 7, 13: Form validation tests
 * - Return status enum values correct (pending, approved, rejected)
 * - Return format enum values correct (physical, ebook, audiobook)
 * - Return reason enum values correct (damaged, unsold_inventory, customer_return, other)
 * - Quantity validation (positive integer)
 * - Currency validation (positive decimal)
 * - Date validation (not future)
 * - Create return schema validation with reason conditional
 * - Approve return schema validation
 */

describe("returnStatusSchema", () => {
  describe("valid values", () => {
    it("accepts 'pending'", () => {
      const result = returnStatusSchema.safeParse("pending");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("pending");
      }
    });

    it("accepts 'approved'", () => {
      const result = returnStatusSchema.safeParse("approved");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("approved");
      }
    });

    it("accepts 'rejected'", () => {
      const result = returnStatusSchema.safeParse("rejected");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("rejected");
      }
    });

    it("accepts all three valid status values", () => {
      expect(returnStatusValues).toHaveLength(3);
      for (const status of returnStatusValues) {
        const result = returnStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'cancelled'", () => {
      const result = returnStatusSchema.safeParse("cancelled");
      expect(result.success).toBe(false);
    });

    it("rejects 'processing'", () => {
      const result = returnStatusSchema.safeParse("processing");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = returnStatusSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'PENDING'", () => {
      const result = returnStatusSchema.safeParse("PENDING");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = returnStatusSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("rejects undefined", () => {
      const result = returnStatusSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});

describe("returnFormatSchema", () => {
  describe("valid values", () => {
    it("accepts 'physical'", () => {
      const result = returnFormatSchema.safeParse("physical");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("physical");
      }
    });

    it("accepts 'ebook'", () => {
      const result = returnFormatSchema.safeParse("ebook");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("ebook");
      }
    });

    it("accepts 'audiobook'", () => {
      const result = returnFormatSchema.safeParse("audiobook");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("audiobook");
      }
    });

    it("accepts all three valid format values", () => {
      for (const format of salesFormatValues) {
        const result = returnFormatSchema.safeParse(format);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(format);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'hardcover'", () => {
      const result = returnFormatSchema.safeParse("hardcover");
      expect(result.success).toBe(false);
    });

    it("rejects 'paperback'", () => {
      const result = returnFormatSchema.safeParse("paperback");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = returnFormatSchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });
});

describe("positiveIntegerSchema", () => {
  describe("valid values", () => {
    it("accepts 1", () => {
      const result = positiveIntegerSchema.safeParse(1);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(1);
      }
    });

    it("accepts 100", () => {
      const result = positiveIntegerSchema.safeParse(100);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(100);
      }
    });

    it("accepts large positive integer", () => {
      const result = positiveIntegerSchema.safeParse(999999);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects 0", () => {
      const result = positiveIntegerSchema.safeParse(0);
      expect(result.success).toBe(false);
    });

    it("rejects negative integer", () => {
      const result = positiveIntegerSchema.safeParse(-5);
      expect(result.success).toBe(false);
    });

    it("rejects decimal", () => {
      const result = positiveIntegerSchema.safeParse(1.5);
      expect(result.success).toBe(false);
    });

    it("rejects string", () => {
      const result = positiveIntegerSchema.safeParse("5");
      expect(result.success).toBe(false);
    });
  });
});

describe("positiveCurrencySchema", () => {
  describe("valid values", () => {
    it("accepts '10.00'", () => {
      const result = positiveCurrencySchema.safeParse("10.00");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("10.00");
      }
    });

    it("accepts '0.99'", () => {
      const result = positiveCurrencySchema.safeParse("0.99");
      expect(result.success).toBe(true);
    });

    it("accepts '1000'", () => {
      const result = positiveCurrencySchema.safeParse("1000");
      expect(result.success).toBe(true);
    });

    it("accepts '25.5' (single decimal place)", () => {
      const result = positiveCurrencySchema.safeParse("25.5");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects '0'", () => {
      const result = positiveCurrencySchema.safeParse("0");
      expect(result.success).toBe(false);
    });

    it("rejects '0.00'", () => {
      const result = positiveCurrencySchema.safeParse("0.00");
      expect(result.success).toBe(false);
    });

    it("rejects negative amount", () => {
      const result = positiveCurrencySchema.safeParse("-10.00");
      expect(result.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const result = positiveCurrencySchema.safeParse("10.999");
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric string", () => {
      const result = positiveCurrencySchema.safeParse("abc");
      expect(result.success).toBe(false);
    });
  });
});

describe("returnDateSchema", () => {
  describe("valid values", () => {
    it("accepts ISO date format", () => {
      const result = returnDateSchema.safeParse("2024-01-15");
      expect(result.success).toBe(true);
    });

    it("accepts full ISO datetime", () => {
      const result = returnDateSchema.safeParse("2024-01-15T10:30:00Z");
      expect(result.success).toBe(true);
    });

    it("accepts today's date (Story 3.5 AC 6)", () => {
      const today = new Date().toISOString().split("T")[0];
      const result = returnDateSchema.safeParse(today);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects invalid date string", () => {
      const result = returnDateSchema.safeParse("not-a-date");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = returnDateSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects future date (Story 3.5 AC 6)", () => {
      // Create a date 30 days in the future
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      const result = returnDateSchema.safeParse(
        futureDate.toISOString().split("T")[0],
      );
      expect(result.success).toBe(false);
    });
  });
});

describe("returnReasonSchema (Story 3.5 AC 7)", () => {
  describe("valid values", () => {
    it("accepts 'damaged'", () => {
      const result = returnReasonSchema.safeParse("damaged");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("damaged");
      }
    });

    it("accepts 'unsold_inventory'", () => {
      const result = returnReasonSchema.safeParse("unsold_inventory");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("unsold_inventory");
      }
    });

    it("accepts 'customer_return'", () => {
      const result = returnReasonSchema.safeParse("customer_return");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("customer_return");
      }
    });

    it("accepts 'other'", () => {
      const result = returnReasonSchema.safeParse("other");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("other");
      }
    });

    it("accepts all four valid reason values", () => {
      expect(returnReasonValues).toHaveLength(4);
      for (const reason of returnReasonValues) {
        const result = returnReasonSchema.safeParse(reason);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(reason);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'defective'", () => {
      const result = returnReasonSchema.safeParse("defective");
      expect(result.success).toBe(false);
    });

    it("rejects 'wrong_item'", () => {
      const result = returnReasonSchema.safeParse("wrong_item");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = returnReasonSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'DAMAGED'", () => {
      const result = returnReasonSchema.safeParse("DAMAGED");
      expect(result.success).toBe(false);
    });
  });
});

describe("returnReasonValues const array (Story 3.5 AC 7)", () => {
  it("has exactly 4 values", () => {
    expect(returnReasonValues).toHaveLength(4);
  });

  it("contains damaged", () => {
    expect(returnReasonValues).toContain("damaged");
  });

  it("contains unsold_inventory", () => {
    expect(returnReasonValues).toContain("unsold_inventory");
  });

  it("contains customer_return", () => {
    expect(returnReasonValues).toContain("customer_return");
  });

  it("contains other", () => {
    expect(returnReasonValues).toContain("other");
  });
});

describe("createReturnSchema (Story 3.5)", () => {
  const validReturn = {
    title_id: "550e8400-e29b-41d4-a716-446655440000",
    format: "physical" as const,
    quantity: 5,
    unit_price: "10.99",
    total_amount: "54.95",
    return_date: "2024-01-15",
    reason: "damaged" as const,
  };

  describe("valid inputs", () => {
    it("accepts valid return with required fields", () => {
      const result = createReturnSchema.safeParse(validReturn);
      expect(result.success).toBe(true);
    });

    it("accepts valid return with reason 'damaged' (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "damaged",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with reason 'unsold_inventory' (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "unsold_inventory",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with reason 'customer_return' (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "customer_return",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with reason 'other' and reason_other text (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "other",
        reason_other: "Custom reason description",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with original_sale_reference (AC 8)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        original_sale_reference: "Invoice #12345",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all format types", () => {
      for (const format of salesFormatValues) {
        const result = createReturnSchema.safeParse({
          ...validReturn,
          format,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing title_id", () => {
      const { title_id, ...noTitleId } = validReturn;
      const result = createReturnSchema.safeParse(noTitleId);
      expect(result.success).toBe(false);
    });

    it("rejects invalid title_id format", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        title_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing format", () => {
      const { format, ...noFormat } = validReturn;
      const result = createReturnSchema.safeParse(noFormat);
      expect(result.success).toBe(false);
    });

    it("rejects zero quantity (AC 4)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity (AC 4)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero unit_price (AC 5)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        unit_price: "0",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative unit_price (AC 5)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        unit_price: "-10.00",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid date", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        return_date: "invalid-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing reason (AC 7)", () => {
      const { reason, ...noReason } = validReturn;
      const result = createReturnSchema.safeParse(noReason);
      expect(result.success).toBe(false);
    });

    it("rejects invalid reason value (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "invalid_reason",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason 'other' without reason_other text (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "other",
        // reason_other is missing
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason 'other' with empty reason_other text (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "other",
        reason_other: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason 'other' with whitespace-only reason_other (AC 7)", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "other",
        reason_other: "   ",
      });
      expect(result.success).toBe(false);
    });

    it("rejects reason_other over 500 characters", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "other",
        reason_other: "x".repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("returnFilterSchema", () => {
  it("accepts empty filter", () => {
    const result = returnFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts filter with title_id", () => {
    const result = returnFilterSchema.safeParse({
      title_id: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("accepts filter with status", () => {
    const result = returnFilterSchema.safeParse({
      status: "pending",
    });
    expect(result.success).toBe(true);
  });

  it("accepts filter with date range", () => {
    const result = returnFilterSchema.safeParse({
      start_date: "2024-01-01",
      end_date: "2024-01-31",
    });
    expect(result.success).toBe(true);
  });

  it("accepts filter with all fields", () => {
    const result = returnFilterSchema.safeParse({
      title_id: "550e8400-e29b-41d4-a716-446655440000",
      format: "physical",
      status: "approved",
      start_date: "2024-01-01",
      end_date: "2024-01-31",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid status in filter", () => {
    const result = returnFilterSchema.safeParse({
      status: "invalid",
    });
    expect(result.success).toBe(false);
  });
});

describe("approveReturnSchema", () => {
  it("accepts approve action", () => {
    const result = approveReturnSchema.safeParse({
      return_id: "550e8400-e29b-41d4-a716-446655440000",
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("accepts reject action", () => {
    const result = approveReturnSchema.safeParse({
      return_id: "550e8400-e29b-41d4-a716-446655440000",
      action: "reject",
    });
    expect(result.success).toBe(true);
  });

  it("accepts reject action with reason", () => {
    const result = approveReturnSchema.safeParse({
      return_id: "550e8400-e29b-41d4-a716-446655440000",
      action: "reject",
      reason: "Insufficient documentation",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = approveReturnSchema.safeParse({
      return_id: "550e8400-e29b-41d4-a716-446655440000",
      action: "cancel",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing return_id", () => {
    const result = approveReturnSchema.safeParse({
      action: "approve",
    });
    expect(result.success).toBe(false);
  });
});

describe("bulkReturnActionSchema", () => {
  it("accepts valid bulk action", () => {
    const result = bulkReturnActionSchema.safeParse({
      return_ids: [
        "550e8400-e29b-41d4-a716-446655440000",
        "550e8400-e29b-41d4-a716-446655440001",
      ],
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty return_ids array", () => {
    const result = bulkReturnActionSchema.safeParse({
      return_ids: [],
      action: "approve",
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid UUID in array", () => {
    const result = bulkReturnActionSchema.safeParse({
      return_ids: ["550e8400-e29b-41d4-a716-446655440000", "invalid-uuid"],
      action: "approve",
    });
    expect(result.success).toBe(false);
  });
});

describe("returnStatusValues const array", () => {
  it("has exactly 3 values", () => {
    expect(returnStatusValues).toHaveLength(3);
  });

  it("contains pending", () => {
    expect(returnStatusValues).toContain("pending");
  });

  it("contains approved", () => {
    expect(returnStatusValues).toContain("approved");
  });

  it("contains rejected", () => {
    expect(returnStatusValues).toContain("rejected");
  });

  it("has expected values in order", () => {
    // TypeScript ensures readonly at compile time via 'as const'
    // Runtime check verifies the exact values and order
    expect(returnStatusValues[0]).toBe("pending");
    expect(returnStatusValues[1]).toBe("approved");
    expect(returnStatusValues[2]).toBe("rejected");
  });
});
