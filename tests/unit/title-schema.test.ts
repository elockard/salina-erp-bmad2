import { describe, expect, it } from "vitest";
import {
  createTitleSchema,
  isbnSchema,
  publicationStatusSchema,
  titleFilterSchema,
  updateTitleSchema,
} from "@/modules/titles/schema";

/**
 * Unit tests for Title Zod schemas
 *
 * Story 2.4 - AC 15: Unit test validates schema constraints
 * (unique ISBN, required fields, valid enum values)
 */

describe("createTitleSchema", () => {
  const validAuthorId = "123e4567-e89b-12d3-a456-426614174000";

  describe("valid inputs", () => {
    it("accepts valid input with all fields", () => {
      const result = createTitleSchema.safeParse({
        title: "The Great Novel",
        subtitle: "A Gripping Tale",
        author_id: validAuthorId,
        genre: "Fiction",
        word_count: 80000,
        publication_status: "published",
        isbn: "9780123456789",
        eisbn: "9781234567890",
        publication_date: "2024-06-15",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("The Great Novel");
        expect(result.data.publication_status).toBe("published");
        expect(result.data.isbn).toBe("9780123456789");
      }
    });

    it("accepts valid input with only required fields", () => {
      const result = createTitleSchema.safeParse({
        title: "Minimal Title",
        author_id: validAuthorId,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe("Minimal Title");
        expect(result.data.author_id).toBe(validAuthorId);
        expect(result.data.publication_status).toBe("draft"); // default value
      }
    });

    it("accepts null for optional isbn fields", () => {
      const result = createTitleSchema.safeParse({
        title: "No ISBN Title",
        author_id: validAuthorId,
        isbn: null,
        eisbn: null,
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty string for optional fields", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        subtitle: "",
        genre: "",
        isbn: "",
        eisbn: "",
        publication_date: "",
      });

      expect(result.success).toBe(true);
    });

    it("accepts all valid publication status values", () => {
      const statuses = [
        "draft",
        "pending",
        "published",
        "out_of_print",
      ] as const;

      for (const status of statuses) {
        const result = createTitleSchema.safeParse({
          title: "Test Title",
          author_id: validAuthorId,
          publication_status: status,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.publication_status).toBe(status);
        }
      }
    });

    it("accepts ISBN-13 with hyphens", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        isbn: "978-0-12-345678-9",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("invalid inputs", () => {
    it("rejects missing title", () => {
      const result = createTitleSchema.safeParse({
        author_id: validAuthorId,
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = createTitleSchema.safeParse({
        title: "",
        author_id: validAuthorId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Title is required");
      }
    });

    it("rejects title exceeding max length", () => {
      const result = createTitleSchema.safeParse({
        title: "A".repeat(501),
        author_id: validAuthorId,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Title is too long");
      }
    });

    it("rejects missing author_id", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid author_id format", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: "not-a-uuid",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid author ID");
      }
    });

    it("rejects invalid publication status", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        publication_status: "unknown",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid ISBN format (not 13 digits)", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        isbn: "123456789", // 9 digits, not 13
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe("Invalid ISBN-13 format");
      }
    });

    it("rejects invalid eISBN format", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        eisbn: "abc123", // letters not allowed
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid publication date format", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        publication_date: "15-06-2024", // wrong format
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Date must be in YYYY-MM-DD format",
        );
      }
    });

    it("rejects negative word count", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        word_count: -100,
      });

      expect(result.success).toBe(false);
    });

    it("rejects decimal word count", () => {
      const result = createTitleSchema.safeParse({
        title: "Test Title",
        author_id: validAuthorId,
        word_count: 80000.5,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(
          "Word count must be a whole number",
        );
      }
    });
  });
});

describe("updateTitleSchema", () => {
  const validAuthorId = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts partial updates", () => {
    const result = updateTitleSchema.safeParse({
      title: "Updated Title",
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty object", () => {
    const result = updateTitleSchema.safeParse({});

    expect(result.success).toBe(true);
  });

  it("accepts updating only publication status", () => {
    const result = updateTitleSchema.safeParse({
      publication_status: "published",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.publication_status).toBe("published");
    }
  });

  it("allows optional author_id change", () => {
    const result = updateTitleSchema.safeParse({
      author_id: validAuthorId,
    });

    expect(result.success).toBe(true);
  });

  it("validates fields when provided", () => {
    const result = updateTitleSchema.safeParse({
      isbn: "invalid-isbn",
    });

    expect(result.success).toBe(false);
  });
});

describe("publicationStatusSchema", () => {
  it("accepts valid publication statuses", () => {
    expect(publicationStatusSchema.safeParse("draft").success).toBe(true);
    expect(publicationStatusSchema.safeParse("pending").success).toBe(true);
    expect(publicationStatusSchema.safeParse("published").success).toBe(true);
    expect(publicationStatusSchema.safeParse("out_of_print").success).toBe(
      true,
    );
  });

  it("rejects invalid publication statuses", () => {
    expect(publicationStatusSchema.safeParse("active").success).toBe(false);
    expect(publicationStatusSchema.safeParse("cancelled").success).toBe(false);
    expect(publicationStatusSchema.safeParse("").success).toBe(false);
    expect(publicationStatusSchema.safeParse("DRAFT").success).toBe(false); // case-sensitive
  });
});

describe("isbnSchema", () => {
  it("accepts valid ISBN-13 without hyphens", () => {
    const result = isbnSchema.safeParse("9780123456789");
    expect(result.success).toBe(true);
  });

  it("accepts valid ISBN-13 with hyphens", () => {
    const result = isbnSchema.safeParse("978-0-12-345678-9");
    expect(result.success).toBe(true);
  });

  it("accepts valid ISBN starting with 979", () => {
    const result = isbnSchema.safeParse("9791234567890");
    expect(result.success).toBe(true);
  });

  it("accepts empty string", () => {
    const result = isbnSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("accepts null", () => {
    const result = isbnSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it("rejects ISBN not starting with 978 or 979", () => {
    const result = isbnSchema.safeParse("9760123456789");
    expect(result.success).toBe(false);
  });

  it("rejects ISBN-10 format", () => {
    const result = isbnSchema.safeParse("0123456789");
    expect(result.success).toBe(false);
  });

  it("rejects invalid characters", () => {
    const result = isbnSchema.safeParse("978-X-12-345678-9");
    expect(result.success).toBe(false);
  });
});

describe("titleFilterSchema", () => {
  it("accepts valid filter with all fields", () => {
    const result = titleFilterSchema.safeParse({
      search: "test",
      author_id: "123e4567-e89b-12d3-a456-426614174000",
      publication_status: "published",
      has_isbn: true,
      has_eisbn: false,
    });

    expect(result.success).toBe(true);
  });

  it("accepts empty filter", () => {
    const result = titleFilterSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts partial filter", () => {
    const result = titleFilterSchema.safeParse({
      publication_status: "draft",
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid author_id in filter", () => {
    const result = titleFilterSchema.safeParse({
      author_id: "not-a-uuid",
    });

    expect(result.success).toBe(false);
  });
});
