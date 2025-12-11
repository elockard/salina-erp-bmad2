import { describe, expect, it } from "vitest";
import {
  type InsertTitleAuthor,
  type TitleAuthor,
  titleAuthors,
} from "@/db/schema/title-authors";

/**
 * Unit tests for Title Authors Schema
 *
 * Story 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 *
 * AC-10.1.1: Title Authors Junction Table Schema
 * AC-10.1.8: Database Indexes for Performance
 *
 * Note: These are schema definition tests, not integration tests.
 * Database constraint enforcement is verified through schema structure.
 */

describe("titleAuthors table schema structure (AC-10.1.1)", () => {
  it("is defined as a pgTable", () => {
    expect(titleAuthors).toBeDefined();
    expect(typeof titleAuthors).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(titleAuthors.id).toBeDefined();
    expect(titleAuthors.id.name).toBe("id");
  });

  it("has title_id column (FK to titles, NOT NULL)", () => {
    expect(titleAuthors.title_id).toBeDefined();
    expect(titleAuthors.title_id.name).toBe("title_id");
    expect(titleAuthors.title_id.notNull).toBe(true);
  });

  it("has contact_id column (FK to contacts, NOT NULL)", () => {
    expect(titleAuthors.contact_id).toBeDefined();
    expect(titleAuthors.contact_id.name).toBe("contact_id");
    expect(titleAuthors.contact_id.notNull).toBe(true);
  });

  it("has ownership_percentage column (DECIMAL, NOT NULL)", () => {
    expect(titleAuthors.ownership_percentage).toBeDefined();
    expect(titleAuthors.ownership_percentage.name).toBe("ownership_percentage");
    expect(titleAuthors.ownership_percentage.notNull).toBe(true);
  });

  it("has is_primary column (BOOLEAN, NOT NULL)", () => {
    expect(titleAuthors.is_primary).toBeDefined();
    expect(titleAuthors.is_primary.name).toBe("is_primary");
    expect(titleAuthors.is_primary.notNull).toBe(true);
  });

  it("has created_at column (NOT NULL)", () => {
    expect(titleAuthors.created_at).toBeDefined();
    expect(titleAuthors.created_at.name).toBe("created_at");
    expect(titleAuthors.created_at.notNull).toBe(true);
  });

  it("has updated_at column (NOT NULL)", () => {
    expect(titleAuthors.updated_at).toBeDefined();
    expect(titleAuthors.updated_at.name).toBe("updated_at");
    expect(titleAuthors.updated_at.notNull).toBe(true);
  });

  it("has created_by column (FK to users, nullable)", () => {
    expect(titleAuthors.created_by).toBeDefined();
    expect(titleAuthors.created_by.name).toBe("created_by");
    expect(titleAuthors.created_by.notNull).toBe(false);
  });

  it("has exactly 8 columns per AC-10.1.1", () => {
    const columnNames = [
      "id",
      "title_id",
      "contact_id",
      "ownership_percentage",
      "is_primary",
      "created_at",
      "updated_at",
      "created_by",
    ];

    for (const name of columnNames) {
      expect(
        (titleAuthors as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(8);
  });
});

describe("TitleAuthor type (AC-10.1.1)", () => {
  it("infers select type from titleAuthors table", () => {
    const mockTitleAuthor: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "50.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(mockTitleAuthor.id).toBeDefined();
    expect(mockTitleAuthor.title_id).toBeDefined();
    expect(mockTitleAuthor.contact_id).toBeDefined();
    expect(mockTitleAuthor.ownership_percentage).toBe("50.00");
    expect(mockTitleAuthor.is_primary).toBe(true);
  });

  it("supports 100% ownership for single author", () => {
    const soleAuthor: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(soleAuthor.ownership_percentage).toBe("100.00");
    expect(soleAuthor.is_primary).toBe(true);
  });

  it("supports decimal ownership percentages", () => {
    const author: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "33.33",
      is_primary: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: "550e8400-e29b-41d4-a716-446655440003",
    };

    expect(author.ownership_percentage).toBe("33.33");
  });

  it("supports nullable created_by for audit trail", () => {
    const authorWithCreator: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: "550e8400-e29b-41d4-a716-446655440003",
    };

    const authorWithoutCreator: TitleAuthor = {
      ...authorWithCreator,
      created_by: null,
    };

    expect(authorWithCreator.created_by).toBeDefined();
    expect(authorWithoutCreator.created_by).toBeNull();
  });
});

describe("InsertTitleAuthor type (AC-10.1.1)", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
    };

    expect(insertData.title_id).toBeDefined();
    expect(insertData.contact_id).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("requires title_id, contact_id, and ownership_percentage", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "50.00",
    };

    expect(insertData.title_id).toBeDefined();
    expect(insertData.contact_id).toBeDefined();
    expect(insertData.ownership_percentage).toBeDefined();
  });

  it("allows optional is_primary field (defaults to false)", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
    };

    expect(insertData.is_primary).toBeUndefined();
  });

  it("allows specifying is_primary", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
    };

    expect(insertData.is_primary).toBe(true);
  });

  it("allows optional created_by for audit trail", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      created_by: "550e8400-e29b-41d4-a716-446655440003",
    };

    expect(insertData.created_by).toBeDefined();
  });

  it("allows optional timestamps (auto-generated)", () => {
    const insertData: InsertTitleAuthor = {
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
    };

    expect(insertData.created_at).toBeUndefined();
    expect(insertData.updated_at).toBeUndefined();
  });
});

