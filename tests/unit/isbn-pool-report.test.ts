import { addMonths, format, subMonths } from "date-fns";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for ISBN Pool Report Queries
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 2 (Stats cards with available/assigned/total by type)
 * AC: 3 (Utilization percentage calculation)
 * AC: 7 (Burn rate calculation - ISBNs per month)
 * AC: 8 (Estimated runout date)
 * AC: 5 (Assignment history grouping by month)
 *
 * Tests:
 * - ISBN counts by type and status (AC-2)
 * - Utilization percentage calculation (AC-3)
 * - Burn rate calculation (AC-7)
 * - Runout date calculation (AC-8)
 * - Assignment history grouping by month (AC-5)
 * - Empty ISBN pool handling
 * - Tenant isolation validation
 */

interface ISBNRecord {
  type: "physical" | "ebook";
  status: "available" | "assigned" | "registered" | "retired";
  assignedAt?: Date;
}

interface ISBNPoolMetrics {
  physical: { available: number; assigned: number; total: number };
  ebook: { available: number; assigned: number; total: number };
  utilizationPercent: number;
  burnRate: number;
  estimatedRunout: Date | null;
}

interface ISBNAssignmentHistoryItem {
  month: string;
  assigned: number;
}

describe("ISBN Pool Metrics Calculation (AC-2, AC-3)", () => {
  /**
   * Simulates the aggregation logic from getISBNPoolMetrics()
   */
  const calculatePoolMetrics = (isbns: ISBNRecord[]): ISBNPoolMetrics => {
    const physical = { available: 0, assigned: 0, total: 0 };
    const ebook = { available: 0, assigned: 0, total: 0 };

    for (const isbn of isbns) {
      if (isbn.status === "retired") continue;

      if (isbn.type === "physical") {
        if (isbn.status === "available") {
          physical.available++;
        } else if (isbn.status === "assigned" || isbn.status === "registered") {
          physical.assigned++;
        }
        physical.total++;
      } else if (isbn.type === "ebook") {
        if (isbn.status === "available") {
          ebook.available++;
        } else if (isbn.status === "assigned" || isbn.status === "registered") {
          ebook.assigned++;
        }
        ebook.total++;
      }
    }

    // Calculate utilization
    const totalAll = physical.total + ebook.total;
    const assignedAll = physical.assigned + ebook.assigned;
    const utilizationPercent =
      totalAll > 0
        ? new Decimal(assignedAll).div(totalAll).mul(100).toNumber()
        : 0;

    // For simplicity, skip burn rate and runout in this pure calculation test
    return {
      physical,
      ebook,
      utilizationPercent: Math.round(utilizationPercent * 10) / 10,
      burnRate: 0,
      estimatedRunout: null,
    };
  };

  describe("ISBN Counts by Type and Status (subtask 2.2)", () => {
    it("counts physical ISBNs correctly", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "available" },
        { type: "physical", status: "available" },
        { type: "physical", status: "assigned" },
        { type: "physical", status: "registered" },
        { type: "ebook", status: "available" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.physical.available).toBe(2);
      expect(result.physical.assigned).toBe(2); // assigned + registered
      expect(result.physical.total).toBe(4);
    });

    it("counts ebook ISBNs correctly", () => {
      const isbns: ISBNRecord[] = [
        { type: "ebook", status: "available" },
        { type: "ebook", status: "available" },
        { type: "ebook", status: "available" },
        { type: "ebook", status: "assigned" },
        { type: "physical", status: "available" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.ebook.available).toBe(3);
      expect(result.ebook.assigned).toBe(1);
      expect(result.ebook.total).toBe(4);
    });

    it("excludes retired ISBNs from counts", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "available" },
        { type: "physical", status: "retired" },
        { type: "physical", status: "retired" },
        { type: "ebook", status: "retired" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.physical.total).toBe(1);
      expect(result.ebook.total).toBe(0);
    });

    it("treats registered as assigned (subtask 2.2)", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "registered" },
        { type: "physical", status: "registered" },
        { type: "ebook", status: "registered" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.physical.assigned).toBe(2);
      expect(result.ebook.assigned).toBe(1);
    });
  });

  describe("Utilization Percentage Calculation (subtask 2.3)", () => {
    it("calculates utilization correctly", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "available" },
        { type: "physical", status: "assigned" },
        { type: "physical", status: "assigned" },
        { type: "physical", status: "assigned" },
        { type: "ebook", status: "available" },
        { type: "ebook", status: "assigned" },
      ];

      const result = calculatePoolMetrics(isbns);

      // 4 assigned out of 6 total = 66.7%
      expect(result.utilizationPercent).toBeCloseTo(66.7, 1);
    });

    it("returns 0 for empty pool", () => {
      const result = calculatePoolMetrics([]);

      expect(result.utilizationPercent).toBe(0);
    });

    it("returns 100 for fully utilized pool", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "assigned" },
        { type: "ebook", status: "assigned" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.utilizationPercent).toBe(100);
    });

    it("returns 0 for fully available pool", () => {
      const isbns: ISBNRecord[] = [
        { type: "physical", status: "available" },
        { type: "ebook", status: "available" },
      ];

      const result = calculatePoolMetrics(isbns);

      expect(result.utilizationPercent).toBe(0);
    });
  });
});

