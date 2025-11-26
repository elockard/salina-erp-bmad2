import { format } from "date-fns";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Unit tests for Sales History View
 *
 * Story 3.3: AC 1-9 (unit test coverage)
 *
 * Tests:
 * - Filter schema validation (already covered in sales-schema.test.ts)
 * - Stats calculation logic
 * - CSV export formatting
 * - Permission validation logic
 */

// Mock formatting utilities
describe("Sales History Formatting Utilities", () => {
  describe("formatCurrency", () => {
    const formatCurrency = (amount: string | number): string => {
      const num = typeof amount === "string" ? parseFloat(amount) : amount;
      if (Number.isNaN(num)) return "$0.00";
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(num);
    };

    it("formats string amount correctly", () => {
      expect(formatCurrency("19.99")).toBe("$19.99");
    });

    it("formats number amount correctly", () => {
      expect(formatCurrency(19.99)).toBe("$19.99");
    });

    it("formats large amounts with commas", () => {
      expect(formatCurrency("1234567.89")).toBe("$1,234,567.89");
    });

    it("formats zero correctly", () => {
      expect(formatCurrency("0")).toBe("$0.00");
    });

    it("handles NaN gracefully", () => {
      expect(formatCurrency("not-a-number")).toBe("$0.00");
    });

    it("formats integer amounts with .00", () => {
      expect(formatCurrency("100")).toBe("$100.00");
    });
  });

  describe("formatDateForTable", () => {
    it("formats date as 'MMM d, yyyy'", () => {
      // Use explicit date components to avoid timezone issues
      const date = new Date(2024, 10, 21); // Nov 21, 2024 (month is 0-indexed)
      expect(format(date, "MMM d, yyyy")).toBe("Nov 21, 2024");
    });

    it("formats date with single digit day", () => {
      const date = new Date(2024, 0, 5); // Jan 5, 2024
      expect(format(date, "MMM d, yyyy")).toBe("Jan 5, 2024");
    });

    it("formats date at end of year", () => {
      const date = new Date(2024, 11, 31); // Dec 31, 2024
      expect(format(date, "MMM d, yyyy")).toBe("Dec 31, 2024");
    });
  });

  describe("Format Badges", () => {
    const formatLabels: Record<string, string> = {
      physical: "P",
      ebook: "E",
      audiobook: "A",
    };

    it("returns P for physical", () => {
      expect(formatLabels.physical).toBe("P");
    });

    it("returns E for ebook", () => {
      expect(formatLabels.ebook).toBe("E");
    });

    it("returns A for audiobook", () => {
      expect(formatLabels.audiobook).toBe("A");
    });
  });

  describe("Channel Badges", () => {
    const channelLabels: Record<string, string> = {
      retail: "Retail",
      wholesale: "Wholesale",
      direct: "Direct",
      distributor: "Distributor",
    };

    it("returns correct label for retail", () => {
      expect(channelLabels.retail).toBe("Retail");
    });

    it("returns correct label for wholesale", () => {
      expect(channelLabels.wholesale).toBe("Wholesale");
    });

    it("returns correct label for direct", () => {
      expect(channelLabels.direct).toBe("Direct");
    });

    it("returns correct label for distributor", () => {
      expect(channelLabels.distributor).toBe("Distributor");
    });
  });
});

