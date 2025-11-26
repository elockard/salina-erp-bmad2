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
  returnStatusSchema,
} from "@/modules/returns/schema";

/**
 * Unit tests for Returns Zod schemas
 *
 * Story 3.4 - AC 1-9: Unit tests validate schema constraints
 * - Return status enum values correct (pending, approved, rejected)
 * - Return format enum values correct (physical, ebook, audiobook)
 * - Quantity validation (positive integer)
 * - Currency validation (positive decimal)
 * - Date validation
 * - Create return schema validation
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
  });
});

describe("createReturnSchema", () => {
  const validReturn = {
    title_id: "550e8400-e29b-41d4-a716-446655440000",
    format: "physical" as const,
    quantity: 5,
    unit_price: "10.99",
    total_amount: "54.95",
    return_date: "2024-01-15",
  };

  describe("valid inputs", () => {
    it("accepts valid return without optional fields", () => {
      const result = createReturnSchema.safeParse(validReturn);
      expect(result.success).toBe(true);
    });

    it("accepts valid return with reason", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "Damaged in shipping",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid return with original_sale_id", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        original_sale_id: "660e8400-e29b-41d4-a716-446655440001",
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

    it("rejects zero quantity", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        quantity: -5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero unit_price", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        unit_price: "0",
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

    it("rejects reason over 1000 characters", () => {
      const result = createReturnSchema.safeParse({
        ...validReturn,
        reason: "x".repeat(1001),
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
