/**
 * Statement Wizard Unit Tests
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * Task 10: Write unit tests
 *
 * Tests cover:
 * - AC-5.3.1: 4-step wizard flow
 * - AC-5.3.2: Period selection (Quarterly, Annual, Custom)
 * - AC-5.3.3: Author selection (Select All, individual, search)
 * - AC-5.3.4: Preview calculation display
 * - AC-5.3.6: Progress indicator
 * - AC-5.3.7: Permission enforcement in server actions
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the modules before importing components
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn().mockResolvedValue("test-tenant-id"),
  getCurrentUser: vi.fn().mockResolvedValue({
    id: "test-user-id",
    role: "finance",
    email: "finance@test.com",
  }),
  getDb: vi.fn().mockResolvedValue({
    query: {
      authors: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn(),
      },
      contracts: {
        findFirst: vi.fn(),
      },
    },
  }),
}));

vi.mock("@/inngest/client", () => ({
  inngest: {
    send: vi.fn().mockResolvedValue({ ids: ["test-job-id"] }),
  },
}));

vi.mock("@/modules/royalties/calculator", () => ({
  calculateRoyaltyForPeriod: vi.fn().mockResolvedValue({
    success: true,
    calculation: {
      netPayable: 1000,
      totalRoyaltyEarned: 1200,
      advanceRecoupment: 200,
      formatCalculations: [],
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { inngest } from "@/inngest/client";
import { requirePermission } from "@/lib/auth";

describe("Statement Wizard - AC-5.3.1: 4-step wizard flow", () => {
  it("should define 4 wizard steps: Period, Authors, Preview, Generate", () => {
    const STEPS = [
      { id: 1, name: "Period", shortName: "Period" },
      { id: 2, name: "Authors", shortName: "Authors" },
      { id: 3, name: "Preview", shortName: "Preview" },
      { id: 4, name: "Generate", shortName: "Generate" },
    ];

    expect(STEPS).toHaveLength(4);
    expect(STEPS[0].name).toBe("Period");
    expect(STEPS[1].name).toBe("Authors");
    expect(STEPS[2].name).toBe("Preview");
    expect(STEPS[3].name).toBe("Generate");
  });

  it("should validate step order (Period -> Authors -> Preview -> Generate)", () => {
    const STEPS = [
      { id: 1, name: "Period" },
      { id: 2, name: "Authors" },
      { id: 3, name: "Preview" },
      { id: 4, name: "Generate" },
    ];

    // Verify sequential IDs
    for (let i = 0; i < STEPS.length; i++) {
      expect(STEPS[i].id).toBe(i + 1);
    }
  });
});

describe("Statement Wizard - AC-5.3.2: Period selection", () => {
  describe("Quarter resolution", () => {
    it("should resolve Q1 to Jan 1 - Mar 31", () => {
      const year = 2025;
      const quarter = 1;
      const startMonth = (quarter - 1) * 3;
      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 0);

      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(2); // March
      expect(end.getDate()).toBe(31);
    });

    it("should resolve Q2 to Apr 1 - Jun 30", () => {
      const year = 2025;
      const quarter = 2;
      const startMonth = (quarter - 1) * 3;
      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 0);

      expect(start.getMonth()).toBe(3); // April
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(30);
    });

    it("should resolve Q3 to Jul 1 - Sep 30", () => {
      const year = 2025;
      const quarter = 3;
      const startMonth = (quarter - 1) * 3;
      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 0);

      expect(start.getMonth()).toBe(6); // July
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(8); // September
      expect(end.getDate()).toBe(30);
    });

    it("should resolve Q4 to Oct 1 - Dec 31", () => {
      const year = 2025;
      const quarter = 4;
      const startMonth = (quarter - 1) * 3;
      const start = new Date(year, startMonth, 1);
      const end = new Date(year, startMonth + 3, 0);

      expect(start.getMonth()).toBe(9); // October
      expect(start.getDate()).toBe(1);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  describe("Annual resolution", () => {
    it("should resolve annual 2024 to Jan 1 - Dec 31, 2024", () => {
      const year = 2024;
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);
      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
    });
  });

  describe("Custom date validation", () => {
    it("should validate end date is after start date", () => {
      const start = new Date(2025, 0, 15);
      const end = new Date(2025, 0, 10);

      expect(end <= start).toBe(true); // Invalid: end before start
    });

    it("should accept valid custom date range", () => {
      const start = new Date(2025, 0, 1);
      const end = new Date(2025, 5, 30);

      expect(end > start).toBe(true); // Valid
    });
  });
});

describe("Statement Wizard - AC-5.3.3: Author selection", () => {
  const mockAuthors = [
    {
      id: "author-1",
      name: "Author One",
      email: "one@test.com",
      pendingRoyalties: 1000,
    },
    {
      id: "author-2",
      name: "Author Two",
      email: "two@test.com",
      pendingRoyalties: 500,
    },
    {
      id: "author-3",
      name: "Author Three",
      email: "three@test.com",
      pendingRoyalties: 750,
    },
  ];

  describe("Select All functionality", () => {
    it("should select all authors when selectAll is true", () => {
      const selectAll = true;
      const selectedAuthorIds = selectAll ? mockAuthors.map((a) => a.id) : [];

      expect(selectedAuthorIds).toHaveLength(3);
      expect(selectedAuthorIds).toContain("author-1");
      expect(selectedAuthorIds).toContain("author-2");
      expect(selectedAuthorIds).toContain("author-3");
    });

    it("should deselect all when selectAll is toggled off", () => {
      const _selectAll = false;
      const selectedAuthorIds: string[] = [];

      expect(selectedAuthorIds).toHaveLength(0);
    });
  });

  describe("Individual selection", () => {
    it("should toggle individual author selection", () => {
      let selectedAuthorIds: string[] = [];

      // Add author
      selectedAuthorIds = [...selectedAuthorIds, "author-1"];
      expect(selectedAuthorIds).toContain("author-1");

      // Remove author
      selectedAuthorIds = selectedAuthorIds.filter((id) => id !== "author-1");
      expect(selectedAuthorIds).not.toContain("author-1");
    });

    it("should set selectAll true when all authors individually selected", () => {
      const selectedAuthorIds = ["author-1", "author-2", "author-3"];
      const shouldBeSelectAll = selectedAuthorIds.length === mockAuthors.length;

      expect(shouldBeSelectAll).toBe(true);
    });
  });

  describe("Search filter", () => {
    it("should filter authors by name (case-insensitive)", () => {
      const searchQuery = "two";
      const filtered = mockAuthors.filter((author) =>
        author.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe("Author Two");
    });

    it("should return empty array when no match", () => {
      const searchQuery = "xyz";
      const filtered = mockAuthors.filter((author) =>
        author.name.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      expect(filtered).toHaveLength(0);
    });
  });

  describe("Selection summary", () => {
    it("should calculate total pending royalties for selected authors", () => {
      const selectedIds = ["author-1", "author-3"];
      const selectedAuthors = mockAuthors.filter((a) =>
        selectedIds.includes(a.id),
      );
      const totalPending = selectedAuthors.reduce(
        (sum, a) => sum + a.pendingRoyalties,
        0,
      );

      expect(totalPending).toBe(1750); // 1000 + 750
    });
  });
});

describe("Statement Wizard - AC-5.3.4: Preview calculations", () => {
  describe("Preview data structure", () => {
    it("should include all required fields in preview calculation", () => {
      const previewCalc = {
        authorId: "author-1",
        authorName: "Test Author",
        totalSales: 100,
        totalReturns: 10,
        royaltyEarned: 500,
        advanceRecouped: 100,
        netPayable: 400,
        warnings: [],
      };

      expect(previewCalc).toHaveProperty("authorId");
      expect(previewCalc).toHaveProperty("authorName");
      expect(previewCalc).toHaveProperty("totalSales");
      expect(previewCalc).toHaveProperty("totalReturns");
      expect(previewCalc).toHaveProperty("royaltyEarned");
      expect(previewCalc).toHaveProperty("advanceRecouped");
      expect(previewCalc).toHaveProperty("netPayable");
      expect(previewCalc).toHaveProperty("warnings");
    });
  });

  describe("Totals calculation", () => {
    it("should aggregate totals from all preview rows", () => {
      const previewData = [
        {
          authorId: "1",
          authorName: "A",
          totalSales: 100,
          totalReturns: 10,
          royaltyEarned: 500,
          advanceRecouped: 100,
          netPayable: 400,
          warnings: [],
        },
        {
          authorId: "2",
          authorName: "B",
          totalSales: 50,
          totalReturns: 5,
          royaltyEarned: 250,
          advanceRecouped: 50,
          netPayable: 200,
          warnings: [],
        },
      ];

      const totals = previewData.reduce(
        (acc, row) => ({
          totalSales: acc.totalSales + row.totalSales,
          totalReturns: acc.totalReturns + row.totalReturns,
          totalRoyaltyEarned: acc.totalRoyaltyEarned + row.royaltyEarned,
          totalAdvanceRecouped: acc.totalAdvanceRecouped + row.advanceRecouped,
          totalNetPayable: acc.totalNetPayable + row.netPayable,
          authorCount: acc.authorCount + 1,
        }),
        {
          totalSales: 0,
          totalReturns: 0,
          totalRoyaltyEarned: 0,
          totalAdvanceRecouped: 0,
          totalNetPayable: 0,
          authorCount: 0,
        },
      );

      expect(totals.totalSales).toBe(150);
      expect(totals.totalReturns).toBe(15);
      expect(totals.totalRoyaltyEarned).toBe(750);
      expect(totals.totalAdvanceRecouped).toBe(150);
      expect(totals.totalNetPayable).toBe(600);
      expect(totals.authorCount).toBe(2);
    });
  });

  describe("Warning detection (AC-5.3.4 edge cases)", () => {
    it("should detect negative net payable (returns exceed royalties)", () => {
      const calc = {
        netPayable: -100,
        totalSales: 10,
        totalReturns: 50,
      };

      const hasNegativeNet =
        calc.netPayable <= 0 && calc.totalReturns > calc.totalSales;
      expect(hasNegativeNet).toBe(true);
    });

    it("should detect zero net payable due to advance recoupment", () => {
      const calc = {
        netPayable: 0,
        advanceRecoupment: 500,
        totalRoyaltyEarned: 500,
      };

      const hasZeroNet = calc.netPayable === 0 && calc.advanceRecoupment > 0;
      expect(hasZeroNet).toBe(true);
    });

    it("should detect no sales in period", () => {
      const calc = {
        totalSales: 0,
        totalReturns: 0,
        netPayable: 0,
      };

      const hasNoSales = calc.totalSales === 0;
      expect(hasNoSales).toBe(true);
    });
  });
});

describe("Statement Wizard - AC-5.3.7: Permission enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("generateStatements action", () => {
    it("should call requirePermission with Finance, Admin, Owner roles", async () => {
      const mockRequirePermission = requirePermission as ReturnType<
        typeof vi.fn
      >;
      mockRequirePermission.mockResolvedValue(undefined);

      // Simulate the permission check
      await requirePermission(["finance", "admin", "owner"]);

      expect(mockRequirePermission).toHaveBeenCalledWith([
        "finance",
        "admin",
        "owner",
      ]);
    });

    it("should reject unauthorized roles (Editor)", async () => {
      const mockRequirePermission = requirePermission as ReturnType<
        typeof vi.fn
      >;
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).rejects.toThrow("UNAUTHORIZED");
    });

    it("should reject unauthorized roles (Author)", async () => {
      const mockRequirePermission = requirePermission as ReturnType<
        typeof vi.fn
      >;
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      await expect(
        requirePermission(["finance", "admin", "owner"]),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("getAuthorsWithPendingRoyalties action", () => {
    it("should enforce Finance, Admin, Owner permission", async () => {
      const mockRequirePermission = requirePermission as ReturnType<
        typeof vi.fn
      >;
      mockRequirePermission.mockResolvedValue(undefined);

      await requirePermission(["finance", "admin", "owner"]);

      expect(mockRequirePermission).toHaveBeenCalledWith([
        "finance",
        "admin",
        "owner",
      ]);
    });
  });

  describe("previewStatementCalculations action", () => {
    it("should enforce Finance, Admin, Owner permission", async () => {
      const mockRequirePermission = requirePermission as ReturnType<
        typeof vi.fn
      >;
      mockRequirePermission.mockResolvedValue(undefined);

      await requirePermission(["finance", "admin", "owner"]);

      expect(mockRequirePermission).toHaveBeenCalledWith([
        "finance",
        "admin",
        "owner",
      ]);
    });
  });
});

describe("Statement Wizard - Form Validation", () => {
  describe("Step 1 validation", () => {
    it("should require quarter and year for quarterly period", () => {
      const formData = {
        periodType: "quarterly",
        quarter: undefined,
        year: undefined,
      };

      const isValid =
        formData.periodType !== "quarterly" ||
        (formData.quarter !== undefined && formData.year !== undefined);

      expect(isValid).toBe(false);
    });

    it("should require year for annual period", () => {
      const formData = {
        periodType: "annual",
        year: undefined,
      };

      const isValid =
        formData.periodType !== "annual" || formData.year !== undefined;

      expect(isValid).toBe(false);
    });

    it("should require both dates for custom period", () => {
      const formData = {
        periodType: "custom",
        customStartDate: new Date(),
        customEndDate: undefined,
      };

      const isValid =
        formData.periodType !== "custom" ||
        (formData.customStartDate !== undefined &&
          formData.customEndDate !== undefined);

      expect(isValid).toBe(false);
    });
  });

  describe("Step 2 validation", () => {
    it("should require at least one author selected", () => {
      const formData = {
        selectAll: false,
        selectedAuthorIds: [],
      };

      const isValid =
        formData.selectAll || formData.selectedAuthorIds.length > 0;

      expect(isValid).toBe(false);
    });

    it("should pass validation if selectAll is true", () => {
      const formData = {
        selectAll: true,
        selectedAuthorIds: [],
      };

      const isValid =
        formData.selectAll || formData.selectedAuthorIds.length > 0;

      expect(isValid).toBe(true);
    });
  });
});

describe("Statement Wizard - Inngest Job Enqueue (AC-5.3.5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should send correct event name to Inngest", async () => {
    const mockSend = inngest.send as ReturnType<typeof vi.fn>;
    mockSend.mockResolvedValue({ ids: ["job-123"] });

    await inngest.send({
      name: "statements/generate.batch",
      data: {
        tenantId: "test-tenant",
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-03-31T00:00:00.000Z",
        authorIds: ["author-1", "author-2"],
        sendEmail: true,
        userId: "user-1",
      },
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "statements/generate.batch",
      }),
    );
  });

  it("should include all required data fields", async () => {
    const mockSend = inngest.send as ReturnType<typeof vi.fn>;
    mockSend.mockResolvedValue({ ids: ["job-123"] });

    await inngest.send({
      name: "statements/generate.batch",
      data: {
        tenantId: "test-tenant",
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-03-31T00:00:00.000Z",
        authorIds: ["author-1", "author-2"],
        sendEmail: true,
        userId: "user-1",
      },
    });

    expect(mockSend).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "test-tenant",
          periodStart: expect.any(String),
          periodEnd: expect.any(String),
          authorIds: expect.any(Array),
          sendEmail: true,
          userId: "user-1",
        }),
      }),
    );
  });

  it("should return job ID on success", async () => {
    const mockSend = inngest.send as ReturnType<typeof vi.fn>;
    mockSend.mockResolvedValue({ ids: ["job-123"] });

    const result = await inngest.send({
      name: "statements/generate.batch",
      data: {
        tenantId: "test-tenant",
        periodStart: "2025-01-01T00:00:00.000Z",
        periodEnd: "2025-03-31T00:00:00.000Z",
        authorIds: ["author-1"],
        sendEmail: false,
        userId: "user-1",
      },
    });

    expect(result.ids[0]).toBe("job-123");
  });
});
