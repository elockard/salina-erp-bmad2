/**
 * Lifetime Sales Queries Unit Tests
 *
 * Story 10.4: Implement Escalating Lifetime Royalty Rates
 * Tests for LifetimeSalesData type and query function signatures.
 *
 * Note: These are unit tests for type structure and exports.
 * Database query testing is covered in integration tests.
 */

import { describe, expect, it } from "vitest";
import type { LifetimeSalesData } from "@/modules/royalties/queries";

// ============================================================================
// Task 2: Lifetime Sales Data Type Tests (AC: 10.4.2)
// ============================================================================

describe("LifetimeSalesData type structure", () => {
  it("should have lifetimeQuantity field as number", () => {
    const data: LifetimeSalesData = {
      lifetimeQuantity: 5000,
      lifetimeRevenue: 50000.0,
    };

    expect(typeof data.lifetimeQuantity).toBe("number");
    expect(data.lifetimeQuantity).toBe(5000);
  });

  it("should have lifetimeRevenue field as number", () => {
    const data: LifetimeSalesData = {
      lifetimeQuantity: 5000,
      lifetimeRevenue: 50000.0,
    };

    expect(typeof data.lifetimeRevenue).toBe("number");
    expect(data.lifetimeRevenue).toBe(50000.0);
  });

  it("should allow zero values for both fields", () => {
    const data: LifetimeSalesData = {
      lifetimeQuantity: 0,
      lifetimeRevenue: 0,
    };

    expect(data.lifetimeQuantity).toBe(0);
    expect(data.lifetimeRevenue).toBe(0);
  });

  it("should support large lifetime quantities", () => {
    const data: LifetimeSalesData = {
      lifetimeQuantity: 1_000_000,
      lifetimeRevenue: 10_000_000.0,
    };

    expect(data.lifetimeQuantity).toBe(1_000_000);
    expect(data.lifetimeRevenue).toBe(10_000_000.0);
  });

  it("should support decimal revenue values", () => {
    const data: LifetimeSalesData = {
      lifetimeQuantity: 100,
      lifetimeRevenue: 999.99,
    };

    expect(data.lifetimeRevenue).toBe(999.99);
  });
});

describe("Lifetime sales query function exports", () => {
  it("should export getLifetimeSalesBeforeDate function", async () => {
    const { getLifetimeSalesBeforeDate } = await import(
      "@/modules/royalties/queries"
    );
    expect(typeof getLifetimeSalesBeforeDate).toBe("function");
  });

  it("should export getLifetimeSalesBeforeDateAdmin function", async () => {
    const { getLifetimeSalesBeforeDateAdmin } = await import(
      "@/modules/royalties/queries"
    );
    expect(typeof getLifetimeSalesBeforeDateAdmin).toBe("function");
  });

  it("should export getLifetimeSalesByFormatBeforeDate function", async () => {
    const { getLifetimeSalesByFormatBeforeDate } = await import(
      "@/modules/royalties/queries"
    );
    expect(typeof getLifetimeSalesByFormatBeforeDate).toBe("function");
  });

  it("should export getLifetimeSalesByFormatBeforeDateAdmin function", async () => {
    const { getLifetimeSalesByFormatBeforeDateAdmin } = await import(
      "@/modules/royalties/queries"
    );
    expect(typeof getLifetimeSalesByFormatBeforeDateAdmin).toBe("function");
  });
});

// ============================================================================
// Map structure tests for multi-format lifetime data
// ============================================================================

describe("Lifetime sales by format Map structure", () => {
  it("should support Map with ContractFormat keys", () => {
    const lifetimeMap = new Map<string, LifetimeSalesData>();

    lifetimeMap.set("physical", {
      lifetimeQuantity: 10000,
      lifetimeRevenue: 100000.0,
    });
    lifetimeMap.set("ebook", {
      lifetimeQuantity: 5000,
      lifetimeRevenue: 25000.0,
    });
    lifetimeMap.set("audiobook", {
      lifetimeQuantity: 2000,
      lifetimeRevenue: 30000.0,
    });

    expect(lifetimeMap.size).toBe(3);
    expect(lifetimeMap.get("physical")?.lifetimeQuantity).toBe(10000);
    expect(lifetimeMap.get("ebook")?.lifetimeQuantity).toBe(5000);
    expect(lifetimeMap.get("audiobook")?.lifetimeQuantity).toBe(2000);
  });

  it("should return undefined for formats with no sales history", () => {
    const lifetimeMap = new Map<string, LifetimeSalesData>();

    lifetimeMap.set("physical", {
      lifetimeQuantity: 10000,
      lifetimeRevenue: 100000.0,
    });

    // ebook has no sales history
    expect(lifetimeMap.get("ebook")).toBeUndefined();
  });

  it("should correctly identify format presence with has()", () => {
    const lifetimeMap = new Map<string, LifetimeSalesData>();

    lifetimeMap.set("physical", {
      lifetimeQuantity: 100,
      lifetimeRevenue: 1000.0,
    });

    expect(lifetimeMap.has("physical")).toBe(true);
    expect(lifetimeMap.has("ebook")).toBe(false);
    expect(lifetimeMap.has("audiobook")).toBe(false);
  });
});
