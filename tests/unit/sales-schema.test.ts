import { describe, expect, it } from "vitest";
import { salesChannelValues, salesFormatValues } from "@/db/schema/sales";
import {
  createSaleSchema,
  positiveCurrencySchema,
  positiveIntegerSchema,
  saleDateSchema,
  salesChannelSchema,
  salesFilterSchema,
  salesFormatSchema,
} from "@/modules/sales/schema";

/**
 * Unit tests for Sales Zod schemas
 *
 * Story 3.1 - AC 1-7: Unit tests validate schema constraints
 * - Sales channel enum values correct (retail, wholesale, direct, distributor)
 * - Sales format enum values correct (physical, ebook, audiobook)
 * - Quantity validation (positive integer)
 * - Currency validation (positive decimal)
 * - Date validation
 * - Create sale schema validation
 */

describe("salesChannelSchema", () => {
  describe("valid values", () => {
    it("accepts 'retail'", () => {
      const result = salesChannelSchema.safeParse("retail");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("retail");
      }
    });

    it("accepts 'wholesale'", () => {
      const result = salesChannelSchema.safeParse("wholesale");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("wholesale");
      }
    });

    it("accepts 'direct'", () => {
      const result = salesChannelSchema.safeParse("direct");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("direct");
      }
    });

    it("accepts 'distributor'", () => {
      const result = salesChannelSchema.safeParse("distributor");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("distributor");
      }
    });

    it("accepts all four valid channel values", () => {
      for (const channel of salesChannelValues) {
        const result = salesChannelSchema.safeParse(channel);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(channel);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'online'", () => {
      const result = salesChannelSchema.safeParse("online");
      expect(result.success).toBe(false);
    });

    it("rejects 'amazon'", () => {
      const result = salesChannelSchema.safeParse("amazon");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = salesChannelSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'RETAIL'", () => {
      const result = salesChannelSchema.safeParse("RETAIL");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = salesChannelSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("rejects undefined", () => {
      const result = salesChannelSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});

describe("salesFormatSchema", () => {
  describe("valid values", () => {
    it("accepts 'physical'", () => {
      const result = salesFormatSchema.safeParse("physical");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("physical");
      }
    });

    it("accepts 'ebook'", () => {
      const result = salesFormatSchema.safeParse("ebook");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("ebook");
      }
    });

    it("accepts 'audiobook'", () => {
      const result = salesFormatSchema.safeParse("audiobook");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("audiobook");
      }
    });

    it("accepts all three valid format values", () => {
      for (const format of salesFormatValues) {
        const result = salesFormatSchema.safeParse(format);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(format);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'hardcover'", () => {
      const result = salesFormatSchema.safeParse("hardcover");
      expect(result.success).toBe(false);
    });

    it("rejects 'paperback'", () => {
      const result = salesFormatSchema.safeParse("paperback");
      expect(result.success).toBe(false);
    });

    it("rejects 'digital'", () => {
      const result = salesFormatSchema.safeParse("digital");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = salesFormatSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'PHYSICAL'", () => {
      const result = salesFormatSchema.safeParse("PHYSICAL");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = salesFormatSchema.safeParse(null);
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

    it("rejects negative numbers", () => {
      const result = positiveIntegerSchema.safeParse(-1);
      expect(result.success).toBe(false);
    });

    it("rejects decimal numbers", () => {
      const result = positiveIntegerSchema.safeParse(1.5);
      expect(result.success).toBe(false);
    });

    it("rejects string numbers", () => {
      const result = positiveIntegerSchema.safeParse("5");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = positiveIntegerSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe("positiveCurrencySchema", () => {
  describe("valid values", () => {
    it("accepts '9.99'", () => {
      const result = positiveCurrencySchema.safeParse("9.99");
      expect(result.success).toBe(true);
    });

    it("accepts '100'", () => {
      const result = positiveCurrencySchema.safeParse("100");
      expect(result.success).toBe(true);
    });

    it("accepts '0.01' (minimum valid)", () => {
      const result = positiveCurrencySchema.safeParse("0.01");
      expect(result.success).toBe(true);
    });

    it("accepts '1000.50'", () => {
      const result = positiveCurrencySchema.safeParse("1000.50");
      expect(result.success).toBe(true);
    });

    it("accepts single decimal place '5.5'", () => {
      const result = positiveCurrencySchema.safeParse("5.5");
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

    it("rejects negative amounts", () => {
      const result = positiveCurrencySchema.safeParse("-9.99");
      expect(result.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const result = positiveCurrencySchema.safeParse("9.999");
      expect(result.success).toBe(false);
    });

    it("rejects non-numeric strings", () => {
      const result = positiveCurrencySchema.safeParse("abc");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = positiveCurrencySchema.safeParse("");
      expect(result.success).toBe(false);
    });
  });
});

describe("saleDateSchema", () => {
  describe("valid values", () => {
    it("accepts ISO date string '2024-01-15'", () => {
      const result = saleDateSchema.safeParse("2024-01-15");
      expect(result.success).toBe(true);
    });

    it("accepts full ISO datetime '2024-01-15T10:30:00Z'", () => {
      const result = saleDateSchema.safeParse("2024-01-15T10:30:00Z");
      expect(result.success).toBe(true);
    });

    it("accepts date string 'January 15, 2024'", () => {
      const result = saleDateSchema.safeParse("January 15, 2024");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid values", () => {
    it("rejects invalid date string", () => {
      const result = saleDateSchema.safeParse("not-a-date");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = saleDateSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects invalid date format", () => {
      const result = saleDateSchema.safeParse("32-13-2024");
      expect(result.success).toBe(false);
    });
  });
});

describe("createSaleSchema", () => {
  const validTitleId = "123e4567-e89b-12d3-a456-426614174000";

  const validSaleInput = {
    title_id: validTitleId,
    format: "physical",
    quantity: 5,
    unit_price: "19.99",
    total_amount: "99.95",
    sale_date: "2024-01-15",
    channel: "retail",
  };

  describe("valid inputs", () => {
    it("accepts valid sale with physical format and retail channel", () => {
      const result = createSaleSchema.safeParse(validSaleInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title_id).toBe(validTitleId);
        expect(result.data.format).toBe("physical");
        expect(result.data.quantity).toBe(5);
        expect(result.data.unit_price).toBe("19.99");
        expect(result.data.total_amount).toBe("99.95");
        expect(result.data.channel).toBe("retail");
      }
    });

    it("accepts valid sale with ebook format and wholesale channel", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        format: "ebook",
        channel: "wholesale",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid sale with audiobook format and direct channel", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        format: "audiobook",
        channel: "direct",
      });
      expect(result.success).toBe(true);
    });

    it("accepts valid sale with distributor channel", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        channel: "distributor",
      });
      expect(result.success).toBe(true);
    });

    it("accepts quantity of 1", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        quantity: 1,
        total_amount: "19.99",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing title_id", () => {
      const { title_id, ...inputWithoutTitleId } = validSaleInput;
      const result = createSaleSchema.safeParse(inputWithoutTitleId);
      expect(result.success).toBe(false);
    });

    it("rejects invalid title_id format", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        title_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing format", () => {
      const { format, ...inputWithoutFormat } = validSaleInput;
      const result = createSaleSchema.safeParse(inputWithoutFormat);
      expect(result.success).toBe(false);
    });

    it("rejects invalid format", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        format: "hardcover",
      });
      expect(result.success).toBe(false);
    });

    it("rejects quantity of 0", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        quantity: 0,
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative quantity", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        quantity: -1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects decimal quantity", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        quantity: 1.5,
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero unit_price", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        unit_price: "0",
      });
      expect(result.success).toBe(false);
    });

    it("rejects negative unit_price", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        unit_price: "-19.99",
      });
      expect(result.success).toBe(false);
    });

    it("rejects zero total_amount", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        total_amount: "0",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid channel", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        channel: "amazon",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid sale_date", () => {
      const result = createSaleSchema.safeParse({
        ...validSaleInput,
        sale_date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing sale_date", () => {
      const { sale_date, ...inputWithoutDate } = validSaleInput;
      const result = createSaleSchema.safeParse(inputWithoutDate);
      expect(result.success).toBe(false);
    });

    it("rejects empty object", () => {
      const result = createSaleSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });
});

