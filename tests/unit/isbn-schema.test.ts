import { describe, expect, it } from "vitest";
import {
  assignIsbnSchema,
  batchImportIsbnSchema,
  createIsbnSchema,
  isbn13Schema,
  isbnFilterSchema,
  isbnStatusSchema,
  isbnTypeSchema,
  updateIsbnStatusSchema,
} from "@/modules/isbn/schema";

/**
 * Unit tests for ISBN Zod schemas
 *
 * Story 2.6 - AC 4, 5: Unit tests validate enum constraints
 * - ISBN type enum values correct (physical, ebook)
 * - ISBN status enum values correct (available, assigned, registered, retired)
 */

describe("isbnTypeSchema", () => {
  describe("valid values", () => {
    it("accepts 'physical'", () => {
      const result = isbnTypeSchema.safeParse("physical");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("physical");
      }
    });

    it("accepts 'ebook'", () => {
      const result = isbnTypeSchema.safeParse("ebook");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("ebook");
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'audiobook'", () => {
      const result = isbnTypeSchema.safeParse("audiobook");
      expect(result.success).toBe(false);
    });

    it("rejects 'hardcover'", () => {
      const result = isbnTypeSchema.safeParse("hardcover");
      expect(result.success).toBe(false);
    });

    it("rejects 'paperback'", () => {
      const result = isbnTypeSchema.safeParse("paperback");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = isbnTypeSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'PHYSICAL'", () => {
      const result = isbnTypeSchema.safeParse("PHYSICAL");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = isbnTypeSchema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("rejects undefined", () => {
      const result = isbnTypeSchema.safeParse(undefined);
      expect(result.success).toBe(false);
    });
  });
});

describe("isbnStatusSchema", () => {
  describe("valid values", () => {
    it("accepts 'available'", () => {
      const result = isbnStatusSchema.safeParse("available");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("available");
      }
    });

    it("accepts 'assigned'", () => {
      const result = isbnStatusSchema.safeParse("assigned");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("assigned");
      }
    });

    it("accepts 'registered'", () => {
      const result = isbnStatusSchema.safeParse("registered");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("registered");
      }
    });

    it("accepts 'retired'", () => {
      const result = isbnStatusSchema.safeParse("retired");
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe("retired");
      }
    });

    it("accepts all four valid status values", () => {
      const statuses = [
        "available",
        "assigned",
        "registered",
        "retired",
      ] as const;

      for (const status of statuses) {
        const result = isbnStatusSchema.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      }
    });
  });

  describe("invalid values", () => {
    it("rejects 'active'", () => {
      const result = isbnStatusSchema.safeParse("active");
      expect(result.success).toBe(false);
    });

    it("rejects 'pending'", () => {
      const result = isbnStatusSchema.safeParse("pending");
      expect(result.success).toBe(false);
    });

    it("rejects 'used'", () => {
      const result = isbnStatusSchema.safeParse("used");
      expect(result.success).toBe(false);
    });

    it("rejects empty string", () => {
      const result = isbnStatusSchema.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects uppercase 'AVAILABLE'", () => {
      const result = isbnStatusSchema.safeParse("AVAILABLE");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = isbnStatusSchema.safeParse(null);
      expect(result.success).toBe(false);
    });
  });
});

describe("isbn13Schema", () => {
  describe("valid ISBN-13 formats", () => {
    it("accepts valid ISBN-13 starting with 978 (no hyphens)", () => {
      const result = isbn13Schema.safeParse("9780123456789");
      expect(result.success).toBe(true);
    });

    it("accepts valid ISBN-13 starting with 979 (no hyphens)", () => {
      const result = isbn13Schema.safeParse("9791234567890");
      expect(result.success).toBe(true);
    });

    it("accepts ISBN-13 with hyphens (978-X-XX-XXXXXX-X format)", () => {
      const result = isbn13Schema.safeParse("978-0-12-345678-9");
      expect(result.success).toBe(true);
    });

    it("accepts ISBN-13 with spaces", () => {
      const result = isbn13Schema.safeParse("978 0 12 345678 9");
      expect(result.success).toBe(true);
    });

    it("accepts ISBN-13 with mixed hyphens and spaces", () => {
      const result = isbn13Schema.safeParse("978-0 12-345678 9");
      expect(result.success).toBe(true);
    });
  });

  describe("invalid ISBN-13 formats", () => {
    it("rejects empty string", () => {
      const result = isbn13Schema.safeParse("");
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("ISBN-13 is required");
      }
    });

    it("rejects ISBN-10 format", () => {
      const result = isbn13Schema.safeParse("0123456789");
      expect(result.success).toBe(false);
    });

    it("rejects ISBN not starting with 978 or 979", () => {
      const result = isbn13Schema.safeParse("9760123456789");
      expect(result.success).toBe(false);
    });

    it("rejects ISBN starting with 977", () => {
      const result = isbn13Schema.safeParse("9771234567890");
      expect(result.success).toBe(false);
    });

    it("rejects ISBN with letters", () => {
      const result = isbn13Schema.safeParse("978-0-12-3456AB-9");
      expect(result.success).toBe(false);
    });

    it("rejects ISBN with too few digits", () => {
      const result = isbn13Schema.safeParse("978012345678");
      expect(result.success).toBe(false);
    });

    it("rejects ISBN with too many digits", () => {
      const result = isbn13Schema.safeParse("97801234567890");
      expect(result.success).toBe(false);
    });

    it("rejects null", () => {
      const result = isbn13Schema.safeParse(null);
      expect(result.success).toBe(false);
    });

    it("rejects random text", () => {
      const result = isbn13Schema.safeParse("not-an-isbn");
      expect(result.success).toBe(false);
    });
  });
});

