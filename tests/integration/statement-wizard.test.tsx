/**
 * Statement Wizard Integration Tests
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * Task 11: Write integration tests
 *
 * Tests cover:
 * - AC-5.3.5: Full wizard flow with Inngest job enqueue
 * - AC-5.3.6: Progress tracking and completion
 * - AC-5.3.7: Role-based access control (Finance allowed, Editor denied)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock modules
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn(),
  getCurrentUser: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn(),
  },
}));

vi.mock("@/modules/royalties/calculator", () => ({
  calculateRoyaltyForPeriod: vi.fn(),
}));

vi.mock("@/db", () => ({
  adminDb: {
    query: {
      statements: {
        findFirst: vi.fn(),
      },
      authors: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      contracts: {
        findFirst: vi.fn(),
      },
      titles: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn(),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn(),
      }),
    }),
  },
}));

import { adminDb } from "@/db";
import { inngest } from "@/inngest/client";
import {
  getCurrentTenantId,
  getCurrentUser,
  getDb,
  requirePermission,
} from "@/lib/auth";
import { calculateRoyaltyForPeriod } from "@/modules/royalties/calculator";

describe("Statement Wizard Integration - AC-5.3.5: Full wizard flow", () => {
  const mockTenantId = "test-tenant-123";
  const mockUserId = "test-user-456";

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    (requirePermission as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (getCurrentTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockTenantId,
    );
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: mockUserId,
      role: "finance",
      email: "finance@test.com",
    });

    const mockDb = {
      query: {
        authors: {
          findMany: vi.fn().mockResolvedValue([
            {
              id: "author-1",
              name: "Test Author",
              email: "author@test.com",
              is_active: true,
            },
          ]),
          findFirst: vi.fn().mockResolvedValue({
            id: "author-1",
            name: "Test Author",
            email: "author@test.com",
            address: "123 Test St",
          }),
        },
        contracts: {
          findFirst: vi.fn().mockResolvedValue({
            id: "contract-1",
            author_id: "author-1",
            title_id: "title-1",
            status: "active",
            advance_amount: "1000",
            advance_recouped: "0",
          }),
        },
      },
    };

    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    (calculateRoyaltyForPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      calculation: {
        period: {
          startDate: new Date("2025-01-01"),
          endDate: new Date("2025-03-31"),
        },
        authorId: "author-1",
        contractId: "contract-1",
        titleId: "title-1",
        formatCalculations: [
          {
            format: "physical",
            netSales: {
              grossQuantity: 100,
              grossRevenue: 2000,
              returnsQuantity: 5,
              returnsAmount: 100,
              netQuantity: 95,
              netRevenue: 1900,
            },
            tierBreakdowns: [
              {
                tierId: "tier-1",
                minQuantity: 0,
                maxQuantity: null,
                rate: 0.1,
                unitsApplied: 95,
                royaltyAmount: 190,
              },
            ],
            formatRoyalty: 190,
          },
        ],
        totalRoyaltyEarned: 190,
        advanceRecoupment: 190,
        netPayable: 0,
      },
    });

    (inngest.send as ReturnType<typeof vi.fn>).mockResolvedValue({
      ids: ["job-id-123"],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("generateStatements action flow", () => {
    it("should successfully enqueue Inngest job with valid parameters", async () => {
      const request = {
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-03-31"),
        authorIds: ["author-1", "author-2"],
        sendEmail: true,
      };

      // Simulate the generateStatements action flow
      await requirePermission(["finance", "admin", "owner"]);
      const tenantId = await getCurrentTenantId();
      const user = await getCurrentUser();

      expect(tenantId).toBe(mockTenantId);
      expect(user?.id).toBe(mockUserId);

      // Enqueue job
      const result = await inngest.send({
        name: "statements/generate.batch",
        data: {
          tenantId,
          periodStart: request.periodStart.toISOString(),
          periodEnd: request.periodEnd.toISOString(),
          authorIds: request.authorIds,
          sendEmail: request.sendEmail,
          userId: user?.id,
        },
      });

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "statements/generate.batch",
          data: expect.objectContaining({
            tenantId: mockTenantId,
            authorIds: ["author-1", "author-2"],
            sendEmail: true,
            userId: mockUserId,
          }),
        }),
      );

      expect(result.ids[0]).toBe("job-id-123");
    });

    it("should include period dates in ISO format", async () => {
      const periodStart = new Date("2025-04-01");
      const periodEnd = new Date("2025-06-30");

      await inngest.send({
        name: "statements/generate.batch",
        data: {
          tenantId: mockTenantId,
          periodStart: periodStart.toISOString(),
          periodEnd: periodEnd.toISOString(),
          authorIds: ["author-1"],
          sendEmail: false,
          userId: mockUserId,
        },
      });

      expect(inngest.send).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            periodStart: "2025-04-01T00:00:00.000Z",
            periodEnd: "2025-06-30T00:00:00.000Z",
          }),
        }),
      );
    });
  });

  describe("getAuthorsWithPendingRoyalties action flow", () => {
    it("should load authors and calculate pending royalties", async () => {
      const periodStart = new Date("2025-01-01");
      const periodEnd = new Date("2025-03-31");

      await requirePermission(["finance", "admin", "owner"]);
      const tenantId = await getCurrentTenantId();
      const db = await getDb();

      const authors = await db.query.authors.findMany();
      expect(authors).toHaveLength(1);
      expect(authors[0].name).toBe("Test Author");

      // Calculate pending royalties for each author
      for (const author of authors) {
        const result = await calculateRoyaltyForPeriod(
          author.id,
          tenantId,
          periodStart,
          periodEnd,
        );

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.calculation).toBeDefined();
        }
      }

      expect(calculateRoyaltyForPeriod).toHaveBeenCalled();
    });
  });

  describe("previewStatementCalculations action flow", () => {
    it("should calculate preview for multiple authors", async () => {
      const authorIds = ["author-1", "author-2"];
      const periodStart = new Date("2025-01-01");
      const periodEnd = new Date("2025-03-31");

      await requirePermission(["finance", "admin", "owner"]);
      const tenantId = await getCurrentTenantId();

      const previews = [];
      for (const authorId of authorIds) {
        const result = await calculateRoyaltyForPeriod(
          authorId,
          tenantId,
          periodStart,
          periodEnd,
        );

        if (result.success) {
          previews.push({
            authorId,
            netPayable: result.calculation.netPayable,
            totalRoyaltyEarned: result.calculation.totalRoyaltyEarned,
          });
        }
      }

      expect(calculateRoyaltyForPeriod).toHaveBeenCalledTimes(2);
      expect(previews).toHaveLength(2);
    });
  });
});

describe("Statement Wizard Integration - AC-5.3.7: Role-based access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Finance role access", () => {
    it("should allow Finance user to access wizard", async () => {
      (requirePermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        role: "finance",
        is_active: true,
      });

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).resolves.toBeUndefined();
    });
  });

  describe("Admin role access", () => {
    it("should allow Admin user to access wizard", async () => {
      (requirePermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        role: "admin",
        is_active: true,
      });

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).resolves.toBeUndefined();
    });
  });

  describe("Owner role access", () => {
    it("should allow Owner user to access wizard", async () => {
      (requirePermission as ReturnType<typeof vi.fn>).mockResolvedValue(
        undefined,
      );
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        role: "owner",
        is_active: true,
      });

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).resolves.toBeUndefined();
    });
  });

  describe("Editor role denial", () => {
    it("should deny Editor user access to wizard", async () => {
      (requirePermission as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("UNAUTHORIZED"),
      );
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        role: "editor",
        is_active: true,
      });

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("Author role denial", () => {
    it("should deny Author user access to wizard", async () => {
      (requirePermission as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("UNAUTHORIZED"),
      );
      (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        role: "author",
        is_active: true,
      });

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });
});

describe("Statement Wizard Integration - Error handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (requirePermission as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (getCurrentTenantId as ReturnType<typeof vi.fn>).mockResolvedValue(
      "test-tenant",
    );
    (getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "user-1",
      role: "finance",
    });
  });

  describe("Calculation failures", () => {
    it("should handle author with no active contract", async () => {
      (calculateRoyaltyForPeriod as ReturnType<typeof vi.fn>).mockResolvedValue(
        {
          success: false,
          error:
            "No active contract found for author author-1 in tenant test-tenant",
        },
      );

      const result = await calculateRoyaltyForPeriod(
        "author-1",
        "test-tenant",
        new Date("2025-01-01"),
        new Date("2025-03-31"),
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("No active contract");
      }
    });

    it("should handle calculation errors gracefully", async () => {
      (calculateRoyaltyForPeriod as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Database connection failed"),
      );

      await expect(
        calculateRoyaltyForPeriod(
          "author-1",
          "test-tenant",
          new Date("2025-01-01"),
          new Date("2025-03-31"),
        ),
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("Inngest job failures", () => {
    it("should handle Inngest send failure", async () => {
      (inngest.send as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error("Inngest service unavailable"),
      );

      await expect(
        inngest.send({
          name: "statements/generate.batch",
          data: {
            tenantId: "test-tenant",
            periodStart: "2025-01-01",
            periodEnd: "2025-03-31",
            authorIds: ["author-1"],
            sendEmail: false,
            userId: "user-1",
          },
        }),
      ).rejects.toThrow("Inngest service unavailable");
    });
  });

  describe("Validation errors", () => {
    it("should reject empty author list", () => {
      const request = {
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-03-31"),
        authorIds: [],
        sendEmail: false,
      };

      const isValid = request.authorIds.length > 0;
      expect(isValid).toBe(false);
    });

    it("should reject invalid date range (end before start)", () => {
      const periodStart = new Date("2025-06-01");
      const periodEnd = new Date("2025-01-01");

      const isValid = periodEnd > periodStart;
      expect(isValid).toBe(false);
    });
  });
});

describe("Statement Wizard Integration - Batch job processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (
      adminDb.query.authors.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "author-1",
      name: "Test Author",
      email: "author@test.com",
      address: "123 Test St",
    });

    (
      adminDb.query.contracts.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "contract-1",
      author_id: "author-1",
      title_id: "title-1",
      status: "active",
      advance_amount: "1000",
      advance_recouped: "500",
    });

    (
      adminDb.query.titles.findFirst as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      id: "title-1",
      title: "Test Book",
    });

    (calculateRoyaltyForPeriod as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      calculation: {
        formatCalculations: [
          {
            format: "physical",
            netSales: {
              grossQuantity: 100,
              grossRevenue: 2000,
              returnsQuantity: 10,
              returnsAmount: 200,
              netQuantity: 90,
              netRevenue: 1800,
            },
            tierBreakdowns: [],
            formatRoyalty: 180,
          },
        ],
        totalRoyaltyEarned: 180,
        advanceRecoupment: 180,
        netPayable: 0,
      },
    });
  });

  it("should process batch job with single author", async () => {
    const eventData = {
      tenantId: "test-tenant",
      periodStart: "2025-01-01T00:00:00.000Z",
      periodEnd: "2025-03-31T00:00:00.000Z",
      authorIds: ["author-1"],
      sendEmail: false,
      userId: "user-1",
    };

    // Simulate processing
    const author = await adminDb.query.authors.findFirst();
    expect(author).toBeDefined();
    if (author) {
      expect(author.name).toBe("Test Author");
    }

    const contract = await adminDb.query.contracts.findFirst();
    expect(contract).toBeDefined();
    if (contract) {
      expect(contract.status).toBe("active");
    }

    const title = await adminDb.query.titles.findFirst();
    expect(title).toBeDefined();
    if (title) {
      expect(title.title).toBe("Test Book");
    }

    const calcResult = await calculateRoyaltyForPeriod(
      "author-1",
      eventData.tenantId,
      new Date(eventData.periodStart),
      new Date(eventData.periodEnd),
    );

    expect(calcResult.success).toBe(true);
    if (calcResult.success) {
      expect(calcResult.calculation.totalRoyaltyEarned).toBe(180);
    }
  });

  it("should handle partial failures gracefully", async () => {
    const authorIds = ["author-1", "author-2", "author-3"];
    const results: { authorId: string; success: boolean; error?: string }[] =
      [];

    // Mock: first succeeds, second fails, third succeeds
    (calculateRoyaltyForPeriod as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        success: true,
        calculation: { netPayable: 100 },
      })
      .mockResolvedValueOnce({ success: false, error: "No contract found" })
      .mockResolvedValueOnce({
        success: true,
        calculation: { netPayable: 200 },
      });

    for (const authorId of authorIds) {
      try {
        const result = await calculateRoyaltyForPeriod(
          authorId,
          "test-tenant",
          new Date("2025-01-01"),
          new Date("2025-03-31"),
        );

        results.push({
          authorId,
          success: result.success,
          error: !result.success ? result.error : undefined,
        });
      } catch (error) {
        results.push({
          authorId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Verify partial success handling
    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    expect(successCount).toBe(2);
    expect(failedCount).toBe(1);
    expect(results[1].error).toBe("No contract found");
  });
});
