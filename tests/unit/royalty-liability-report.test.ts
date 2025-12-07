import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

/**
 * Unit Tests for Royalty Liability Report Queries
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 2 (Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement)
 * AC: 3 (Average payment per author calculation)
 * AC: 4 (Liability by author grouping and sorting)
 * AC: 5 (Default sort by total owed DESC)
 * AC: 6 (Advance balance calculation - remaining = amount - recouped)
 *
 * Tests:
 * - Total unpaid liability calculation (AC-2)
 * - Authors with pending payments count (AC-2)
 * - Oldest unpaid statement detection (AC-2)
 * - Average payment per author (AC-3)
 * - Liability by author grouping and sorting (AC-4, AC-5)
 * - Advance balance calculation (AC-6)
 * - Tenant isolation validation
 * - Empty data handling
 */

interface StatementRecord {
  authorId: string;
  netPayable: number;
  periodEnd: Date;
  tenantId: string;
}

interface ContractRecord {
  contractId: string;
  authorId: string;
  titleId: string;
  titleName: string;
  advanceAmount: number;
  advanceRecouped: number;
  tenantId: string;
}

interface AuthorRecord {
  authorId: string;
  authorName: string;
  paymentMethod: string | null;
}

interface AuthorLiabilityRow {
  authorId: string;
  authorName: string;
  titleCount: number;
  unpaidStatements: number;
  totalOwed: number;
  oldestStatement: Date;
  paymentMethod: string | null;
}

interface AdvanceBalanceRow {
  authorId: string;
  authorName: string;
  contractId: string;
  titleName: string;
  advanceAmount: number;
  advanceRecouped: number;
  advanceRemaining: number;
}

interface RoyaltyLiabilitySummary {
  totalUnpaidLiability: number;
  authorsWithPendingPayments: number;
  oldestUnpaidStatement: Date | null;
  averagePaymentPerAuthor: number;
  liabilityByAuthor: AuthorLiabilityRow[];
  advanceBalances: AdvanceBalanceRow[];
}

describe("Total Unpaid Liability Calculation (AC-2.3)", () => {
  /**
   * Simulates the SUM of net_payable from statements
   */
  const calculateTotalLiability = (statements: StatementRecord[]): number => {
    return statements.reduce(
      (sum, s) => new Decimal(sum).plus(s.netPayable).toNumber(),
      0,
    );
  };

  it("calculates total liability from multiple statements", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100.5,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 200.25,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a2",
        netPayable: 350.0,
        periodEnd: new Date(),
        tenantId: "t1",
      },
    ];

    const total = calculateTotalLiability(statements);

    expect(total).toBe(650.75);
  });

  it("returns 0 for empty statements", () => {
    const total = calculateTotalLiability([]);

    expect(total).toBe(0);
  });

  it("handles decimal precision correctly", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 0.1,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 0.2,
        periodEnd: new Date(),
        tenantId: "t1",
      },
    ];

    const total = calculateTotalLiability(statements);

    // Using Decimal.js should give us 0.3, not 0.30000000000000004
    expect(total).toBe(0.3);
  });

  it("handles large amounts", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 999999.99,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 0.01,
        periodEnd: new Date(),
        tenantId: "t1",
      },
    ];

    const total = calculateTotalLiability(statements);

    expect(total).toBe(1000000);
  });
});

describe("Authors with Pending Payments Count (AC-2.4)", () => {
  /**
   * Simulates COUNT DISTINCT author_id from statements
   */
  const countAuthorsWithPendingPayments = (
    statements: StatementRecord[],
  ): number => {
    const uniqueAuthors = new Set(statements.map((s) => s.authorId));
    return uniqueAuthors.size;
  };

  it("counts distinct authors correctly", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 200,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a2",
        netPayable: 300,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a3",
        netPayable: 400,
        periodEnd: new Date(),
        tenantId: "t1",
      },
    ];

    const count = countAuthorsWithPendingPayments(statements);

    expect(count).toBe(3);
  });

  it("returns 0 for empty statements", () => {
    const count = countAuthorsWithPendingPayments([]);

    expect(count).toBe(0);
  });

  it("handles single author with multiple statements", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 200,
        periodEnd: new Date(),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 300,
        periodEnd: new Date(),
        tenantId: "t1",
      },
    ];

    const count = countAuthorsWithPendingPayments(statements);

    expect(count).toBe(1);
  });
});

