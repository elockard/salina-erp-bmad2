import { addDays, subDays, format } from "date-fns";
import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for Accounts Receivable Dashboard
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.2: Summary stats calculations
 * AC-8.5.3: Aging bucket calculations
 *
 * Tests:
 * - AR summary calculations (total, current, overdue)
 * - Aging bucket assignment logic
 * - Average days to pay calculation
 * - Customer aging grouping
 * - Empty data handling
 */

interface Invoice {
  id: string;
  customerId: string;
  invoiceDate: Date;
  dueDate: Date;
  total: string;
  balanceDue: string;
  status: string;
}

interface AgingBuckets {
  current: Decimal;
  days1to30: Decimal;
  days31to60: Decimal;
  days61to90: Decimal;
  days90plus: Decimal;
  total: Decimal;
}

describe("AR Summary Calculations (AC-8.5.2)", () => {
  const today = new Date();

  /**
   * Simulates getARSummary calculation logic
   */
  const calculateARSummary = (invoices: Invoice[]) => {
    let totalReceivables = new Decimal(0);
    let currentAmount = new Decimal(0);
    let overdueAmount = new Decimal(0);
    let openInvoiceCount = 0;

    const validStatuses = ["sent", "partially_paid", "overdue"];

    for (const invoice of invoices) {
      if (!validStatuses.includes(invoice.status)) continue;

      const balance = new Decimal(invoice.balanceDue);
      if (balance.lte(0)) continue;

      openInvoiceCount++;
      totalReceivables = totalReceivables.plus(balance);

      // Check if overdue (due_date < today)
      if (invoice.dueDate < today) {
        overdueAmount = overdueAmount.plus(balance);
      } else {
        currentAmount = currentAmount.plus(balance);
      }
    }

    return {
      totalReceivables: totalReceivables.toFixed(2),
      currentAmount: currentAmount.toFixed(2),
      overdueAmount: overdueAmount.toFixed(2),
      openInvoiceCount,
    };
  };

  describe("Total Receivables Calculation", () => {
    it("sums balance_due from open invoices", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 30),
          dueDate: addDays(today, 10),
          total: "1000.00",
          balanceDue: "500.00",
          status: "sent",
        },
        {
          id: "2",
          customerId: "c1",
          invoiceDate: subDays(today, 20),
          dueDate: addDays(today, 5),
          total: "750.00",
          balanceDue: "750.00",
          status: "partially_paid",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.totalReceivables).toBe("1250.00");
      expect(result.openInvoiceCount).toBe(2);
    });

    it("excludes paid and void invoices", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 30),
          dueDate: addDays(today, 10),
          total: "1000.00",
          balanceDue: "1000.00",
          status: "sent",
        },
        {
          id: "2",
          customerId: "c1",
          invoiceDate: subDays(today, 20),
          dueDate: addDays(today, 5),
          total: "500.00",
          balanceDue: "0.00",
          status: "paid",
        },
        {
          id: "3",
          customerId: "c1",
          invoiceDate: subDays(today, 15),
          dueDate: addDays(today, 15),
          total: "300.00",
          balanceDue: "300.00",
          status: "void",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.totalReceivables).toBe("1000.00");
      expect(result.openInvoiceCount).toBe(1);
    });

    it("excludes draft invoices", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 10),
          dueDate: addDays(today, 20),
          total: "1000.00",
          balanceDue: "1000.00",
          status: "draft",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.totalReceivables).toBe("0.00");
      expect(result.openInvoiceCount).toBe(0);
    });
  });

  describe("Current vs Overdue Classification", () => {
    it("classifies invoices due in the future as current", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 10),
          dueDate: addDays(today, 5), // Future = current
          total: "500.00",
          balanceDue: "500.00",
          status: "sent",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.currentAmount).toBe("500.00");
      expect(result.overdueAmount).toBe("0.00");
    });

    it("classifies invoices past due as overdue", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 45),
          dueDate: subDays(today, 15), // Past = overdue
          total: "750.00",
          balanceDue: "750.00",
          status: "sent",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.currentAmount).toBe("0.00");
      expect(result.overdueAmount).toBe("750.00");
    });

    it("handles mixed current and overdue invoices", () => {
      const invoices: Invoice[] = [
        {
          id: "1",
          customerId: "c1",
          invoiceDate: subDays(today, 10),
          dueDate: addDays(today, 20), // Current
          total: "1000.00",
          balanceDue: "1000.00",
          status: "sent",
        },
        {
          id: "2",
          customerId: "c2",
          invoiceDate: subDays(today, 60),
          dueDate: subDays(today, 30), // Overdue
          total: "500.00",
          balanceDue: "250.00",
          status: "partially_paid",
        },
      ];

      const result = calculateARSummary(invoices);
      expect(result.totalReceivables).toBe("1250.00");
      expect(result.currentAmount).toBe("1000.00");
      expect(result.overdueAmount).toBe("250.00");
    });
  });

  describe("Empty Data Handling", () => {
    it("returns zeros for empty invoice list", () => {
      const result = calculateARSummary([]);
      expect(result.totalReceivables).toBe("0.00");
      expect(result.currentAmount).toBe("0.00");
      expect(result.overdueAmount).toBe("0.00");
      expect(result.openInvoiceCount).toBe(0);
    });
  });
});