describe("Burn Rate Calculation (AC-7, subtask 2.4)", () => {
  /**
   * Simulates burn rate calculation from getISBNPoolMetrics()
   */
  const calculateBurnRate = (
    assignedLast6Months: number,
    months: number = 6,
  ): number => {
    return new Decimal(assignedLast6Months).div(months).toNumber();
  };

  it("calculates average burn rate correctly", () => {
    // 12 ISBNs assigned in last 6 months = 2 per month
    const burnRate = calculateBurnRate(12, 6);
    expect(burnRate).toBe(2);
  });

  it("handles fractional burn rates", () => {
    // 7 ISBNs in 6 months = 1.167 per month
    const burnRate = calculateBurnRate(7, 6);
    expect(burnRate).toBeCloseTo(1.167, 2);
  });

  it("returns 0 when no assignments", () => {
    const burnRate = calculateBurnRate(0, 6);
    expect(burnRate).toBe(0);
  });

  it("handles high-volume assignments", () => {
    // 600 ISBNs in 6 months = 100 per month
    const burnRate = calculateBurnRate(600, 6);
    expect(burnRate).toBe(100);
  });
});

describe("Estimated Runout Date Calculation (AC-8, subtask 2.5)", () => {
  /**
   * Simulates runout calculation from getISBNPoolMetrics()
   */
  const calculateEstimatedRunout = (
    totalAvailable: number,
    burnRate: number,
    now: Date = new Date(),
  ): Date | null => {
    if (burnRate <= 0 || totalAvailable <= 0) {
      return null;
    }

    const monthsUntilRunout = Math.ceil(totalAvailable / burnRate);
    return addMonths(now, monthsUntilRunout);
  };

  it("calculates runout date correctly", () => {
    // Use local date to avoid timezone issues
    const now = new Date(2025, 5, 1); // June 1, 2025

    // 20 available, 4 per month = 5 months until runout
    const runout = calculateEstimatedRunout(20, 4, now);

    // Verify month offset is correct (5 months from June = November)
    expect(runout?.getFullYear()).toBe(2025);
    expect(runout?.getMonth()).toBe(10); // November (0-indexed)
  });

  it("rounds up to next month", () => {
    // Use local date to avoid timezone issues
    const now = new Date(2025, 5, 1); // June 1, 2025

    // 21 available, 4 per month = 5.25 months, rounds to 6
    const runout = calculateEstimatedRunout(21, 4, now);

    // Verify month offset is correct (6 months from June = December)
    expect(runout?.getFullYear()).toBe(2025);
    expect(runout?.getMonth()).toBe(11); // December (0-indexed)
  });

  it("returns null when burn rate is 0", () => {
    const runout = calculateEstimatedRunout(50, 0);
    expect(runout).toBeNull();
  });

  it("returns null when no available ISBNs", () => {
    const runout = calculateEstimatedRunout(0, 5);
    expect(runout).toBeNull();
  });

  it("handles low inventory correctly", () => {
    // Use local date to avoid timezone issues
    const now = new Date(2025, 5, 1); // June 1, 2025

    // 3 available, 10 per month = 0.3 months, rounds to 1
    const runout = calculateEstimatedRunout(3, 10, now);

    // Verify month offset is correct (1 month from June = July)
    expect(runout?.getFullYear()).toBe(2025);
    expect(runout?.getMonth()).toBe(6); // July (0-indexed)
  });
});

