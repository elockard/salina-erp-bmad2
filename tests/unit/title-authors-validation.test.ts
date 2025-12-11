import { describe, expect, it } from "vitest";
import {
  calculateEqualSplit,
  titleAuthorSchema,
  titleAuthorsArraySchema,
  titleAuthorsFormSchema,
  validateOwnershipSum,
} from "@/modules/title-authors/schema";
import {
  isTitleAuthorInput,
  isTitleAuthorWithContact,
  OWNERSHIP_PRESETS,
} from "@/modules/title-authors/types";

/**
 * Unit tests for Title Authors Validation
 *
 * Story 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 *
 * AC-10.1.2: Ownership Percentage Validation
 * - Sum must equal exactly 100%
 * - Uses Decimal.js for precision
 * - Each percentage must be between 1 and 100
 */

describe("titleAuthorSchema (AC-10.1.2)", () => {
  describe("valid inputs", () => {
    it("accepts valid author with 100% ownership", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "100.00",
        is_primary: true,
      });

      expect(result.success).toBe(true);
    });

    it("accepts valid author with 50% ownership", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "50",
        is_primary: false,
      });

      expect(result.success).toBe(true);
    });

    it("accepts minimum ownership percentage (1%)", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "1",
        is_primary: false,
      });

      expect(result.success).toBe(true);
    });

    it("accepts decimal ownership percentage", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "33.33",
        is_primary: false,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid contact_id", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "invalid-uuid",
        ownership_percentage: "100",
        is_primary: true,
      });

      expect(result.success).toBe(false);
    });

    it("rejects ownership below 1%", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "0.5",
        is_primary: false,
      });

      expect(result.success).toBe(false);
    });

    it("rejects ownership above 100%", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "101",
        is_primary: false,
      });

      expect(result.success).toBe(false);
    });

    it("rejects more than 2 decimal places", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "33.333",
        is_primary: false,
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-numeric ownership", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "fifty",
        is_primary: false,
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing is_primary", () => {
      const result = titleAuthorSchema.safeParse({
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "100",
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("titleAuthorsArraySchema (AC-10.1.2)", () => {
  describe("valid arrays", () => {
    it("accepts single author with 100% ownership", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440000",
          ownership_percentage: "100",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(true);
    });

    it("accepts two authors with 50/50 split", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "50",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "50",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(true);
    });

    it("accepts three authors with 33/33/34 split", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "33",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "33",
          is_primary: false,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440003",
          ownership_percentage: "34",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(true);
    });

    it("accepts three authors with decimal split (33.33/33.33/33.34)", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "33.33",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "33.33",
          is_primary: false,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440003",
          ownership_percentage: "33.34",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(true);
    });
  });

  describe("invalid arrays", () => {
    it("rejects empty array", () => {
      const result = titleAuthorsArraySchema.safeParse([]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(
          errorMessages.some((m) => m.includes("At least one author")),
        ).toBe(true);
      }
    });

    it("rejects sum less than 100%", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "50",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "40",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(errorMessages.some((m) => m.includes("100%"))).toBe(true);
      }
    });

    it("rejects sum greater than 100%", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "60",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "50",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(errorMessages.some((m) => m.includes("100%"))).toBe(true);
      }
    });

    it("rejects duplicate contact IDs", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "50",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001", // Same ID!
          ownership_percentage: "50",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(errorMessages.some((m) => m.includes("Duplicate"))).toBe(true);
      }
    });

    it("rejects no primary author", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "50",
          is_primary: false,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "50",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(errorMessages.some((m) => m.includes("primary"))).toBe(true);
      }
    });

    it("rejects multiple primary authors", () => {
      const result = titleAuthorsArraySchema.safeParse([
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "50",
          is_primary: true,
        },
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440002",
          ownership_percentage: "50",
          is_primary: true, // Both primary!
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        const errorMessages = result.error.issues.map((i) => i.message);
        expect(errorMessages.some((m) => m.includes("primary"))).toBe(true);
      }
    });
  });
});