describe("Aging Bucket Assignment (AC-8.5.3)", () => {
  const today = new Date();

  /**
   * Simulates aging bucket assignment logic
   */
  const assignToAgingBucket = (
    dueDate: Date,
    balance: Decimal,
  ): { bucket: keyof AgingBuckets; amount: Decimal } => {
    const daysOverdue = Math.ceil(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysOverdue <= 0) {
      return { bucket: "current", amount: balance };
    }
    if (daysOverdue <= 30) {
      return { bucket: "days1to30", amount: balance };
    }
    if (daysOverdue <= 60) {
      return { bucket: "days31to60", amount: balance };
    }
    if (daysOverdue <= 90) {
      return { bucket: "days61to90", amount: balance };
    }
    return { bucket: "days90plus", amount: balance };
  };

  describe("Bucket Boundaries", () => {
    it("assigns future due dates to current bucket", () => {
      const dueDate = addDays(today, 10);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("current");
    });

    it("assigns today's due date to current bucket", () => {
      const result = assignToAgingBucket(today, new Decimal("100.00"));
      expect(result.bucket).toBe("current");
    });

    it("assigns 1 day overdue to 1-30 bucket", () => {
      const dueDate = subDays(today, 1);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days1to30");
    });

    it("assigns 30 days overdue to 1-30 bucket", () => {
      const dueDate = subDays(today, 30);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days1to30");
    });

    it("assigns 31 days overdue to 31-60 bucket", () => {
      const dueDate = subDays(today, 31);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days31to60");
    });

    it("assigns 60 days overdue to 31-60 bucket", () => {
      const dueDate = subDays(today, 60);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days31to60");
    });

    it("assigns 61 days overdue to 61-90 bucket", () => {
      const dueDate = subDays(today, 61);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days61to90");
    });

    it("assigns 90 days overdue to 61-90 bucket", () => {
      const dueDate = subDays(today, 90);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days61to90");
    });

    it("assigns 91 days overdue to 90+ bucket", () => {
      const dueDate = subDays(today, 91);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days90plus");
    });

    it("assigns 180 days overdue to 90+ bucket", () => {
      const dueDate = subDays(today, 180);
      const result = assignToAgingBucket(dueDate, new Decimal("100.00"));
      expect(result.bucket).toBe("days90plus");
    });
  });
});

