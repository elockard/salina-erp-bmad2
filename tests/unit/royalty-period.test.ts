import { describe, expect, it } from "vitest";
import {
  formatRoyaltyPeriodPreview,
  getCurrentRoyaltyPeriod,
  getDaysInMonth,
  getRoyaltyPeriodDates,
  getRoyaltyPeriodLabel,
  isValidDayForMonth,
  MONTHS,
} from "@/lib/royalty-period";
import type { TenantSettings } from "@/modules/tenant/types";

/**
 * Unit tests for Royalty Period Calculation Utilities (Story 7.5)
 *
 * Tests:
 * - getDaysInMonth() for all months
 * - Feb 29 in leap years vs non-leap years
 * - isValidDayForMonth() edge cases
 * - Period calculation for all three types
 * - fiscal_year with null fiscal_year_start fallback
 */

describe("MONTHS constant", () => {
  it("has 12 months", () => {
    expect(MONTHS).toHaveLength(12);
  });

  it("has correct labels", () => {
    expect(MONTHS[0]).toEqual({ value: 1, label: "January" });
    expect(MONTHS[11]).toEqual({ value: 12, label: "December" });
  });
});

describe("getDaysInMonth", () => {
  it("returns 31 for January", () => {
    expect(getDaysInMonth(1)).toBe(31);
  });

  it("returns 29 for February (allows leap year)", () => {
    expect(getDaysInMonth(2)).toBe(29);
  });

  it("returns 31 for March", () => {
    expect(getDaysInMonth(3)).toBe(31);
  });

  it("returns 30 for April", () => {
    expect(getDaysInMonth(4)).toBe(30);
  });

  it("returns 31 for May", () => {
    expect(getDaysInMonth(5)).toBe(31);
  });

  it("returns 30 for June", () => {
    expect(getDaysInMonth(6)).toBe(30);
  });

  it("returns 31 for July", () => {
    expect(getDaysInMonth(7)).toBe(31);
  });

  it("returns 31 for August", () => {
    expect(getDaysInMonth(8)).toBe(31);
  });

  it("returns 30 for September", () => {
    expect(getDaysInMonth(9)).toBe(30);
  });

  it("returns 31 for October", () => {
    expect(getDaysInMonth(10)).toBe(31);
  });

  it("returns 30 for November", () => {
    expect(getDaysInMonth(11)).toBe(30);
  });

  it("returns 31 for December", () => {
    expect(getDaysInMonth(12)).toBe(31);
  });

  it("returns 31 for invalid month 0", () => {
    expect(getDaysInMonth(0)).toBe(31);
  });

  it("returns 31 for invalid month 13", () => {
    expect(getDaysInMonth(13)).toBe(31);
  });
});

describe("isValidDayForMonth", () => {
  describe("valid days", () => {
    it("Jan 1 is valid", () => {
      expect(isValidDayForMonth(1, 1)).toBe(true);
    });

    it("Jan 31 is valid", () => {
      expect(isValidDayForMonth(1, 31)).toBe(true);
    });

    it("Feb 28 is valid", () => {
      expect(isValidDayForMonth(2, 28)).toBe(true);
    });

    it("Feb 29 is valid (leap year support)", () => {
      expect(isValidDayForMonth(2, 29)).toBe(true);
    });

    it("Apr 30 is valid", () => {
      expect(isValidDayForMonth(4, 30)).toBe(true);
    });
  });

  describe("invalid days", () => {
    it("Feb 30 is invalid", () => {
      expect(isValidDayForMonth(2, 30)).toBe(false);
    });

    it("Feb 31 is invalid", () => {
      expect(isValidDayForMonth(2, 31)).toBe(false);
    });

    it("Apr 31 is invalid", () => {
      expect(isValidDayForMonth(4, 31)).toBe(false);
    });

    it("Day 0 is invalid", () => {
      expect(isValidDayForMonth(1, 0)).toBe(false);
    });

    it("Negative day is invalid", () => {
      expect(isValidDayForMonth(1, -1)).toBe(false);
    });

    it("Month 0 is invalid", () => {
      expect(isValidDayForMonth(0, 1)).toBe(false);
    });

    it("Month 13 is invalid", () => {
      expect(isValidDayForMonth(13, 1)).toBe(false);
    });
  });
});