describe("Oldest Unpaid Statement Detection (AC-2.5)", () => {
  /**
   * Simulates MIN of period_end from statements
   */
  const findOldestStatement = (statements: StatementRecord[]): Date | null => {
    if (statements.length === 0) return null;

    return statements.reduce(
      (oldest, s) => (s.periodEnd < oldest ? s.periodEnd : oldest),
      statements[0].periodEnd,
    );
  };

  it("finds the oldest statement", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date("2024-06-30"),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 200,
        periodEnd: new Date("2024-03-31"),
        tenantId: "t1",
      },
      {
        authorId: "a2",
        netPayable: 300,
        periodEnd: new Date("2024-09-30"),
        tenantId: "t1",
      },
    ];

    const oldest = findOldestStatement(statements);

    expect(oldest?.toISOString().split("T")[0]).toBe("2024-03-31");
  });

  it("returns null for empty statements", () => {
    const oldest = findOldestStatement([]);

    expect(oldest).toBeNull();
  });

  it("handles single statement", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date("2024-12-31"),
        tenantId: "t1",
      },
    ];

    const oldest = findOldestStatement(statements);

    expect(oldest?.toISOString().split("T")[0]).toBe("2024-12-31");
  });
});

describe("Average Payment Per Author Calculation (AC-3)", () => {
  /**
   * Simulates totalLiability / authorsCount
   */
  const calculateAveragePayment = (
    totalLiability: number,
    authorsCount: number,
  ): number => {
    if (authorsCount === 0) return 0;
    return new Decimal(totalLiability).div(authorsCount).toNumber();
  };

  it("calculates average correctly", () => {
    const average = calculateAveragePayment(3000, 3);

    expect(average).toBe(1000);
  });

  it("handles decimal averages", () => {
    const average = calculateAveragePayment(1000, 3);

    expect(average).toBeCloseTo(333.33, 2);
  });

  it("returns 0 when no authors", () => {
    const average = calculateAveragePayment(0, 0);

    expect(average).toBe(0);
  });

  it("handles single author", () => {
    const average = calculateAveragePayment(5000, 1);

    expect(average).toBe(5000);
  });
});

describe("Liability By Author Grouping (AC-4)", () => {
  /**
   * Simulates GROUP BY author_id aggregation
   */
  const groupLiabilityByAuthor = (
    statements: StatementRecord[],
    authors: AuthorRecord[],
    titleCounts: Map<string, number>,
  ): AuthorLiabilityRow[] => {
    const authorMap = new Map(authors.map((a) => [a.authorId, a]));
    const grouped = new Map<
      string,
      {
        totalOwed: number;
        unpaidStatements: number;
        oldestStatement: Date;
      }
    >();

    for (const statement of statements) {
      const existing = grouped.get(statement.authorId);
      if (existing) {
        existing.totalOwed = new Decimal(existing.totalOwed)
          .plus(statement.netPayable)
          .toNumber();
        existing.unpaidStatements++;
        if (statement.periodEnd < existing.oldestStatement) {
          existing.oldestStatement = statement.periodEnd;
        }
      } else {
        grouped.set(statement.authorId, {
          totalOwed: statement.netPayable,
          unpaidStatements: 1,
          oldestStatement: statement.periodEnd,
        });
      }
    }

    return Array.from(grouped.entries()).map(([authorId, data]) => {
      const author = authorMap.get(authorId);
      return {
        authorId,
        authorName: author?.authorName ?? "Unknown",
        titleCount: titleCounts.get(authorId) ?? 0,
        unpaidStatements: data.unpaidStatements,
        totalOwed: data.totalOwed,
        oldestStatement: data.oldestStatement,
        paymentMethod: author?.paymentMethod ?? null,
      };
    });
  };

  it("groups statements by author correctly", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date("2024-06-30"),
        tenantId: "t1",
      },
      {
        authorId: "a1",
        netPayable: 200,
        periodEnd: new Date("2024-03-31"),
        tenantId: "t1",
      },
      {
        authorId: "a2",
        netPayable: 500,
        periodEnd: new Date("2024-09-30"),
        tenantId: "t1",
      },
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author One", paymentMethod: "check" },
      {
        authorId: "a2",
        authorName: "Author Two",
        paymentMethod: "direct_deposit",
      },
    ];

    const titleCounts = new Map([
      ["a1", 2],
      ["a2", 1],
    ]);

    const result = groupLiabilityByAuthor(statements, authors, titleCounts);

    const author1 = result.find((r) => r.authorId === "a1");
    expect(author1?.totalOwed).toBe(300);
    expect(author1?.unpaidStatements).toBe(2);
    expect(author1?.titleCount).toBe(2);
    expect(author1?.oldestStatement.toISOString().split("T")[0]).toBe(
      "2024-03-31",
    );

    const author2 = result.find((r) => r.authorId === "a2");
    expect(author2?.totalOwed).toBe(500);
    expect(author2?.unpaidStatements).toBe(1);
    expect(author2?.titleCount).toBe(1);
  });

  it("handles empty statements", () => {
    const result = groupLiabilityByAuthor([], [], new Map());

    expect(result).toHaveLength(0);
  });
});

