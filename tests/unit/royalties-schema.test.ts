import { describe, expect, it } from "vitest";
import {
  contractStatusSchema,
  contractFormatSchema,
  currencySchema,
  rateSchema,
  tierInputSchema,
  createContractSchema,
} from "@/modules/royalties/schema";

/**
 * Unit tests for Royalties Validation Schemas
 *
 * Story 4.2 - AC 4: Tier validation (sequential, non-overlapping)
 * Story 4.2 - AC 6: Server action with validation and permission
 * Story 4.2 - AC 8: Rate boundaries and validation (0-100%)
 * Story 4.2 - AC 9: Schema validation for multi-tenant isolation
 */

describe("contractStatusSchema", () => {
  it("accepts valid status 'active'", () => {
    const result = contractStatusSchema.safeParse("active");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("active");
    }
  });

  it("accepts valid status 'suspended'", () => {
    const result = contractStatusSchema.safeParse("suspended");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("suspended");
    }
  });

  it("accepts valid status 'terminated'", () => {
    const result = contractStatusSchema.safeParse("terminated");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("terminated");
    }
  });

  it("rejects invalid status", () => {
    const result = contractStatusSchema.safeParse("invalid");
    expect(result.success).toBe(false);
  });

  it("rejects empty string", () => {
    const result = contractStatusSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("contractFormatSchema", () => {
  it("accepts valid format 'physical'", () => {
    const result = contractFormatSchema.safeParse("physical");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("physical");
    }
  });

  it("accepts valid format 'ebook'", () => {
    const result = contractFormatSchema.safeParse("ebook");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("ebook");
    }
  });

  it("accepts valid format 'audiobook'", () => {
    const result = contractFormatSchema.safeParse("audiobook");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("audiobook");
    }
  });

  it("rejects invalid format", () => {
    const result = contractFormatSchema.safeParse("hardcover");
    expect(result.success).toBe(false);
  });
});