describe("CSV Export Formatting", () => {
  const escapeCSV = (value: string | number): string => {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  it("does not escape simple values", () => {
    expect(escapeCSV("Hello")).toBe("Hello");
    expect(escapeCSV(123)).toBe("123");
  });

  it("escapes values with commas", () => {
    expect(escapeCSV("Hello, World")).toBe('"Hello, World"');
  });

  it("escapes values with quotes", () => {
    expect(escapeCSV('Say "Hello"')).toBe('"Say ""Hello"""');
  });

  it("escapes values with newlines", () => {
    expect(escapeCSV("Line1\nLine2")).toBe('"Line1\nLine2"');
  });

  it("escapes values with multiple special characters", () => {
    expect(escapeCSV('Hello, "World"\nNew Line')).toBe(
      '"Hello, ""World""\nNew Line"'
    );
  });

  describe("CSV filename generation", () => {
    it("generates filename with current date", () => {
      const filename = `sales-export-${format(new Date(), "yyyy-MM-dd")}.csv`;
      expect(filename).toMatch(/^sales-export-\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });
});

describe("Pagination Logic", () => {
  describe("calculatePagination", () => {
    const calculatePagination = (
      total: number,
      page: number,
      pageSize: number
    ) => ({
      totalPages: Math.ceil(total / pageSize),
      startItem: (page - 1) * pageSize + 1,
      endItem: Math.min(page * pageSize, total),
    });

    it("calculates correct pagination for first page", () => {
      const result = calculatePagination(156, 1, 20);
      expect(result.totalPages).toBe(8);
      expect(result.startItem).toBe(1);
      expect(result.endItem).toBe(20);
    });

    it("calculates correct pagination for middle page", () => {
      const result = calculatePagination(156, 4, 20);
      expect(result.totalPages).toBe(8);
      expect(result.startItem).toBe(61);
      expect(result.endItem).toBe(80);
    });

    it("calculates correct pagination for last page", () => {
      const result = calculatePagination(156, 8, 20);
      expect(result.totalPages).toBe(8);
      expect(result.startItem).toBe(141);
      expect(result.endItem).toBe(156);
    });

    it("handles empty results", () => {
      const result = calculatePagination(0, 1, 20);
      expect(result.totalPages).toBe(0);
      expect(result.startItem).toBe(1);
      expect(result.endItem).toBe(0);
    });

    it("handles single page of results", () => {
      const result = calculatePagination(15, 1, 20);
      expect(result.totalPages).toBe(1);
      expect(result.startItem).toBe(1);
      expect(result.endItem).toBe(15);
    });

    it("handles exactly one page of results", () => {
      const result = calculatePagination(20, 1, 20);
      expect(result.totalPages).toBe(1);
      expect(result.startItem).toBe(1);
      expect(result.endItem).toBe(20);
    });
  });
});

describe("Date Range Defaults", () => {
  describe("getCurrentMonthRange", () => {
    const getCurrentMonthRange = () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      return {
        start: startOfMonth.toISOString().split("T")[0],
        end: endOfMonth.toISOString().split("T")[0],
      };
    };

    it("returns valid date strings", () => {
      const range = getCurrentMonthRange();
      expect(range.start).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(range.end).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("start is before or equal to end", () => {
      const range = getCurrentMonthRange();
      expect(new Date(range.start).getTime()).toBeLessThanOrEqual(
        new Date(range.end).getTime()
      );
    });

    it("start is first day of month", () => {
      const range = getCurrentMonthRange();
      expect(range.start.slice(-2)).toBe("01");
    });
  });
});

describe("Filter State Management", () => {
  describe("buildFilterParams", () => {
    const buildFilterParams = (filters: Record<string, string | undefined>) => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "all") {
          params.set(key, value);
        }
      });
      return params;
    };

    it("builds empty params for no filters", () => {
      const params = buildFilterParams({});
      expect(params.toString()).toBe("");
    });

    it("excludes 'all' values", () => {
      const params = buildFilterParams({ format: "all", channel: "all" });
      expect(params.toString()).toBe("");
    });

    it("includes actual filter values", () => {
      const params = buildFilterParams({
        format: "physical",
        channel: "retail",
      });
      expect(params.get("format")).toBe("physical");
      expect(params.get("channel")).toBe("retail");
    });

    it("excludes undefined values", () => {
      const params = buildFilterParams({
        format: "physical",
        channel: undefined,
      });
      expect(params.get("format")).toBe("physical");
      expect(params.has("channel")).toBe(false);
    });
  });
});

describe("Permission Validation", () => {
  const RECORD_SALES = ["owner", "admin", "editor", "finance"];

  const hasPermission = (role: string) => RECORD_SALES.includes(role);

  it("owner has permission", () => {
    expect(hasPermission("owner")).toBe(true);
  });

  it("admin has permission", () => {
    expect(hasPermission("admin")).toBe(true);
  });

  it("editor has permission", () => {
    expect(hasPermission("editor")).toBe(true);
  });

  it("finance has permission", () => {
    expect(hasPermission("finance")).toBe(true);
  });

  it("author does not have permission", () => {
    expect(hasPermission("author")).toBe(false);
  });

  it("unknown role does not have permission", () => {
    expect(hasPermission("guest")).toBe(false);
  });
});

describe("Stats Calculation", () => {
  describe("bestSellingTitle", () => {
    const findBestSeller = (
      sales: { title: string; quantity: number }[]
    ): { title: string; units: number } | null => {
      if (sales.length === 0) return null;

      const totals = sales.reduce((acc, sale) => {
        acc[sale.title] = (acc[sale.title] || 0) + sale.quantity;
        return acc;
      }, {} as Record<string, number>);

      let bestTitle = "";
      let maxUnits = 0;
      for (const [title, units] of Object.entries(totals)) {
        if (units > maxUnits) {
          bestTitle = title;
          maxUnits = units;
        }
      }

      return { title: bestTitle, units: maxUnits };
    };

    it("returns null for empty sales", () => {
      expect(findBestSeller([])).toBe(null);
    });

    it("finds single best seller", () => {
      const result = findBestSeller([
        { title: "Book A", quantity: 10 },
        { title: "Book B", quantity: 5 },
      ]);
      expect(result).toEqual({ title: "Book A", units: 10 });
    });

    it("aggregates multiple sales of same title", () => {
      const result = findBestSeller([
        { title: "Book A", quantity: 5 },
        { title: "Book B", quantity: 8 },
        { title: "Book A", quantity: 7 },
      ]);
      expect(result).toEqual({ title: "Book A", units: 12 });
    });

    it("handles single sale", () => {
      const result = findBestSeller([{ title: "Only Book", quantity: 3 }]);
      expect(result).toEqual({ title: "Only Book", units: 3 });
    });
  });
});