describe("Liability By Author Sorting (AC-5)", () => {
  /**
   * Simulates ORDER BY totalOwed DESC
   */
  const sortByTotalOwedDesc = (
    rows: AuthorLiabilityRow[],
  ): AuthorLiabilityRow[] => {
    return [...rows].sort((a, b) => b.totalOwed - a.totalOwed);
  };

  it("sorts by total owed descending", () => {
    const rows: AuthorLiabilityRow[] = [
      {
        authorId: "a1",
        authorName: "A",
        titleCount: 1,
        unpaidStatements: 1,
        totalOwed: 100,
        oldestStatement: new Date(),
        paymentMethod: null,
      },
      {
        authorId: "a2",
        authorName: "B",
        titleCount: 1,
        unpaidStatements: 1,
        totalOwed: 500,
        oldestStatement: new Date(),
        paymentMethod: null,
      },
      {
        authorId: "a3",
        authorName: "C",
        titleCount: 1,
        unpaidStatements: 1,
        totalOwed: 250,
        oldestStatement: new Date(),
        paymentMethod: null,
      },
    ];

    const sorted = sortByTotalOwedDesc(rows);

    expect(sorted[0].authorId).toBe("a2"); // 500
    expect(sorted[1].authorId).toBe("a3"); // 250
    expect(sorted[2].authorId).toBe("a1"); // 100
  });

  it("handles equal amounts", () => {
    const rows: AuthorLiabilityRow[] = [
      {
        authorId: "a1",
        authorName: "A",
        titleCount: 1,
        unpaidStatements: 1,
        totalOwed: 100,
        oldestStatement: new Date(),
        paymentMethod: null,
      },
      {
        authorId: "a2",
        authorName: "B",
        titleCount: 1,
        unpaidStatements: 1,
        totalOwed: 100,
        oldestStatement: new Date(),
        paymentMethod: null,
      },
    ];

    const sorted = sortByTotalOwedDesc(rows);

    expect(sorted).toHaveLength(2);
    // Both have same amount, order is stable
    expect(sorted[0].totalOwed).toBe(100);
    expect(sorted[1].totalOwed).toBe(100);
  });
});

describe("Advance Balance Calculation (AC-6)", () => {
  /**
   * Simulates advanceRemaining = advanceAmount - advanceRecouped
   */
  const calculateAdvanceBalances = (
    contracts: ContractRecord[],
    authors: AuthorRecord[],
  ): AdvanceBalanceRow[] => {
    const authorMap = new Map(authors.map((a) => [a.authorId, a]));

    return contracts
      .filter((c) => c.advanceAmount > c.advanceRecouped)
      .map((c) => {
        const author = authorMap.get(c.authorId);
        return {
          authorId: c.authorId,
          authorName: author?.authorName ?? "Unknown",
          contractId: c.contractId,
          titleName: c.titleName,
          advanceAmount: c.advanceAmount,
          advanceRecouped: c.advanceRecouped,
          advanceRemaining: new Decimal(c.advanceAmount)
            .minus(c.advanceRecouped)
            .toNumber(),
        };
      });
  };

  it("calculates remaining balance correctly", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book One",
        advanceAmount: 5000,
        advanceRecouped: 2000,
        tenantId: "t1",
      },
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author One", paymentMethod: null },
    ];

    const result = calculateAdvanceBalances(contracts, authors);

    expect(result).toHaveLength(1);
    expect(result[0].advanceRemaining).toBe(3000);
  });

  it("only includes contracts with active advances", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book One",
        advanceAmount: 5000,
        advanceRecouped: 2000,
        tenantId: "t1",
      },
      {
        contractId: "c2",
        authorId: "a1",
        titleId: "t2",
        titleName: "Book Two",
        advanceAmount: 1000,
        advanceRecouped: 1000,
        tenantId: "t1",
      }, // Fully recouped
      {
        contractId: "c3",
        authorId: "a2",
        titleId: "t3",
        titleName: "Book Three",
        advanceAmount: 0,
        advanceRecouped: 0,
        tenantId: "t1",
      }, // No advance
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author One", paymentMethod: null },
      { authorId: "a2", authorName: "Author Two", paymentMethod: null },
    ];

    const result = calculateAdvanceBalances(contracts, authors);

    expect(result).toHaveLength(1);
    expect(result[0].contractId).toBe("c1");
  });

  it("handles zero advances", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book",
        advanceAmount: 0,
        advanceRecouped: 0,
        tenantId: "t1",
      },
    ];

    const result = calculateAdvanceBalances(contracts, []);

    expect(result).toHaveLength(0);
  });

  it("handles partial recoupment correctly", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book",
        advanceAmount: 10000.5,
        advanceRecouped: 3500.25,
        tenantId: "t1",
      },
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author", paymentMethod: null },
    ];

    const result = calculateAdvanceBalances(contracts, authors);

    expect(result[0].advanceRemaining).toBe(6500.25);
  });
});

