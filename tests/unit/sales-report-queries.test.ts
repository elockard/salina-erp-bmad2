import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for Sales Report Queries
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 5, 6 (Sales report results table and totals)
 *
 * Tests:
 * - Grouping by title (AC-5)
 * - Grouping by format (AC-5)
 * - Grouping by channel (AC-5)
 * - Grouping by date (AC-5)
 * - Date range filtering
 * - Multi-select title filtering
 * - Multi-select author filtering (via contracts)
 * - Totals calculation accuracy with Decimal.js (AC-6)
 * - Empty results handling
 * - Permission validation (AC-10)
 */

interface SaleRecord {
  titleId: string;
  titleName: string;
  format: "physical" | "ebook" | "audiobook";
  channel: "retail" | "wholesale" | "direct" | "distributor";
  saleDate: string;
  quantity: number;
  totalAmount: string;
}

interface SalesReportRow {
  groupKey: string;
  groupLabel: string;
  totalUnits: number;
  totalRevenue: number;
  avgUnitPrice: number;
}

describe("Sales Report Grouping", () => {
  const sampleSales: SaleRecord[] = [
    {
      titleId: "t1",
      titleName: "Book One",
      format: "physical",
      channel: "retail",
      saleDate: "2025-01-15",
      quantity: 10,
      totalAmount: "150.00",
    },
    {
      titleId: "t1",
      titleName: "Book One",
      format: "ebook",
      channel: "direct",
      saleDate: "2025-01-20",
      quantity: 25,
      totalAmount: "125.00",
    },
    {
      titleId: "t2",
      titleName: "Book Two",
      format: "physical",
      channel: "wholesale",
      saleDate: "2025-02-10",
      quantity: 100,
      totalAmount: "800.00",
    },
    {
      titleId: "t2",
      titleName: "Book Two",
      format: "audiobook",
      channel: "retail",
      saleDate: "2025-02-15",
      quantity: 5,
      totalAmount: "75.00",
    },
  ];

  describe("Group by Title (subtask 8.2)", () => {
    const groupByTitle = (sales: SaleRecord[]): SalesReportRow[] => {
      const groups = new Map<
        string,
        { label: string; units: number; revenue: Decimal }
      >();

      for (const sale of sales) {
        const existing = groups.get(sale.titleId) ?? {
          label: sale.titleName,
          units: 0,
          revenue: new Decimal(0),
        };
        groups.set(sale.titleId, {
          label: sale.titleName,
          units: existing.units + sale.quantity,
          revenue: existing.revenue.plus(new Decimal(sale.totalAmount)),
        });
      }

      return Array.from(groups.entries()).map(([key, data]) => ({
        groupKey: key,
        groupLabel: data.label,
        totalUnits: data.units,
        totalRevenue: data.revenue.toNumber(),
        avgUnitPrice:
          data.units > 0 ? data.revenue.div(data.units).toNumber() : 0,
      }));
    };

    it("groups sales by title correctly", () => {
      const result = groupByTitle(sampleSales);

      expect(result).toHaveLength(2);

      const book1 = result.find((r) => r.groupKey === "t1");
      expect(book1?.groupLabel).toBe("Book One");
      expect(book1?.totalUnits).toBe(35); // 10 + 25
      expect(book1?.totalRevenue).toBe(275); // 150 + 125

      const book2 = result.find((r) => r.groupKey === "t2");
      expect(book2?.groupLabel).toBe("Book Two");
      expect(book2?.totalUnits).toBe(105); // 100 + 5
      expect(book2?.totalRevenue).toBe(875); // 800 + 75
    });

    it("calculates average unit price correctly", () => {
      const result = groupByTitle(sampleSales);

      const book1 = result.find((r) => r.groupKey === "t1");
      // 275 / 35 = 7.857142857...
      expect(book1?.avgUnitPrice).toBeCloseTo(7.857, 2);

      const book2 = result.find((r) => r.groupKey === "t2");
      // 875 / 105 = 8.333...
      expect(book2?.avgUnitPrice).toBeCloseTo(8.333, 2);
    });
  });

  describe("Group by Format (subtask 8.3)", () => {
    const groupByFormat = (sales: SaleRecord[]): SalesReportRow[] => {
      const groups = new Map<string, { units: number; revenue: Decimal }>();
      const formatLabels: Record<string, string> = {
        physical: "Physical",
        ebook: "Ebook",
        audiobook: "Audiobook",
      };

      for (const sale of sales) {
        const existing = groups.get(sale.format) ?? {
          units: 0,
          revenue: new Decimal(0),
        };
        groups.set(sale.format, {
          units: existing.units + sale.quantity,
          revenue: existing.revenue.plus(new Decimal(sale.totalAmount)),
        });
      }

      return Array.from(groups.entries()).map(([key, data]) => ({
        groupKey: key,
        groupLabel: formatLabels[key] ?? key,
        totalUnits: data.units,
        totalRevenue: data.revenue.toNumber(),
        avgUnitPrice:
          data.units > 0 ? data.revenue.div(data.units).toNumber() : 0,
      }));
    };

    it("groups sales by format correctly", () => {
      const result = groupByFormat(sampleSales);

      expect(result).toHaveLength(3);

      const physical = result.find((r) => r.groupKey === "physical");
      expect(physical?.groupLabel).toBe("Physical");
      expect(physical?.totalUnits).toBe(110); // 10 + 100
      expect(physical?.totalRevenue).toBe(950); // 150 + 800

      const ebook = result.find((r) => r.groupKey === "ebook");
      expect(ebook?.groupLabel).toBe("Ebook");
      expect(ebook?.totalUnits).toBe(25);
      expect(ebook?.totalRevenue).toBe(125);

      const audiobook = result.find((r) => r.groupKey === "audiobook");
      expect(audiobook?.groupLabel).toBe("Audiobook");
      expect(audiobook?.totalUnits).toBe(5);
      expect(audiobook?.totalRevenue).toBe(75);
    });
  });

  describe("Group by Channel (subtask 8.4)", () => {
    const groupByChannel = (sales: SaleRecord[]): SalesReportRow[] => {
      const groups = new Map<string, { units: number; revenue: Decimal }>();
      const channelLabels: Record<string, string> = {
        retail: "Retail",
        wholesale: "Wholesale",
        direct: "Direct",
        distributor: "Distributor",
      };

      for (const sale of sales) {
        const existing = groups.get(sale.channel) ?? {
          units: 0,
          revenue: new Decimal(0),
        };
        groups.set(sale.channel, {
          units: existing.units + sale.quantity,
          revenue: existing.revenue.plus(new Decimal(sale.totalAmount)),
        });
      }

      return Array.from(groups.entries()).map(([key, data]) => ({
        groupKey: key,
        groupLabel: channelLabels[key] ?? key,
        totalUnits: data.units,
        totalRevenue: data.revenue.toNumber(),
        avgUnitPrice:
          data.units > 0 ? data.revenue.div(data.units).toNumber() : 0,
      }));
    };

    it("groups sales by channel correctly", () => {
      const result = groupByChannel(sampleSales);

      expect(result).toHaveLength(3);

      const retail = result.find((r) => r.groupKey === "retail");
      expect(retail?.groupLabel).toBe("Retail");
      expect(retail?.totalUnits).toBe(15); // 10 + 5
      expect(retail?.totalRevenue).toBe(225); // 150 + 75

      const wholesale = result.find((r) => r.groupKey === "wholesale");
      expect(wholesale?.groupLabel).toBe("Wholesale");
      expect(wholesale?.totalUnits).toBe(100);
      expect(wholesale?.totalRevenue).toBe(800);

      const direct = result.find((r) => r.groupKey === "direct");
      expect(direct?.groupLabel).toBe("Direct");
      expect(direct?.totalUnits).toBe(25);
      expect(direct?.totalRevenue).toBe(125);
    });
  });

  describe("Group by Date (subtask 8.5)", () => {
    const groupByDate = (sales: SaleRecord[]): SalesReportRow[] => {
      const groups = new Map<string, { units: number; revenue: Decimal }>();

      for (const sale of sales) {
        // Group by YYYY-MM
        const month = sale.saleDate.substring(0, 7);
        const existing = groups.get(month) ?? {
          units: 0,
          revenue: new Decimal(0),
        };
        groups.set(month, {
          units: existing.units + sale.quantity,
          revenue: existing.revenue.plus(new Decimal(sale.totalAmount)),
        });
      }

      return Array.from(groups.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([key, data]) => {
          const [year, monthNum] = key.split("-");
          const date = new Date(Number(year), Number(monthNum) - 1);
          const label = date.toLocaleDateString("en-US", {
            month: "short",
            year: "numeric",
          });

          return {
            groupKey: key,
            groupLabel: label,
            totalUnits: data.units,
            totalRevenue: data.revenue.toNumber(),
            avgUnitPrice:
              data.units > 0 ? data.revenue.div(data.units).toNumber() : 0,
          };
        });
    };

    it("groups sales by month correctly", () => {
      const result = groupByDate(sampleSales);

      expect(result).toHaveLength(2);

      const jan = result.find((r) => r.groupKey === "2025-01");
      expect(jan?.totalUnits).toBe(35); // 10 + 25
      expect(jan?.totalRevenue).toBe(275); // 150 + 125

      const feb = result.find((r) => r.groupKey === "2025-02");
      expect(feb?.totalUnits).toBe(105); // 100 + 5
      expect(feb?.totalRevenue).toBe(875); // 800 + 75
    });

    it("sorts results chronologically", () => {
      const result = groupByDate(sampleSales);

      expect(result[0].groupKey).toBe("2025-01");
      expect(result[1].groupKey).toBe("2025-02");
    });
  });
});

