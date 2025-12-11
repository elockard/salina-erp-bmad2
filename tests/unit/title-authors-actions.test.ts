/**
 * Title Authors Actions Unit Tests
 *
 * Tests for server actions in the title-authors module.
 * Uses mocked database and auth functions for isolated testing.
 *
 * Story: 10.1 - Add Multiple Authors Per Title with Ownership Percentages
 * AC-10.1.2: Ownership percentage validation
 * AC-10.1.3: Backward compatibility for single-author titles
 * AC-10.1.6: Audit trail for ownership changes
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock the auth module before importing actions
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn(),
  getCurrentUser: vi.fn(),
  getDb: vi.fn(),
}));

// Mock the audit module
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn(),
}));

// Mock next/cache
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import { logAuditEvent } from "@/lib/audit";
// Import mocked modules
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";

// Import actions under test
import {
  addAuthorToTitle,
  removeAuthorFromTitle,
  setTitlePrimaryAuthor,
  updateTitleAuthors,
} from "@/modules/title-authors/actions";

// =============================================================================
// Test Utilities
// =============================================================================

// Use valid UUIDs for test constants (Zod validates UUID format)
const TEST_TENANT_ID = "00000000-0000-4000-8000-000000000001";
const TEST_USER_ID = "00000000-0000-4000-8000-000000000002";
const TEST_TITLE_ID = "00000000-0000-4000-8000-000000000003";
const TEST_CONTACT_ID = "00000000-0000-4000-8000-000000000004";
const TEST_CONTACT_ID_2 = "00000000-0000-4000-8000-000000000005";
const TEST_CONTACT_ID_3 = "00000000-0000-4000-8000-000000000006";

function createMockDb() {
  const mockSelect = vi.fn();
  const mockFrom = vi.fn();
  const mockWhere = vi.fn();
  const mockInsert = vi.fn();
  const mockValues = vi.fn();
  const mockReturning = vi.fn();
  const mockUpdate = vi.fn();
  const mockSet = vi.fn();
  const mockDelete = vi.fn();
  const mockTransaction = vi.fn();

  // Chain setup
  mockSelect.mockReturnValue({ from: mockFrom });
  mockFrom.mockReturnValue({ where: mockWhere });
  mockWhere.mockReturnValue([]);
  mockInsert.mockReturnValue({ values: mockValues });
  mockValues.mockReturnValue({ returning: mockReturning });
  mockReturning.mockReturnValue([]);
  mockUpdate.mockReturnValue({ set: mockSet });
  mockSet.mockReturnValue({ where: mockWhere });
  mockDelete.mockReturnValue({ where: mockWhere });

  return {
    select: mockSelect,
    from: mockFrom,
    where: mockWhere,
    insert: mockInsert,
    values: mockValues,
    returning: mockReturning,
    update: mockUpdate,
    set: mockSet,
    delete: mockDelete,
    transaction: mockTransaction,
    // Reset all mocks
    reset: () => {
      mockSelect.mockClear();
      mockFrom.mockClear();
      mockWhere.mockClear();
      mockInsert.mockClear();
      mockValues.mockClear();
      mockReturning.mockClear();
      mockUpdate.mockClear();
      mockSet.mockClear();
      mockDelete.mockClear();
      mockTransaction.mockClear();
    },
  };
}

// =============================================================================
// Test Suites
// =============================================================================

describe("Title Authors Actions", () => {
  let mockDb: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockDb = createMockDb();

    // Default mock implementations
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getCurrentTenantId).mockResolvedValue(TEST_TENANT_ID);
    vi.mocked(getCurrentUser).mockResolvedValue({ id: TEST_USER_ID } as any);
    vi.mocked(getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================================================
  // addAuthorToTitle Tests
  // ===========================================================================

  describe("addAuthorToTitle", () => {
    it("requires CREATE_AUTHORS_TITLES permission", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "50.00",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("You don't have permission to manage titles");
      }
    });

    it("rejects percentage below 1", async () => {
      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "0.50",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Ownership percentage must be between 1 and 100",
        );
      }
    });

    it("rejects percentage above 100", async () => {
      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "100.01",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Ownership percentage must be between 1 and 100",
        );
      }
    });

    it("validates title exists and belongs to tenant", async () => {
      // Mock title not found
      mockDb.where.mockReturnValueOnce([]); // No title found

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "50.00",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Title not found or access denied");
      }
    });

    it("validates contact exists and belongs to tenant", async () => {
      // Mock title found, contact not found
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([]); // Contact not found

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "50.00",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Contact not found or access denied");
      }
    });

    it("rejects duplicate author assignment", async () => {
      // Mock title found, contact found, author already exists
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }]) // Contact found
        .mockReturnValueOnce([
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID },
        ]); // Author already exists

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "50.00",
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "This author is already assigned to this title",
        );
      }
    });

    it("successfully adds author with valid data", async () => {
      const newTitleAuthor = {
        id: "ta-123",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "50.00",
        is_primary: false,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: TEST_USER_ID,
      };
      const contact = {
        id: TEST_CONTACT_ID,
        first_name: "John",
        last_name: "Author",
      };

      // Mock successful path
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }]) // Contact found
        .mockReturnValueOnce([]) // No existing author
        .mockReturnValueOnce([contact]); // Contact for response
      mockDb.returning.mockReturnValueOnce([newTitleAuthor]);

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "50.00",
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeDefined();
        expect(result.data?.contact_id).toBe(TEST_CONTACT_ID);
      }
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          actionType: "CREATE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith(`/titles/${TEST_TITLE_ID}`);
    });

    it("sets primary flag and unsets others when isPrimary is true", async () => {
      const newTitleAuthor = {
        id: "ta-123",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "100.00",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: TEST_USER_ID,
      };
      const contact = { id: TEST_CONTACT_ID };

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }]) // Contact found
        .mockReturnValueOnce([]) // No existing author
        .mockReturnValueOnce([contact]); // Contact for response
      mockDb.returning.mockReturnValueOnce([newTitleAuthor]);

      const result = await addAuthorToTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
        "100.00",
        true,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.is_primary).toBe(true);
      }
      // Verify update was called to unset existing primaries
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // removeAuthorFromTitle Tests
  // ===========================================================================

  describe("removeAuthorFromTitle", () => {
    it("requires CREATE_AUTHORS_TITLES permission", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("You don't have permission to manage titles");
      }
    });

    it("validates title exists and belongs to tenant", async () => {
      mockDb.where.mockReturnValueOnce([]); // No title found

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Title not found or access denied");
      }
    });

    it("prevents removing the last author (AC-10.1.4)", async () => {
      // Mock title found, only one author exists
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID },
        ]); // Only one author

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Cannot remove the last author. Title must have at least one author.",
        );
      }
    });

    it("returns error if author not found on title", async () => {
      // Mock title found, multiple authors but not the one we're removing
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([
          { title_id: TEST_TITLE_ID, contact_id: "other-contact-1" },
          { title_id: TEST_TITLE_ID, contact_id: "other-contact-2" },
        ]); // Multiple authors, but not the one we want

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Author not found on this title");
      }
    });

    it("successfully removes author when multiple exist", async () => {
      // Mock title found, multiple authors
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([
          {
            title_id: TEST_TITLE_ID,
            contact_id: TEST_CONTACT_ID,
            is_primary: false,
            ownership_percentage: "50.00",
          },
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID_2 },
        ]); // Multiple authors

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.removed).toBe(true);
      }
      expect(mockDb.delete).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "DELETE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
        }),
      );
    });

    it("promotes another author to primary when removing primary", async () => {
      // Mock removing the primary author
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([
          {
            title_id: TEST_TITLE_ID,
            contact_id: TEST_CONTACT_ID,
            is_primary: true,
            ownership_percentage: "50.00",
          },
          {
            title_id: TEST_TITLE_ID,
            contact_id: TEST_CONTACT_ID_2,
            is_primary: false,
          },
        ]); // Primary + another

      const result = await removeAuthorFromTitle(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(true);
      // Should update to set a new primary
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // updateTitleAuthors Tests
  // ===========================================================================

  describe("updateTitleAuthors", () => {
    it("requires CREATE_AUTHORS_TITLES permission", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("You don't have permission to manage titles");
      }
    });

    it("validates at least one author required", async () => {
      const result = await updateTitleAuthors(TEST_TITLE_ID, []);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("At least one author is required");
      }
    });

    it("validates ownership sum equals 100% (AC-10.1.2)", async () => {
      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "50.00",
          is_primary: true,
        },
        {
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "40.00",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("sum to exactly 100%");
      }
    });

    it("validates exactly one primary author (AC-10.1.5)", async () => {
      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "50.00",
          is_primary: true,
        },
        {
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "50.00",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain(
          "At most one author can be marked as primary",
        );
      }
    });

    it("validates no duplicate contact IDs", async () => {
      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "50.00",
          is_primary: true,
        },
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "50.00",
          is_primary: false,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Duplicate authors are not allowed");
      }
    });

    it("validates title access", async () => {
      mockDb.where.mockReturnValueOnce([]); // No title found

      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Title not found or access denied");
      }
    });

    it("validates all contact access", async () => {
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([]); // Contact not found

      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Contact not found or access denied");
      }
    });

    it("uses transaction for batch update (AC-10.1.6)", async () => {
      const newAuthor = {
        id: "ta-123",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "100.00",
        is_primary: true,
        created_at: new Date(),
        updated_at: new Date(),
        created_by: TEST_USER_ID,
      };
      const contact = { id: TEST_CONTACT_ID };

      // Setup mock transaction
      const mockTx = {
        delete: vi.fn().mockReturnValue({ where: vi.fn() }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([newAuthor]),
          }),
        }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockTx));

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }]) // Contact found
        .mockReturnValueOnce([]) // Existing authors
        .mockReturnValueOnce([contact]); // Contact for response

      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ]);

      expect(result.success).toBe(true);
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "UPDATE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
        }),
      );
    });

    it("handles decimal precision correctly (AC-10.1.2)", async () => {
      const newAuthors = [
        {
          id: "ta-1",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "33.33",
          is_primary: true,
        },
        {
          id: "ta-2",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "33.33",
          is_primary: false,
        },
        {
          id: "ta-3",
          title_id: TEST_TITLE_ID,
          contact_id: TEST_CONTACT_ID_3,
          ownership_percentage: "33.34",
          is_primary: false,
        },
      ];

      const mockTx = {
        delete: vi.fn().mockReturnValue({ where: vi.fn() }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue(newAuthors),
          }),
        }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockTx));

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }]) // Contact 1 found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID_2 }]) // Contact 2 found
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID_3 }]) // Contact 3 found
        .mockReturnValueOnce([]) // Existing authors
        .mockReturnValueOnce([
          { id: TEST_CONTACT_ID },
          { id: TEST_CONTACT_ID_2 },
          { id: TEST_CONTACT_ID_3 },
        ]); // Contacts for response

      const result = await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "33.33",
          is_primary: true,
        },
        {
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "33.33",
          is_primary: false,
        },
        {
          contact_id: TEST_CONTACT_ID_3,
          ownership_percentage: "33.34",
          is_primary: false,
        },
      ]);

      // 33.33 + 33.33 + 33.34 = 100.00 exactly with Decimal.js
      expect(result.success).toBe(true);
    });
  });

  // ===========================================================================
  // setTitlePrimaryAuthor Tests
  // ===========================================================================

  describe("setTitlePrimaryAuthor", () => {
    it("requires CREATE_AUTHORS_TITLES permission", async () => {
      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await setTitlePrimaryAuthor(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("You don't have permission to manage titles");
      }
    });

    it("validates title exists and belongs to tenant", async () => {
      mockDb.where.mockReturnValueOnce([]); // No title found

      const result = await setTitlePrimaryAuthor(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Title not found or access denied");
      }
    });

    it("validates contact is an author on the title", async () => {
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([]); // Author not found

      const result = await setTitlePrimaryAuthor(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Contact is not an author on this title");
      }
    });

    it("successfully sets primary author (AC-10.1.5)", async () => {
      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockTx));

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }]) // Title found
        .mockReturnValueOnce([
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID },
        ]) // Author found
        .mockReturnValueOnce([
          { contact_id: TEST_CONTACT_ID_2, is_primary: true },
          { contact_id: TEST_CONTACT_ID, is_primary: false },
        ]); // Current authors

      const result = await setTitlePrimaryAuthor(
        TEST_TITLE_ID,
        TEST_CONTACT_ID,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data?.updated).toBe(true);
      }
      expect(mockDb.transaction).toHaveBeenCalled();
      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "UPDATE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
          changes: expect.objectContaining({
            after: expect.objectContaining({
              action: "set_primary_author",
              primary_contact_id: TEST_CONTACT_ID,
            }),
          }),
        }),
      );
    });

    it("does not affect ownership percentages (AC-10.1.5)", async () => {
      const mockTx = {
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn(),
          }),
        }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockTx));

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }])
        .mockReturnValueOnce([
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID },
        ])
        .mockReturnValueOnce([
          {
            contact_id: TEST_CONTACT_ID,
            is_primary: false,
            ownership_percentage: "30.00",
          },
        ]);

      await setTitlePrimaryAuthor(TEST_TITLE_ID, TEST_CONTACT_ID);

      // Verify only is_primary is updated, not ownership_percentage
      const updateCalls = mockTx.update.mock.calls;
      expect(updateCalls.length).toBeGreaterThan(0);
      // The set calls should only contain is_primary
      const setCalls = mockTx.update().set.mock.calls;
      for (const call of setCalls) {
        expect(call[0]).not.toHaveProperty("ownership_percentage");
      }
    });
  });

  // ===========================================================================
  // Audit Trail Tests (AC-10.1.6)
  // ===========================================================================

  describe("Audit Trail (AC-10.1.6)", () => {
    it("logs audit event for addAuthorToTitle", async () => {
      const newTitleAuthor = {
        id: "ta-123",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID,
        ownership_percentage: "100.00",
        is_primary: true,
      };
      const contact = { id: TEST_CONTACT_ID };

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }])
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID }])
        .mockReturnValueOnce([])
        .mockReturnValueOnce([contact]);
      mockDb.returning.mockReturnValueOnce([newTitleAuthor]);

      await addAuthorToTitle(TEST_TITLE_ID, TEST_CONTACT_ID, "100.00", true);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: TEST_TENANT_ID,
          userId: TEST_USER_ID,
          actionType: "CREATE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
          changes: expect.objectContaining({
            after: expect.objectContaining({
              action: "add_author",
              contact_id: TEST_CONTACT_ID,
              ownership_percentage: "100.00",
              is_primary: true,
            }),
          }),
        }),
      );
    });

    it("logs audit event for removeAuthorFromTitle", async () => {
      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }])
        .mockReturnValueOnce([
          {
            title_id: TEST_TITLE_ID,
            contact_id: TEST_CONTACT_ID,
            is_primary: false,
            ownership_percentage: "50.00",
          },
          { title_id: TEST_TITLE_ID, contact_id: TEST_CONTACT_ID_2 },
        ]);

      await removeAuthorFromTitle(TEST_TITLE_ID, TEST_CONTACT_ID);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "DELETE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
          changes: expect.objectContaining({
            before: expect.objectContaining({
              action: "remove_author",
              contact_id: TEST_CONTACT_ID,
              ownership_percentage: "50.00",
            }),
          }),
        }),
      );
    });

    it("logs audit event for updateTitleAuthors with before/after", async () => {
      const existingAuthors = [
        {
          contact_id: TEST_CONTACT_ID,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ];
      const newAuthor = {
        id: "ta-123",
        title_id: TEST_TITLE_ID,
        contact_id: TEST_CONTACT_ID_2,
        ownership_percentage: "100.00",
        is_primary: true,
      };

      const mockTx = {
        delete: vi.fn().mockReturnValue({ where: vi.fn() }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockReturnValue([newAuthor]),
          }),
        }),
      };
      mockDb.transaction.mockImplementation(async (fn) => fn(mockTx));

      mockDb.where
        .mockReturnValueOnce([{ id: TEST_TITLE_ID }])
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID_2 }])
        .mockReturnValueOnce(existingAuthors)
        .mockReturnValueOnce([{ id: TEST_CONTACT_ID_2 }]);

      await updateTitleAuthors(TEST_TITLE_ID, [
        {
          contact_id: TEST_CONTACT_ID_2,
          ownership_percentage: "100.00",
          is_primary: true,
        },
      ]);

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "UPDATE",
          resourceType: "title",
          resourceId: TEST_TITLE_ID,
          changes: expect.objectContaining({
            before: expect.objectContaining({
              action: "update_authors",
              authors: existingAuthors.map((a) => ({
                contact_id: a.contact_id,
                ownership_percentage: a.ownership_percentage,
                is_primary: a.is_primary,
              })),
            }),
            after: expect.objectContaining({
              action: "update_authors",
            }),
          }),
        }),
      );
    });
  });
});