describe("titleAuthorsFormSchema (AC-10.1.2)", () => {
  it("accepts valid form data", () => {
    const result = titleAuthorsFormSchema.safeParse({
      title_id: "550e8400-e29b-41d4-a716-446655440000",
      authors: [
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "100",
          is_primary: true,
        },
      ],
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid title_id", () => {
    const result = titleAuthorsFormSchema.safeParse({
      title_id: "invalid-uuid",
      authors: [
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "100",
          is_primary: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });

  it("rejects missing title_id", () => {
    const result = titleAuthorsFormSchema.safeParse({
      authors: [
        {
          contact_id: "550e8400-e29b-41d4-a716-446655440001",
          ownership_percentage: "100",
          is_primary: true,
        },
      ],
    });

    expect(result.success).toBe(false);
  });
});

describe("validateOwnershipSum (AC-10.1.2)", () => {
  it("returns valid for sum equal to 100", () => {
    const result = validateOwnershipSum(["50", "50"]);

    expect(result.valid).toBe(true);
    expect(result.total).toBe("100");
    expect(result.error).toBeUndefined();
  });

  it("returns valid for decimal sum equal to 100", () => {
    const result = validateOwnershipSum(["33.33", "33.33", "33.34"]);

    expect(result.valid).toBe(true);
    expect(result.total).toBe("100");
  });

  it("returns invalid for sum less than 100", () => {
    const result = validateOwnershipSum(["50", "40"]);

    expect(result.valid).toBe(false);
    expect(result.total).toBe("90");
    expect(result.error).toContain("100%");
  });

  it("returns invalid for sum greater than 100", () => {
    const result = validateOwnershipSum(["60", "50"]);

    expect(result.valid).toBe(false);
    expect(result.total).toBe("110");
    expect(result.error).toContain("100%");
  });

  it("handles single author with 100%", () => {
    const result = validateOwnershipSum(["100"]);

    expect(result.valid).toBe(true);
    expect(result.total).toBe("100");
  });

  it("handles empty array", () => {
    const result = validateOwnershipSum([]);

    expect(result.valid).toBe(false);
    expect(result.total).toBe("0");
  });
});

describe("calculateEqualSplit (Dev Notes: Equal Split Rounding Strategy)", () => {
  it("returns empty array for 0 authors", () => {
    const result = calculateEqualSplit(0);

    expect(result).toEqual([]);
  });

  it("returns [100] for 1 author", () => {
    const result = calculateEqualSplit(1);

    expect(result).toEqual(["100.00"]);
  });

  it("returns [50, 50] for 2 authors", () => {
    const result = calculateEqualSplit(2);

    expect(result).toEqual(["50.00", "50.00"]);
  });

  it("returns [33.33, 33.33, 33.34] for 3 authors", () => {
    const result = calculateEqualSplit(3);

    // Total should be exactly 100
    const total = result.reduce((sum, v) => sum + parseFloat(v), 0);
    expect(total).toBe(100);

    // First two should be 33.33, last gets remainder
    expect(result[0]).toBe("33.33");
    expect(result[1]).toBe("33.33");
    expect(result[2]).toBe("33.34");
  });

  it("returns equal split for 4 authors summing to 100", () => {
    const result = calculateEqualSplit(4);

    const total = result.reduce((sum, v) => sum + parseFloat(v), 0);
    expect(total).toBe(100);
    expect(result.length).toBe(4);
  });

  it("handles 7 authors correctly", () => {
    const result = calculateEqualSplit(7);

    const total = result.reduce((sum, v) => sum + parseFloat(v), 0);
    // Use toBeCloseTo for floating-point comparison
    expect(total).toBeCloseTo(100, 2);
    expect(result.length).toBe(7);
  });
});

describe("OWNERSHIP_PRESETS (AC-10.1.4)", () => {
  it("has 5 presets", () => {
    expect(OWNERSHIP_PRESETS.length).toBe(5);
  });

  it("has 50/50 preset", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "50/50");
    expect(preset).toBeDefined();
    expect(preset?.values).toEqual([50, 50]);
  });

  it("has 60/40 preset", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "60/40");
    expect(preset).toBeDefined();
    expect(preset?.values).toEqual([60, 40]);
  });

  it("has 70/30 preset", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "70/30");
    expect(preset).toBeDefined();
    expect(preset?.values).toEqual([70, 30]);
  });

  it("has 33/33/34 preset", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "33/33/34");
    expect(preset).toBeDefined();
    expect(preset?.values).toEqual([33, 33, 34]);
  });

  it("has Equal Split preset with calculate function", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "Equal Split");
    expect(preset).toBeDefined();
    expect(preset?.values).toBeNull();
    expect(preset?.calculate).toBeDefined();
  });

  it("Equal Split preset calculates correctly for 2 authors", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "Equal Split");
    const result = preset?.calculate?.(2);

    expect(result).toEqual([50, 50]);
  });

  it("Equal Split preset calculates correctly for 3 authors", () => {
    const preset = OWNERSHIP_PRESETS.find((p) => p.label === "Equal Split");
    const result = preset?.calculate?.(3);

    // Should sum to 100
    const total = result?.reduce((sum, v) => sum + v, 0);
    expect(total).toBe(100);
  });
});

describe("Type Guards", () => {
  describe("isTitleAuthorInput", () => {
    it("returns true for valid input", () => {
      const input = {
        contact_id: "550e8400-e29b-41d4-a716-446655440000",
        ownership_percentage: "50",
        is_primary: true,
      };

      expect(isTitleAuthorInput(input)).toBe(true);
    });

    it("returns false for null", () => {
      expect(isTitleAuthorInput(null)).toBe(false);
    });

    it("returns false for missing fields", () => {
      expect(isTitleAuthorInput({ contact_id: "abc" })).toBe(false);
    });

    it("returns false for wrong types", () => {
      expect(
        isTitleAuthorInput({
          contact_id: 123,
          ownership_percentage: "50",
          is_primary: true,
        }),
      ).toBe(false);
    });
  });

  describe("isTitleAuthorWithContact", () => {
    it("returns true for valid input with contact", () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "50",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
        contact: {
          id: "550e8400-e29b-41d4-a716-446655440002",
          first_name: "John",
          last_name: "Doe",
        },
      };

      expect(isTitleAuthorWithContact(input)).toBe(true);
    });

    it("returns false for input without contact", () => {
      const input = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "50",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
      };

      expect(isTitleAuthorWithContact(input)).toBe(false);
    });

    it("returns false for null", () => {
      expect(isTitleAuthorWithContact(null)).toBe(false);
    });
  });
});
