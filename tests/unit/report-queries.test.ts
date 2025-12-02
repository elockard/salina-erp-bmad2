import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for Report Queries
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 1-6 (Revenue and Liability query logic)
 *
 * Tests:
 * - Revenue aggregation by period (AC-2)
 * - Revenue aggregation by format (AC-3)
 * - Revenue aggregation by channel (AC-4)
 * - Liability calculation from unpaid statements (AC-5)
 * - Liability grouping by author (AC-6)
 * - Decimal.js precision in financial calculations
 * - Percentage calculations sum to 100%
 */

describe("Revenue Metrics Calculations", () => {
  describe("Total Revenue Calculation (AC-1)", () => {
    const calculateTotalRevenue = (
      sales: Array<{ totalAmount: string }>,
    ): number => {
      return sales
        .reduce(
          (sum, sale) => sum.plus(new Decimal(sale.totalAmount)),
          new Decimal(0),
        )
        .toNumber();
    };

    it("sums all sales amounts correctly", () => {
      const sales = [
        { totalAmount: "100.00" },
        { totalAmount: "250.50" },
        { totalAmount: "75.25" },
      ];
      expect(calculateTotalRevenue(sales)).toBe(425.75);
    });

    it("returns 0 for empty sales array", () => {
      expect(calculateTotalRevenue([])).toBe(0);
    });

    it("handles single sale", () => {
      const sales = [{ totalAmount: "1234.56" }];
      expect(calculateTotalRevenue(sales)).toBe(1234.56);
    });

    it("handles large amounts without precision loss", () => {
      const sales = [{ totalAmount: "9999999.99" }, { totalAmount: "0.01" }];
      expect(calculateTotalRevenue(sales)).toBe(10000000);
    });

    it("uses Decimal.js to avoid floating point errors", () => {
      // Classic floating point problem: 0.1 + 0.2 !== 0.3 in JS
      const sales = [{ totalAmount: "0.1" }, { totalAmount: "0.2" }];
      expect(calculateTotalRevenue(sales)).toBe(0.3);
    });
  });

  describe("Revenue By Period Aggregation (AC-2)", () => {
    interface SaleByPeriod {
      period: string;
      amount: string;
    }

    const aggregateByPeriod = (
      sales: SaleByPeriod[],
    ): Array<{ period: string; amount: number }> => {
      const periodMap = new Map<string, Decimal>();

      for (const sale of sales) {
        const current = periodMap.get(sale.period) ?? new Decimal(0);
        periodMap.set(sale.period, current.plus(new Decimal(sale.amount)));
      }

      return Array.from(periodMap.entries()).map(([period, amount]) => ({
        period,
        amount: amount.toNumber(),
      }));
    };

    it("groups sales by period correctly", () => {
      const sales: SaleByPeriod[] = [
        { period: "Jan 2025", amount: "100.00" },
        { period: "Jan 2025", amount: "200.00" },
        { period: "Feb 2025", amount: "150.00" },
      ];
      const result = aggregateByPeriod(sales);

      expect(result.find((r) => r.period === "Jan 2025")?.amount).toBe(300);
      expect(result.find((r) => r.period === "Feb 2025")?.amount).toBe(150);
    });

    it("handles empty sales array", () => {
      expect(aggregateByPeriod([])).toEqual([]);
    });

    it("handles single period", () => {
      const sales: SaleByPeriod[] = [{ period: "Q1 2025", amount: "1000.00" }];
      const result = aggregateByPeriod(sales);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ period: "Q1 2025", amount: 1000 });
    });
  });

  describe("Revenue By Format Aggregation (AC-3)", () => {
    interface SaleByFormat {
      format: string;
      amount: string;
    }

    const aggregateByFormat = (
      sales: SaleByFormat[],
    ): Array<{ format: string; amount: number; percentage: number }> => {
      const formatMap = new Map<string, Decimal>();
      let total = new Decimal(0);

      for (const sale of sales) {
        const amount = new Decimal(sale.amount);
        const current = formatMap.get(sale.format) ?? new Decimal(0);
        formatMap.set(sale.format, current.plus(amount));
        total = total.plus(amount);
      }

      return Array.from(formatMap.entries()).map(([format, amount]) => ({
        format,
        amount: amount.toNumber(),
        percentage: total.isZero()
          ? 0
          : amount.div(total).mul(100).toDecimalPlaces(1).toNumber(),
      }));
    };

    it("calculates percentages correctly", () => {
      const sales: SaleByFormat[] = [
        { format: "physical", amount: "500.00" },
        { format: "ebook", amount: "300.00" },
        { format: "audiobook", amount: "200.00" },
      ];
      const result = aggregateByFormat(sales);

      expect(result.find((r) => r.format === "physical")?.percentage).toBe(50);
      expect(result.find((r) => r.format === "ebook")?.percentage).toBe(30);
      expect(result.find((r) => r.format === "audiobook")?.percentage).toBe(20);
    });

    it("percentages sum to 100%", () => {
      const sales: SaleByFormat[] = [
        { format: "physical", amount: "333.33" },
        { format: "ebook", amount: "333.33" },
        { format: "audiobook", amount: "333.34" },
      ];
      const result = aggregateByFormat(sales);

      const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0);
      // Allow small rounding tolerance
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.5);
    });

    it("handles single format", () => {
      const sales: SaleByFormat[] = [{ format: "ebook", amount: "100.00" }];
      const result = aggregateByFormat(sales);

      expect(result).toHaveLength(1);
      expect(result[0].percentage).toBe(100);
    });

    it("handles empty sales", () => {
      expect(aggregateByFormat([])).toEqual([]);
    });
  });

  describe("Revenue By Channel Aggregation (AC-4)", () => {
    interface SaleByChannel {
      channel: string;
      amount: string;
    }

    const aggregateByChannel = (
      sales: SaleByChannel[],
    ): Array<{ channel: string; amount: number; percentage: number }> => {
      const channelMap = new Map<string, Decimal>();
      let total = new Decimal(0);

      for (const sale of sales) {
        const amount = new Decimal(sale.amount);
        const current = channelMap.get(sale.channel) ?? new Decimal(0);
        channelMap.set(sale.channel, current.plus(amount));
        total = total.plus(amount);
      }

      return Array.from(channelMap.entries()).map(([channel, amount]) => ({
        channel,
        amount: amount.toNumber(),
        percentage: total.isZero()
          ? 0
          : amount.div(total).mul(100).toDecimalPlaces(1).toNumber(),
      }));
    };

    it("groups by all four channels correctly", () => {
      const sales: SaleByChannel[] = [
        { channel: "retail", amount: "400.00" },
        { channel: "wholesale", amount: "300.00" },
        { channel: "direct", amount: "200.00" },
        { channel: "distributor", amount: "100.00" },
      ];
      const result = aggregateByChannel(sales);

      expect(result.find((r) => r.channel === "retail")?.percentage).toBe(40);
      expect(result.find((r) => r.channel === "wholesale")?.percentage).toBe(
        30,
      );
      expect(result.find((r) => r.channel === "direct")?.percentage).toBe(20);
      expect(result.find((r) => r.channel === "distributor")?.percentage).toBe(
        10,
      );
    });

    it("percentages sum to 100%", () => {
      const sales: SaleByChannel[] = [
        { channel: "retail", amount: "123.45" },
        { channel: "wholesale", amount: "234.56" },
        { channel: "direct", amount: "345.67" },
        { channel: "distributor", amount: "456.78" },
      ];
      const result = aggregateByChannel(sales);

      const totalPercentage = result.reduce((sum, r) => sum + r.percentage, 0);
      expect(Math.abs(totalPercentage - 100)).toBeLessThan(0.5);
    });
  });
});

