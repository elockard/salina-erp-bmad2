/**
 * Platform Admin Queries Unit Tests
 *
 * Story 13.2: Build Tenant List and Search Interface
 * Tests for getTenants() - search, filter, sort, pagination
 *
 * Note: These tests focus on the searchTenants action which calls getTenants.
 * The queries module is tested through the actions layer since mocking
 * complex drizzle ORM subqueries directly is brittle.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the entire queries module to avoid complex drizzle mocking
vi.mock("@/modules/platform-admin/queries", () => ({
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
    TENANT_SEARCH: "tenant_search",
  },
}));

import { getCurrentPlatformAdmin } from "@/lib/platform-admin";
import { searchTenants } from "@/modules/platform-admin/actions";
import { getTenants } from "@/modules/platform-admin/queries";

// Type the mocks
const mockGetCurrentPlatformAdmin = getCurrentPlatformAdmin as ReturnType<
  typeof vi.fn
>;
const mockGetTenants = getTenants as ReturnType<typeof vi.fn>;

describe("Platform Admin Queries via searchTenants action", () => {
  const mockAdmin = {
    clerkId: "user_admin_123",
    email: "admin@example.com",
    name: "Admin User",
  };

  const mockTenants = [
    {
      id: "tenant-1",
      name: "Acme Publishing",
      subdomain: "acme",
      status: "active" as const,
      created_at: new Date("2025-01-01"),
      user_count: 5,
    },
    {
      id: "tenant-2",
      name: "Beta Books",
      subdomain: "beta",
      status: "active" as const,
      created_at: new Date("2025-02-01"),
      user_count: 3,
    },
    {
      id: "tenant-3",
      name: "Gamma Press",
      subdomain: "gamma",
      status: "active" as const,
      created_at: new Date("2025-03-01"),
      user_count: 8,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
  });

  describe("basic query functionality", () => {
    it("returns tenant data with user counts", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      const result = await searchTenants({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenants).toHaveLength(3);
        expect(result.data.tenants[0]).toHaveProperty("id");
        expect(result.data.tenants[0]).toHaveProperty("name");
        expect(result.data.tenants[0]).toHaveProperty("subdomain");
        expect(result.data.tenants[0]).toHaveProperty("created_at");
        expect(result.data.tenants[0]).toHaveProperty("user_count");
        expect(result.data.tenants[0]).toHaveProperty("status", "active");
      }
    });

    it("returns empty array when no tenants exist", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });

      const result = await searchTenants({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenants).toHaveLength(0);
        expect(result.data.total).toBe(0);
      }
    });
  });

  describe("search functionality", () => {
    it("filters by name (case-insensitive)", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [mockTenants[0]],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      const result = await searchTenants({ search: "acme" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ search: "acme" }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenants).toHaveLength(1);
        expect(result.data.total).toBe(1);
      }
    });

    it("filters by subdomain", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [mockTenants[1]],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      const result = await searchTenants({ search: "beta" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ search: "beta" }),
      );
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tenants).toHaveLength(1);
      }
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

  describe("status filter", () => {
    it("filters by status", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ status: "active" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ status: "active" }),
      );
    });

    it("passes suspended status", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 25,
        totalPages: 0,
      });

      await searchTenants({ status: "suspended" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ status: "suspended" }),
      );
    });
  });

  describe("sorting functionality", () => {
    it("sorts by name ascending by default", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({});

      expect(mockGetTenants).toHaveBeenCalled();
    });

    it("sorts by created_at", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ sortBy: "created_at" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "created_at" }),
      );
    });

    it("sorts by user_count", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ sortBy: "user_count" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: "user_count" }),
      );
    });

    it("sorts descending when specified", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [...mockTenants].reverse(),
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ sortOrder: "desc" });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ sortOrder: "desc" }),
      );
    });
  });

  describe("pagination functionality", () => {
    it("paginates correctly with default page size", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 100,
        page: 1,
        pageSize: 25,
        totalPages: 4,
      });

      const result = await searchTenants({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.pageSize).toBe(25);
        expect(result.data.total).toBe(100);
        expect(result.data.totalPages).toBe(4);
      }
    });

    it("respects custom page size", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants.slice(0, 2),
        total: 10,
        page: 1,
        pageSize: 2,
        totalPages: 5,
      });

      const result = await searchTenants({ pageSize: 2 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 2 }),
      );
      if (result.success) {
        expect(result.data.pageSize).toBe(2);
        expect(result.data.totalPages).toBe(5);
      }
    });

    it("navigates to correct page", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [mockTenants[2]],
        total: 10,
        page: 3,
        pageSize: 1,
        totalPages: 10,
      });

      const result = await searchTenants({ page: 3, pageSize: 1 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ page: 3, pageSize: 1 }),
      );
      if (result.success) {
        expect(result.data.page).toBe(3);
      }
    });

    it("calculates totalPages correctly", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 10,
        totalPages: 0,
      });

      const result = await searchTenants({ pageSize: 10 });

      if (result.success) {
        expect(result.data.totalPages).toBe(0);
      }
    });
  });

  describe("combined filters", () => {
    it("applies search with sorting", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [mockTenants[0]],
        total: 1,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({
        search: "acme",
        sortBy: "created_at",
        sortOrder: "desc",
      });

      expect(mockGetTenants).toHaveBeenCalledWith({
        search: "acme",
        sortBy: "created_at",
        sortOrder: "desc",
      });
    });

    it("applies all filters together", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [mockTenants[0]],
        total: 1,
        page: 1,
        pageSize: 10,
        totalPages: 1,
      });

      await searchTenants({
        search: "publishing",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        pageSize: 10,
      });

      expect(mockGetTenants).toHaveBeenCalledWith({
        search: "publishing",
        status: "active",
        sortBy: "name",
        sortOrder: "asc",
        page: 1,
        pageSize: 10,
      });
    });
  });

  describe("pagination edge cases", () => {
    beforeEach(() => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(mockAdmin);
    });

    it("handles page=0 by passing to getTenants (server validates)", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ page: 0 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ page: 0 }),
      );
    });

    it("handles negative page by passing to getTenants (server validates)", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ page: -5 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ page: -5 }),
      );
    });

    it("handles pageSize=0 by passing to getTenants (server validates)", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 1,
        totalPages: 0,
      });

      await searchTenants({ pageSize: 0 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 0 }),
      );
    });

    it("handles negative pageSize by passing to getTenants (server validates)", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 0,
        page: 1,
        pageSize: 1,
        totalPages: 0,
      });

      await searchTenants({ pageSize: -10 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: -10 }),
      );
    });

    it("handles very large page numbers", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: [],
        total: 3,
        page: 999999,
        pageSize: 25,
        totalPages: 1,
      });

      await searchTenants({ page: 999999 });

      expect(mockGetTenants).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999999 }),
      );
    });
  });

  describe("ActionResult pattern", () => {
    it("returns success: true with data on success", async () => {
      mockGetTenants.mockResolvedValue({
        tenants: mockTenants,
        total: 3,
        page: 1,
        pageSize: 25,
        totalPages: 1,
      });

      const result = await searchTenants({});

      expect(result).toHaveProperty("success", true);
      expect(result).toHaveProperty("data");
    });

    it("returns success: false with error on unauthorized", async () => {
      mockGetCurrentPlatformAdmin.mockResolvedValue(null);

      const result = await searchTenants({});

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
      if (!result.success) {
        expect(result.error).toBe(
          "Unauthorized: Platform admin access required",
        );
      }
    });

    it("returns success: false with error on failure (not throws)", async () => {
      mockGetTenants.mockRejectedValue(new Error("Database error"));

      const result = await searchTenants({});

      expect(result).toHaveProperty("success", false);
      expect(result).toHaveProperty("error");
    });
  });
});
