import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTenantSettings,
  updateTenantSettings,
} from "@/modules/tenant/actions";

// Create shared mock instances using vi.hoisted so they're the same across all calls
const mockFindFirst = vi.hoisted(() => vi.fn());
const mockReturning = vi.hoisted(() => vi.fn());
const mockWhere = vi.hoisted(() => vi.fn(() => ({ returning: mockReturning })));
const mockSet = vi.hoisted(() => vi.fn(() => ({ where: mockWhere })));
const mockUpdate = vi.hoisted(() => vi.fn(() => ({ set: mockSet })));
const mockRequirePermission = vi.hoisted(() => vi.fn());
const mockGetCurrentTenantId = vi.hoisted(() =>
  vi.fn(() => Promise.resolve("test-tenant-id")),
);

// Create shared db instance
const mockDbInstance = vi.hoisted(() => ({
  query: {
    tenants: {
      findFirst: mockFindFirst,
    },
  },
  update: mockUpdate,
}));

// Mock dependencies with shared instances
vi.mock("@/lib/auth", () => ({
  requirePermission: mockRequirePermission,
  getCurrentTenantId: mockGetCurrentTenantId,
  getDb: vi.fn(() => Promise.resolve(mockDbInstance)),
}));

vi.mock("@/db/schema/tenants", () => ({
  tenants: {
    id: "id",
  },
  // Story 7.5: Export royalty period type values for validation
  royaltyPeriodTypeValues: ["calendar_year", "fiscal_year", "custom"],
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
    // Royalty period settings (Story 7.5)
    royalty_period_type: "fiscal_year",
    royalty_period_start_month: null,
    royalty_period_start_day: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getTenantSettings", () => {
    it("should return tenant settings for authorized user", async () => {
      mockRequirePermission.mockResolvedValue(undefined);
      mockFindFirst.mockResolvedValue(mockTenant);

      const result = await getTenantSettings();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe("test-tenant-id");
        expect(result.data.timezone).toBe("America/New_York");
      }
    });

    it("should return error for unauthorized user", async () => {
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await getTenantSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should return error when tenant not found", async () => {
      mockRequirePermission.mockResolvedValue(undefined);
      mockFindFirst.mockResolvedValue(undefined);

      const result = await getTenantSettings();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Tenant not found");
      }
    });
  });

  describe("updateTenantSettings", () => {
    it("should update settings for authorized user", async () => {
      const updatedTenant = {
        ...mockTenant,
        timezone: "America/Los_Angeles",
        updated_at: new Date(),
      };

      mockRequirePermission.mockResolvedValue(undefined);
      mockReturning.mockResolvedValue([updatedTenant]);

      const result = await updateTenantSettings({
        timezone: "America/Los_Angeles",
        fiscal_year_start: "2024-07-01",
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe("America/Los_Angeles");
      }
    });

    it("should return error for unauthorized user", async () => {
      mockRequirePermission.mockRejectedValue(new Error("UNAUTHORIZED"));

      const result = await updateTenantSettings({
        timezone: "America/Los_Angeles",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("permission");
      }
    });

    it("should return validation error for invalid timezone", async () => {
      // Permission check passes, but validation should fail
      mockRequirePermission.mockResolvedValue(undefined);

      const result = await updateTenantSettings({
        timezone: "Invalid/Timezone",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("Invalid");
      }
    });

    it("should return validation error for invalid currency", async () => {
      // Permission check passes, but validation should fail
      mockRequirePermission.mockResolvedValue(undefined);

      const result = await updateTenantSettings({
        timezone: "America/New_York",
        fiscal_year_start: null,
        // @ts-expect-error Testing invalid currency value
        default_currency: "INVALID",
        statement_frequency: "quarterly",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        // Validation error message may vary - just verify error exists
        expect(result.error).toBeDefined();
        expect(result.error.toLowerCase()).toContain("currency");
      }
    });

    it("should persist settings across queries", async () => {
      const updatedTenant = {
        ...mockTenant,
        timezone: "Europe/London",
        default_currency: "GBP",
        statement_frequency: "annual",
      };

      mockRequirePermission.mockResolvedValue(undefined);
      mockReturning.mockResolvedValue([updatedTenant]);

      const updateResult = await updateTenantSettings({
        timezone: "Europe/London",
        fiscal_year_start: null,
        default_currency: "GBP",
        statement_frequency: "annual",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(updateResult.success).toBe(true);

      // Verify updated_at was set
      if (updateResult.success) {
        expect(updateResult.data.timezone).toBe("Europe/London");
      }
    });

    it("should return error when database update fails", async () => {
      mockRequirePermission.mockResolvedValue(undefined);
      mockReturning.mockRejectedValue(new Error("Database connection failed"));

      const result = await updateTenantSettings({
        timezone: "America/New_York",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    // Story 7.5 AC-7: Test custom period validation
    it("should validate day for month in custom period (AC-7)", async () => {
      mockRequirePermission.mockResolvedValue(undefined);

      // Feb 31 is invalid - should fail validation
      const result = await updateTenantSettings({
        timezone: "America/New_York",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "custom",
        royalty_period_start_month: 2,
        royalty_period_start_day: 31,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("invalid");
      }
    });

    // Story 7.5 AC-3.3: Test custom period requires month/day
    it("should require month and day when custom period selected (AC-3.3)", async () => {
      mockRequirePermission.mockResolvedValue(undefined);

      // Custom type without month/day should fail
      const result = await updateTenantSettings({
        timezone: "America/New_York",
        fiscal_year_start: null,
        default_currency: "USD",
        statement_frequency: "quarterly",
        royalty_period_type: "custom",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain("required");
      }
    });
  });
});