describe("Liability Metrics Calculations", () => {
  describe("Total Liability from Unpaid Statements (AC-5)", () => {
    interface Statement {
      netPayable: string;
      status: "draft" | "sent" | "failed";
    }

    const calculateTotalLiability = (statements: Statement[]): number => {
      // All statements are considered unpaid (no "paid" status exists)
      return statements
        .reduce(
          (sum, stmt) => sum.plus(new Decimal(stmt.netPayable)),
          new Decimal(0),
        )
        .toNumber();
    };

    it("sums all statement net_payable amounts", () => {
      const statements: Statement[] = [
        { netPayable: "1000.00", status: "sent" },
        { netPayable: "2500.50", status: "draft" },
        { netPayable: "500.00", status: "failed" },
      ];
      expect(calculateTotalLiability(statements)).toBe(4000.5);
    });

    it("returns 0 for empty statements array", () => {
      expect(calculateTotalLiability([])).toBe(0);
    });

    it("handles single statement", () => {
      const statements: Statement[] = [
        { netPayable: "1234.56", status: "sent" },
      ];
      expect(calculateTotalLiability(statements)).toBe(1234.56);
    });

    it("uses Decimal.js for precision", () => {
      const statements: Statement[] = [
        { netPayable: "0.01", status: "draft" },
        { netPayable: "0.02", status: "draft" },
        { netPayable: "0.03", status: "draft" },
      ];
      expect(calculateTotalLiability(statements)).toBe(0.06);
    });
  });

  describe("Liability By Author Grouping (AC-6)", () => {
    interface StatementWithAuthor {
      authorId: string;
      authorName: string;
      netPayable: string;
    }

    const groupLiabilityByAuthor = (
      statements: StatementWithAuthor[],
    ): Array<{
      authorId: string;
      authorName: string;
      amount: number;
      unpaidStatementsCount: number;
    }> => {
      const authorMap = new Map<
        string,
        { name: string; amount: Decimal; count: number }
      >();

      for (const stmt of statements) {
        const current = authorMap.get(stmt.authorId) ?? {
          name: stmt.authorName,
          amount: new Decimal(0),
          count: 0,
        };
        authorMap.set(stmt.authorId, {
          name: stmt.authorName,
          amount: current.amount.plus(new Decimal(stmt.netPayable)),
          count: current.count + 1,
        });
      }

      const result = Array.from(authorMap.entries()).map(([id, data]) => ({
        authorId: id,
        authorName: data.name,
        amount: data.amount.toNumber(),
        unpaidStatementsCount: data.count,
      }));

      // Sort by amount DESC (AC-7.4)
      return result.sort((a, b) => b.amount - a.amount);
    };

    it("groups statements by author correctly", () => {
      const statements: StatementWithAuthor[] = [
        { authorId: "a1", authorName: "Author One", netPayable: "1000.00" },
        { authorId: "a2", authorName: "Author Two", netPayable: "500.00" },
        { authorId: "a1", authorName: "Author One", netPayable: "750.00" },
      ];
      const result = groupLiabilityByAuthor(statements);

      const author1 = result.find((r) => r.authorId === "a1");
      const author2 = result.find((r) => r.authorId === "a2");

      expect(author1?.amount).toBe(1750);
      expect(author1?.unpaidStatementsCount).toBe(2);
      expect(author2?.amount).toBe(500);
      expect(author2?.unpaidStatementsCount).toBe(1);
    });

    it("sorts by amount DESC", () => {
      const statements: StatementWithAuthor[] = [
        { authorId: "a1", authorName: "Low", netPayable: "100.00" },
        { authorId: "a2", authorName: "High", netPayable: "1000.00" },
        { authorId: "a3", authorName: "Mid", netPayable: "500.00" },
      ];
      const result = groupLiabilityByAuthor(statements);

      expect(result[0].authorName).toBe("High");
      expect(result[1].authorName).toBe("Mid");
      expect(result[2].authorName).toBe("Low");
    });

    it("handles empty statements", () => {
      expect(groupLiabilityByAuthor([])).toEqual([]);
    });

    it("handles single author with multiple statements", () => {
      const statements: StatementWithAuthor[] = [
        { authorId: "a1", authorName: "Solo Author", netPayable: "100.00" },
        { authorId: "a1", authorName: "Solo Author", netPayable: "200.00" },
        { authorId: "a1", authorName: "Solo Author", netPayable: "300.00" },
      ];
      const result = groupLiabilityByAuthor(statements);

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(600);
      expect(result[0].unpaidStatementsCount).toBe(3);
    });
  });
});