describe("createIsbnSchema", () => {
  describe("valid inputs", () => {
    it("accepts valid input with physical type", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "9780123456789",
        type: "physical",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbn_13).toBe("9780123456789");
        expect(result.data.type).toBe("physical");
      }
    });

    it("accepts valid input with ebook type", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "9791234567890",
        type: "ebook",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbn_13).toBe("9791234567890");
        expect(result.data.type).toBe("ebook");
      }
    });

    it("accepts ISBN-13 with hyphens", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "978-0-12-345678-9",
        type: "physical",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing isbn_13", () => {
      const result = createIsbnSchema.safeParse({
        type: "physical",
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing type", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "9780123456789",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid isbn_13 format", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "invalid",
        type: "physical",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid type", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "9780123456789",
        type: "hardcover",
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty isbn_13", () => {
      const result = createIsbnSchema.safeParse({
        isbn_13: "",
        type: "physical",
      });

      expect(result.success).toBe(false);
    });
  });
});

describe("batchImportIsbnSchema", () => {
  describe("valid inputs", () => {
    it("accepts single ISBN in array", () => {
      const result = batchImportIsbnSchema.safeParse({
        isbns: [{ isbn_13: "9780123456789", type: "physical" }],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbns).toHaveLength(1);
      }
    });

    it("accepts multiple ISBNs", () => {
      const result = batchImportIsbnSchema.safeParse({
        isbns: [
          { isbn_13: "9780123456789", type: "physical" },
          { isbn_13: "9791234567890", type: "ebook" },
          { isbn_13: "978-0-12-345678-9", type: "physical" },
        ],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isbns).toHaveLength(3);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects empty array", () => {
      const result = batchImportIsbnSchema.safeParse({
        isbns: [],
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "At least one ISBN is required",
        );
      }
    });

    it("rejects array with invalid ISBN", () => {
      const result = batchImportIsbnSchema.safeParse({
        isbns: [
          { isbn_13: "9780123456789", type: "physical" },
          { isbn_13: "invalid", type: "ebook" },
        ],
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing isbns field", () => {
      const result = batchImportIsbnSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe("assignIsbnSchema", () => {
  const validTitleId = "123e4567-e89b-12d3-a456-426614174000";
  const validUserId = "987fcdeb-51a2-3456-b789-012345678901";

  describe("valid inputs", () => {
    it("accepts valid title_id and user_id", () => {
      const result = assignIsbnSchema.safeParse({
        title_id: validTitleId,
        user_id: validUserId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title_id).toBe(validTitleId);
        expect(result.data.user_id).toBe(validUserId);
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid title_id format", () => {
      const result = assignIsbnSchema.safeParse({
        title_id: "not-a-uuid",
        user_id: validUserId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid title ID");
      }
    });

    it("rejects invalid user_id format", () => {
      const result = assignIsbnSchema.safeParse({
        title_id: validTitleId,
        user_id: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid user ID");
      }
    });

    it("rejects missing title_id", () => {
      const result = assignIsbnSchema.safeParse({
        user_id: validUserId,
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing user_id", () => {
      const result = assignIsbnSchema.safeParse({
        title_id: validTitleId,
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty object", () => {
      const result = assignIsbnSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe("updateIsbnStatusSchema", () => {
  describe("valid inputs", () => {
    it("accepts all valid status values", () => {
      const statuses = [
        "available",
        "assigned",
        "registered",
        "retired",
      ] as const;

      for (const status of statuses) {
        const result = updateIsbnStatusSchema.safeParse({ status });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(status);
        }
      }
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid status", () => {
      const result = updateIsbnStatusSchema.safeParse({
        status: "pending",
      });

      expect(result.success).toBe(false);
    });

    it("rejects missing status", () => {
      const result = updateIsbnStatusSchema.safeParse({});

      expect(result.success).toBe(false);
    });
  });
});

describe("isbnFilterSchema", () => {
  const validTitleId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid filter with all fields", () => {
      const result = isbnFilterSchema.safeParse({
        search: "978",
        type: "physical",
        status: "available",
        assigned_to_title_id: validTitleId,
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty filter", () => {
      const result = isbnFilterSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts partial filter with type only", () => {
      const result = isbnFilterSchema.safeParse({
        type: "ebook",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial filter with status only", () => {
      const result = isbnFilterSchema.safeParse({
        status: "assigned",
      });

      expect(result.success).toBe(true);
    });

    it("accepts null for assigned_to_title_id", () => {
      const result = isbnFilterSchema.safeParse({
        assigned_to_title_id: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects invalid type in filter", () => {
      const result = isbnFilterSchema.safeParse({
        type: "hardcover",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid status in filter", () => {
      const result = isbnFilterSchema.safeParse({
        status: "pending",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid assigned_to_title_id format", () => {
      const result = isbnFilterSchema.safeParse({
        assigned_to_title_id: "not-a-uuid",
      });

      expect(result.success).toBe(false);
    });
  });
});
