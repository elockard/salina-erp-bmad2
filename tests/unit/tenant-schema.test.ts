import { describe, expect, it } from "vitest";
import {
  type InsertTenant,
  type RoyaltyPeriodType,
  royaltyPeriodTypeValues,
  type Tenant,
  tenants,
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
      "royalty_period_start_month",
    );
    // Nullable - only required when type is 'custom'
    expect(tenants.royalty_period_start_month.notNull).toBe(false);
  });

  it("has royalty_period_start_day column (AC 9)", () => {
    expect(tenants.royalty_period_start_day).toBeDefined();
    expect(tenants.royalty_period_start_day.name).toBe(
      "royalty_period_start_day",
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
      // Payer info (Story 11.3)
      payer_ein_encrypted: null,
      payer_ein_last_four: null,
      payer_name: null,
      payer_address_line1: null,
      payer_address_line2: null,
      payer_city: null,
      payer_state: null,
      payer_zip: null,
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
      // Payer info (Story 11.3)
      payer_ein_encrypted: null,
      payer_ein_last_four: null,
      payer_name: null,
      payer_address_line1: null,
      payer_address_line2: null,
      payer_city: null,
      payer_state: null,
      payer_zip: null,
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

/**
 * Story 11.3 - AC-11.3.3: Payer Information for 1099 Generation
 * Tests for payer EIN and address fields on tenants table
 */
describe("tenants payer information columns (AC-11.3.3)", () => {
  it("has payer_ein_encrypted column (nullable)", () => {
    expect(tenants.payer_ein_encrypted).toBeDefined();
    expect(tenants.payer_ein_encrypted.name).toBe("payer_ein_encrypted");
    expect(tenants.payer_ein_encrypted.notNull).toBe(false);
  });

  it("has payer_ein_last_four column (nullable)", () => {
    expect(tenants.payer_ein_last_four).toBeDefined();
    expect(tenants.payer_ein_last_four.name).toBe("payer_ein_last_four");
    expect(tenants.payer_ein_last_four.notNull).toBe(false);
  });

  it("has payer_name column (nullable)", () => {
    expect(tenants.payer_name).toBeDefined();
    expect(tenants.payer_name.name).toBe("payer_name");
    expect(tenants.payer_name.notNull).toBe(false);
  });

  it("has payer_address_line1 column (nullable)", () => {
    expect(tenants.payer_address_line1).toBeDefined();
    expect(tenants.payer_address_line1.name).toBe("payer_address_line1");
    expect(tenants.payer_address_line1.notNull).toBe(false);
  });

  it("has payer_address_line2 column (nullable)", () => {
    expect(tenants.payer_address_line2).toBeDefined();
    expect(tenants.payer_address_line2.name).toBe("payer_address_line2");
    expect(tenants.payer_address_line2.notNull).toBe(false);
  });

  it("has payer_city column (nullable)", () => {
    expect(tenants.payer_city).toBeDefined();
    expect(tenants.payer_city.name).toBe("payer_city");
    expect(tenants.payer_city.notNull).toBe(false);
  });

  it("has payer_state column (nullable)", () => {
    expect(tenants.payer_state).toBeDefined();
    expect(tenants.payer_state.name).toBe("payer_state");
    expect(tenants.payer_state.notNull).toBe(false);
  });

  it("has payer_zip column (nullable)", () => {
    expect(tenants.payer_zip).toBeDefined();
    expect(tenants.payer_zip.name).toBe("payer_zip");
    expect(tenants.payer_zip.notNull).toBe(false);
  });
});

describe("Tenant type with payer info", () => {
  it("supports payer information fields", () => {
    const tenantWithPayer: Tenant = {
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
      // Payer info (Story 11.3)
      payer_ein_encrypted: "encryptedEINvalue",
      payer_ein_last_four: "6789",
      payer_name: "Acme Publishing LLC",
      payer_address_line1: "123 Main Street",
      payer_address_line2: "Suite 100",
      payer_city: "New York",
      payer_state: "NY",
      payer_zip: "10001",
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(tenantWithPayer.payer_name).toBe("Acme Publishing LLC");
    expect(tenantWithPayer.payer_ein_last_four).toBe("6789");
    expect(tenantWithPayer.payer_city).toBe("New York");
  });

  it("allows null payer information (before configured)", () => {
    const tenantWithoutPayer: Tenant = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      subdomain: "test-pub",
      name: "Test Publisher",
      timezone: "America/New_York",
      fiscal_year_start: null,
      default_currency: "USD",
      statement_frequency: "quarterly",
      royalty_period_type: "fiscal_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
      // Payer info all null
      payer_ein_encrypted: null,
      payer_ein_last_four: null,
      payer_name: null,
      payer_address_line1: null,
      payer_address_line2: null,
      payer_city: null,
      payer_state: null,
      payer_zip: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(tenantWithoutPayer.payer_ein_encrypted).toBeNull();
    expect(tenantWithoutPayer.payer_name).toBeNull();
  });
});