describe("currencySchema", () => {
  describe("valid values", () => {
    it("accepts zero as string", () => {
      const result = currencySchema.safeParse("0");
      expect(result.success).toBe(true);
    });

    it("accepts empty string", () => {
      const result = currencySchema.safeParse("");
      expect(result.success).toBe(true);
    });

    it("accepts whole numbers", () => {
      const result = currencySchema.safeParse("1000");
      expect(result.success).toBe(true);
    });

    it("accepts numbers with 1 decimal place", () => {
      const result = currencySchema.safeParse("1000.5");
      expect(result.success).toBe(true);
    });

    it("accepts numbers with 2 decimal places", () => {
      const result = currencySchema.safeParse("1000.99");
      expect(result.success).toBe(true);
    });

    it("accepts zero with decimal places", () => {
      const result = currencySchema.safeParse("0.00");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects negative numbers", () => {
      const result = currencySchema.safeParse("-100");
      expect(result.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const result = currencySchema.safeParse("100.999");
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric strings", () => {
      const result = currencySchema.safeParse("abc");
      expect(result.success).toBe(false);
    });
  });
});

describe("rateSchema (AC 8)", () => {
  describe("valid rates (0-100%)", () => {
    it("accepts 0 (0%)", () => {
      const result = rateSchema.safeParse(0);
      expect(result.success).toBe(true);
    });

    it("accepts 0.1 (10%)", () => {
      const result = rateSchema.safeParse(0.1);
      expect(result.success).toBe(true);
    });

    it("accepts 0.15 (15%)", () => {
      const result = rateSchema.safeParse(0.15);
      expect(result.success).toBe(true);
    });

    it("accepts 0.5 (50%)", () => {
      const result = rateSchema.safeParse(0.5);
      expect(result.success).toBe(true);
    });

    it("accepts 1 (100%)", () => {
      const result = rateSchema.safeParse(1);
      expect(result.success).toBe(true);
    });

    it("accepts precise decimal rates", () => {
      const result = rateSchema.safeParse(0.1234);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid rates", () => {
    it("rejects negative rates", () => {
      const result = rateSchema.safeParse(-0.01);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("at least 0%");
      }
    });

    it("rejects rates over 100%", () => {
      const result = rateSchema.safeParse(1.01);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("exceed 100%");
      }
    });

    it("rejects rates way over 100%", () => {
      const result = rateSchema.safeParse(2.5);
      expect(result.success).toBe(false);
    });
  });
});

describe("tierInputSchema", () => {
  describe("valid tier inputs", () => {
    it("accepts a tier with all required fields", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: 0,
        max_quantity: 5000,
        rate: 0.1,
      });
      expect(result.success).toBe(true);
    });

    it("accepts a tier with null max_quantity (unlimited)", () => {
      const result = tierInputSchema.safeParse({
        format: "ebook",
        min_quantity: 5001,
        max_quantity: null,
        rate: 0.15,
      });
      expect(result.success).toBe(true);
    });

    it("accepts audiobook format", () => {
      const result = tierInputSchema.safeParse({
        format: "audiobook",
        min_quantity: 0,
        max_quantity: 1000,
        rate: 0.08,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid tier inputs", () => {
    it("rejects negative min_quantity", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: -1,
        max_quantity: 5000,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects max_quantity less than or equal to min_quantity", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: 5000,
        max_quantity: 5000,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects max_quantity less than min_quantity", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: 5000,
        max_quantity: 4000,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid format", () => {
      const result = tierInputSchema.safeParse({
        format: "invalid",
        min_quantity: 0,
        max_quantity: 5000,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-integer quantities", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: 0.5,
        max_quantity: 5000,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects max_quantity of 0", () => {
      const result = tierInputSchema.safeParse({
        format: "physical",
        min_quantity: 0,
        max_quantity: 0,
        rate: 0.1,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("createContractSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  describe("valid contracts", () => {
    it("accepts a contract with a single tier (unlimited)", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts a contract with multiple sequential tiers", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          { format: "physical", min_quantity: 0, max_quantity: 5000, rate: 0.1 },
          {
            format: "physical",
            min_quantity: 5001,
            max_quantity: 10000,
            rate: 0.125,
          },
          {
            format: "physical",
            min_quantity: 10001,
            max_quantity: null,
            rate: 0.15,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("accepts multiple formats with separate tier structures", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          { format: "physical", min_quantity: 0, max_quantity: 5000, rate: 0.1 },
          {
            format: "physical",
            min_quantity: 5001,
            max_quantity: null,
            rate: 0.15,
          },
          { format: "ebook", min_quantity: 0, max_quantity: null, rate: 0.25 },
        ],
      });
      expect(result.success).toBe(true);
    });

    it("applies default status of 'active'", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("active");
      }
    });

    it("applies default advance amounts", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.advance_amount).toBe("0");
        expect(result.data.advance_paid).toBe("0");
      }
    });

    it("accepts explicit status", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        status: "suspended",
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe("suspended");
      }
    });

    it("accepts explicit advance amounts", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        advance_amount: "5000.00",
        advance_paid: "2500.00",
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.advance_amount).toBe("5000.00");
        expect(result.data.advance_paid).toBe("2500.00");
      }
    });
  });

  describe("tier validation - sequential and non-overlapping (AC 4)", () => {
    it("rejects tiers that do not start at 0", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 1000,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects tiers with gaps", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          { format: "physical", min_quantity: 0, max_quantity: 5000, rate: 0.1 },
          {
            format: "physical",
            min_quantity: 6000,
            max_quantity: null,
            rate: 0.15,
          }, // Gap from 5001-5999
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects tiers with overlaps", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          { format: "physical", min_quantity: 0, max_quantity: 5000, rate: 0.1 },
          {
            format: "physical",
            min_quantity: 4500,
            max_quantity: null,
            rate: 0.15,
          }, // Overlaps with first tier
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-last tier with null max_quantity", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          }, // This is unlimited
          {
            format: "physical",
            min_quantity: 5001,
            max_quantity: null,
            rate: 0.15,
          }, // Can't have a tier after unlimited
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects last tier with defined max_quantity", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: 5000,
            rate: 0.1,
          }, // Last tier must be unlimited
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("UUID validation (AC 9)", () => {
    it("rejects invalid author_id UUID", () => {
      const result = createContractSchema.safeParse({
        author_id: "not-a-uuid",
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid title_id UUID", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: "not-a-uuid",
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty author_id", () => {
      const result = createContractSchema.safeParse({
        author_id: "",
        title_id: validUUID,
        tiers: [
          {
            format: "physical",
            min_quantity: 0,
            max_quantity: null,
            rate: 0.1,
          },
        ],
      });
      expect(result.success).toBe(false);
    });
  });

  describe("tiers array validation", () => {
    it("rejects empty tiers array", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
        tiers: [],
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing tiers field", () => {
      const result = createContractSchema.safeParse({
        author_id: validUUID,
        title_id: validUUID,
      });
      expect(result.success).toBe(false);
    });
  });
});
