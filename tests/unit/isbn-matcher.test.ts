/**
 * ISBN Matcher Unit Tests
 *
 * Story: 19.4 - Bulk Update via CSV
 * Task 8: Unit tests for ISBN matching and diff computation
 *
 * Tests:
 * - ISBN normalization (removing hyphens, spaces, uppercase)
 * - Diff computation (detecting field changes)
 * - Field change detection for significant changes (title field)
 */

import { describe, expect, it } from "vitest";
import {
  computeBulkDiffSummary,
  computeTitleDiff,
  getSelectedUpdates,
  hasTitleFieldChange,
  normalizeIsbn,
} from "@/modules/import-export/matchers/isbn-matcher";
import type {
  ExistingTitleData,
  TitleMatch,
  ValidatedTitleRow,
} from "@/modules/import-export/types";

describe("normalizeIsbn", () => {
  it("should remove hyphens from ISBN", () => {
    expect(normalizeIsbn("978-0-7432-7356-5")).toBe("9780743273565");
  });

  it("should remove spaces from ISBN", () => {
    expect(normalizeIsbn("978 0 7432 7356 5")).toBe("9780743273565");
  });

  it("should convert to uppercase", () => {
    expect(normalizeIsbn("978074327356x")).toBe("978074327356X");
  });

  it("should trim whitespace", () => {
    expect(normalizeIsbn("  978-0-7432-7356-5  ")).toBe("9780743273565");
  });

  it("should handle mixed formatting", () => {
    expect(normalizeIsbn("  978-0 7432-7356 5  ")).toBe("9780743273565");
  });

  it("should handle already normalized ISBN", () => {
    expect(normalizeIsbn("9780743273565")).toBe("9780743273565");
  });

  it("should handle ISBN-10 format", () => {
    expect(normalizeIsbn("0-7432-7356-7")).toBe("0743273567");
  });
});

describe("computeTitleDiff", () => {
  const baseExistingTitle: ExistingTitleData = {
    id: "test-id-123",
    title: "The Great Gatsby",
    subtitle: "A Novel",
    isbn: "9780743273565",
    genre: "Fiction",
    publication_date: "1925-04-10",
    publication_status: "published",
    word_count: 47094,
    asin: "B000JQSLJ8",
    bisac_code: null,
    bisac_codes: null,
  };

  it("should detect no changes when values are identical", () => {
    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby",
        subtitle: "A Novel",
        isbn: "9780743273565",
        genre: "Fiction",
        publication_date: "1925-04-10",
        publication_status: "published",
        word_count: 47094,
        asin: "B000JQSLJ8",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(baseExistingTitle, csvRow);

    expect(diff.changedFields).toHaveLength(0);
    expect(diff.unchangedFields.length).toBeGreaterThan(0);
  });

  it("should detect title field change", () => {
    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby - Updated Edition",
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(baseExistingTitle, csvRow);

    expect(diff.changedFields).toHaveLength(1);
    expect(diff.changedFields[0].fieldKey).toBe("title");
    expect(diff.changedFields[0].oldValue).toBe("The Great Gatsby");
    expect(diff.changedFields[0].newValue).toBe(
      "The Great Gatsby - Updated Edition",
    );
  });

  it("should detect multiple field changes", () => {
    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby",
        subtitle: "The Jazz Age Novel",
        genre: "Classic Fiction",
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(baseExistingTitle, csvRow);

    expect(diff.changedFields).toHaveLength(2);
    expect(diff.changedFields.map((c) => c.fieldKey)).toContain("subtitle");
    expect(diff.changedFields.map((c) => c.fieldKey)).toContain("genre");
  });

  it("should treat null and empty string as equivalent (no change)", () => {
    const existingWithNull: ExistingTitleData = {
      ...baseExistingTitle,
      subtitle: null,
    };

    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby",
        subtitle: "",
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(existingWithNull, csvRow);

    // subtitle should not be in changedFields (null == "")
    expect(diff.changedFields.map((c) => c.fieldKey)).not.toContain("subtitle");
  });

  it("should detect change from null to value", () => {
    const existingWithNull: ExistingTitleData = {
      ...baseExistingTitle,
      genre: null,
    };

    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby",
        genre: "Fiction",
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(existingWithNull, csvRow);

    expect(diff.changedFields.map((c) => c.fieldKey)).toContain("genre");
    const genreChange = diff.changedFields.find((c) => c.fieldKey === "genre");
    expect(genreChange?.oldValue).toBeNull();
    expect(genreChange?.newValue).toBe("Fiction");
  });

  it("should skip fields not in CSV row", () => {
    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        // Only title and isbn, no other fields
        title: "The Great Gatsby",
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(baseExistingTitle, csvRow);

    // Should not report changes for fields not in CSV
    expect(diff.changedFields.map((c) => c.fieldKey)).not.toContain("subtitle");
    expect(diff.changedFields.map((c) => c.fieldKey)).not.toContain("genre");
  });

  it("should handle word_count number comparison", () => {
    const csvRow: ValidatedTitleRow = {
      row: 1,
      valid: true,
      data: {
        title: "The Great Gatsby",
        word_count: 50000,
        isbn: "9780743273565",
      },
      errors: [],
      warnings: [],
    };

    const diff = computeTitleDiff(baseExistingTitle, csvRow);

    expect(diff.changedFields.map((c) => c.fieldKey)).toContain("word_count");
    const wordCountChange = diff.changedFields.find(
      (c) => c.fieldKey === "word_count",
    );
    expect(wordCountChange?.oldValue).toBe(47094);
    expect(wordCountChange?.newValue).toBe(50000);
  });
});