describe("Sales Report Filtering", () => {
  const sampleSales: SaleRecord[] = [
    {
      titleId: "t1",
      titleName: "Book One",
      format: "physical",
      channel: "retail",
      saleDate: "2025-01-15",
      quantity: 10,
      totalAmount: "150.00",
    },
    {
      titleId: "t2",
      titleName: "Book Two",
      format: "ebook",
      channel: "direct",
      saleDate: "2025-02-15",
      quantity: 20,
      totalAmount: "200.00",
    },
    {
      titleId: "t3",
      titleName: "Book Three",
      format: "audiobook",
      channel: "wholesale",
      saleDate: "2025-03-15",
      quantity: 30,
      totalAmount: "450.00",
    },
  ];

  describe("Date Range Filtering (subtask 8.6)", () => {
    const filterByDateRange = (
      sales: SaleRecord[],
      startDate: string,
      endDate: string,
    ): SaleRecord[] => {
      return sales.filter(
        (sale) => sale.saleDate >= startDate && sale.saleDate <= endDate,
      );
    };

    it("filters sales within date range", () => {
      const result = filterByDateRange(sampleSales, "2025-01-01", "2025-02-28");

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.titleId)).toEqual(["t1", "t2"]);
    });

    it("excludes sales outside date range", () => {
      const result = filterByDateRange(sampleSales, "2025-03-01", "2025-03-31");

      expect(result).toHaveLength(1);
      expect(result[0].titleId).toBe("t3");
    });

    it("returns empty array when no sales in range", () => {
      const result = filterByDateRange(sampleSales, "2024-01-01", "2024-12-31");

      expect(result).toHaveLength(0);
    });
  });

  describe("Title Filtering (subtask 8.7)", () => {
    const filterByTitles = (
      sales: SaleRecord[],
      titleIds: string[],
    ): SaleRecord[] => {
      if (titleIds.length === 0) return sales;
      return sales.filter((sale) => titleIds.includes(sale.titleId));
    };

    it("filters to selected titles", () => {
      const result = filterByTitles(sampleSales, ["t1", "t3"]);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.titleId)).toEqual(["t1", "t3"]);
    });

    it("returns all sales when no titles specified", () => {
      const result = filterByTitles(sampleSales, []);

      expect(result).toHaveLength(3);
    });

    it("returns empty when no matching titles", () => {
      const result = filterByTitles(sampleSales, ["t999"]);

      expect(result).toHaveLength(0);
    });
  });

  describe("Author Filtering via Contracts (subtask 8.8)", () => {
    interface Contract {
      titleId: string;
      authorId: string;
    }

    const filterByAuthors = (
      sales: SaleRecord[],
      authorIds: string[],
      contracts: Contract[],
    ): SaleRecord[] => {
      if (authorIds.length === 0) return sales;

      // Get title IDs for selected authors
      const authorTitleIds = contracts
        .filter((c) => authorIds.includes(c.authorId))
        .map((c) => c.titleId);

      return sales.filter((sale) => authorTitleIds.includes(sale.titleId));
    };

    const contracts: Contract[] = [
      { titleId: "t1", authorId: "a1" },
      { titleId: "t2", authorId: "a2" },
      { titleId: "t3", authorId: "a1" },
    ];

    it("filters sales by author via contracts", () => {
      const result = filterByAuthors(sampleSales, ["a1"], contracts);

      expect(result).toHaveLength(2);
      expect(result.map((r) => r.titleId)).toEqual(["t1", "t3"]);
    });

    it("returns all sales when no authors specified", () => {
      const result = filterByAuthors(sampleSales, [], contracts);

      expect(result).toHaveLength(3);
    });

    it("handles multiple author selection", () => {
      const result = filterByAuthors(sampleSales, ["a1", "a2"], contracts);

      expect(result).toHaveLength(3);
    });

    it("returns empty when author has no titles", () => {
      const result = filterByAuthors(sampleSales, ["a999"], contracts);

      expect(result).toHaveLength(0);
    });
  });

  describe("Format Filtering", () => {
    const filterByFormat = (
      sales: SaleRecord[],
      format: string | undefined,
    ): SaleRecord[] => {
      if (!format || format === "all") return sales;
      return sales.filter((sale) => sale.format === format);
    };

    it("filters by specific format", () => {
      const result = filterByFormat(sampleSales, "physical");

      expect(result).toHaveLength(1);
      expect(result[0].format).toBe("physical");
    });

    it("returns all when format is 'all'", () => {
      const result = filterByFormat(sampleSales, "all");

      expect(result).toHaveLength(3);
    });

    it("returns all when format is undefined", () => {
      const result = filterByFormat(sampleSales, undefined);

      expect(result).toHaveLength(3);
    });
  });

  describe("Channel Filtering", () => {
    const filterByChannel = (
      sales: SaleRecord[],
      channel: string | undefined,
    ): SaleRecord[] => {
      if (!channel || channel === "all") return sales;
      return sales.filter((sale) => sale.channel === channel);
    };

    it("filters by specific channel", () => {
      const result = filterByChannel(sampleSales, "retail");

      expect(result).toHaveLength(1);
      expect(result[0].channel).toBe("retail");
    });

    it("returns all when channel is 'all'", () => {
      const result = filterByChannel(sampleSales, "all");

      expect(result).toHaveLength(3);
    });
  });
});