describe("Average Days to Pay Calculation (AC-8.5.2)", () => {
  /**
   * Simulates average days to pay calculation
   */
  const calculateAverageDaysToPay = (
    paidInvoices: { invoiceDate: Date; paymentDate: Date }[],
  ): number => {
    if (paidInvoices.length === 0) return 0;

    const totalDays = paidInvoices.reduce((sum, inv) => {
      const days = Math.ceil(
        (inv.paymentDate.getTime() - inv.invoiceDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
      return sum + Math.max(0, days);
    }, 0);

    return Math.round(totalDays / paidInvoices.length);
  };

  it("calculates average correctly for single invoice", () => {
    const today = new Date();
    const invoiceDate = subDays(today, 30);
    const paymentDate = subDays(today, 5); // 25 days to pay

    const result = calculateAverageDaysToPay([{ invoiceDate, paymentDate }]);
    expect(result).toBe(25);
  });

  it("calculates average correctly for multiple invoices", () => {
    const today = new Date();
    const invoices = [
      { invoiceDate: subDays(today, 40), paymentDate: subDays(today, 20) }, // 20 days
      { invoiceDate: subDays(today, 50), paymentDate: subDays(today, 20) }, // 30 days
    ];

    const result = calculateAverageDaysToPay(invoices);
    expect(result).toBe(25); // Average of 20 and 30
  });

  it("returns 0 for no paid invoices", () => {
    const result = calculateAverageDaysToPay([]);
    expect(result).toBe(0);
  });

  it("handles same-day payment", () => {
    const today = new Date();
    const invoiceDate = subDays(today, 10);
    const paymentDate = subDays(today, 10); // Same day

    const result = calculateAverageDaysToPay([{ invoiceDate, paymentDate }]);
    expect(result).toBe(0);
  });
});

describe("Customer Aging Grouping (AC-8.5.3)", () => {
  const today = new Date();

  /**
   * Groups invoices by customer and calculates aging buckets
   */
  const groupByCustomer = (
    invoices: Invoice[],
  ): Map<string, AgingBuckets> => {
    const customerBuckets = new Map<string, AgingBuckets>();

    for (const invoice of invoices) {
      const balance = new Decimal(invoice.balanceDue);
      if (balance.lte(0)) continue;

      const daysOverdue = Math.ceil(
        (today.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (!customerBuckets.has(invoice.customerId)) {
        customerBuckets.set(invoice.customerId, {
          current: new Decimal(0),
          days1to30: new Decimal(0),
          days31to60: new Decimal(0),
          days61to90: new Decimal(0),
          days90plus: new Decimal(0),
          total: new Decimal(0),
        });
      }

      const buckets = customerBuckets.get(invoice.customerId)!;

      if (daysOverdue <= 0) {
        buckets.current = buckets.current.plus(balance);
      } else if (daysOverdue <= 30) {
        buckets.days1to30 = buckets.days1to30.plus(balance);
      } else if (daysOverdue <= 60) {
        buckets.days31to60 = buckets.days31to60.plus(balance);
      } else if (daysOverdue <= 90) {
        buckets.days61to90 = buckets.days61to90.plus(balance);
      } else {
        buckets.days90plus = buckets.days90plus.plus(balance);
      }

      buckets.total = buckets.total.plus(balance);
    }

    return customerBuckets;
  };

  it("groups multiple invoices for same customer", () => {
    const invoices: Invoice[] = [
      {
        id: "1",
        customerId: "c1",
        invoiceDate: subDays(today, 30),
        dueDate: addDays(today, 10), // Current
        total: "500.00",
        balanceDue: "500.00",
        status: "sent",
      },
      {
        id: "2",
        customerId: "c1",
        invoiceDate: subDays(today, 60),
        dueDate: subDays(today, 20), // 1-30 days
        total: "300.00",
        balanceDue: "300.00",
        status: "sent",
      },
    ];

    const result = groupByCustomer(invoices);
    const c1Buckets = result.get("c1");

    expect(c1Buckets).toBeDefined();
    expect(c1Buckets!.current.toFixed(2)).toBe("500.00");
    expect(c1Buckets!.days1to30.toFixed(2)).toBe("300.00");
    expect(c1Buckets!.total.toFixed(2)).toBe("800.00");
  });

  it("separates different customers", () => {
    const invoices: Invoice[] = [
      {
        id: "1",
        customerId: "c1",
        invoiceDate: subDays(today, 10),
        dueDate: addDays(today, 20),
        total: "1000.00",
        balanceDue: "1000.00",
        status: "sent",
      },
      {
        id: "2",
        customerId: "c2",
        invoiceDate: subDays(today, 10),
        dueDate: addDays(today, 20),
        total: "500.00",
        balanceDue: "500.00",
        status: "sent",
      },
    ];

    const result = groupByCustomer(invoices);

    expect(result.size).toBe(2);
    expect(result.get("c1")!.total.toFixed(2)).toBe("1000.00");
    expect(result.get("c2")!.total.toFixed(2)).toBe("500.00");
  });

  it("excludes zero balance invoices", () => {
    const invoices: Invoice[] = [
      {
        id: "1",
        customerId: "c1",
        invoiceDate: subDays(today, 30),
        dueDate: addDays(today, 10),
        total: "500.00",
        balanceDue: "0.00", // Paid
        status: "paid",
      },
    ];

    const result = groupByCustomer(invoices);
    expect(result.size).toBe(0);
  });
});

describe("AR Export Data Generation (AC-8.5.6)", () => {
  /**
   * Simulates CSV generation logic
   */
  const generateCSVContent = (
    rows: { customerName: string; current: string; days1to30: string; days31to60: string; days61to90: string; days90plus: string; total: string }[],
  ): string => {
    const headers = [
      "Customer",
      "Current",
      "1-30 Days",
      "31-60 Days",
      "61-90 Days",
      "90+ Days",
      "Total",
    ];

    const csvRows = rows.map((row) => [
      `"${row.customerName.replace(/"/g, '""')}"`,
      row.current,
      row.days1to30,
      row.days31to60,
      row.days61to90,
      row.days90plus,
      row.total,
    ]);

    return [headers.join(","), ...csvRows.map((row) => row.join(","))].join("\n");
  };

  it("generates valid CSV with headers", () => {
    const rows = [
      {
        customerName: "Acme Corp",
        current: "1000.00",
        days1to30: "500.00",
        days31to60: "0.00",
        days61to90: "0.00",
        days90plus: "0.00",
        total: "1500.00",
      },
    ];

    const csv = generateCSVContent(rows);
    const lines = csv.split("\n");

    expect(lines[0]).toBe("Customer,Current,1-30 Days,31-60 Days,61-90 Days,90+ Days,Total");
    expect(lines[1]).toContain("Acme Corp");
    expect(lines[1]).toContain("1500.00");
  });

  it("escapes quotes in customer names", () => {
    const rows = [
      {
        customerName: 'Company "Best"',
        current: "100.00",
        days1to30: "0.00",
        days31to60: "0.00",
        days61to90: "0.00",
        days90plus: "0.00",
        total: "100.00",
      },
    ];

    const csv = generateCSVContent(rows);
    expect(csv).toContain('""Best""'); // Escaped quotes
  });

  it("handles empty data", () => {
    const csv = generateCSVContent([]);
    const lines = csv.split("\n");

    expect(lines.length).toBe(1); // Just headers
    expect(lines[0]).toContain("Customer");
  });
});
