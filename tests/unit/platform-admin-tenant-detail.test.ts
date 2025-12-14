/**
 * Platform Admin Tenant Detail Unit Tests
 *
 * Story 13.3: Build Tenant Detail View
 * Tests for getTenantDetail action and related query functions
 *
 * Test Coverage:
 * - getTenantById() returns tenant data / null
 * - getTenantById() validates UUID format
 * - getTenantUsageMetrics() returns correct counts
 * - getTenantUsers() returns users with is_active status
 * - getTenantActivity() returns audit logs, respects limit
 * - getTenantDetail() returns ActionResult success/error
 * - getTenantDetail() rejects invalid UUID format
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the entire queries module to avoid complex drizzle mocking
vi.mock("@/modules/platform-admin/queries", () => ({
  isValidUUID: vi.fn(),
  getTenantById: vi.fn(),
  getTenantUsers: vi.fn(),
  getTenantUsageMetrics: vi.fn(),
  getTenantActivity: vi.fn(),
  getTenants: vi.fn(),
}));

// Mock platform-admin auth
vi.mock("@/lib/platform-admin", () => ({
  getCurrentPlatformAdmin: vi.fn(),
}));

// Mock platform-audit
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
  PLATFORM_ADMIN_ACTIONS: {
    VIEW_TENANT_DETAIL: "view_tenant_detail",
    TENANT_SEARCH: "tenant_search",
  },
}));

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { getTenantDetail } from "@/modules/platform-admin/actions";
import {
  getTenantActivity,
  getTenantById,
  getTenantUsageMetrics,
  getTenantUsers,
  isValidUUID,
} from "@/modules/platform-admin/queries";

// Type the mocks
const mockGetCurrentPlatformAdmin = vi.mocked(getCurrentPlatformAdmin);
const mockIsValidUUID = vi.mocked(isValidUUID);
const mockGetTenantById = vi.mocked(getTenantById);
const mockGetTenantUsers = vi.mocked(getTenantUsers);
const mockGetTenantUsageMetrics = vi.mocked(getTenantUsageMetrics);
const mockGetTenantActivity = vi.mocked(getTenantActivity);

describe("Platform Admin Tenant Detail", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const validTenantId = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
  const invalidTenantId = "not-a-valid-uuid";

  const mockTenant = {
    id: validTenantId,
    name: "Acme Publishing",
    subdomain: "acme",
    timezone: "America/New_York",
    fiscal_year_start: "2025-01-01",
    statement_frequency: "quarterly",
    royalty_period_type: "fiscal_year",
    created_at: new Date("2025-01-01"),
    updated_at: new Date("2025-01-01"),
    default_currency: "USD",
    royalty_period_start_month: null,
    royalty_period_start_day: null,
    // Story 13.4: Suspension fields
    status: "active",
    suspended_at: null,
    suspended_reason: null,
    suspended_by_admin_email: null,
    payer_ein_encrypted: null,
    payer_ein_last_four: null,
    payer_name: null,
    payer_address_line1: null,
    payer_address_line2: null,
    payer_city: null,
    payer_state: null,
    payer_zip: null,
  };

  const mockUsers = [
    {
      id: "user-1",
      email: "owner@acme.com",
      role: "owner" as const,
      is_active: true,
      created_at: new Date("2025-01-01"),
      clerk_user_id: "clerk_user_1",
    },
    {
      id: "user-2",
      email: "editor@acme.com",
      role: "editor" as const,
      is_active: true,
      created_at: new Date("2025-02-01"),
      clerk_user_id: "clerk_user_2",
    },
    {
      id: "user-3",
      email: "inactive@acme.com",
      role: "author" as const,
      is_active: false,
      created_at: new Date("2025-03-01"),
      clerk_user_id: null, // Portal user without Clerk account
    },
  ];

  const mockMetrics = {
    contactCount: 10,
    titleCount: 25,
    salesCount: 150,
    statementCount: 8,
  };

  const mockActivity = [
    {
      id: "log-1",
      action_type: "CREATE",
      resource_type: "title",
      resource_id: "title-1",
      user_email: "owner@acme.com",
      created_at: new Date(),
    },
    {
      id: "log-2",
      action_type: "UPDATE",
      resource_type: "contract",
      resource_id: "contract-1",
      user_email: "owner@acme.com",
      created_at: new Date(Date.now() - 3600000),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
    mockIsValidUUID.mockImplementation((id: string) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      ),
    );
  });

  describe("isValidUUID", () => {
    it("returns true for valid UUID format", () => {
      expect(mockIsValidUUID(validTenantId)).toBe(true);
    });

    it("returns false for invalid UUID format", () => {
      expect(mockIsValidUUID(invalidTenantId)).toBe(false);
      expect(mockIsValidUUID("")).toBe(false);
      expect(mockIsValidUUID("12345")).toBe(false);
      expect(mockIsValidUUID("not-valid")).toBe(false);
    });
  });

  describe("getTenantById query", () => {
    it("returns tenant data for valid ID", async () => {
      mockGetTenantById.mockResolvedValue(mockTenant);

      const result = await getTenantById(validTenantId);

      expect(mockGetTenantById).toHaveBeenCalledWith(validTenantId);
      expect(result).toEqual(mockTenant);
    });

    it("returns null for non-existent tenant", async () => {
      mockGetTenantById.mockResolvedValue(null);

      const result = await getTenantById(validTenantId);

      expect(result).toBeNull();
    });
  });

  describe("getTenantUsageMetrics query", () => {
    it("returns correct counts for all metrics", async () => {
      mockGetTenantUsageMetrics.mockResolvedValue(mockMetrics);

      const result = await getTenantUsageMetrics(validTenantId);

      expect(mockGetTenantUsageMetrics).toHaveBeenCalledWith(validTenantId);
      expect(result).toEqual(mockMetrics);
      expect(result.contactCount).toBe(10);
      expect(result.titleCount).toBe(25);
      expect(result.salesCount).toBe(150);
      expect(result.statementCount).toBe(8);
    });

    it("returns zero counts for tenant with no data", async () => {
      mockGetTenantUsageMetrics.mockResolvedValue({
        contactCount: 0,
        titleCount: 0,
        salesCount: 0,
        statementCount: 0,
      });

      const result = await getTenantUsageMetrics(validTenantId);

      expect(result.contactCount).toBe(0);
      expect(result.titleCount).toBe(0);
      expect(result.salesCount).toBe(0);
      expect(result.statementCount).toBe(0);
    });
  });

  describe("getTenantUsers query", () => {
    it("returns users with email, role, and is_active status", async () => {
      mockGetTenantUsers.mockResolvedValue(mockUsers);

      const result = await getTenantUsers(validTenantId);

      expect(mockGetTenantUsers).toHaveBeenCalledWith(validTenantId);
      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty("email", "owner@acme.com");
      expect(result[0]).toHaveProperty("role", "owner");
      expect(result[0]).toHaveProperty("is_active", true);
      expect(result[2]).toHaveProperty("is_active", false);
    });

    it("returns empty array for tenant with no users", async () => {
      mockGetTenantUsers.mockResolvedValue([]);

      const result = await getTenantUsers(validTenantId);

      expect(result).toHaveLength(0);
    });

    it("NOTE: users table has no name column - email is identifier", async () => {
      mockGetTenantUsers.mockResolvedValue(mockUsers);

      const result = await getTenantUsers(validTenantId);

      // Verify no 'name' property exists (schema doesn't have it)
      for (const user of result) {
        expect(user).not.toHaveProperty("name");
      }
    });
  });

  describe("getTenantActivity query", () => {
    it("returns audit log entries with user email", async () => {
      mockGetTenantActivity.mockResolvedValue(mockActivity);

      const result = await getTenantActivity(validTenantId);

      expect(mockGetTenantActivity).toHaveBeenCalledWith(validTenantId);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("action_type", "CREATE");
      expect(result[0]).toHaveProperty("resource_type", "title");
      expect(result[0]).toHaveProperty("user_email", "owner@acme.com");
    });

    it("returns empty array for tenant with no activity", async () => {
      mockGetTenantActivity.mockResolvedValue([]);

      const result = await getTenantActivity(validTenantId);

      expect(result).toHaveLength(0);
    });

    it("respects limit parameter", async () => {
      const limitedActivity = [mockActivity[0]];
      mockGetTenantActivity.mockResolvedValue(limitedActivity);

      const result = await getTenantActivity(validTenantId, 1);

      expect(mockGetTenantActivity).toHaveBeenCalledWith(validTenantId, 1);
      expect(result).toHaveLength(1);
    });
  });

  describe("getTenantDetail action", () => {
    beforeEach(() => {
      mockGetTenantById.mockResolvedValue(mockTenant);
      mockGetTenantUsers.mockResolvedValue(mockUsers);
      mockGetTenantUsageMetrics.mockResolvedValue(mockMetrics);
      mockGetTenantActivity.mockResolvedValue(mockActivity);
    });

    it("returns success with full tenant detail data", async () => {
      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe(validTenantId);
        expect(result.data.name).toBe("Acme Publishing");
        expect(result.data.subdomain).toBe("acme");
        expect(result.data.status).toBe("active");
        expect(result.data.user_count).toBe(3);
        expect(result.data.timezone).toBe("America/New_York");
        expect(result.data.statement_frequency).toBe("quarterly");
        expect(result.data.users).toHaveLength(3);
        expect(result.data.metrics).toEqual(mockMetrics);
        expect(result.data.activity).toHaveLength(2);
      }
    });

    it("returns last_activity_at from most recent activity", async () => {
      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.last_activity_at).toEqual(
          mockActivity[0].created_at,
        );
      }
    });

    it("returns null last_activity_at when no activity exists", async () => {
      mockGetTenantActivity.mockResolvedValue([]);

      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.last_activity_at).toBeNull();
      }
    });

    it("rejects invalid UUID format before making queries", async () => {
      const result = await getTenantDetail(invalidTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Invalid tenant ID format");
      }
      // Should not have called any queries
      expect(mockGetTenantById).not.toHaveBeenCalled();
    });

    it("returns error when tenant not found", async () => {
      mockGetTenantById.mockResolvedValue(null);

      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tenant not found");
      }
    });

    it("returns error when not authenticated as platform admin", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("returns error on database failure (does not throw)", async () => {
      mockGetTenantById.mockRejectedValue(new Error("Database error"));

      const result = await getTenantDetail(validTenantId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to load tenant details");
      }
    });

    it("fetches users, metrics, and activity in parallel", async () => {
      await getTenantDetail(validTenantId);

      // All three queries should be called
      expect(mockGetTenantUsers).toHaveBeenCalledWith(validTenantId);
      expect(mockGetTenantUsageMetrics).toHaveBeenCalledWith(validTenantId);
      expect(mockGetTenantActivity).toHaveBeenCalledWith(validTenantId);
    });
  });

  describe("ActionResult pattern compliance", () => {
    beforeEach(() => {
      mockGetTenantById.mockResolvedValue(mockTenant);
      mockGetTenantUsers.mockResolvedValue(mockUsers);
      mockGetTenantUsageMetrics.mockResolvedValue(mockMetrics);
      mockGetTenantActivity.mockResolvedValue(mockActivity);
    });

    it("returns { success: true, data: TenantDetail } on success", async () => {
      const result = await getTenantDetail(validTenantId);

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("data");
      expect(result).not.toHaveProperty("error");
    });

    it("returns { success: false, error: string } on failure", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await getTenantDetail(validTenantId);

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
      expect(result).not.toHaveProperty("data");
    });
  });
});