describe("salesFilterSchema", () => {
  const validTitleId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid filter with all fields", () => {
      const result = salesFilterSchema.safeParse({
        title_id: validTitleId,
        format: "physical",
        channel: "retail",
        start_date: "2024-01-01",
        end_date: "2024-12-31",
      });
      expect(result.success).toBe(true);
    });

    it("accepts empty filter", () => {
      const result = salesFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial filter with title_id only", () => {
      const result = salesFilterSchema.safeParse({
        title_id: validTitleId,
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial filter with format only", () => {
      const result = salesFilterSchema.safeParse({
        format: "ebook",
      });
      expect(result.success).toBe(true);
    });

    it("accepts partial filter with channel only", () => {
      const result = salesFilterSchema.safeParse({
        channel: "wholesale",
      });
      expect(result.success).toBe(true);
    });

    it("accepts date range filter", () => {
      const result = salesFilterSchema.safeParse({
        start_date: "2024-01-01",
        end_date: "2024-06-30",
      });
      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid title_id format", () => {
      const result = salesFilterSchema.safeParse({
        title_id: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid format in filter", () => {
      const result = salesFilterSchema.safeParse({
        format: "hardcover",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid channel in filter", () => {
      const result = salesFilterSchema.safeParse({
        channel: "amazon",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid start_date", () => {
      const result = salesFilterSchema.safeParse({
        start_date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid end_date", () => {
      const result = salesFilterSchema.safeParse({
        end_date: "not-a-date",
      });
      expect(result.success).toBe(false);
    });
  });
});

describe("schema exports from db/schema/sales", () => {
  it("salesChannelValues has exactly 4 channels", () => {
    expect(salesChannelValues).toHaveLength(4);
    expect(salesChannelValues).toEqual([
      "retail",
      "wholesale",
      "direct",
      "distributor",
    ]);
  });

  it("salesFormatValues has exactly 3 formats", () => {
    expect(salesFormatValues).toHaveLength(3);
    expect(salesFormatValues).toEqual(["physical", "ebook", "audiobook"]);
  });
});