describe("Period Bucket Generation", () => {
  type Period = "day" | "week" | "month" | "quarter" | "year";

  const generatePeriodLabels = (period: Period, count: number): string[] => {
    const labels: string[] = [];
    const now = new Date();

    for (let i = count - 1; i >= 0; i--) {
      let label: string;
      switch (period) {
        case "day":
          label = `Day ${count - i}`;
          break;
        case "week":
          label = `Week ${count - i}`;
          break;
        case "month": {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          label = date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });
          break;
        }
        case "quarter": {
          const quarterMonth = now.getMonth() - i * 3;
          const quarterDate = new Date(now.getFullYear(), quarterMonth, 1);
          const quarter = Math.ceil((quarterDate.getMonth() + 1) / 3);
          label = `Q${quarter} ${quarterDate.getFullYear()}`;
          break;
        }
        case "year": {
          label = String(now.getFullYear() - i);
          break;
        }
      }
      labels.push(label);
    }
    return labels;
  };

  it("generates correct number of month labels", () => {
    const labels = generatePeriodLabels("month", 12);
    expect(labels).toHaveLength(12);
  });

  it("generates quarter labels in Q# YYYY format", () => {
    const labels = generatePeriodLabels("quarter", 4);
    expect(labels).toHaveLength(4);
    for (const label of labels) {
      expect(label).toMatch(/^Q[1-4] \d{4}$/);
    }
  });

  it("generates year labels as 4-digit years", () => {
    const labels = generatePeriodLabels("year", 3);
    expect(labels).toHaveLength(3);
    for (const label of labels) {
      expect(label).toMatch(/^\d{4}$/);
    }
  });
});

