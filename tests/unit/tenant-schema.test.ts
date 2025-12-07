import { describe, expect, it } from "vitest";
import {
  type InsertTenant,
  royaltyPeriodTypeValues,
  type RoyaltyPeriodType,
  tenants,
  type Tenant,
} from "@/db/schema/tenants";

/**
 * Unit tests for Tenants Schema
 *
 * Story 7.5 - AC 9, 10: Database schema for royalty period settings
 * - Test royalty_period_type enum values
 * - Test new columns: royalty_period_type, royalty_period_start_month, royalty_period_start_day
 * - Test default values
 */

describe("royaltyPeriodTypeValues", () => {
  describe("valid values", () => {
    it("has exactly 3 values", () => {
      expect(royaltyPeriodTypeValues).toHaveLength(3);
    });

    it("contains 'calendar_year'", () => {
      expect(royaltyPeriodTypeValues).toContain("calendar_year");
    });

    it("contains 'fiscal_year'", () => {
      expect(royaltyPeriodTypeValues).toContain("fiscal_year");
    });

    it("contains 'custom'", () => {
      expect(royaltyPeriodTypeValues).toContain("custom");
    });

    it("has expected values in order", () => {
      expect(royaltyPeriodTypeValues[0]).toBe("calendar_year");
      expect(royaltyPeriodTypeValues[1]).toBe("fiscal_year");
      expect(royaltyPeriodTypeValues[2]).toBe("custom");
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = royaltyPeriodTypeValues;
      expect(values).toEqual(["calendar_year", "fiscal_year", "custom"]);
    });
  });
});

describe("RoyaltyPeriodType type", () => {
  it("accepts valid period type values", () => {
    const calendarYear: RoyaltyPeriodType = "calendar_year";
    const fiscalYear: RoyaltyPeriodType = "fiscal_year";
    const custom: RoyaltyPeriodType = "custom";

    expect(calendarYear).toBe("calendar_year");
    expect(fiscalYear).toBe("fiscal_year");
    expect(custom).toBe("custom");
  });

  it("derives from royaltyPeriodTypeValues", () => {
    for (const periodType of royaltyPeriodTypeValues) {
      const p: RoyaltyPeriodType = periodType;
      expect(typeof p).toBe("string");
    }
  });
});

describe("tenants table schema structure", () => {
  it("is defined as a pgTable", () => {
    expect(tenants).toBeDefined();
    expect(typeof tenants).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(tenants.id).toBeDefined();
    expect(tenants.id.name).toBe("id");
  });

  it("has subdomain column", () => {
    expect(tenants.subdomain).toBeDefined();
    expect(tenants.subdomain.name).toBe("subdomain");
    expect(tenants.subdomain.notNull).toBe(true);
  });

  it("has name column", () => {
    expect(tenants.name).toBeDefined();
    expect(tenants.name.name).toBe("name");
    expect(tenants.name.notNull).toBe(true);
  });

  it("has timezone column", () => {
    expect(tenants.timezone).toBeDefined();
    expect(tenants.timezone.name).toBe("timezone");
    expect(tenants.timezone.notNull).toBe(true);
  });

  it("has fiscal_year_start column", () => {
    expect(tenants.fiscal_year_start).toBeDefined();
    expect(tenants.fiscal_year_start.name).toBe("fiscal_year_start");
  });

  it("has default_currency column", () => {
    expect(tenants.default_currency).toBeDefined();
    expect(tenants.default_currency.name).toBe("default_currency");
    expect(tenants.default_currency.notNull).toBe(true);
  });

  it("has statement_frequency column", () => {
    expect(tenants.statement_frequency).toBeDefined();
    expect(tenants.statement_frequency.name).toBe("statement_frequency");
    expect(tenants.statement_frequency.notNull).toBe(true);
  });

  // New royalty period columns - AC 9
  it("has royalty_period_type column (AC 9)", () => {
    expect(tenants.royalty_period_type).toBeDefined();
    expect(tenants.royalty_period_type.name).toBe("royalty_period_type");
    expect(tenants.royalty_period_type.notNull).toBe(true);
  });

  it("has royalty_period_start_month column (AC 9)", () => {
    expect(tenants.royalty_period_start_month).toBeDefined();
    expect(tenants.royalty_period_start_month.name).toBe(
      "royalty_period_start_month"
    );
    // Nullable - only required when type is 'custom'
    expect(tenants.royalty_period_start_month.notNull).toBe(false);
  });

  it("has royalty_period_start_day column (AC 9)", () => {
    expect(tenants.royalty_period_start_day).toBeDefined();
    expect(tenants.royalty_period_start_day.name).toBe(
      "royalty_period_start_day"
    );
    // Nullable - only required when type is 'custom'
    expect(tenants.royalty_period_start_day.notNull).toBe(false);
  });

  it("has created_at column", () => {
    expect(tenants.created_at).toBeDefined();
    expect(tenants.created_at.name).toBe("created_at");
    expect(tenants.created_at.notNull).toBe(true);
  });

  it("has updated_at column", () => {
    expect(tenants.updated_at).toBeDefined();
    expect(tenants.updated_at.name).toBe("updated_at");
    expect(tenants.updated_at.notNull).toBe(true);
  });
});

