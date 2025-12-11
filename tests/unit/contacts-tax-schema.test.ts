/**
 * Unit tests for Tax Info Zod Schemas
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.2, AC-11.1.3: Tax Identification Number Entry and Validation
 *
 * Tests verify:
 * - tinTypeEnum validation
 * - taxInfoSchema validation with SSN/EIN formats
 * - updateTaxInfoSchema for partial updates
 * - W-9 date requirement when w9_received is true
 */

import { describe, expect, it } from "vitest";
import {
  type TaxInfoInput,
  type TinTypeInput,
  taxInfoSchema,
  tinTypeEnum,
  type UpdateTaxInfoInput,
  updateTaxInfoSchema,
} from "@/modules/contacts/schema";

describe("tinTypeEnum (AC-11.1.2)", () => {
  it("accepts ssn", () => {
    expect(tinTypeEnum.safeParse("ssn").success).toBe(true);
  });

  it("accepts ein", () => {
    expect(tinTypeEnum.safeParse("ein").success).toBe(true);
  });

  it("rejects invalid type", () => {
    expect(tinTypeEnum.safeParse("itin").success).toBe(false);
    expect(tinTypeEnum.safeParse("").success).toBe(false);
    expect(tinTypeEnum.safeParse("SSN").success).toBe(false);
  });
});

describe("taxInfoSchema (AC-11.1.2, AC-11.1.3)", () => {
  describe("valid SSN tax info", () => {
    it("validates complete SSN tax info", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates SSN with W-9 received and date", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: true,
        w9_received_date: new Date("2024-01-15"),
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("defaults is_us_based to true", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.is_us_based).toBe(true);
      }
    });

    it("defaults w9_received to false", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.w9_received).toBe(false);
      }
    });
  });

  describe("valid EIN tax info", () => {
    it("validates complete EIN tax info", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "12-3456789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates EIN with W-9 received and date", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "12-3456789",
        is_us_based: true,
        w9_received: true,
        w9_received_date: "2024-01-15", // Date string should be coerced
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("invalid SSN format (AC-11.1.3)", () => {
    it("rejects SSN without dashes", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123456789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("tin");
      }
    });

    it("rejects SSN with wrong dash positions", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "12-345-6789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects EIN format when type is SSN", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "12-3456789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("invalid EIN format (AC-11.1.3)", () => {
    it("rejects EIN without dash", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "123456789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects SSN format when type is EIN", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("W-9 validation (AC-11.1.7)", () => {
    it("requires w9_received_date when w9_received is true", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: true,
        // Missing w9_received_date
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("w9_received_date");
      }
    });

    it("allows null w9_received_date when w9_received is false", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: false,
        w9_received_date: null,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("required fields", () => {
    it("requires tin_type", () => {
      const input = {
        tin: "123-45-6789",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("requires tin", () => {
      const input = {
        tin_type: "ssn" as const,
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects empty tin", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "",
        is_us_based: true,
        w9_received: false,
      };

      const result = taxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

describe("updateTaxInfoSchema (AC-11.1.2, AC-11.1.3)", () => {
  describe("partial updates", () => {
    it("allows updating only is_us_based", () => {
      const input = {
        is_us_based: false,
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows updating only w9_received", () => {
      const input = {
        w9_received: true,
        w9_received_date: new Date(),
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("allows empty object", () => {
      const result = updateTaxInfoSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe("TIN update validation", () => {
    it("requires tin_type when providing tin", () => {
      const input = {
        tin: "123-45-6789",
        // Missing tin_type
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("tin_type");
      }
    });

    it("validates SSN format when type is ssn", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123-45-6789",
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("validates EIN format when type is ein", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "12-3456789",
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("rejects invalid SSN format", () => {
      const input = {
        tin_type: "ssn" as const,
        tin: "123456789",
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("rejects invalid EIN format", () => {
      const input = {
        tin_type: "ein" as const,
        tin: "123456789",
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe("allows tin_type without tin", () => {
    it("allows tin_type alone (for clearing TIN type)", () => {
      const input = {
        tin_type: "ssn" as const,
      };

      const result = updateTaxInfoSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});

describe("Type inference", () => {
  it("TaxInfoInput has correct shape", () => {
    const input: TaxInfoInput = {
      tin_type: "ssn",
      tin: "123-45-6789",
      is_us_based: true,
      w9_received: false,
      w9_received_date: null,
    };

    expect(input.tin_type).toBe("ssn");
    expect(input.tin).toBe("123-45-6789");
  });

  it("UpdateTaxInfoInput allows partial data", () => {
    const input: UpdateTaxInfoInput = {
      is_us_based: false,
    };

    expect(input.is_us_based).toBe(false);
    expect(input.tin).toBeUndefined();
  });

  it("TinTypeInput is string union", () => {
    const ssn: TinTypeInput = "ssn";
    const ein: TinTypeInput = "ein";

    expect(ssn).toBe("ssn");
    expect(ein).toBe("ein");
  });
});