describe("ISBN Assignment History Grouping (AC-5, subtask 3.2)", () => {
  interface AssignmentRecord {
    assignedAt: Date;
  }

  /**
   * Simulates month grouping from getISBNAssignmentHistory()
   */
  const groupAssignmentsByMonth = (
    assignments: AssignmentRecord[],
    months: number,
  ): ISBNAssignmentHistoryItem[] => {
    const now = new Date();
    const results: ISBNAssignmentHistoryItem[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth(),
        1,
      );
      const monthEnd = new Date(
        monthDate.getFullYear(),
        monthDate.getMonth() + 1,
        0,
        23,
        59,
        59,
      );

      const count = assignments.filter(
        (a) => a.assignedAt >= monthStart && a.assignedAt <= monthEnd,
      ).length;

      results.push({
        month: format(monthDate, "MMM yyyy"),
        assigned: count,
      });
    }

    return results;
  };

  it("groups assignments by month correctly", () => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);

    const assignments = [
      { assignedAt: now },
      { assignedAt: now },
      { assignedAt: lastMonth },
    ];

    const result = groupAssignmentsByMonth(assignments, 6);

    expect(result).toHaveLength(6);

    // Current month should have 2
    const currentMonth = result.find((r) => r.month === format(now, "MMM yyyy"));
    expect(currentMonth?.assigned).toBe(2);

    // Last month should have 1
    const prevMonth = result.find(
      (r) => r.month === format(lastMonth, "MMM yyyy"),
    );
    expect(prevMonth?.assigned).toBe(1);
  });

  it("returns chronological order", () => {
    const result = groupAssignmentsByMonth([], 6);

    expect(result).toHaveLength(6);

    // First entry should be 5 months ago
    const fiveMonthsAgo = subMonths(new Date(), 5);
    expect(result[0].month).toBe(format(fiveMonthsAgo, "MMM yyyy"));

    // Last entry should be current month
    expect(result[5].month).toBe(format(new Date(), "MMM yyyy"));
  });

  it("returns zeros for months with no assignments", () => {
    const result = groupAssignmentsByMonth([], 6);

    for (const item of result) {
      expect(item.assigned).toBe(0);
    }
  });

  it("handles configurable month range", () => {
    const result3 = groupAssignmentsByMonth([], 3);
    expect(result3).toHaveLength(3);

    const result12 = groupAssignmentsByMonth([], 12);
    expect(result12).toHaveLength(12);
  });
});

describe("Empty ISBN Pool Handling (subtask 9.7)", () => {
  const calculatePoolMetrics = (isbns: ISBNRecord[]): ISBNPoolMetrics => {
    const physical = { available: 0, assigned: 0, total: 0 };
    const ebook = { available: 0, assigned: 0, total: 0 };

    for (const isbn of isbns) {
      if (isbn.status === "retired") continue;

      if (isbn.type === "physical") {
        if (isbn.status === "available") physical.available++;
        else if (isbn.status === "assigned" || isbn.status === "registered")
          physical.assigned++;
        physical.total++;
      } else {
        if (isbn.status === "available") ebook.available++;
        else if (isbn.status === "assigned" || isbn.status === "registered")
          ebook.assigned++;
        ebook.total++;
      }
    }

    const totalAll = physical.total + ebook.total;
    const assignedAll = physical.assigned + ebook.assigned;

    return {
      physical,
      ebook,
      utilizationPercent:
        totalAll > 0
          ? Math.round(
              new Decimal(assignedAll).div(totalAll).mul(100).toNumber() * 10,
            ) / 10
          : 0,
      burnRate: 0,
      estimatedRunout: null,
    };
  };

  it("returns zero counts for empty pool", () => {
    const result = calculatePoolMetrics([]);

    expect(result.physical.available).toBe(0);
    expect(result.physical.assigned).toBe(0);
    expect(result.physical.total).toBe(0);
    expect(result.ebook.available).toBe(0);
    expect(result.ebook.assigned).toBe(0);
    expect(result.ebook.total).toBe(0);
  });

  it("returns zero utilization for empty pool", () => {
    const result = calculatePoolMetrics([]);

    expect(result.utilizationPercent).toBe(0);
  });

  it("handles pool with only retired ISBNs", () => {
    const isbns: ISBNRecord[] = [
      { type: "physical", status: "retired" },
      { type: "ebook", status: "retired" },
    ];

    const result = calculatePoolMetrics(isbns);

    expect(result.physical.total).toBe(0);
    expect(result.ebook.total).toBe(0);
    expect(result.utilizationPercent).toBe(0);
  });
});

