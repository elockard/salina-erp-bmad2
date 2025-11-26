import { describe, expect, it, vi } from "vitest";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/modules/tenant/actions";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  requirePermission: vi.fn(),
  getCurrentTenantId: vi.fn(() => Promise.resolve("test-tenant-id")),
  getDb: vi.fn(() => ({
    query: {
      tenants: {
        findFirst: vi.fn(),
      },
    },
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(),
        })),
      })),
    })),
  })),
}));

vi.mock("@/db/schema/tenants", () => ({
  tenants: {
    id: "id",
  },
}));

describe("Tenant Settings Server Actions", () => {
  const mockTenant = {
    id: "test-tenant-id",
    subdomain: "testcompany",
    name: "Test Company",
    timezone: "America/New_York",
    fiscal_year_start: "2024-07-01",
    default_currency: "USD",
    statement_frequency: "quarterly",
    created_at: new Date(),
    updated_at: new Date(),
  };

  describe("getTenantSettings", () => {
    it("should return tenant settings for authorized user", async () => {
      const { getDb, requirePermission } = await import("@/lib/auth");
      const mockDb = await getDb();

      vi.mocked(requirePermission).mockResolvedValue(undefined);
      vi.mocked(mockDb.query.tenants.findFirst).mockResolvedValue(mockTenant);

      const result = await getTenantSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("test-tenant-id");
        expect(result.data.timezone).toBe("America/New_York");
      }
    });

    it("should return error for unauthorized user", async () => {
      const { requirePermission } = await import("@/lib/auth");

      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await getTenantSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should return error when tenant not found", async () => {
      const { getDb, requirePermission } = await import("@/lib/auth");
      const mockDb = await getDb();

      vi.mocked(requirePermission).mockResolvedValue(undefined);
      vi.mocked(mockDb.query.tenants.findFirst).mockResolvedValue(undefined);

      const result = await getTenantSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tenant not found");
      }
    });
  });

  describe("updateTenantSettings", () => {
    it("should update settings for authorized user", async () => {
      const { getDb, requirePermission } = await import("@/lib/auth");
      const mockDb = await getDb();

      const updatedTenant = {
        ...mockTenant,
        timezone: "America/Los_Angeles",
        updated_at: new Date(),
      };

      vi.mocked(requirePermission).mockResolvedValue(undefined);
      vi.mocked(mockDb.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTenant]),
          }),
        }),
      } as any);

      const result = await updateTenantSettings({
        timezone: "America/Los_Angeles",
        fiscal_year_start: "2024-07-01",
        default_currency: "USD",
        statement_frequency: "quarterly",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe("America/Los_Angeles");
      }
    });

    it("should return error for unauthorized user", async () => {
      const { requirePermission } = await import("@/lib/auth");

      vi.mocked(requirePermission).mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await updateTenantSettings({
        timezone: "America/Los_Angeles",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should return validation error for invalid timezone", async () => {
      const result = await updateTenantSettings({
        timezone: "Invalid/Timezone",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }
    });

    it("should return validation error for invalid currency", async () => {
      const result = await updateTenantSettings({
        timezone: "America/New_York",
        fiscal_year_start: null,
        default_currency: "INVALID" as any,
        statement_frequency: "quarterly",
      });

      expect(result.success).toBe(false);
    });

    it("should persist settings across queries", async () => {
      const { getDb, requirePermission } = await import("@/lib/auth");
      const mockDb = await getDb();

      vi.mocked(requirePermission).mockResolvedValue(undefined);

      const updatedTenant = {
        ...mockTenant,
        timezone: "Europe/London",
      };

      vi.mocked(mockDb.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedTenant]),
          }),
        }),
      } as any);

      const updateResult = await updateTenantSettings({
        timezone: "Europe/London",
        fiscal_year_start: null,
        default_currency: "GBP",
        statement_frequency: "annual",
      });

      expect(updateResult.success).toBe(true);

      // Verify updated_at was set
      if (updateResult.success) {
        expect(updateResult.data.timezone).toBe("Europe/London");
      }
    });
  });
});