describe("Tenant Isolation Validation", () => {
  const filterByTenant = <T extends { tenantId: string }>(
    records: T[],
    tenantId: string,
  ): T[] => {
    return records.filter((r) => r.tenantId === tenantId);
  };

  it("filters statements by tenant ID", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date(),
        tenantId: "tenant-a",
      },
      {
        authorId: "a1",
        netPayable: 200,
        periodEnd: new Date(),
        tenantId: "tenant-b",
      },
      {
        authorId: "a2",
        netPayable: 300,
        periodEnd: new Date(),
        tenantId: "tenant-a",
      },
    ];

    const tenantAStatements = filterByTenant(statements, "tenant-a");
    const tenantBStatements = filterByTenant(statements, "tenant-b");

    expect(tenantAStatements).toHaveLength(2);
    expect(tenantBStatements).toHaveLength(1);
  });

  it("filters contracts by tenant ID", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book",
        advanceAmount: 5000,
        advanceRecouped: 0,
        tenantId: "tenant-a",
      },
      {
        contractId: "c2",
        authorId: "a1",
        titleId: "t2",
        titleName: "Book 2",
        advanceAmount: 3000,
        advanceRecouped: 0,
        tenantId: "tenant-b",
      },
    ];

    const tenantAContracts = filterByTenant(contracts, "tenant-a");

    expect(tenantAContracts).toHaveLength(1);
    expect(tenantAContracts[0].contractId).toBe("c1");
  });

  it("returns empty for non-existent tenant", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date(),
        tenantId: "tenant-a",
      },
    ];

    const result = filterByTenant(statements, "tenant-c");

    expect(result).toHaveLength(0);
  });
});

