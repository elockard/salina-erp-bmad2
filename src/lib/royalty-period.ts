/**
 * Royalty Period Calculation Utilities (Story 7.5)
 *
 * Provides functions for calculating royalty period dates based on tenant settings.
 * Used by statement wizard and report filters.
 */

import type { TenantSettings } from "@/modules/tenant/types";

// Month labels for UI
export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

// Days in each month (Feb uses 29 to allow leap year dates)
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Get the number of days in a given month
 * February returns 29 to support leap year dates
 */
export function getDaysInMonth(month: number): number {
  if (month < 1 || month > 12) return 31;
  return DAYS_IN_MONTH[month - 1];
}

/**
 * Validate if a day is valid for a given month
 * @param month 1-12
 * @param day 1-31
 */
export function isValidDayForMonth(month: number, day: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  return day <= getDaysInMonth(month);
}

/**
 * Get royalty period start and end dates for a given year
 * based on tenant settings
 */
export function getRoyaltyPeriodDates(
  settings: Pick<
    TenantSettings,
    | "royalty_period_type"
    | "royalty_period_start_month"
    | "royalty_period_start_day"
    | "fiscal_year_start"
  >,
  year: number
): { start: Date; end: Date } {
  switch (settings.royalty_period_type) {
    case "calendar_year":
      return {
        start: new Date(year, 0, 1), // Jan 1
        end: new Date(year, 11, 31), // Dec 31
      };

    case "fiscal_year":
      if (!settings.fiscal_year_start) {
        // Fallback to calendar year when fiscal_year_start not set
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
        };
      }
      // Parse YYYY-MM-DD format to avoid timezone issues
      const [, fiscalMonth, fiscalDay] = settings.fiscal_year_start
        .split("-")
        .map(Number);
      const startMonth = fiscalMonth - 1; // Convert to 0-indexed
      return {
        start: new Date(year, startMonth, fiscalDay),
        end: new Date(year + 1, startMonth, fiscalDay - 1),
      };

    case "custom":
      if (
        !settings.royalty_period_start_month ||
        !settings.royalty_period_start_day
      ) {
        // Fallback to calendar year when custom dates not set
        return {
          start: new Date(year, 0, 1),
          end: new Date(year, 11, 31),
        };
      }
      const month = settings.royalty_period_start_month - 1; // 0-indexed
      const day = settings.royalty_period_start_day;
      return {
        start: new Date(year, month, day),
        end: new Date(year + 1, month, day - 1),
      };
  }
}

/**
 * Get the current royalty period based on today's date
 * Returns the period that contains today
 */
export function getCurrentRoyaltyPeriod(
  settings: Pick<
    TenantSettings,
    | "royalty_period_type"
    | "royalty_period_start_month"
    | "royalty_period_start_day"
    | "fiscal_year_start"
  >
): { start: Date; end: Date } {
  const today = new Date();
  const currentYear = today.getFullYear();

  // Get period for current year
  const currentYearPeriod = getRoyaltyPeriodDates(settings, currentYear);

  // Check if today falls within current year's period
  if (today >= currentYearPeriod.start && today <= currentYearPeriod.end) {
    return currentYearPeriod;
  }

  // If today is before current year's period start, return previous year's period
  if (today < currentYearPeriod.start) {
    return getRoyaltyPeriodDates(settings, currentYear - 1);
  }

  // If today is after current year's period end, return next year's period
  return getRoyaltyPeriodDates(settings, currentYear + 1);
}

/**
 * Format a human-readable preview of the royalty period
 */
export function formatRoyaltyPeriodPreview(
  settings: Pick<
    TenantSettings,
    | "royalty_period_type"
    | "royalty_period_start_month"
    | "royalty_period_start_day"
    | "fiscal_year_start"
  >
): string {
  const { start, end } = getCurrentRoyaltyPeriod(settings);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });

  return `Your royalty year runs from ${formatDate(start)} to ${formatDate(end)}`;
}

/**
 * Get the royalty period label for display
 */
export function getRoyaltyPeriodLabel(
  settings: Pick<TenantSettings, "royalty_period_type">
): string {
  switch (settings.royalty_period_type) {
    case "calendar_year":
      return "Calendar Year";
    case "fiscal_year":
      return "Fiscal Year";
    case "custom":
      return "Custom Period";
  }
}
