/**
 * ISBN Prefixes Queries Tests
 *
 * Unit tests for ISBN prefix query functions.
 * Story 7.4: Implement Publisher ISBN Prefix System
 */

import { beforeEach, describe, expect, test, vi } from "vitest";

// Mock auth module before importing queries
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
  requirePermission: vi.fn(),
}));

import type { IsbnPrefixGenerationStatus } from "@/db/schema/isbn-prefixes";
// Import after mocking
import { getCurrentTenantId, getDb, requirePermission } from "@/lib/auth";

// Define mock data
// Story 7.6: Removed type field - ISBNs are unified
const mockTenantId = "test-tenant-123";
const mockPrefixes = [
  {
    id: "prefix-1",
    tenant_id: mockTenantId,
    prefix: "9781234567",
    block_size: 100,
    description: "Test prefix 1",
    total_isbns: 100,
    available_count: 80,
    assigned_count: 20,
    generation_status: "completed" as IsbnPrefixGenerationStatus,
    generation_error: null,
    created_by_user_id: "user-1",
    created_at: new Date("2024-01-01"),
    updated_at: new Date("2024-01-01"),
  },
  {
    id: "prefix-2",
    tenant_id: mockTenantId,
    prefix: "9789876543",
    block_size: 1000,
    description: "Test prefix 2",
    total_isbns: 1000,
    available_count: 1000,
    assigned_count: 0,
    generation_status: "generating" as IsbnPrefixGenerationStatus,
    generation_error: null,
    created_by_user_id: "user-1",
    created_at: new Date("2024-01-02"),
    updated_at: new Date("2024-01-02"),
  },
];

describe("ISBN Prefixes Queries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentTenantId).mockResolvedValue(mockTenantId);
    vi.mocked(requirePermission).mockResolvedValue(undefined);
  });

  describe("getIsbnPrefixes", () => {
    test("returns all prefixes for current tenant", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findMany: vi.fn().mockResolvedValue(mockPrefixes),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      // Import dynamically after mocks are set up
      const { getIsbnPrefixes } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getIsbnPrefixes();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });

    // Story 7.6: Removed "filters by type" test - type filtering no longer exists

    test("filters by status when specified", async () => {
      const findManyMock = vi.fn().mockResolvedValue([mockPrefixes[1]]);
      const mockDb = {
        query: {
          isbnPrefixes: {
            findMany: findManyMock,
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { getIsbnPrefixes } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getIsbnPrefixes({ status: "generating" });

      expect(result.success).toBe(true);
    });

    test("returns error when unauthorized", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const { getIsbnPrefixes } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getIsbnPrefixes();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });
  });

  describe("getIsbnPrefixById", () => {
    test("returns prefix with details when found", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue({
              ...mockPrefixes[0],
              createdByUser: { id: "user-1", email: "test@example.com" },
            }),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { getIsbnPrefixById } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getIsbnPrefixById("prefix-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("prefix-1");
      }
    });

    test("returns null when prefix not found", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { getIsbnPrefixById } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getIsbnPrefixById("nonexistent");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("not found");
      }
    });
  });

  describe("checkPrefixExists", () => {
    test("returns true when prefix exists", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue(mockPrefixes[0]),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { checkPrefixExists } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await checkPrefixExists("9781234567");

      expect(result).toBe(true);
    });

    test("returns false when prefix does not exist", async () => {
      const mockDb = {
        query: {
          isbnPrefixes: {
            // Drizzle's findFirst returns undefined when no match is found
            findFirst: vi.fn().mockResolvedValue(undefined),
          },
        },
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { checkPrefixExists } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await checkPrefixExists("9789999999");

      expect(result).toBe(false);
    });
  });

  describe("getPrefixSampleIsbns", () => {
    test("returns first N ISBNs for a prefix", async () => {
      const mockIsbns = [
        {
          id: "isbn-1",
          isbn_13: "9781234567890",
          status: "available",
          assignedToTitleId: null,
        },
        {
          id: "isbn-2",
          isbn_13: "9781234567906",
          status: "assigned",
          assignedToTitleId: "title-1",
        },
      ];

      const mockDb = {
        query: {
          isbnPrefixes: {
            findFirst: vi.fn().mockResolvedValue(mockPrefixes[0]),
          },
        },
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue(mockIsbns),
      };
      vi.mocked(getDb).mockResolvedValue(
        mockDb as unknown as Awaited<ReturnType<typeof getDb>>,
      );

      const { getPrefixSampleIsbns } = await import(
        "@/modules/isbn-prefixes/queries"
      );
      const result = await getPrefixSampleIsbns("prefix-1", 50);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
      }
    });
  });
});