describe("getRoyaltyPeriodDates", () => {
  describe("calendar_year", () => {
    it("returns Jan 1 to Dec 31 for calendar year", () => {
      const settings: Pick<
        TenantSettings,
        | "royalty_period_type"
        | "royalty_period_start_month"
        | "royalty_period_start_day"
        | "fiscal_year_start"
      > = {
        royalty_period_type: "calendar_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
        fiscal_year_start: null,
      };

      const { start, end } = getRoyaltyPeriodDates(settings, 2024);

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  describe("fiscal_year", () => {
    it("returns fiscal year dates when fiscal_year_start is set", () => {
      const settings: Pick<
        TenantSettings,
        | "royalty_period_type"
        | "royalty_period_start_month"
        | "royalty_period_start_day"
        | "fiscal_year_start"
      > = {
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
        fiscal_year_start: "2024-07-01", // July 1
      };

      const { start, end } = getRoyaltyPeriodDates(settings, 2024);

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(6); // July
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(5); // June
      expect(end.getDate()).toBe(30);
    });

    it("falls back to calendar year when fiscal_year_start is null", () => {
      const settings: Pick<
        TenantSettings,
        | "royalty_period_type"
        | "royalty_period_start_month"
        | "royalty_period_start_day"
        | "fiscal_year_start"
      > = {
        royalty_period_type: "fiscal_year",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
        fiscal_year_start: null,
      };

      const { start, end } = getRoyaltyPeriodDates(settings, 2024);

      // Should fall back to calendar year
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0); // January
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11); // December
      expect(end.getDate()).toBe(31);
    });
  });

  describe("custom", () => {
    it("returns custom period dates", () => {
      const settings: Pick<
        TenantSettings,
        | "royalty_period_type"
        | "royalty_period_start_month"
        | "royalty_period_start_day"
        | "fiscal_year_start"
      > = {
        royalty_period_type: "custom",
        royalty_period_start_month: 4, // April
        royalty_period_start_day: 15,
        fiscal_year_start: null,
      };

      const { start, end } = getRoyaltyPeriodDates(settings, 2024);

      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(3); // April (0-indexed)
      expect(start.getDate()).toBe(15);

      expect(end.getFullYear()).toBe(2025);
      expect(end.getMonth()).toBe(3); // April
      expect(end.getDate()).toBe(14);
    });

    it("falls back to calendar year when custom dates are null", () => {
      const settings: Pick<
        TenantSettings,
        | "royalty_period_type"
        | "royalty_period_start_month"
        | "royalty_period_start_day"
        | "fiscal_year_start"
      > = {
        royalty_period_type: "custom",
        royalty_period_start_month: null,
        royalty_period_start_day: null,
        fiscal_year_start: null,
      };

      const { start, end } = getRoyaltyPeriodDates(settings, 2024);

      // Should fall back to calendar year
      expect(start.getFullYear()).toBe(2024);
      expect(start.getMonth()).toBe(0);
      expect(start.getDate()).toBe(1);

      expect(end.getFullYear()).toBe(2024);
      expect(end.getMonth()).toBe(11);
      expect(end.getDate()).toBe(31);
    });
  });
});

describe("getCurrentRoyaltyPeriod", () => {
  it("returns current calendar year period for calendar_year type", () => {
    const settings: Pick<
      TenantSettings,
      | "royalty_period_type"
      | "royalty_period_start_month"
      | "royalty_period_start_day"
      | "fiscal_year_start"
    > = {
      royalty_period_type: "calendar_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
      fiscal_year_start: null,
    };

    const { start, end } = getCurrentRoyaltyPeriod(settings);

    // Should return a valid date range
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    expect(end > start).toBe(true);
  });
});

describe("formatRoyaltyPeriodPreview", () => {
  it("formats calendar year preview", () => {
    const settings: Pick<
      TenantSettings,
      | "royalty_period_type"
      | "royalty_period_start_month"
      | "royalty_period_start_day"
      | "fiscal_year_start"
    > = {
      royalty_period_type: "calendar_year",
      royalty_period_start_month: null,
      royalty_period_start_day: null,
      fiscal_year_start: null,
    };

    const preview = formatRoyaltyPeriodPreview(settings);

    expect(preview).toContain("Your royalty year runs from");
    expect(preview).toContain("January 1");
    expect(preview).toContain("December 31");
  });
});

describe("getRoyaltyPeriodLabel", () => {
  it("returns 'Calendar Year' for calendar_year type", () => {
    expect(
      getRoyaltyPeriodLabel({ royalty_period_type: "calendar_year" }),
    ).toBe("Calendar Year");
  });

  it("returns 'Fiscal Year' for fiscal_year type", () => {
    expect(getRoyaltyPeriodLabel({ royalty_period_type: "fiscal_year" })).toBe(
      "Fiscal Year",
    );
  });

  it("returns 'Custom Period' for custom type", () => {
    expect(getRoyaltyPeriodLabel({ royalty_period_type: "custom" })).toBe(
      "Custom Period",
    );
  });
});