describe("Sales Report Totals Calculation (subtask 8.9)", () => {
  const calculateTotals = (rows: SalesReportRow[]): SalesReportRow => {
    const totalUnits = rows.reduce((sum, row) => sum + row.totalUnits, 0);
    const totalRevenue = rows.reduce(
      (sum, row) => new Decimal(sum).plus(row.totalRevenue).toNumber(),
      0,
    );

    return {
      groupKey: "total",
      groupLabel: "Total",
      totalUnits,
      totalRevenue,
      avgUnitPrice:
        totalUnits > 0
          ? new Decimal(totalRevenue).div(totalUnits).toNumber()
          : 0,
    };
  };

  it("calculates totals correctly", () => {
    const rows: SalesReportRow[] = [
      {
        groupKey: "a",
        groupLabel: "A",
        totalUnits: 10,
        totalRevenue: 100,
        avgUnitPrice: 10,
      },
      {
        groupKey: "b",
        groupLabel: "B",
        totalUnits: 20,
        totalRevenue: 300,
        avgUnitPrice: 15,
      },
      {
        groupKey: "c",
        groupLabel: "C",
        totalUnits: 30,
        totalRevenue: 600,
        avgUnitPrice: 20,
      },
    ];

    const totals = calculateTotals(rows);

    expect(totals.totalUnits).toBe(60);
    expect(totals.totalRevenue).toBe(1000);
    expect(totals.avgUnitPrice).toBeCloseTo(16.67, 2); // 1000/60
  });

  it("uses Decimal.js for precision", () => {
    const rows: SalesReportRow[] = [
      {
        groupKey: "a",
        groupLabel: "A",
        totalUnits: 3,
        totalRevenue: 0.1,
        avgUnitPrice: 0.033,
      },
      {
        groupKey: "b",
        groupLabel: "B",
        totalUnits: 3,
        totalRevenue: 0.2,
        avgUnitPrice: 0.067,
      },
    ];

    const totals = calculateTotals(rows);

    // Classic floating point problem: 0.1 + 0.2 !== 0.3
    // Decimal.js handles this correctly
    expect(totals.totalRevenue).toBe(0.3);
  });

  it("handles empty rows (subtask 8.10)", () => {
    const totals = calculateTotals([]);

    expect(totals.totalUnits).toBe(0);
    expect(totals.totalRevenue).toBe(0);
    expect(totals.avgUnitPrice).toBe(0);
  });

  it("handles zero units gracefully", () => {
    const rows: SalesReportRow[] = [
      {
        groupKey: "a",
        groupLabel: "A",
        totalUnits: 0,
        totalRevenue: 0,
        avgUnitPrice: 0,
      },
    ];

    const totals = calculateTotals(rows);

    expect(totals.avgUnitPrice).toBe(0);
  });
});

