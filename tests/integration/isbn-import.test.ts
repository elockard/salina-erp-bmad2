import { beforeEach, describe, expect, it, vi } from "vitest";
import { importISBNs } from "@/modules/isbn/actions";

/**
 * Integration tests for ISBN Import Server Action
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 *
 * AC 5: Server-side validation (re-validate all ISBNs)
 * AC 6: Duplicate detection (global uniqueness across all tenants)
 * AC 8: Transaction ensures all-or-nothing import
 */

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn(() => Promise.resolve("test-tenant-id")),
  getDb: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// Mock database operations
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();
const mockWhere = vi.fn();

vi.mock("@/db/schema/isbns", () => ({
  isbns: { isbn_13: "isbn_13" },
}));

describe("ISBN Import Server Action", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup default mock implementations
    mockWhere.mockResolvedValue([]);
    mockFrom.mockReturnValue({ where: mockWhere });
    mockSelect.mockReturnValue({ from: mockFrom });
    mockInsert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    const mockDb = {
      insert: mockInsert,
      select: mockSelect,
    };

    const { getDb } = await import("@/lib/auth");
    vi.mocked(getDb).mockResolvedValue(mockDb as never);
  });

  describe("Permission checks", () => {
    it("AC1: should return error for unauthorized user", async () => {
      const { requirePermission } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should proceed for authorized user with MANAGE_SETTINGS", async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "physical",
      });

      expect(result.success).toBe(true);
      expect(requirePermission).toHaveBeenCalled();
    });
  });

  describe("Server-side validation (AC5)", () => {
    beforeEach(async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);
    });

    it("should reject invalid ISBN-13 format", async () => {
      const result = await importISBNs({
        isbns: ["1234567890"], // Too short
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("validation");
        expect(result.data?.errorDetails).toHaveLength(1);
        expect(result.data?.errorDetails[0].error).toContain("Invalid length");
      }
    });

    it("should reject invalid ISBN-13 checksum", async () => {
      const result = await importISBNs({
        isbns: ["9780306406158"], // Wrong check digit (should be 7)
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data?.errorDetails).toHaveLength(1);
        expect(result.data?.errorDetails[0].error).toContain("checksum");
      }
    });

    it("should reject invalid prefix (not 978 or 979)", async () => {
      const result = await importISBNs({
        isbns: ["9771234567890"], // 977 prefix
        type: "ebook",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data?.errorDetails[0].error).toContain("prefix");
      }
    });

    it("should accept valid ISBN-13 with correct checksum", async () => {
      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "physical",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.imported).toBe(1);
      }
    });

    it("should accept valid ISBN-13 with 979 prefix", async () => {
      const result = await importISBNs({
        isbns: ["9791234567896"],
        type: "ebook",
      });

      expect(result.success).toBe(true);
    });
  });

  describe("Duplicate detection within batch", () => {
    beforeEach(async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);
    });

    it("should detect duplicates within the import batch", async () => {
      const result = await importISBNs({
        isbns: ["9780306406157", "9780306406157"], // Same ISBN twice
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.data?.errorDetails).toHaveLength(1);
        expect(result.data?.errorDetails[0].error).toContain("Duplicate");
      }
    });
  });

  describe("Duplicate detection against database (AC6)", () => {
    it("should detect ISBNs that already exist in database", async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      // Mock database returning existing ISBN
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ isbn_13: "9780306406157" }]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("already exist");
        expect(result.data?.duplicates).toBe(1);
      }
    });
  });

  describe("All-or-nothing import (AC8)", () => {
    it("should not import any ISBNs if one fails validation", async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const mockInsertFn = vi.fn();
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: mockInsertFn.mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157", "invalid-isbn"],
        type: "physical",
      });

      expect(result.success).toBe(false);
      expect(mockInsertFn).not.toHaveBeenCalled();
      if (!result.success) {
        expect(result.data?.imported).toBe(0);
      }
    });

    it("should import all ISBNs atomically when all are valid", async () => {
      const { requirePermission, getDb } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const mockValuesFn = vi.fn().mockResolvedValue(undefined);
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: mockValuesFn,
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157", "9780140449136", "9780201633610"],
        type: "physical",
      });

      expect(result.success).toBe(true);
      expect(mockValuesFn).toHaveBeenCalledTimes(1); // Single bulk insert
      if (result.success) {
        expect(result.data.imported).toBe(3);
      }
    });
  });

  describe("Input validation", () => {
    beforeEach(async () => {
      const { requirePermission } = await import("@/lib/auth");
      vi.mocked(requirePermission).mockResolvedValue(undefined);
    });

    it("should reject empty ISBN array", async () => {
      const result = await importISBNs({
        isbns: [],
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("At least one ISBN");
      }
    });

    it("should reject more than 100 ISBNs", async () => {
      const tooManyIsbns = Array(101).fill("9780306406157");

      const result = await importISBNs({
        isbns: tooManyIsbns,
        type: "physical",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Maximum 100");
      }
    });

    it("should accept physical type", async () => {
      const { getDb } = await import("@/lib/auth");
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "physical",
      });

      expect(result.success).toBe(true);
    });

    it("should accept ebook type", async () => {
      const { getDb } = await import("@/lib/auth");
      const mockDb = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as never);

      const result = await importISBNs({
        isbns: ["9780306406157"],
        type: "ebook",
      });

      expect(result.success).toBe(true);
    });
  });
});