describe("Tenant type", () => {
  it("infers select type from tenants table", () => {
    const mockTenant: Tenant = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      subdomain: "test-pub",
      name: "Test Publisher",
      timezone: "America/New_York",
      fiscal_year_start: "2024-01-01",
      default_currency: "USD",
      statement_frequency: "quarterly",
      royalty_period_type: "fiscal_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(mockTenant.id).toBeDefined();
    expect(mockTenant.subdomain).toBe("test-pub");
    expect(mockTenant.royalty_period_type).toBe("fiscal_year");
  });

  it("supports all royalty period types", () => {
    const calendarYearTenant: Tenant = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      subdomain: "test-pub",
      name: "Test Publisher",
      timezone: "America/New_York",
      fiscal_year_start: null,
      default_currency: "USD",
      statement_frequency: "quarterly",
      royalty_period_type: "calendar_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const customTenant: Tenant = {
      ...calendarYearTenant,
      id: "550e8400-e29b-41d4-a716-446655440001",
      royalty_period_type: "custom",
      royalty_period_start_month: 4,
      royalty_period_start_day: 1,
    };

    expect(calendarYearTenant.royalty_period_type).toBe("calendar_year");
    expect(customTenant.royalty_period_type).toBe("custom");
    expect(customTenant.royalty_period_start_month).toBe(4);
    expect(customTenant.royalty_period_start_day).toBe(1);
  });
});

describe("InsertTenant type", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertTenant = {
      subdomain: "new-pub",
      name: "New Publisher",
      // id is optional - will be auto-generated
    };

    expect(insertData.subdomain).toBe("new-pub");
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional royalty period fields with defaults", () => {
    const insertData: InsertTenant = {
      subdomain: "new-pub",
      name: "New Publisher",
      // royalty_period_type defaults to "fiscal_year"
      // royalty_period_start_month and _day default to null
    };

    expect(insertData.royalty_period_type).toBeUndefined();
    expect(insertData.royalty_period_start_month).toBeUndefined();
    expect(insertData.royalty_period_start_day).toBeUndefined();
  });

  it("allows explicit royalty period values for custom type", () => {
    const insertData: InsertTenant = {
      subdomain: "new-pub",
      name: "New Publisher",
      royalty_period_type: "custom",
      royalty_period_start_month: 7,
      royalty_period_start_day: 1,
    };

    expect(insertData.royalty_period_type).toBe("custom");
    expect(insertData.royalty_period_start_month).toBe(7);
    expect(insertData.royalty_period_start_day).toBe(1);
  });
});

describe("Default value verification (AC 10)", () => {
  it("royalty_period_type should default to fiscal_year for existing tenants", () => {
    // The migration should default existing rows to 'fiscal_year'
    // This test verifies the schema default is correct
    expect(tenants.royalty_period_type.default).toBe("fiscal_year");
  });
});