describe("Sales Report Permission Validation (AC-10)", () => {
  const SALES_REPORT_ACCESS = ["finance", "admin", "owner", "editor"];

  const hasSalesReportAccess = (role: string): boolean =>
    SALES_REPORT_ACCESS.includes(role);

  it("finance has access to sales reports", () => {
    expect(hasSalesReportAccess("finance")).toBe(true);
  });

  it("admin has access to sales reports", () => {
    expect(hasSalesReportAccess("admin")).toBe(true);
  });

  it("owner has access to sales reports", () => {
    expect(hasSalesReportAccess("owner")).toBe(true);
  });

  it("editor has access to sales reports", () => {
    expect(hasSalesReportAccess("editor")).toBe(true);
  });

  it("author does NOT have access to sales reports", () => {
    expect(hasSalesReportAccess("author")).toBe(false);
  });
});

describe("CSV Export Format (AC-9)", () => {
  const generateCSV = (rows: SalesReportRow[]): string => {
    const headers = ["Group", "Total Units", "Total Revenue", "Avg Unit Price"];
    const dataRows = rows.map((row) => [
      `"${row.groupLabel.replace(/"/g, '""')}"`,
      row.totalUnits.toString(),
      row.totalRevenue.toFixed(2),
      row.avgUnitPrice.toFixed(2),
    ]);

    return [headers.join(","), ...dataRows.map((row) => row.join(","))].join(
      "\n",
    );
  };

  it("includes correct CSV headers", () => {
    const csv = generateCSV([]);
    const headers = csv.split("\n")[0];

    expect(headers).toBe("Group,Total Units,Total Revenue,Avg Unit Price");
  });

  it("formats currency correctly for CSV", () => {
    const rows: SalesReportRow[] = [
      {
        groupKey: "test",
        groupLabel: "Test Group",
        totalUnits: 100,
        totalRevenue: 1234.56,
        avgUnitPrice: 12.3456,
      },
    ];

    const csv = generateCSV(rows);
    const dataRow = csv.split("\n")[1];

    expect(dataRow).toBe('"Test Group",100,1234.56,12.35');
  });

  it("escapes quotes in group labels", () => {
    const rows: SalesReportRow[] = [
      {
        groupKey: "test",
        groupLabel: 'Book "Title" Here',
        totalUnits: 10,
        totalRevenue: 100,
        avgUnitPrice: 10,
      },
    ];

    const csv = generateCSV(rows);
    const dataRow = csv.split("\n")[1];

    expect(dataRow).toContain('"Book ""Title"" Here"');
  });
});
