/**
 * Integration Tests for Portal Statement Access
 *
 * Story: 5.6 - Build Author Portal Statement Access
 *
 * Tests:
 * - Author role can access /portal (AC-5.6.1)
 * - Author can only see own statements (RLS enforcement) (AC-5.6.5)
 * - Author cannot access other author's statement by ID (AC-5.6.5)
 * - PDF download generates presigned URL for owned statement (AC-5.6.4)
 * - PDF download fails for statement not owned (AC-5.6.4, AC-5.6.5)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetTestAuthContext, setTestUserRole } from "../setup";

// Mock auth functions
vi.mock("@/lib/auth", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/auth")>("@/lib/auth");
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    getDb: vi.fn(),
    requirePermission: vi.fn(),
    getCurrentTenantId: vi.fn().mockResolvedValue("tenant-1"),
  };
});

// Mock storage for presigned URL
vi.mock("@/modules/statements/storage", () => ({
  getStatementDownloadUrl: vi
    .fn()
    .mockResolvedValue("https://s3.example.com/presigned-url"),
}));

// Sample test data
const mockAuthor = {
  id: "author-1",
  tenant_id: "tenant-1",
  name: "Jane Author",
  email: "jane@example.com",
  portal_user_id: "user-1",
  is_active: true,
  // For contacts query compatibility (Story 7.3 migration)
  roles: [{ role: "author" }],
};

const _mockOtherAuthor = {
  id: "author-2",
  tenant_id: "tenant-1",
  name: "Other Author",
  email: "other@example.com",
  portal_user_id: "user-2",
  is_active: true,
};

const mockUser = {
  id: "user-1",
  clerk_user_id: "clerk-user-1",
  tenant_id: "tenant-1",
  role: "author",
  is_active: true,
};

const mockStatement = {
  id: "stmt-1",
  tenant_id: "tenant-1",
  author_id: "author-1",
  contract_id: "contract-1",
  period_start: new Date("2025-10-01"),
  period_end: new Date("2025-12-31"),
  total_royalty_earned: "1500.00",
  recoupment: "200.00",
  net_payable: "1300.00",
  calculations: {},
  pdf_s3_key: "statements/tenant-1/stmt-1.pdf",
  status: "sent",
  email_sent_at: new Date("2025-11-15T10:30:00Z"),
  generated_by_user_id: "user-1",
  created_at: new Date("2025-11-14T09:00:00Z"),
  updated_at: new Date("2025-11-15T10:30:00Z"),
};

const _mockOtherStatement = {
  ...mockStatement,
  id: "stmt-2",
  author_id: "author-2", // Different author
};

// Import modules after mocks
import { getCurrentUser, getDb } from "@/lib/auth";

describe("Portal Statement Access", () => {
  beforeEach(() => {
    resetTestAuthContext();
    vi.clearAllMocks();
  });

  describe("getMyStatements Query (AC-5.6.2, AC-5.6.5)", () => {
    it("returns only statements belonging to the current author", async () => {
      // Setup mocks
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findMany: vi.fn().mockResolvedValue([mockStatement]),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      // Import and call
      const { getMyStatements } = await import("@/modules/statements/queries");
      const result = await getMyStatements();

      // Verify contact lookup used portal_user_id (Story 7.3 migration)
      expect(mockDbQuery.contacts.findFirst).toHaveBeenCalled();

      // Verify only author's statements returned
      expect(result).toHaveLength(1);
      expect(result[0].author_id).toBe("author-1");
    });

    it("returns empty array if user not linked to author", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(null), // No author linked
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(null), // No contact linked
        },
        statements: {
          findMany: vi.fn(),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatements } = await import("@/modules/statements/queries");
      const result = await getMyStatements();

      expect(result).toEqual([]);
      expect(mockDbQuery.statements.findMany).not.toHaveBeenCalled();
    });

    it("returns empty array if user not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { getMyStatements } = await import("@/modules/statements/queries");
      const result = await getMyStatements();

      expect(result).toEqual([]);
    });
  });

  describe("getMyStatementById Query (AC-5.6.3, AC-5.6.5)", () => {
    it("returns statement if owned by current author", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findFirst: vi.fn().mockResolvedValue({
            ...mockStatement,
            author: mockAuthor,
            contract: {
              id: "contract-1",
              title_id: "title-1",
              title: { id: "title-1", title: "Test Book" },
            },
          }),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementById } = await import(
        "@/modules/statements/queries"
      );
      const result = await getMyStatementById("stmt-1");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("stmt-1");
    });

    it("returns null for statement not owned by author (AC-5.6.5)", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findFirst: vi.fn().mockResolvedValue(null), // No match (ownership check)
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementById } = await import(
        "@/modules/statements/queries"
      );
      const result = await getMyStatementById("stmt-2"); // Other author's statement

      expect(result).toBeNull();
    });
  });

  describe("getMyStatementPDFUrl Action (AC-5.6.4, AC-5.6.5)", () => {
    it("returns presigned URL for owned statement", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findFirst: vi.fn().mockResolvedValue(mockStatement),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementPDFUrl } = await import(
        "@/modules/statements/actions"
      );
      const result = await getMyStatementPDFUrl("stmt-1");

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.url).toContain("presigned");
        expect(result.data.expiresInMinutes).toBe(15);
      }
    });

    it("fails for statement not owned by author (AC-5.6.5)", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findFirst: vi.fn().mockResolvedValue(null), // Not found (ownership check)
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementPDFUrl } = await import(
        "@/modules/statements/actions"
      );
      const result = await getMyStatementPDFUrl("stmt-2");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Statement not found");
      }
    });

    it("fails if PDF not yet generated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findFirst: vi.fn().mockResolvedValue({
            ...mockStatement,
            pdf_s3_key: null, // No PDF
          }),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementPDFUrl } = await import(
        "@/modules/statements/actions"
      );
      const result = await getMyStatementPDFUrl("stmt-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("PDF not yet generated for this statement");
      }
    });

    it("fails if user not authenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);

      const { getMyStatementPDFUrl } = await import(
        "@/modules/statements/actions"
      );
      const result = await getMyStatementPDFUrl("stmt-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Authentication required");
      }
    });

    it("fails if user not linked to author", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(
        mockUser as unknown as Awaited<ReturnType<typeof getCurrentUser>>,
      );

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(null), // No author linked
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(null), // No contact linked
        },
        statements: {
          findFirst: vi.fn(),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatementPDFUrl } = await import(
        "@/modules/statements/actions"
      );
      const result = await getMyStatementPDFUrl("stmt-1");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("No author account linked to your user");
      }
    });
  });

  describe("Role-Based Access (AC-5.6.1)", () => {
    it("author role should be able to access portal queries", async () => {
      setTestUserRole("author");
      vi.mocked(getCurrentUser).mockResolvedValue({
        ...mockUser,
        role: "author",
      } as unknown as Awaited<ReturnType<typeof getCurrentUser>>);

      const mockDbQuery = {
        authors: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        contacts: {
          findFirst: vi.fn().mockResolvedValue(mockAuthor),
        },
        statements: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      };

      vi.mocked(getDb).mockResolvedValue({
        query: mockDbQuery,
      } as unknown as Awaited<ReturnType<typeof getDb>>);

      const { getMyStatements } = await import("@/modules/statements/queries");
      const result = await getMyStatements();

      // Should not throw - author can access
      expect(result).toEqual([]);
    });
  });
});
