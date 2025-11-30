import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit tests for Contract Detail View
 *
 * Story 4.3 - AC 3, 4, 5: Advance tracking and tier display tests
 * Tests for:
 * - Advance tracking calculations
 * - Progress percentage calculations
 * - Remaining balance calculations
 * - Tier grouping by format
 * - Rate formatting
 */

describe("Advance Tracking Calculations (AC 3)", () => {
  /**
   * Calculate remaining balance: advance_amount - advance_recouped
   */
  function calculateRemainingBalance(
    advanceAmount: string,
    advanceRecouped: string
  ): Decimal {
    const amount = new Decimal(advanceAmount || "0");
    const recouped = new Decimal(advanceRecouped || "0");
    return amount.minus(recouped);
  }

  /**
   * Calculate progress percentage: (recouped / amount) * 100, capped at 100%
   */
  function calculateProgressPercentage(
    advanceAmount: string,
    advanceRecouped: string
  ): number {
    const amount = new Decimal(advanceAmount || "0");
    const recouped = new Decimal(advanceRecouped || "0");

    if (amount.isZero()) {
      return recouped.greaterThan(0) ? 100 : 0;
    }

    return Math.min(100, recouped.dividedBy(amount).times(100).toNumber());
  }

  describe("remaining balance", () => {
    it("calculates simple remaining balance", () => {
      const remaining = calculateRemainingBalance("10000.00", "3000.00");
      expect(remaining.toString()).toBe("7000");
    });

    it("returns zero when fully recouped", () => {
      const remaining = calculateRemainingBalance("5000.00", "5000.00");
      expect(remaining.toString()).toBe("0");
    });

    it("handles no recoupment yet", () => {
      const remaining = calculateRemainingBalance("5000.00", "0");
      expect(remaining.toString()).toBe("5000");
    });

    it("handles over-recoupment (negative remaining)", () => {
      const remaining = calculateRemainingBalance("5000.00", "6000.00");
      expect(remaining.isNegative()).toBe(true);
      expect(remaining.toString()).toBe("-1000");
    });

    it("handles zero advance amount", () => {
      const remaining = calculateRemainingBalance("0", "0");
      expect(remaining.toString()).toBe("0");
    });

    it("uses Decimal.js for precision", () => {
      // Test decimal precision (avoid floating point errors)
      const remaining = calculateRemainingBalance("0.10", "0.03");
      expect(remaining.toString()).toBe("0.07");
    });
  });

  describe("progress percentage", () => {
    it("calculates correct progress for partial recoupment", () => {
      const progress = calculateProgressPercentage("10000.00", "3000.00");
      expect(progress).toBe(30);
    });

    it("returns 100 when fully recouped", () => {
      const progress = calculateProgressPercentage("5000.00", "5000.00");
      expect(progress).toBe(100);
    });

    it("returns 0 when no recoupment", () => {
      const progress = calculateProgressPercentage("5000.00", "0");
      expect(progress).toBe(0);
    });

    it("caps at 100 when over-recouped", () => {
      const progress = calculateProgressPercentage("5000.00", "7500.00");
      expect(progress).toBe(100);
    });

    it("handles zero advance amount with recoupment", () => {
      // Edge case: no advance but somehow has recoupment
      const progress = calculateProgressPercentage("0", "100.00");
      expect(progress).toBe(100);
    });

    it("handles zero advance amount with no recoupment", () => {
      const progress = calculateProgressPercentage("0", "0");
      expect(progress).toBe(0);
    });

    it("handles decimal progress values", () => {
      // 3333.33 / 10000 = 33.3333%
      const progress = calculateProgressPercentage("10000.00", "3333.33");
      expect(progress).toBeCloseTo(33.33, 1);
    });
  });

  describe("fully recouped detection", () => {
    function isFullyRecouped(
      advanceAmount: string,
      advanceRecouped: string
    ): boolean {
      const remaining = calculateRemainingBalance(advanceAmount, advanceRecouped);
      return remaining.lessThanOrEqualTo(0);
    }

    it("detects fully recouped contract", () => {
      expect(isFullyRecouped("5000.00", "5000.00")).toBe(true);
    });

    it("detects over-recouped contract", () => {
      expect(isFullyRecouped("5000.00", "7000.00")).toBe(true);
    });

    it("detects not fully recouped contract", () => {
      expect(isFullyRecouped("5000.00", "3000.00")).toBe(false);
    });

    it("handles zero advance (considered fully recouped)", () => {
      expect(isFullyRecouped("0", "0")).toBe(true);
    });
  });
});

