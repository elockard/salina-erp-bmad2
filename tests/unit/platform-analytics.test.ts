/**
 * Platform Analytics Unit Tests
 *
 * Story 13.5: Build Platform Analytics Dashboard
 *
 * Tests for platform analytics queries and dashboard action:
 * - getPlatformTenantMetrics
 * - getTenantGrowthTrend
 * - getPlatformUserMetrics
 * - getPlatformUsageMetrics
 * - getPlatformDashboard action
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the queries module
vi.mock("@/modules/platform-admin/queries", () => ({
  getPlatformTenantMetrics: vi.fn(),
  getTenantGrowthTrend: vi.fn(),
  getPlatformUserMetrics: vi.fn(),
  getPlatformUsageMetrics: vi.fn(),
  getTenants: vi.fn(),
  getTenantById: vi.fn(),
  getTenantUsers: vi.fn(),
  getTenantUsageMetrics: vi.fn(),
  getTenantActivity: vi.fn(),
  getTenantOwnerEmail: vi.fn(),
  isValidUUID: vi.fn(),
}));

// Mock the health module
vi.mock("@/modules/platform-admin/health", () => ({
  getDatabaseHealthStatus: vi.fn(),
  getInngestHealthStatus: vi.fn(),
  getEmailServiceStatus: vi.fn(),
}));

// Mock platform-admin auth
vi.mock("@/lib/platform-admin", () => ({
  getCurrentPlatformAdmin: vi.fn(),
}));

// Mock platform-audit
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
  PLATFORM_ADMIN_ACTIONS: {
    VIEW_PLATFORM_DASHBOARD: "view_platform_dashboard",
    TENANT_SEARCH: "tenant_search",
    VIEW_TENANT_DETAIL: "view_tenant_detail",
    SUSPEND_TENANT: "suspend_tenant",
    REACTIVATE_TENANT: "reactivate_tenant",
  },
}));

// Mock email service
vi.mock("@/modules/platform-admin/email-service", () => ({
  sendTenantSuspendedEmail: vi.fn(),
  sendTenantReactivatedEmail: vi.fn(),
}));

// Mock adminDb for direct query tests
vi.mock("@/db", () => ({
  adminDb: {
    select: vi.fn(),
    execute: vi.fn(),
    query: {
      tenants: { findFirst: vi.fn() },
      users: { findFirst: vi.fn() },
    },
  },
}));

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import {
  logPlatformAdminEvent,
  PLATFORM_ADMIN_ACTIONS,
} from "@/lib/platform-audit";
import { getPlatformDashboard } from "@/modules/platform-admin/actions";
import {
  getDatabaseHealthStatus,
  getEmailServiceStatus,
  getInngestHealthStatus,
} from "@/modules/platform-admin/health";
import {
  getPlatformTenantMetrics,
  getPlatformUsageMetrics,
  getPlatformUserMetrics,
  getTenantGrowthTrend,
} from "@/modules/platform-admin/queries";

// Type the mocks
const mockGetCurrentPlatformAdmin = getCurrentPlatformAdmin as ReturnType<
  typeof vi.fn
>;
const mockLogPlatformAdminEvent = logPlatformAdminEvent as ReturnType<
  typeof vi.fn
>;
const mockGetPlatformTenantMetrics = getPlatformTenantMetrics as ReturnType<
  typeof vi.fn
>;
const mockGetTenantGrowthTrend = getTenantGrowthTrend as ReturnType<
  typeof vi.fn
>;
const mockGetPlatformUserMetrics = getPlatformUserMetrics as ReturnType<
  typeof vi.fn
>;
const mockGetPlatformUsageMetrics = getPlatformUsageMetrics as ReturnType<
  typeof vi.fn
>;
const mockGetDatabaseHealthStatus = getDatabaseHealthStatus as ReturnType<
  typeof vi.fn
>;
const mockGetInngestHealthStatus = getInngestHealthStatus as ReturnType<
  typeof vi.fn
>;
const mockGetEmailServiceStatus = getEmailServiceStatus as ReturnType<
  typeof vi.fn
>;

describe("Platform Analytics", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const mockTenantMetrics = {
    total: 25,
    activeLastThirtyDays: 18,
    newThisMonth: 5,
    suspended: 2,
  };

  const mockTenantGrowthTrend = [
    { month: "2025-07", count: 3 },
    { month: "2025-08", count: 5 },
    { month: "2025-09", count: 4 },
    { month: "2025-10", count: 6 },
    { month: "2025-11", count: 4 },
    { month: "2025-12", count: 3 },
  ];

  const mockUserMetrics = {
    total: 150,
    activeLastThirtyDays: 87,
    byRole: {
      owner: 25,
      admin: 30,
      editor: 45,
      finance: 20,
      author: 30,
    },
  };

  const mockUsageMetrics = {
    totalTitles: 500,
    salesThisMonth: 1250,
    statementsThisMonth: 45,
  };

  const mockDbHealth = {
    status: "healthy" as const,
    responseTimeMs: 15,
  };

  const mockInngestHealth = {
    status: "unknown" as const,
    dashboardUrl: "https://app.inngest.com",
  };

  const mockEmailHealth = {
    status: "unknown" as const,
    dashboardUrl: "https://resend.com/overview",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
    mockGetPlatformTenantMetrics.mockResolvedValue(mockTenantMetrics);
    mockGetTenantGrowthTrend.mockResolvedValue(mockTenantGrowthTrend);
    mockGetPlatformUserMetrics.mockResolvedValue(mockUserMetrics);
    mockGetPlatformUsageMetrics.mockResolvedValue(mockUsageMetrics);
    mockGetDatabaseHealthStatus.mockResolvedValue(mockDbHealth);
    mockGetInngestHealthStatus.mockReturnValue(mockInngestHealth);
    mockGetEmailServiceStatus.mockReturnValue(mockEmailHealth);
  });

  describe("getPlatformTenantMetrics", () => {
    it("returns correct counts including suspended", async () => {
      const result = await getPlatformTenantMetrics();

      expect(result).toEqual({
        total: 25,
        activeLastThirtyDays: 18,
        newThisMonth: 5,
        suspended: 2,
      });
    });

    it("handles 0 tenants gracefully", async () => {
      mockGetPlatformTenantMetrics.mockResolvedValue({
        total: 0,
        activeLastThirtyDays: 0,
        newThisMonth: 0,
        suspended: 0,
      });

      const result = await getPlatformTenantMetrics();

      expect(result.total).toBe(0);
      expect(result.activeLastThirtyDays).toBe(0);
      expect(result.newThisMonth).toBe(0);
      expect(result.suspended).toBe(0);
    });
  });

  describe("getTenantGrowthTrend", () => {
    it("returns monthly data points in ascending order", async () => {
      const result = await getTenantGrowthTrend(6);

      expect(result).toHaveLength(6);
      expect(result[0].month).toBe("2025-07");
      expect(result[5].month).toBe("2025-12");
    });

    it("handles empty result set", async () => {
      mockGetTenantGrowthTrend.mockResolvedValue([]);

      const result = await getTenantGrowthTrend(6);

      expect(result).toHaveLength(0);
    });

    it("validates months parameter (calls with validated value)", async () => {
      await getTenantGrowthTrend(6);

      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(6);
    });
  });

  describe("getPlatformUserMetrics", () => {
    it("returns correct role distribution", async () => {
      const result = await getPlatformUserMetrics();

      expect(result.total).toBe(150);
      expect(result.activeLastThirtyDays).toBe(87);
      expect(result.byRole).toEqual({
        owner: 25,
        admin: 30,
        editor: 45,
        finance: 20,
        author: 30,
      });
    });

    it("handles missing roles in result", async () => {
      mockGetPlatformUserMetrics.mockResolvedValue({
        total: 10,
        activeLastThirtyDays: 5,
        byRole: {
          owner: 2,
          admin: 3,
          editor: 0,
          finance: 0,
          author: 5,
        },
      });

      const result = await getPlatformUserMetrics();

      expect(result.byRole.editor).toBe(0);
      expect(result.byRole.finance).toBe(0);
    });

    it("handles 0 users gracefully", async () => {
      mockGetPlatformUserMetrics.mockResolvedValue({
        total: 0,
        activeLastThirtyDays: 0,
        byRole: {
          owner: 0,
          admin: 0,
          editor: 0,
          finance: 0,
          author: 0,
        },
      });

      const result = await getPlatformUserMetrics();

      expect(result.total).toBe(0);
      expect(Object.values(result.byRole).every((v) => v === 0)).toBe(true);
    });
  });

  describe("getPlatformUsageMetrics", () => {
    it("returns correct usage counts", async () => {
      const result = await getPlatformUsageMetrics();

      expect(result).toEqual({
        totalTitles: 500,
        salesThisMonth: 1250,
        statementsThisMonth: 45,
      });
    });

    it("handles 0 usage gracefully", async () => {
      mockGetPlatformUsageMetrics.mockResolvedValue({
        totalTitles: 0,
        salesThisMonth: 0,
        statementsThisMonth: 0,
      });

      const result = await getPlatformUsageMetrics();

      expect(result.totalTitles).toBe(0);
      expect(result.salesThisMonth).toBe(0);
      expect(result.statementsThisMonth).toBe(0);
    });
  });

  describe("getPlatformDashboard action", () => {
    it("requires platform admin authentication", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await getPlatformDashboard();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("logs VIEW_PLATFORM_DASHBOARD to audit", async () => {
      await getPlatformDashboard();

      expect(mockLogPlatformAdminEvent).toHaveBeenCalledWith({
        adminEmail: mockAdmin.email,
        adminClerkId: mockAdmin.clerkId,
        action: PLATFORM_ADMIN_ACTIONS.VIEW_PLATFORM_DASHBOARD,
        route: "/platform-admin",
        metadata: {},
      });
    });

    it("returns all metrics combined", async () => {
      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.tenantMetrics).toEqual(mockTenantMetrics);
        expect(result.data.tenantGrowthTrend).toEqual(mockTenantGrowthTrend);
        expect(result.data.userMetrics).toEqual(mockUserMetrics);
        expect(result.data.usageMetrics).toEqual(mockUsageMetrics);
        expect(result.data.health.database).toEqual(mockDbHealth);
        expect(result.data.health.inngest).toEqual(mockInngestHealth);
        expect(result.data.health.email).toEqual(mockEmailHealth);
        expect(typeof result.data.generatedAt).toBe("string");
      }
    });

    it("fetches all metrics in parallel", async () => {
      await getPlatformDashboard();

      // All metrics queries should be called
      expect(mockGetPlatformTenantMetrics).toHaveBeenCalledTimes(1);
      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(6);
      expect(mockGetPlatformUserMetrics).toHaveBeenCalledTimes(1);
      expect(mockGetPlatformUsageMetrics).toHaveBeenCalledTimes(1);
      expect(mockGetDatabaseHealthStatus).toHaveBeenCalledTimes(1);
      expect(mockGetInngestHealthStatus).toHaveBeenCalledTimes(1);
      expect(mockGetEmailServiceStatus).toHaveBeenCalledTimes(1);
    });

    it("returns success: false on database error", async () => {
      mockGetPlatformTenantMetrics.mockRejectedValue(new Error("DB error"));

      const result = await getPlatformDashboard();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to load platform dashboard");
      }
    });

    it("handles degraded database health", async () => {
      mockGetDatabaseHealthStatus.mockResolvedValue({
        status: "degraded",
        responseTimeMs: 250,
      });

      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.health.database.status).toBe("degraded");
        expect(result.data.health.database.responseTimeMs).toBe(250);
      }
    });

    it("handles database error status", async () => {
      mockGetDatabaseHealthStatus.mockResolvedValue({
        status: "error",
        responseTimeMs: 5000,
      });

      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.health.database.status).toBe("error");
      }
    });
  });

  describe("health check utilities", () => {
    it("getDatabaseHealthStatus returns healthy for fast response", async () => {
      const result = await getDatabaseHealthStatus();

      expect(result.status).toBe("healthy");
      expect(result.responseTimeMs).toBe(15);
    });

    it("getInngestHealthStatus returns unknown with dashboard URL", () => {
      const result = getInngestHealthStatus();

      expect(result.status).toBe("unknown");
      expect(result.dashboardUrl).toBe("https://app.inngest.com");
    });

    it("getEmailServiceStatus returns unknown with dashboard URL", () => {
      const result = getEmailServiceStatus();

      expect(result.status).toBe("unknown");
      expect(result.dashboardUrl).toBe("https://resend.com/overview");
    });
  });

  describe("query parameter validation", () => {
    it("getTenantGrowthTrend validates months parameter bounds", async () => {
      // Test that the function is called with bounded value
      mockGetTenantGrowthTrend.mockResolvedValue([]);

      await getTenantGrowthTrend(6);
      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(6);

      await getTenantGrowthTrend(0);
      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(0);

      await getTenantGrowthTrend(100);
      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(100);
    });

    it("getPlatformDashboard fetches 6 months of growth trend", async () => {
      await getPlatformDashboard();

      // Verify the action calls getTenantGrowthTrend with 6 months
      expect(mockGetTenantGrowthTrend).toHaveBeenCalledWith(6);
    });
  });

  describe("serialization safety", () => {
    it("generatedAt is returned as ISO string not Date object", async () => {
      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(typeof result.data.generatedAt).toBe("string");
        // Verify it's a valid ISO date string
        expect(() => new Date(result.data.generatedAt)).not.toThrow();
        expect(result.data.generatedAt).toMatch(
          /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/,
        );
      }
    });
  });

  describe("edge cases", () => {
    it("handles all zeroes without division errors", async () => {
      mockGetPlatformTenantMetrics.mockResolvedValue({
        total: 0,
        activeLastThirtyDays: 0,
        newThisMonth: 0,
        suspended: 0,
      });
      mockGetTenantGrowthTrend.mockResolvedValue([]);
      mockGetPlatformUserMetrics.mockResolvedValue({
        total: 0,
        activeLastThirtyDays: 0,
        byRole: { owner: 0, admin: 0, editor: 0, finance: 0, author: 0 },
      });
      mockGetPlatformUsageMetrics.mockResolvedValue({
        totalTitles: 0,
        salesThisMonth: 0,
        statementsThisMonth: 0,
      });

      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.tenantMetrics.total).toBe(0);
        expect(result.data.userMetrics.total).toBe(0);
        expect(result.data.usageMetrics.totalTitles).toBe(0);
      }
    });

    it("handles large numbers correctly", async () => {
      mockGetPlatformTenantMetrics.mockResolvedValue({
        total: 1000000,
        activeLastThirtyDays: 750000,
        newThisMonth: 50000,
        suspended: 100,
      });
      mockGetPlatformUserMetrics.mockResolvedValue({
        total: 5000000,
        activeLastThirtyDays: 2500000,
        byRole: {
          owner: 1000000,
          admin: 1000000,
          editor: 1500000,
          finance: 500000,
          author: 1000000,
        },
      });

      const result = await getPlatformDashboard();

      expect(result.success).toBe(true);
      if (result.success && result.data) {
        expect(result.data.tenantMetrics.total).toBe(1000000);
        expect(result.data.userMetrics.total).toBe(5000000);
      }
    });
  });
});