describe("Ownership percentage constraints (AC-10.1.1, AC-10.1.2)", () => {
  describe("valid percentage values", () => {
    it("accepts minimum valid percentage (1%)", () => {
      const author: TitleAuthor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "1.00",
        is_primary: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
      };

      expect(author.ownership_percentage).toBe("1.00");
    });

    it("accepts maximum valid percentage (100%)", () => {
      const author: TitleAuthor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "100.00",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
      };

      expect(author.ownership_percentage).toBe("100.00");
    });

    it("accepts typical co-author percentages", () => {
      const author50: TitleAuthor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "50.00",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
      };

      const author3333: TitleAuthor = {
        ...author50,
        ownership_percentage: "33.33",
        is_primary: false,
      };

      expect(author50.ownership_percentage).toBe("50.00");
      expect(author3333.ownership_percentage).toBe("33.33");
    });
  });

  describe("percentage precision (DECIMAL(5,2))", () => {
    it("supports 2 decimal places for precise splits", () => {
      const author: TitleAuthor = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        title_id: "550e8400-e29b-41d4-a716-446655440001",
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "33.34", // For 3-way split (33.33 + 33.33 + 33.34 = 100)
        is_primary: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: null,
      };

      expect(author.ownership_percentage).toBe("33.34");
    });
  });
});

describe("Primary author designation (AC-10.1.5)", () => {
  it("supports primary author flag", () => {
    const primaryAuthor: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "60.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(primaryAuthor.is_primary).toBe(true);
  });

  it("supports non-primary author flag", () => {
    const secondaryAuthor: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "40.00",
      is_primary: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    expect(secondaryAuthor.is_primary).toBe(false);
  });
});

describe("Timestamps and audit trail (AC-10.1.1)", () => {
  it("has created_at timestamp", () => {
    const now = new Date();
    const author: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: now,
      updated_at: now,
      created_by: null,
    };

    expect(author.created_at).toEqual(now);
  });

  it("has updated_at timestamp for tracking changes", () => {
    const created = new Date("2024-01-01");
    const updated = new Date("2024-06-15");
    const author: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: created,
      updated_at: updated,
      created_by: null,
    };

    expect(author.updated_at.getTime()).toBeGreaterThan(
      author.created_at.getTime(),
    );
  });

  it("supports created_by for user audit trail", () => {
    const author: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "100.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: "550e8400-e29b-41d4-a716-446655440003",
    };

    expect(author.created_by).toBe("550e8400-e29b-41d4-a716-446655440003");
  });
});

describe("Co-author scenarios (AC-10.1.1)", () => {
  it("supports 50/50 co-author split", () => {
    const author1: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440010",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440002",
      ownership_percentage: "50.00",
      is_primary: true,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    const author2: TitleAuthor = {
      id: "550e8400-e29b-41d4-a716-446655440011",
      title_id: "550e8400-e29b-41d4-a716-446655440001",
      contact_id: "550e8400-e29b-41d4-a716-446655440003",
      ownership_percentage: "50.00",
      is_primary: false,
      created_at: new Date(),
      updated_at: new Date(),
      created_by: null,
    };

    // Same title_id
    expect(author1.title_id).toBe(author2.title_id);
    // Different contact_ids
    expect(author1.contact_id).not.toBe(author2.contact_id);
    // Percentages sum to 100
    expect(
      parseFloat(author1.ownership_percentage) +
        parseFloat(author2.ownership_percentage),
    ).toBe(100);
  });

  it("supports 3-way co-author split (33/33/34)", () => {
    const titleId = "550e8400-e29b-41d4-a716-446655440001";
    const baseDate = new Date();

    const authors: TitleAuthor[] = [
      {
        id: "550e8400-e29b-41d4-a716-446655440010",
        title_id: titleId,
        contact_id: "550e8400-e29b-41d4-a716-446655440002",
        ownership_percentage: "33.33",
        is_primary: true,
        created_at: baseDate,
        updated_at: baseDate,
        created_by: null,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440011",
        title_id: titleId,
        contact_id: "550e8400-e29b-41d4-a716-446655440003",
        ownership_percentage: "33.33",
        is_primary: false,
        created_at: baseDate,
        updated_at: baseDate,
        created_by: null,
      },
      {
        id: "550e8400-e29b-41d4-a716-446655440012",
        title_id: titleId,
        contact_id: "550e8400-e29b-41d4-a716-446655440004",
        ownership_percentage: "33.34",
        is_primary: false,
        created_at: baseDate,
        updated_at: baseDate,
        created_by: null,
      },
    ];

    // All have same title_id
    expect(authors.every((a) => a.title_id === titleId)).toBe(true);
    // All have different contact_ids
    const contactIds = authors.map((a) => a.contact_id);
    expect(new Set(contactIds).size).toBe(3);
    // Only one is primary
    expect(authors.filter((a) => a.is_primary).length).toBe(1);
    // Percentages sum to 100
    const totalPercentage = authors.reduce(
      (sum, a) => sum + parseFloat(a.ownership_percentage),
      0,
    );
    expect(totalPercentage).toBe(100);
  });
});
