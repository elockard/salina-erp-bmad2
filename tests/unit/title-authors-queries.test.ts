/**
 * Title Authors Queries Unit Tests
 *
 * Tests for query functions in the title-authors module.
 * Uses mocked database and auth functions for isolated testing.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * AC-10.1.3: Backward compatibility for single-author titles
 * AC-10.1.7: Author view of co-authored titles
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module before importing queries
vi.mock("@/lib/auth", () => ({
  getCurrentTenantId: vi.fn(),
  getDb: vi.fn(),
}));

// Import mocked modules
import { getCurrentTenantId, getDb } from "@/lib/auth";

// Import queries under test
import {
  getAuthorTitles,
  getContactsWithAuthorRole,
  getTitleAuthors,
  getTitleOwnershipSum,
  getTitlePrimaryAuthor,
  getTitleWithAuthors,
  isAuthorOnTitle,
} from "@/modules/title-authors/queries";

// =============================================================================
// Test Utilities
// =============================================================================

// Use valid UUIDs for test constants
const TEST_TENANT_ID = "00000000-0000-4000-8000-000000000001";
const TEST_TITLE_ID = "00000000-0000-4000-8000-000000000003";
const TEST_CONTACT_ID = "00000000-0000-4000-8000-000000000004";
const TEST_CONTACT_ID_2 = "00000000-0000-4000-8000-000000000005";

function createMockDb() {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockGroupBy = vi.fn();
  const mockQuery = {
    titleAuthors: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    titles: {
      findFirst: vi.fn(),
    },
    contacts: {
      findMany: vi.fn(),
    },
  };

  // Chain setup - supports both where() terminating and where().groupBy() chaining
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockImplementation(() => {
    // Return array by default but also support groupBy chaining
    const result: unknown[] = [];
    (result as any).groupBy = mockGroupBy;
    return result;
  });
  mockGroupBy.mockReturnValue([]);

  return {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    groupBy: mockGroupBy,
    query: mockQuery,
    reset: () => {
      mockSelect.mockClear();
      mockFrom.mockClear();
      mockWhere.mockClear();
      mockGroupBy.mockClear();
      mockQuery.titleAuthors.findMany.mockReset();
      mockQuery.titleAuthors.findFirst.mockReset();
      mockQuery.titles.findFirst.mockReset();
      mockQuery.contacts.findMany.mockReset();
    },
  };
}

// =============================================================================
// Test Suites
// =============================================================================

describe("Title Authors Queries", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    vi.mocked(getCurrentTenantId).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // getTitleAuthors Tests
  // ===========================================================================

  describe("getTitleAuthors", () => {
    it("returns empty array if title not found", async () => {
      mockDb.where.mockReturnValueOnce([]); // No title found

      const result = await getTitleAuthors(TEST_TITLE_ID);

      expect(result).toEqual([]);
    });

    it("returns empty array if title belongs to different tenant", async () => {
      // Title not found for this tenant
      mockDb.where.mockReturnValueOnce([]);

      const result = await getTitleAuthors(TEST_TITLE_ID);

      expect(result).toEqual([]);
    });

    it("returns authors sorted by primary first, then ownership percentage", async () => {
      const authors = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "60.00",
          is_primary: true,
          contact: {
            id: TEST_CONTACT_ID,
            first_name: "Primary",
            last_name: "Author",
          },
        },
        {
          id: "ta-2",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "40.00",
          is_primary: false,
          contact: {
            id: TEST_CONTACT_ID_2,
            first_name: "Co",
            last_name: "Author",
          },
        },
      ];

      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // Title found
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authors);

      const result = await getTitleAuthors(TEST_TITLE_ID);

      expect(result).toHaveLength(2);
      expect(result[0].is_primary).toBe(true);
      expect(result[0].contact.first_name).toBe("Primary");
    });

    it("returns single author for sole-author title", async () => {
      const authors = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
          contact: {
            id: TEST_CONTACT_ID,
            first_name: "Sole",
            last_name: "Author",
          },
        },
      ];

      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // Title found
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authors);

      const result = await getTitleAuthors(TEST_TITLE_ID);

      expect(result).toHaveLength(1);
      expect(result[0].ownership_percentage).toBe("100.00");
    });
  });

  // ===========================================================================
  // getAuthorTitles Tests
  // ===========================================================================

  describe("getAuthorTitles", () => {
    it("returns empty array if contact not found", async () => {
      mockDb.where.mockReturnValueOnce([]); // No contact found

      const result = await getAuthorTitles(TEST_CONTACT_ID);

      expect(result).toEqual([]);
    });

    it("returns titles with ownership info for author (AC-10.1.7)", async () => {
      const authorEntries = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
          title: {
            id: TEST_TITLE_ID,
            title: "My Book",
            isbn: "978-0-123456-78-9",
            publication_status: "published",
            tenant_id: TEST_TENANT_ID,
          },
        },
      ];

      mockDb.where.mockReturnValueOnce([{ id: TEST_CONTACT_ID }]); // Contact found
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authorEntries);
      // Mock the groupBy query for co-author counts (returns array with groupBy method)
      const whereResultWithGroupBy: any = [];
      whereResultWithGroupBy.groupBy = vi
        .fn()
        .mockReturnValue([{ titleId: TEST_TITLE_ID, count: 1 }]);
      mockDb.where.mockReturnValueOnce(whereResultWithGroupBy);

      const result = await getAuthorTitles(TEST_CONTACT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("My Book");
      expect(result[0].ownershipPercentage).toBe("100.00");
      expect(result[0].isCoAuthored).toBe(false);
      expect(result[0].coAuthorCount).toBe(1);
    });

    it("indicates co-authored status when multiple authors exist", async () => {
      const authorEntries = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "50.00",
          is_primary: true,
          title: {
            id: TEST_TITLE_ID,
            title: "Co-authored Book",
            isbn: null,
            publication_status: "draft",
            tenant_id: TEST_TENANT_ID,
          },
        },
      ];

      mockDb.where.mockReturnValueOnce([{ id: TEST_CONTACT_ID }]); // Contact found
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authorEntries);
      // Mock the groupBy query for co-author counts (returns 2 authors)
      const whereResultWithGroupBy: any = [];
      whereResultWithGroupBy.groupBy = vi
        .fn()
        .mockReturnValue([{ titleId: TEST_TITLE_ID, count: 2 }]);
      mockDb.where.mockReturnValueOnce(whereResultWithGroupBy);

      const result = await getAuthorTitles(TEST_CONTACT_ID);

      expect(result[0].isCoAuthored).toBe(true);
      expect(result[0].coAuthorCount).toBe(2);
    });

    it("filters out titles from other tenants", async () => {
      const authorEntries = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
          title: {
            id: TEST_TITLE_ID,
            title: "Other Tenant Book",
            isbn: null,
            publication_status: null,
            tenant_id: "other-tenant-id", // Different tenant
          },
        },
      ];

      mockDb.where.mockReturnValueOnce([{ id: TEST_CONTACT_ID }]); // Contact found
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authorEntries);

      const result = await getAuthorTitles(TEST_CONTACT_ID);

      // Should not include title from other tenant
      expect(result).toHaveLength(0);
    });
  });

  // ===========================================================================
  // getTitleWithAuthors Tests
  // ===========================================================================

  describe("getTitleWithAuthors", () => {
    it("returns null if title not found", async () => {
      mockDb.query.titles.findFirst.mockResolvedValueOnce(null);

      const result = await getTitleWithAuthors(TEST_TITLE_ID);

      expect(result).toBeNull();
    });

    it("returns title with authors and metadata", async () => {
      const title = {
        id: TEST_TITLE_ID,
        title: "Test Book",
        isbn: "978-0-123456-78-9",
        tenant_id: TEST_TENANT_ID,
        publication_status: "published",
        created_at: new Date("2024-01-01"),
        updated_at: new Date("2024-06-01"),
      };
      const authors = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
          contact: {
            id: TEST_CONTACT_ID,
            first_name: "Test",
            last_name: "Author",
          },
        },
      ];

      mockDb.query.titles.findFirst.mockResolvedValueOnce(title);
      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // For getTitleAuthors
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authors);

      const result = await getTitleWithAuthors(TEST_TITLE_ID);

      expect(result).not.toBeNull();
      expect(result?.title).toBe("Test Book");
      expect(result?.authors).toHaveLength(1);
      expect(result?.primaryAuthor?.contact_id).toBe(TEST_CONTACT_ID);
      expect(result?.isSoleAuthor).toBe(true);
    });

    it("correctly identifies multi-author titles", async () => {
      const title = {
        id: TEST_TITLE_ID,
        title: "Co-authored Book",
        isbn: null,
        tenant_id: TEST_TENANT_ID,
        publication_status: "draft",
        created_at: new Date(),
        updated_at: new Date(),
      };
      const authors = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "60.00",
          is_primary: true,
          contact: { id: TEST_CONTACT_ID },
        },
        {
          id: "ta-2",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "40.00",
          is_primary: false,
          contact: { id: TEST_CONTACT_ID_2 },
        },
      ];

      mockDb.query.titles.findFirst.mockResolvedValueOnce(title);
      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // For getTitleAuthors
      mockDb.query.titleAuthors.findMany.mockResolvedValueOnce(authors);

      const result = await getTitleWithAuthors(TEST_TITLE_ID);

      expect(result?.authors).toHaveLength(2);
      expect(result?.isSoleAuthor).toBe(false);
      expect(result?.primaryAuthor?.ownership_percentage).toBe("60.00");
    });
  });

  // ===========================================================================
  // getContactsWithAuthorRole Tests
  // ===========================================================================

  describe("getContactsWithAuthorRole", () => {
    it("returns empty array if no author roles exist", async () => {
      mockDb.where.mockReturnValueOnce([]); // No author roles

      const result = await getContactsWithAuthorRole();

      expect(result).toEqual([]);
    });

    it("returns contacts with author role sorted by display name", async () => {
      // pen_name is stored in role_specific_data JSONB
      const authorRoles = [
        { contactId: TEST_CONTACT_ID, roleData: null },
        { contactId: TEST_CONTACT_ID_2, roleData: { pen_name: "Pen Name" } },
      ];
      const contactsList = [
        {
          id: TEST_CONTACT_ID,
          first_name: "Zack",
          last_name: "Author",
          email: "zack@test.com",
          tenant_id: TEST_TENANT_ID,
        },
        {
          id: TEST_CONTACT_ID_2,
          first_name: "Alice",
          last_name: "Writer",
          email: "alice@test.com",
          tenant_id: TEST_TENANT_ID,
        },
      ];

      mockDb.where.mockReturnValueOnce(authorRoles); // Author roles
      mockDb.query.contacts.findMany.mockResolvedValueOnce(contactsList);

      const result = await getContactsWithAuthorRole();

      expect(result).toHaveLength(2);
      // Should be sorted by display name
      expect(result[0].displayName).toBe("Alice Writer");
      expect(result[1].displayName).toBe("Zack Author");
      expect(result[0].penName).toBe("Pen Name");
      expect(result[1].penName).toBeNull();
    });

    it("handles contacts with missing names", async () => {
      const authorRoles = [{ contactId: TEST_CONTACT_ID, roleData: null }];
      const contactsList = [
        {
          id: TEST_CONTACT_ID,
          first_name: null,
          last_name: null,
          email: "noname@test.com",
          tenant_id: TEST_TENANT_ID,
        },
      ];

      mockDb.where.mockReturnValueOnce(authorRoles);
      mockDb.query.contacts.findMany.mockResolvedValueOnce(contactsList);

      const result = await getContactsWithAuthorRole();

      expect(result[0].displayName).toBe("noname@test.com");
    });
  });

  // ===========================================================================
  // isAuthorOnTitle Tests
  // ===========================================================================

  describe("isAuthorOnTitle", () => {
    it("returns true if contact is an author on the title", async () => {
      mockDb.where.mockReturnValueOnce([{ id: "ta-1" }]); // Author found

      const result = await isAuthorOnTitle(TEST_TITLE_ID, TEST_CONTACT_ID);

      expect(result).toBe(true);
    });

    it("returns false if contact is not an author on the title", async () => {
      mockDb.where.mockReturnValueOnce([]); // No author found

      const result = await isAuthorOnTitle(TEST_TITLE_ID, TEST_CONTACT_ID);

      expect(result).toBe(false);
    });
  });

  // ===========================================================================
  // getTitlePrimaryAuthor Tests
  // ===========================================================================

  describe("getTitlePrimaryAuthor", () => {
    it("returns null if title not found", async () => {
      mockDb.where.mockReturnValueOnce([]); // No title

      const result = await getTitlePrimaryAuthor(TEST_TITLE_ID);

      expect(result).toBeNull();
    });

    it("returns primary author with contact info", async () => {
      const primaryAuthor = {
        id: "ta-1",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "100.00",
        is_primary: true,
        contact: {
          id: TEST_CONTACT_ID,
          first_name: "Primary",
          last_name: "Author",
        },
      };

      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // Title found
      mockDb.query.titleAuthors.findFirst.mockResolvedValueOnce(primaryAuthor);

      const result = await getTitlePrimaryAuthor(TEST_TITLE_ID);

      expect(result).not.toBeNull();
      expect(result?.is_primary).toBe(true);
      expect(result?.contact.first_name).toBe("Primary");
    });

    it("falls back to first author if no primary set", async () => {
      const firstAuthor = {
        id: "ta-1",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "50.00",
        is_primary: false,
        contact: {
          id: TEST_CONTACT_ID,
          first_name: "First",
          last_name: "Author",
        },
      };

      mockDb.where.mockReturnValueOnce([{ id: TEST_TITLE_ID }]); // Title found
      mockDb.query.titleAuthors.findFirst
        .mockResolvedValueOnce(null) // No primary
        .mockResolvedValueOnce(firstAuthor); // First by ownership

      const result = await getTitlePrimaryAuthor(TEST_TITLE_ID);

      expect(result).not.toBeNull();
      expect(result?.contact.first_name).toBe("First");
    });
  });

  // ===========================================================================
  // getTitleOwnershipSum Tests
  // ===========================================================================

  describe("getTitleOwnershipSum", () => {
    it("returns 0 and invalid for title with no authors", async () => {
      mockDb.where.mockReturnValueOnce([]); // No authors

      const result = await getTitleOwnershipSum(TEST_TITLE_ID);

      expect(result.total).toBe("0");
      expect(result.isValid).toBe(false);
    });

    it("returns valid for 100% total", async () => {
      mockDb.where.mockReturnValueOnce([
        { percentage: "50.00" },
        { percentage: "50.00" },
      ]);

      const result = await getTitleOwnershipSum(TEST_TITLE_ID);

      expect(result.total).toBe("100");
      expect(result.isValid).toBe(true);
    });

    it("returns invalid for non-100% total", async () => {
      mockDb.where.mockReturnValueOnce([
        { percentage: "40.00" },
        { percentage: "40.00" },
      ]);

      const result = await getTitleOwnershipSum(TEST_TITLE_ID);

      expect(result.total).toBe("80");
      expect(result.isValid).toBe(false);
    });

    it("handles decimal precision correctly", async () => {
      mockDb.where.mockReturnValueOnce([
        { percentage: "33.33" },
        { percentage: "33.33" },
        { percentage: "33.34" },
      ]);

      const result = await getTitleOwnershipSum(TEST_TITLE_ID);

      expect(result.total).toBe("100");
      expect(result.isValid).toBe(true);
    });
  });
});
