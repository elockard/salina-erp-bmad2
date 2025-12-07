import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for Dashboard Analytics Queries
 *
 * Story: 6.7 - Enhance All Dashboards with Role-Specific Analytics
 * AC: 1-4 (Dashboard data calculations)
 *
 * Tests:
 * - Revenue trend aggregation (AC-1)
 * - Top selling titles calculation (AC-1)
 * - Author performance aggregation (AC-1)
 * - ISBN utilization calculation (AC-1)
 * - Liability trend aggregation (AC-2)
 * - Pending returns urgency calculation (AC-2)
 * - Editor dashboard metrics (AC-3)
 * - Author portal dashboard metrics (AC-4)
 */

describe("Owner/Admin Dashboard Data (AC-1)", () => {
  describe("Revenue Trend Aggregation", () => {
    interface MonthlySale {
      yearMonth: string;
      revenue: string;
    }

    const aggregateRevenueTrend = (
      sales: MonthlySale[],
    ): { month: string; revenue: number }[] => {
      const revenueMap = new Map<string, Decimal>();

      for (const sale of sales) {
        const current = revenueMap.get(sale.yearMonth) ?? new Decimal(0);
        revenueMap.set(sale.yearMonth, current.plus(new Decimal(sale.revenue)));
      }

      return Array.from(revenueMap.entries()).map(([month, revenue]) => ({
        month,
        revenue: revenue.toNumber(),
      }));
    };

    it("aggregates revenue by month correctly", () => {
      const sales: MonthlySale[] = [
        { yearMonth: "2025-01", revenue: "1000.00" },
        { yearMonth: "2025-01", revenue: "500.00" },
        { yearMonth: "2025-02", revenue: "750.00" },
      ];
      const result = aggregateRevenueTrend(sales);

      expect(result.find((r) => r.month === "2025-01")?.revenue).toBe(1500);
      expect(result.find((r) => r.month === "2025-02")?.revenue).toBe(750);
    });

    it("returns empty array for no sales", () => {
      expect(aggregateRevenueTrend([])).toEqual([]);
    });

    it("handles single month with single sale", () => {
      const sales: MonthlySale[] = [
        { yearMonth: "2025-01", revenue: "100.00" },
      ];
      const result = aggregateRevenueTrend(sales);

      expect(result).toHaveLength(1);
      expect(result[0].revenue).toBe(100);
    });
  });

  describe("Top Selling Titles", () => {
    interface TitleSale {
      titleId: string;
      title: string;
      units: number;
      revenue: string;
    }

    const aggregateTopTitles = (
      sales: TitleSale[],
      limit: number = 5,
    ): { titleId: string; title: string; units: number; revenue: number }[] => {
      const titleMap = new Map<
        string,
        { title: string; units: number; revenue: Decimal }
      >();

      for (const sale of sales) {
        const current = titleMap.get(sale.titleId) ?? {
          title: sale.title,
          units: 0,
          revenue: new Decimal(0),
        };
        titleMap.set(sale.titleId, {
          title: sale.title,
          units: current.units + sale.units,
          revenue: current.revenue.plus(new Decimal(sale.revenue)),
        });
      }

      return Array.from(titleMap.entries())
        .map(([titleId, data]) => ({
          titleId,
          title: data.title,
          units: data.units,
          revenue: data.revenue.toNumber(),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    };

    it("returns top 5 titles by revenue", () => {
      const sales: TitleSale[] = [
        { titleId: "t1", title: "Title 1", units: 100, revenue: "1000.00" },
        { titleId: "t2", title: "Title 2", units: 200, revenue: "2000.00" },
        { titleId: "t3", title: "Title 3", units: 300, revenue: "3000.00" },
        { titleId: "t4", title: "Title 4", units: 400, revenue: "4000.00" },
        { titleId: "t5", title: "Title 5", units: 500, revenue: "5000.00" },
        { titleId: "t6", title: "Title 6", units: 600, revenue: "6000.00" },
      ];
      const result = aggregateTopTitles(sales, 5);

      expect(result).toHaveLength(5);
      expect(result[0].revenue).toBe(6000);
      expect(result[4].revenue).toBe(2000);
    });

    it("sorts by revenue descending", () => {
      const sales: TitleSale[] = [
        { titleId: "t1", title: "Low", units: 10, revenue: "100.00" },
        { titleId: "t2", title: "High", units: 50, revenue: "500.00" },
        { titleId: "t3", title: "Mid", units: 30, revenue: "300.00" },
      ];
      const result = aggregateTopTitles(sales);

      expect(result[0].title).toBe("High");
      expect(result[1].title).toBe("Mid");
      expect(result[2].title).toBe("Low");
    });

    it("aggregates multiple sales of same title", () => {
      const sales: TitleSale[] = [
        { titleId: "t1", title: "Same Title", units: 10, revenue: "100.00" },
        { titleId: "t1", title: "Same Title", units: 20, revenue: "200.00" },
      ];
      const result = aggregateTopTitles(sales);

      expect(result).toHaveLength(1);
      expect(result[0].units).toBe(30);
      expect(result[0].revenue).toBe(300);
    });
  });

  describe("Author Performance", () => {
    interface AuthorRevenue {
      authorId: string;
      name: string;
      revenue: string;
    }

    const aggregateAuthorPerformance = (
      data: AuthorRevenue[],
      limit: number = 5,
    ): { authorId: string; name: string; revenue: number }[] => {
      const authorMap = new Map<string, { name: string; revenue: Decimal }>();

      for (const item of data) {
        const current = authorMap.get(item.authorId) ?? {
          name: item.name,
          revenue: new Decimal(0),
        };
        authorMap.set(item.authorId, {
          name: item.name,
          revenue: current.revenue.plus(new Decimal(item.revenue)),
        });
      }

      return Array.from(authorMap.entries())
        .map(([authorId, data]) => ({
          authorId,
          name: data.name,
          revenue: data.revenue.toNumber(),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, limit);
    };

    it("ranks authors by revenue", () => {
      const data: AuthorRevenue[] = [
        { authorId: "a1", name: "Author Low", revenue: "100.00" },
        { authorId: "a2", name: "Author High", revenue: "1000.00" },
        { authorId: "a3", name: "Author Mid", revenue: "500.00" },
      ];
      const result = aggregateAuthorPerformance(data);

      expect(result[0].name).toBe("Author High");
      expect(result[1].name).toBe("Author Mid");
      expect(result[2].name).toBe("Author Low");
    });

    it("limits to specified count", () => {
      const data: AuthorRevenue[] = Array.from({ length: 10 }, (_, i) => ({
        authorId: `a${i}`,
        name: `Author ${i}`,
        revenue: `${i * 100}.00`,
      }));
      const result = aggregateAuthorPerformance(data, 3);

      expect(result).toHaveLength(3);
    });
  });

  describe("ISBN Utilization Trend", () => {
    const calculateUtilization = (
      assignedCount: number,
      totalCount: number,
    ): number => {
      if (totalCount === 0) return 0;
      return new Decimal(assignedCount)
        .div(totalCount)
        .mul(100)
        .toDecimalPlaces(1)
        .toNumber();
    };

    it("calculates utilization percentage correctly", () => {
      expect(calculateUtilization(50, 100)).toBe(50);
      expect(calculateUtilization(25, 100)).toBe(25);
      expect(calculateUtilization(75, 100)).toBe(75);
    });

    it("returns 0 for zero total", () => {
      expect(calculateUtilization(0, 0)).toBe(0);
    });

    it("handles fractional percentages", () => {
      expect(calculateUtilization(33, 100)).toBe(33);
      expect(calculateUtilization(1, 3)).toBeCloseTo(33.3, 1);
    });

    it("returns 100 for fully utilized", () => {
      expect(calculateUtilization(100, 100)).toBe(100);
    });
  });
});

describe("Finance Dashboard Data (AC-2)", () => {
  describe("Liability Trend Aggregation", () => {
    interface MonthlyLiability {
      yearMonth: string;
      liability: string;
    }

    const aggregateLiabilityTrend = (
      data: MonthlyLiability[],
    ): { month: string; liability: number }[] => {
      const liabilityMap = new Map<string, Decimal>();

      for (const item of data) {
        const current = liabilityMap.get(item.yearMonth) ?? new Decimal(0);
        liabilityMap.set(
          item.yearMonth,
          current.plus(new Decimal(item.liability)),
        );
      }

      return Array.from(liabilityMap.entries()).map(([month, liability]) => ({
        month,
        liability: liability.toNumber(),
      }));
    };

    it("aggregates liability by month correctly", () => {
      const data: MonthlyLiability[] = [
        { yearMonth: "2025-01", liability: "1000.00" },
        { yearMonth: "2025-01", liability: "500.00" },
        { yearMonth: "2025-02", liability: "750.00" },
      ];
      const result = aggregateLiabilityTrend(data);

      expect(result.find((r) => r.month === "2025-01")?.liability).toBe(1500);
      expect(result.find((r) => r.month === "2025-02")?.liability).toBe(750);
    });
  });

  describe("Pending Returns Urgency", () => {
    interface Return {
      status: string;
      createdAt: Date;
    }

    const calculatePendingUrgency = (
      returns: Return[],
      now: Date = new Date(),
    ): { count: number; urgent: number } => {
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const pending = returns.filter((r) => r.status === "pending");
      const urgent = pending.filter((r) => r.createdAt < sevenDaysAgo);

      return {
        count: pending.length,
        urgent: urgent.length,
      };
    };

    it("counts total pending returns", () => {
      const now = new Date();
      const returns: Return[] = [
        { status: "pending", createdAt: now },
        { status: "pending", createdAt: now },
        { status: "approved", createdAt: now },
      ];
      const result = calculatePendingUrgency(returns, now);

      expect(result.count).toBe(2);
    });

    it("identifies urgent returns (7+ days old)", () => {
      const now = new Date();
      const oldDate = new Date(now);
      oldDate.setDate(oldDate.getDate() - 10);

      const returns: Return[] = [
        { status: "pending", createdAt: now },
        { status: "pending", createdAt: oldDate },
        { status: "pending", createdAt: oldDate },
      ];
      const result = calculatePendingUrgency(returns, now);

      expect(result.count).toBe(3);
      expect(result.urgent).toBe(2);
    });

    it("returns zeros for empty array", () => {
      const result = calculatePendingUrgency([]);

      expect(result.count).toBe(0);
      expect(result.urgent).toBe(0);
    });
  });

  describe("Top Authors by Royalty", () => {
    interface AuthorRoyalty {
      authorId: string;
      name: string;
      amount: string;
    }

    const aggregateTopAuthors = (
      data: AuthorRoyalty[],
      limit: number = 5,
    ): { authorId: string; name: string; amount: number }[] => {
      const authorMap = new Map<string, { name: string; amount: Decimal }>();

      for (const item of data) {
        const current = authorMap.get(item.authorId) ?? {
          name: item.name,
          amount: new Decimal(0),
        };
        authorMap.set(item.authorId, {
          name: item.name,
          amount: current.amount.plus(new Decimal(item.amount)),
        });
      }

      return Array.from(authorMap.entries())
        .map(([authorId, data]) => ({
          authorId,
          name: data.name,
          amount: data.amount.toNumber(),
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, limit);
    };

    it("ranks authors by royalty amount", () => {
      const data: AuthorRoyalty[] = [
        { authorId: "a1", name: "Low", amount: "100.00" },
        { authorId: "a2", name: "High", amount: "1000.00" },
        { authorId: "a3", name: "Mid", amount: "500.00" },
      ];
      const result = aggregateTopAuthors(data);

      expect(result[0].name).toBe("High");
      expect(result[1].name).toBe("Mid");
      expect(result[2].name).toBe("Low");
    });
  });
});

describe("Editor Dashboard Data (AC-3)", () => {
  describe("Title Counts", () => {
    interface Title {
      titleId: string;
      assignedByUserId: string;
      assignedAt: Date;
    }

    const countMyTitlesThisQuarter = (
      titles: Title[],
      userId: string,
      quarterStart: Date,
    ): number => {
      return titles.filter(
        (t) => t.assignedByUserId === userId && t.assignedAt >= quarterStart,
      ).length;
    };

    it("counts titles assigned by user this quarter", () => {
      const now = new Date();
      const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );

      const titles: Title[] = [
        { titleId: "t1", assignedByUserId: "user1", assignedAt: now },
        { titleId: "t2", assignedByUserId: "user1", assignedAt: now },
        { titleId: "t3", assignedByUserId: "user2", assignedAt: now },
      ];
      const result = countMyTitlesThisQuarter(titles, "user1", quarterStart);

      expect(result).toBe(2);
    });

    it("excludes titles from previous quarters", () => {
      const now = new Date();
      const quarterStart = new Date(
        now.getFullYear(),
        Math.floor(now.getMonth() / 3) * 3,
        1,
      );
      const lastQuarter = new Date(quarterStart);
      lastQuarter.setMonth(lastQuarter.getMonth() - 3);

      const titles: Title[] = [
        { titleId: "t1", assignedByUserId: "user1", assignedAt: now },
        { titleId: "t2", assignedByUserId: "user1", assignedAt: lastQuarter },
      ];
      const result = countMyTitlesThisQuarter(titles, "user1", quarterStart);

      expect(result).toBe(1);
    });
  });

  describe("ISBN Assignment Counts", () => {
    interface ISBN {
      isbnId: string;
      assignedByUserId: string;
    }

    const countMyIsbnAssignments = (isbns: ISBN[], userId: string): number => {
      return isbns.filter((isbn) => isbn.assignedByUserId === userId).length;
    };

    it("counts ISBNs assigned by user", () => {
      const isbns: ISBN[] = [
        { isbnId: "isbn1", assignedByUserId: "user1" },
        { isbnId: "isbn2", assignedByUserId: "user1" },
        { isbnId: "isbn3", assignedByUserId: "user2" },
      ];
      const result = countMyIsbnAssignments(isbns, "user1");

      expect(result).toBe(2);
    });

    it("returns 0 for no assignments", () => {
      const isbns: ISBN[] = [{ isbnId: "isbn1", assignedByUserId: "user2" }];
      const result = countMyIsbnAssignments(isbns, "user1");

      expect(result).toBe(0);
    });
  });
});

describe("Author Portal Dashboard Data (AC-4)", () => {
  describe("Earnings Timeline", () => {
    interface QuarterlyEarning {
      quarter: string;
      earnings: string;
    }

    const aggregateEarnings = (
      data: QuarterlyEarning[],
    ): { quarter: string; earnings: number }[] => {
      const earningsMap = new Map<string, Decimal>();

      for (const item of data) {
        const current = earningsMap.get(item.quarter) ?? new Decimal(0);
        earningsMap.set(item.quarter, current.plus(new Decimal(item.earnings)));
      }

      return Array.from(earningsMap.entries())
        .map(([quarter, earnings]) => ({
          quarter,
          earnings: earnings.toNumber(),
        }))
        .sort((a, b) => a.quarter.localeCompare(b.quarter));
    };

    it("aggregates earnings by quarter", () => {
      const data: QuarterlyEarning[] = [
        { quarter: "2025-Q1", earnings: "1000.00" },
        { quarter: "2025-Q1", earnings: "500.00" },
        { quarter: "2025-Q2", earnings: "750.00" },
      ];
      const result = aggregateEarnings(data);

      expect(result.find((r) => r.quarter === "2025-Q1")?.earnings).toBe(1500);
      expect(result.find((r) => r.quarter === "2025-Q2")?.earnings).toBe(750);
    });

    it("sorts quarters chronologically", () => {
      const data: QuarterlyEarning[] = [
        { quarter: "2025-Q3", earnings: "300.00" },
        { quarter: "2025-Q1", earnings: "100.00" },
        { quarter: "2025-Q2", earnings: "200.00" },
      ];
      const result = aggregateEarnings(data);

      expect(result[0].quarter).toBe("2025-Q1");
      expect(result[1].quarter).toBe("2025-Q2");
      expect(result[2].quarter).toBe("2025-Q3");
    });
  });

  describe("Advance Recoupment Progress", () => {
    interface Contract {
      advanceAmount: string;
      advanceRecouped: string;
    }

    const calculateAdvanceProgress = (
      contracts: Contract[],
    ): { total: number; recouped: number; remaining: number } => {
      let total = new Decimal(0);
      let recouped = new Decimal(0);

      for (const contract of contracts) {
        total = total.plus(new Decimal(contract.advanceAmount));
        recouped = recouped.plus(new Decimal(contract.advanceRecouped));
      }

      return {
        total: total.toNumber(),
        recouped: recouped.toNumber(),
        remaining: total.minus(recouped).toNumber(),
      };
    };

    it("calculates total advance correctly", () => {
      const contracts: Contract[] = [
        { advanceAmount: "5000.00", advanceRecouped: "1000.00" },
        { advanceAmount: "3000.00", advanceRecouped: "500.00" },
      ];
      const result = calculateAdvanceProgress(contracts);

      expect(result.total).toBe(8000);
    });

    it("calculates recouped amount correctly", () => {
      const contracts: Contract[] = [
        { advanceAmount: "5000.00", advanceRecouped: "1000.00" },
        { advanceAmount: "3000.00", advanceRecouped: "500.00" },
      ];
      const result = calculateAdvanceProgress(contracts);

      expect(result.recouped).toBe(1500);
    });

    it("calculates remaining amount correctly", () => {
      const contracts: Contract[] = [
        { advanceAmount: "5000.00", advanceRecouped: "1000.00" },
        { advanceAmount: "3000.00", advanceRecouped: "500.00" },
      ];
      const result = calculateAdvanceProgress(contracts);

      expect(result.remaining).toBe(6500);
    });

    it("returns zeros for no contracts", () => {
      const result = calculateAdvanceProgress([]);

      expect(result.total).toBe(0);
      expect(result.recouped).toBe(0);
      expect(result.remaining).toBe(0);
    });

    it("handles fully recouped advance", () => {
      const contracts: Contract[] = [
        { advanceAmount: "1000.00", advanceRecouped: "1000.00" },
      ];
      const result = calculateAdvanceProgress(contracts);

      expect(result.remaining).toBe(0);
    });
  });

  describe("Best Performing Titles", () => {
    interface TitlePerformance {
      titleId: string;
      title: string;
      units: number;
    }

    const aggregateBestTitles = (
      data: TitlePerformance[],
      limit: number = 5,
    ): { titleId: string; title: string; units: number }[] => {
      const titleMap = new Map<string, { title: string; units: number }>();

      for (const item of data) {
        const current = titleMap.get(item.titleId) ?? {
          title: item.title,
          units: 0,
        };
        titleMap.set(item.titleId, {
          title: item.title,
          units: current.units + item.units,
        });
      }

      return Array.from(titleMap.entries())
        .map(([titleId, data]) => ({
          titleId,
          title: data.title,
          units: data.units,
        }))
        .sort((a, b) => b.units - a.units)
        .slice(0, limit);
    };

    it("ranks titles by units sold", () => {
      const data: TitlePerformance[] = [
        { titleId: "t1", title: "Low", units: 10 },
        { titleId: "t2", title: "High", units: 100 },
        { titleId: "t3", title: "Mid", units: 50 },
      ];
      const result = aggregateBestTitles(data);

      expect(result[0].title).toBe("High");
      expect(result[1].title).toBe("Mid");
      expect(result[2].title).toBe("Low");
    });

    it("limits to specified count", () => {
      const data: TitlePerformance[] = Array.from({ length: 10 }, (_, i) => ({
        titleId: `t${i}`,
        title: `Title ${i}`,
        units: i * 10,
      }));
      const result = aggregateBestTitles(data, 3);

      expect(result).toHaveLength(3);
    });

    it("aggregates units from multiple sales", () => {
      const data: TitlePerformance[] = [
        { titleId: "t1", title: "Same Title", units: 10 },
        { titleId: "t1", title: "Same Title", units: 20 },
      ];
      const result = aggregateBestTitles(data);

      expect(result).toHaveLength(1);
      expect(result[0].units).toBe(30);
    });
  });
});

describe("Role-Based Dashboard Access", () => {
  const OWNER_ADMIN_ACCESS = ["owner", "admin"];
  const FINANCE_ACCESS = ["finance", "admin", "owner"];
  const EDITOR_ACCESS = ["editor", "finance", "admin", "owner"];

  const hasOwnerAdminAccess = (role: string): boolean =>
    OWNER_ADMIN_ACCESS.includes(role);
  const hasFinanceAccess = (role: string): boolean =>
    FINANCE_ACCESS.includes(role);
  const hasEditorAccess = (role: string): boolean =>
    EDITOR_ACCESS.includes(role);

  it("owner has access to owner/admin dashboard", () => {
    expect(hasOwnerAdminAccess("owner")).toBe(true);
  });

  it("admin has access to owner/admin dashboard", () => {
    expect(hasOwnerAdminAccess("admin")).toBe(true);
  });

  it("finance does NOT have access to owner/admin dashboard", () => {
    expect(hasOwnerAdminAccess("finance")).toBe(false);
  });

  it("finance has access to finance dashboard", () => {
    expect(hasFinanceAccess("finance")).toBe(true);
  });

  it("editor has access to editor dashboard", () => {
    expect(hasEditorAccess("editor")).toBe(true);
  });

  it("author does NOT have access to internal dashboards", () => {
    expect(hasOwnerAdminAccess("author")).toBe(false);
    expect(hasFinanceAccess("author")).toBe(false);
    expect(hasEditorAccess("author")).toBe(false);
  });
});