describe("Empty Data Handling", () => {
  const calculateSummary = (
    statements: StatementRecord[],
    contracts: ContractRecord[],
    authors: AuthorRecord[],
    titleCounts: Map<string, number>,
  ): RoyaltyLiabilitySummary => {
    const totalUnpaidLiability = statements.reduce(
      (sum, s) => new Decimal(sum).plus(s.netPayable).toNumber(),
      0,
    );

    const uniqueAuthors = new Set(statements.map((s) => s.authorId));
    const authorsWithPendingPayments = uniqueAuthors.size;

    const oldestUnpaidStatement =
      statements.length > 0
        ? statements.reduce(
            (oldest, s) => (s.periodEnd < oldest ? s.periodEnd : oldest),
            statements[0].periodEnd,
          )
        : null;

    const averagePaymentPerAuthor =
      authorsWithPendingPayments > 0
        ? new Decimal(totalUnpaidLiability)
            .div(authorsWithPendingPayments)
            .toNumber()
        : 0;

    // Simplified grouping
    const authorMap = new Map(authors.map((a) => [a.authorId, a]));
    const groupedMap = new Map<
      string,
      { totalOwed: number; unpaidStatements: number; oldestStatement: Date }
    >();
    for (const s of statements) {
      const existing = groupedMap.get(s.authorId);
      if (existing) {
        existing.totalOwed += s.netPayable;
        existing.unpaidStatements++;
        if (s.periodEnd < existing.oldestStatement)
          existing.oldestStatement = s.periodEnd;
      } else {
        groupedMap.set(s.authorId, {
          totalOwed: s.netPayable,
          unpaidStatements: 1,
          oldestStatement: s.periodEnd,
        });
      }
    }

    const liabilityByAuthor = Array.from(groupedMap.entries())
      .map(([authorId, data]) => ({
        authorId,
        authorName: authorMap.get(authorId)?.authorName ?? "Unknown",
        titleCount: titleCounts.get(authorId) ?? 0,
        ...data,
        paymentMethod: authorMap.get(authorId)?.paymentMethod ?? null,
      }))
      .sort((a, b) => b.totalOwed - a.totalOwed);

    const advanceBalances = contracts
      .filter((c) => c.advanceAmount > c.advanceRecouped)
      .map((c) => ({
        authorId: c.authorId,
        authorName: authorMap.get(c.authorId)?.authorName ?? "Unknown",
        contractId: c.contractId,
        titleName: c.titleName,
        advanceAmount: c.advanceAmount,
        advanceRecouped: c.advanceRecouped,
        advanceRemaining: c.advanceAmount - c.advanceRecouped,
      }))
      .sort((a, b) => b.advanceRemaining - a.advanceRemaining);

    return {
      totalUnpaidLiability,
      authorsWithPendingPayments,
      oldestUnpaidStatement,
      averagePaymentPerAuthor,
      liabilityByAuthor,
      advanceBalances,
    };
  };

  it("handles empty statements and contracts", () => {
    const result = calculateSummary([], [], [], new Map());

    expect(result.totalUnpaidLiability).toBe(0);
    expect(result.authorsWithPendingPayments).toBe(0);
    expect(result.oldestUnpaidStatement).toBeNull();
    expect(result.averagePaymentPerAuthor).toBe(0);
    expect(result.liabilityByAuthor).toHaveLength(0);
    expect(result.advanceBalances).toHaveLength(0);
  });

  it("handles statements but no advances", () => {
    const statements: StatementRecord[] = [
      {
        authorId: "a1",
        netPayable: 100,
        periodEnd: new Date("2024-06-30"),
        tenantId: "t1",
      },
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author", paymentMethod: null },
    ];

    const result = calculateSummary(
      statements,
      [],
      authors,
      new Map([["a1", 1]]),
    );

    expect(result.totalUnpaidLiability).toBe(100);
    expect(result.authorsWithPendingPayments).toBe(1);
    expect(result.liabilityByAuthor).toHaveLength(1);
    expect(result.advanceBalances).toHaveLength(0);
  });

  it("handles advances but no statements", () => {
    const contracts: ContractRecord[] = [
      {
        contractId: "c1",
        authorId: "a1",
        titleId: "t1",
        titleName: "Book",
        advanceAmount: 5000,
        advanceRecouped: 1000,
        tenantId: "t1",
      },
    ];

    const authors: AuthorRecord[] = [
      { authorId: "a1", authorName: "Author", paymentMethod: null },
    ];

    const result = calculateSummary([], contracts, authors, new Map());

    expect(result.totalUnpaidLiability).toBe(0);
    expect(result.authorsWithPendingPayments).toBe(0);
    expect(result.liabilityByAuthor).toHaveLength(0);
    expect(result.advanceBalances).toHaveLength(1);
    expect(result.advanceBalances[0].advanceRemaining).toBe(4000);
  });
});

describe("Royalty Liability Report Permission Validation", () => {
  const LIABILITY_REPORT_ACCESS = ["finance", "admin", "owner"];

  const hasLiabilityReportAccess = (role: string): boolean =>
    LIABILITY_REPORT_ACCESS.includes(role);

  it("finance has access to liability report", () => {
    expect(hasLiabilityReportAccess("finance")).toBe(true);
  });

  it("admin has access to liability report", () => {
    expect(hasLiabilityReportAccess("admin")).toBe(true);
  });

  it("owner has access to liability report", () => {
    expect(hasLiabilityReportAccess("owner")).toBe(true);
  });

  it("editor does NOT have access to liability report", () => {
    expect(hasLiabilityReportAccess("editor")).toBe(false);
  });

  it("author does NOT have access to liability report", () => {
    expect(hasLiabilityReportAccess("author")).toBe(false);
  });
});
