/**
 * Platform Admin Actions Unit Tests
 *
 * Story 13.2: Build Tenant List and Search Interface
 * Tests for searchTenants() server action - auth, ActionResult pattern, audit logging
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock platform-admin auth
vi.mock("@/lib/platform-admin", () => ({
  getCurrentPlatformAdmin: vi.fn(),
}));

// Mock platform-audit
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
  PLATFORM_ADMIN_ACTIONS: {
    TENANT_SEARCH: "tenant_search",
  },
}));

// Mock queries
vi.mock("@/modules/platform-admin/queries", () => ({
  getTenants: vi.fn(),
}));

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { logPlatformAdminEvent } from "@/lib/platform-audit";
import { searchTenants } from "@/modules/platform-admin/actions";
import { getTenants } from "@/modules/platform-admin/queries";

// Type the mocks
const mockGetCurrentPlatformAdmin = getCurrentPlatformAdmin as ReturnType<
  typeof vi.fn
>;
const mockLogPlatformAdminEvent = logPlatformAdminEvent as ReturnType<
  typeof vi.fn
>;
const mockGetTenants = getTenants as ReturnType<typeof vi.fn>;

describe("Platform Admin Actions - searchTenants", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const mockTenantsResult = {
    tenants: [
      {
        id: "tenant-1",
        name: "Test Tenant",
        subdomain: "test",
        status: "active" as const,
        created_at: new Date(),
        user_count: 5,
      },
    ],
    total: 1,
    page: 1,
    pageSize: 25,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("authorization", () => {
    it("returns error when user is not authenticated", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await searchTenants({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("returns error for non-platform-admin user (does not throw)", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await searchTenants({});

      expect(result.success).toBe(false);
      // Verify it returns ActionResult, not throws
      expect(result).toHaveProperty("error");
    });
  });

  describe("successful queries", () => {
    beforeEach(() => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
      mockGetTenants.mockResolvedValue(mockTenantsResult);
    });

    it("returns ActionResult with success and data", async () => {
      const result = await searchTenants({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(mockTenantsResult);
      }
    });

    it("passes search parameters to getTenants", async () => {
      await searchTenants({
        search: "test",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
        page: 2,
        pageSize: 10,
      });

      expect(mockGetTenants).toHaveBeenCalledWith({
        search: "test",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
        page: 2,
        pageSize: 10,
      });
    });

    it("filters by name (case-insensitive implied by query)", async () => {
      await searchTenants({ search: "TEST" });

      expect(mockGetTenants).toHaveBeenCalledWith({ search: "TEST" });
    });

    it("filters by subdomain", async () => {
      await searchTenants({ search: "subdomain-value" });

      expect(mockGetTenants).toHaveBeenCalledWith({
        search: "subdomain-value",
      });
    });

    it("filters by status", async () => {
      await searchTenants({ status: "active" });

      expect(mockGetTenants).toHaveBeenCalledWith({ status: "active" });
    });

    it("sorts by name", async () => {
      await searchTenants({ sortBy: "name" });

      expect(mockGetTenants).toHaveBeenCalledWith({ sortBy: "name" });
    });

    it("sorts by created_at", async () => {
      await searchTenants({ sortBy: "created_at" });

      expect(mockGetTenants).toHaveBeenCalledWith({ sortBy: "created_at" });
    });

    it("sorts by user_count", async () => {
      await searchTenants({ sortBy: "user_count" });

      expect(mockGetTenants).toHaveBeenCalledWith({ sortBy: "user_count" });
    });

    it("paginates correctly", async () => {
      await searchTenants({ page: 3, pageSize: 50 });

      expect(mockGetTenants).toHaveBeenCalledWith({ page: 3, pageSize: 50 });
    });

    it("returns empty array when no matches", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });

      const result = await searchTenants({ search: "nonexistent" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenants).toHaveLength(0);
      }
    });
  });

  describe("audit logging", () => {
    beforeEach(() => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
      mockGetTenants.mockResolvedValue(mockTenantsResult);
    });

    it("logs search event to audit trail", async () => {
      await searchTenants({ search: "test", status: "active" });

      expect(mockLogPlatformAdminEvent).toHaveBeenCalledWith({
        adminEmail: mockAdmin.email,
        adminClerkId: mockAdmin.clerkId,
        action: "tenant_search",
        route: "/platform-admin/tenants",
        metadata: {
          search: "test",
          status: "active",
          sortBy: undefined,
          page: undefined,
        },
      });
    });

    it("does not log when unauthorized", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      await searchTenants({});

      expect(mockLogPlatformAdminEvent).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
    });

    it("returns ActionResult error on query failure (does not throw)", async () => {
      mockGetTenants.mockRejectedValue(new Error("Database error"));

      const result = await searchTenants({});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Failed to search tenants");
      }
    });

    it("logs error to console on failure", async () => {
      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      mockGetTenants.mockRejectedValue(new Error("DB connection failed"));

      await searchTenants({});

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