describe("Tier Display Functions (AC 4)", () => {
  /**
   * Format rate from decimal to percentage display
   * e.g., 0.10 -> "10.00%"
   */
  function formatRate(rate: string): string {
    const decimal = parseFloat(rate || "0");
    return `${(decimal * 100).toFixed(2)}%`;
  }

  /**
   * Format quantity range for display
   */
  function formatRange(minQuantity: number, maxQuantity: number | null): string {
    if (maxQuantity === null) {
      return `${minQuantity.toLocaleString()}+ units`;
    }
    return `${minQuantity.toLocaleString()} - ${maxQuantity.toLocaleString()} units`;
  }

  /**
   * Group tiers by format
   */
  interface Tier {
    format: string;
    min_quantity: number;
    max_quantity: number | null;
    rate: string;
  }

  function groupTiersByFormat(tiers: Tier[]): Record<string, Tier[]> {
    return tiers.reduce(
      (acc, tier) => {
        if (!acc[tier.format]) {
          acc[tier.format] = [];
        }
        acc[tier.format].push(tier);
        return acc;
      },
      {} as Record<string, Tier[]>
    );
  }

  describe("formatRate", () => {
    it("converts decimal to percentage", () => {
      expect(formatRate("0.1000")).toBe("10.00%");
      expect(formatRate("0.1500")).toBe("15.00%");
      expect(formatRate("0.0800")).toBe("8.00%");
    });

    it("handles zero rate", () => {
      expect(formatRate("0")).toBe("0.00%");
    });

    it("handles 100% rate", () => {
      expect(formatRate("1.0000")).toBe("100.00%");
    });

    it("handles precision", () => {
      expect(formatRate("0.1234")).toBe("12.34%");
    });

    it("handles empty/null value", () => {
      expect(formatRate("")).toBe("0.00%");
    });
  });

  describe("formatRange", () => {
    it("formats bounded range", () => {
      expect(formatRange(0, 5000)).toBe("0 - 5,000 units");
    });

    it("formats unlimited range", () => {
      expect(formatRange(5001, null)).toBe("5,001+ units");
    });

    it("handles large numbers", () => {
      expect(formatRange(10001, 50000)).toBe("10,001 - 50,000 units");
    });

    it("handles single unit range", () => {
      expect(formatRange(0, 1)).toBe("0 - 1 units");
    });
  });

  describe("groupTiersByFormat", () => {
    it("groups tiers by format correctly", () => {
      const tiers: Tier[] = [
        { format: "physical", min_quantity: 0, max_quantity: 5000, rate: "0.1000" },
        { format: "physical", min_quantity: 5001, max_quantity: null, rate: "0.1200" },
        { format: "ebook", min_quantity: 0, max_quantity: null, rate: "0.2500" },
      ];

      const grouped = groupTiersByFormat(tiers);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped.physical).toHaveLength(2);
      expect(grouped.ebook).toHaveLength(1);
    });

    it("handles empty tiers array", () => {
      const grouped = groupTiersByFormat([]);
      expect(Object.keys(grouped)).toHaveLength(0);
    });

    it("handles single format", () => {
      const tiers: Tier[] = [
        { format: "audiobook", min_quantity: 0, max_quantity: null, rate: "0.1500" },
      ];

      const grouped = groupTiersByFormat(tiers);

      expect(Object.keys(grouped)).toHaveLength(1);
      expect(grouped.audiobook).toHaveLength(1);
    });

    it("handles all three formats", () => {
      const tiers: Tier[] = [
        { format: "physical", min_quantity: 0, max_quantity: null, rate: "0.1000" },
        { format: "ebook", min_quantity: 0, max_quantity: null, rate: "0.2500" },
        { format: "audiobook", min_quantity: 0, max_quantity: null, rate: "0.1500" },
      ];

      const grouped = groupTiersByFormat(tiers);

      expect(Object.keys(grouped)).toHaveLength(3);
      expect(grouped.physical).toBeDefined();
      expect(grouped.ebook).toBeDefined();
      expect(grouped.audiobook).toBeDefined();
    });
  });
});

describe("Currency Formatting", () => {
  function formatCurrency(amount: string): string {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  }

  it("formats positive amount", () => {
    expect(formatCurrency("5000.00")).toBe("$5,000.00");
  });

  it("formats zero amount", () => {
    expect(formatCurrency("0")).toBe("$0.00");
  });

  it("formats large amount", () => {
    expect(formatCurrency("1000000.00")).toBe("$1,000,000.00");
  });

  it("handles decimal precision", () => {
    expect(formatCurrency("1234.56")).toBe("$1,234.56");
  });

  it("handles empty string", () => {
    expect(formatCurrency("")).toBe("$0.00");
  });
});

describe("Status Badge Mapping", () => {
  const STATUS_BADGES: Record<
    string,
    { label: string; variant: "default" | "secondary" | "destructive" }
  > = {
    active: { label: "Active", variant: "default" },
    suspended: { label: "Suspended", variant: "secondary" },
    terminated: { label: "Terminated", variant: "destructive" },
  };

  it("maps active status correctly", () => {
    const badge = STATUS_BADGES.active;
    expect(badge.label).toBe("Active");
    expect(badge.variant).toBe("default");
  });

  it("maps suspended status correctly", () => {
    const badge = STATUS_BADGES.suspended;
    expect(badge.label).toBe("Suspended");
    expect(badge.variant).toBe("secondary");
  });

  it("maps terminated status correctly", () => {
    const badge = STATUS_BADGES.terminated;
    expect(badge.label).toBe("Terminated");
    expect(badge.variant).toBe("destructive");
  });

  it("has all status values", () => {
    expect(Object.keys(STATUS_BADGES)).toEqual(["active", "suspended", "terminated"]);
  });
});

describe("Date Formatting", () => {
  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC", // Ensure consistent timezone for tests
    }).format(new Date(date));
  }

  it("formats date correctly", () => {
    const date = new Date("2024-03-15T12:00:00Z"); // Use midday to avoid timezone edge cases
    const formatted = formatDate(date);
    expect(formatted).toMatch(/Mar 15, 2024/);
  });

  it("handles different dates", () => {
    const jan = new Date("2024-01-15T12:00:00Z"); // Use midday
    const dec = new Date("2024-12-15T12:00:00Z"); // Use midday

    expect(formatDate(jan)).toMatch(/Jan/);
    expect(formatDate(dec)).toMatch(/Dec/);
  });
});