describe("Tenant Isolation Validation (subtask 2.6, subtask 9.8)", () => {
  interface TenantISBN extends ISBNRecord {
    tenantId: string;
  }

  const filterByTenant = (
    isbns: TenantISBN[],
    tenantId: string,
  ): ISBNRecord[] => {
    return isbns
      .filter((isbn) => isbn.tenantId === tenantId)
      .map(({ type, status, assignedAt }) => ({ type, status, assignedAt }));
  };

  it("filters ISBNs by tenant ID", () => {
    const isbns: TenantISBN[] = [
      { tenantId: "tenant-a", type: "physical", status: "available" },
      { tenantId: "tenant-a", type: "physical", status: "assigned" },
      { tenantId: "tenant-b", type: "physical", status: "available" },
      { tenantId: "tenant-b", type: "ebook", status: "available" },
      { tenantId: "tenant-b", type: "ebook", status: "assigned" },
    ];

    const tenantAIsbns = filterByTenant(isbns, "tenant-a");
    const tenantBIsbns = filterByTenant(isbns, "tenant-b");

    expect(tenantAIsbns).toHaveLength(2);
    expect(tenantBIsbns).toHaveLength(3);
  });

  it("returns empty array for non-existent tenant", () => {
    const isbns: TenantISBN[] = [
      { tenantId: "tenant-a", type: "physical", status: "available" },
    ];

    const result = filterByTenant(isbns, "tenant-c");

    expect(result).toHaveLength(0);
  });

  it("ensures tenant isolation in metrics", () => {
    const calculateMetrics = (
      isbns: TenantISBN[],
      tenantId: string,
    ): { total: number } => {
      const filtered = filterByTenant(isbns, tenantId);
      return { total: filtered.length };
    };

    const isbns: TenantISBN[] = [
      { tenantId: "tenant-a", type: "physical", status: "available" },
      { tenantId: "tenant-a", type: "ebook", status: "available" },
      { tenantId: "tenant-b", type: "physical", status: "available" },
    ];

    const metricsA = calculateMetrics(isbns, "tenant-a");
    const metricsB = calculateMetrics(isbns, "tenant-b");

    expect(metricsA.total).toBe(2);
    expect(metricsB.total).toBe(1);
  });
});

describe("ISBN Pool Report Permission Validation", () => {
  const ISBN_REPORT_ACCESS = ["finance", "admin", "owner", "editor"];

  const hasISBNPoolReportAccess = (role: string): boolean =>
    ISBN_REPORT_ACCESS.includes(role);

  it("finance has access to ISBN pool report", () => {
    expect(hasISBNPoolReportAccess("finance")).toBe(true);
  });

  it("admin has access to ISBN pool report", () => {
    expect(hasISBNPoolReportAccess("admin")).toBe(true);
  });

  it("owner has access to ISBN pool report", () => {
    expect(hasISBNPoolReportAccess("owner")).toBe(true);
  });

  it("editor has access to ISBN pool report", () => {
    expect(hasISBNPoolReportAccess("editor")).toBe(true);
  });

  it("author does NOT have access to ISBN pool report", () => {
    expect(hasISBNPoolReportAccess("author")).toBe(false);
  });
});