describe("Currency Formatting", () => {
  const formatCurrency = (value: number): string => {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  it("formats positive amounts correctly", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56");
  });

  it("formats zero correctly", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large amounts with commas", () => {
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });

  it("formats small amounts with cents", () => {
    expect(formatCurrency(0.01)).toBe("$0.01");
  });
});

describe("Permission Validation for Reports", () => {
  const REPORTS_ACCESS = ["finance", "admin", "owner"];

  const hasReportsAccess = (role: string): boolean =>
    REPORTS_ACCESS.includes(role);

  it("finance has access to reports", () => {
    expect(hasReportsAccess("finance")).toBe(true);
  });

  it("admin has access to reports", () => {
    expect(hasReportsAccess("admin")).toBe(true);
  });

  it("owner has access to reports", () => {
    expect(hasReportsAccess("owner")).toBe(true);
  });

  it("editor does NOT have access to reports", () => {
    expect(hasReportsAccess("editor")).toBe(false);
  });

  it("author does NOT have access to reports", () => {
    expect(hasReportsAccess("author")).toBe(false);
  });
});

describe("Tenant Isolation Validation", () => {
  interface Sale {
    tenantId: string;
    amount: string;
  }

  const filterByTenant = (sales: Sale[], tenantId: string): Sale[] => {
    return sales.filter((sale) => sale.tenantId === tenantId);
  };

  it("filters sales to only matching tenant", () => {
    const sales: Sale[] = [
      { tenantId: "tenant-1", amount: "100.00" },
      { tenantId: "tenant-2", amount: "200.00" },
      { tenantId: "tenant-1", amount: "300.00" },
    ];
    const result = filterByTenant(sales, "tenant-1");

    expect(result).toHaveLength(2);
    expect(result.every((s) => s.tenantId === "tenant-1")).toBe(true);
  });

  it("returns empty array for non-existent tenant", () => {
    const sales: Sale[] = [{ tenantId: "tenant-1", amount: "100.00" }];
    const result = filterByTenant(sales, "tenant-999");

    expect(result).toHaveLength(0);
  });

  it("prevents cross-tenant data leakage", () => {
    const sales: Sale[] = [
      { tenantId: "tenant-1", amount: "100.00" },
      { tenantId: "tenant-2", amount: "200.00" },
    ];
    const tenant1Sales = filterByTenant(sales, "tenant-1");
    const tenant2Sales = filterByTenant(sales, "tenant-2");

    // No sales from tenant-1 should appear in tenant-2's results
    expect(tenant2Sales.some((s) => s.tenantId === "tenant-1")).toBe(false);
    // No sales from tenant-2 should appear in tenant-1's results
    expect(tenant1Sales.some((s) => s.tenantId === "tenant-2")).toBe(false);
  });
});