describe("hasTitleFieldChange", () => {
  it("should return true when title field is changed", () => {
    const diff = {
      changedFields: [
        {
          field: "Title",
          fieldKey: "title" as const,
          oldValue: "Old",
          newValue: "New",
        },
      ],
      unchangedFields: [],
      totalFields: 1,
    };

    expect(hasTitleFieldChange(diff)).toBe(true);
  });

  it("should return false when only non-title fields changed", () => {
    const diff = {
      changedFields: [
        {
          field: "Genre",
          fieldKey: "genre" as const,
          oldValue: "Fiction",
          newValue: "Non-fiction",
        },
      ],
      unchangedFields: ["Title"],
      totalFields: 2,
    };

    expect(hasTitleFieldChange(diff)).toBe(false);
  });

  it("should return false when no fields changed", () => {
    const diff = {
      changedFields: [],
      unchangedFields: ["Title", "Genre"],
      totalFields: 2,
    };

    expect(hasTitleFieldChange(diff)).toBe(false);
  });
});

describe("computeBulkDiffSummary", () => {
  const createMatch = (
    hasChanges: boolean,
    changedCount: number,
    fields: string[] = [],
  ): TitleMatch => ({
    isbn: "123456789",
    titleId: "title-123",
    existingTitle: {
      id: "title-123",
      title: "Test",
      subtitle: null,
      isbn: "123456789",
      genre: null,
      publication_date: null,
      publication_status: "draft",
      word_count: null,
      asin: null,
      bisac_code: null,
      bisac_codes: null,
    },
    csvRow: {
      row: 1,
      valid: true,
      data: { title: "Test", isbn: "123456789" },
      errors: [],
      warnings: [],
    },
    diff: {
      changedFields: fields.map((f) => ({
        field: f,
        fieldKey: f as any,
        oldValue: "old",
        newValue: "new",
      })),
      unchangedFields: [],
      totalFields: changedCount,
    },
    hasChanges,
    rowNumber: 1,
    selected: hasChanges,
  });

  it("should count matches with and without changes", () => {
    const matches: TitleMatch[] = [
      createMatch(true, 2, ["title", "genre"]),
      createMatch(true, 1, ["subtitle"]),
      createMatch(false, 0),
    ];

    const summary = computeBulkDiffSummary(matches);

    expect(summary.totalMatched).toBe(3);
    expect(summary.withChanges).toBe(2);
    expect(summary.withoutChanges).toBe(1);
  });

  it("should count total fields changed", () => {
    const matches: TitleMatch[] = [
      createMatch(true, 2, ["title", "genre"]),
      createMatch(true, 3, ["subtitle", "word_count", "publication_date"]),
    ];

    const summary = computeBulkDiffSummary(matches);

    expect(summary.totalFieldsChanged).toBe(5);
  });

  it("should track field change counts", () => {
    const matches: TitleMatch[] = [
      createMatch(true, 2, ["title", "genre"]),
      createMatch(true, 2, ["title", "subtitle"]),
      createMatch(true, 1, ["genre"]),
    ];

    const summary = computeBulkDiffSummary(matches);

    expect(summary.fieldChangeCounts.title).toBe(2);
    expect(summary.fieldChangeCounts.genre).toBe(2);
    expect(summary.fieldChangeCounts.subtitle).toBe(1);
  });
});

describe("getSelectedUpdates", () => {
  const createMatch = (hasChanges: boolean, selected: boolean): TitleMatch => ({
    isbn: "123456789",
    titleId: "title-123",
    existingTitle: {
      id: "title-123",
      title: "Test",
      subtitle: null,
      isbn: "123456789",
      genre: null,
      publication_date: null,
      publication_status: "draft",
      word_count: null,
      asin: null,
      bisac_code: null,
      bisac_codes: null,
    },
    csvRow: {
      row: 1,
      valid: true,
      data: { title: "Test", isbn: "123456789" },
      errors: [],
      warnings: [],
    },
    diff: {
      changedFields: hasChanges
        ? [
            {
              field: "Title",
              fieldKey: "title" as const,
              oldValue: "old",
              newValue: "new",
            },
          ]
        : [],
      unchangedFields: [],
      totalFields: hasChanges ? 1 : 0,
    },
    hasChanges,
    rowNumber: 1,
    selected,
  });

  it("should return only matches with changes AND selected", () => {
    const matches: TitleMatch[] = [
      createMatch(true, true), // Should be included
      createMatch(true, false), // Has changes but not selected
      createMatch(false, true), // Selected but no changes
      createMatch(false, false), // Neither
    ];

    const selected = getSelectedUpdates(matches);

    expect(selected).toHaveLength(1);
  });

  it("should return empty array when none selected", () => {
    const matches: TitleMatch[] = [
      createMatch(true, false),
      createMatch(true, false),
    ];

    const selected = getSelectedUpdates(matches);

    expect(selected).toHaveLength(0);
  });

  it("should return empty array when none have changes", () => {
    const matches: TitleMatch[] = [
      createMatch(false, true),
      createMatch(false, true),
    ];

    const selected = getSelectedUpdates(matches);

    expect(selected).toHaveLength(0);
  });
});
