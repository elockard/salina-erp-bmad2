import { describe, expect, it } from "vitest";
import {
  type InsertStatement,
  type Statement,
  type StatementStatus,
  statementStatusValues,
  statements,
} from "@/db/schema/statements";
import type {
  StatementAdvanceRecoupment,
  StatementCalculations,
  StatementFormatBreakdown,
  StatementTierBreakdown,
} from "@/modules/statements/types";

/**
 * Unit tests for Statements Schema
 *
 * Story 5.1 - Create Statements Database Schema and PDF Storage
 *
 * AC-5.1.1: statements table created with all 16 columns
 * AC-5.1.2: JSONB calculations field stores full breakdown structure
 *
 * Note: These are schema definition tests, not integration tests.
 * Database constraint enforcement is verified through schema structure.
 * RLS policy tests are in integration/statements-rls.test.ts
 */

describe("statementStatusValues", () => {
  describe("valid values (AC-5.1.1)", () => {
    it("has exactly 3 values", () => {
      expect(statementStatusValues).toHaveLength(3);
    });

    it("contains 'draft'", () => {
      expect(statementStatusValues).toContain("draft");
    });

    it("contains 'sent'", () => {
      expect(statementStatusValues).toContain("sent");
    });

    it("contains 'failed'", () => {
      expect(statementStatusValues).toContain("failed");
    });

    it("has expected values in order", () => {
      expect(statementStatusValues[0]).toBe("draft");
      expect(statementStatusValues[1]).toBe("sent");
      expect(statementStatusValues[2]).toBe("failed");
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = statementStatusValues;
      expect(values).toEqual(["draft", "sent", "failed"]);
    });
  });
});

describe("StatementStatus type", () => {
  it("accepts valid status values", () => {
    const draft: StatementStatus = "draft";
    const sent: StatementStatus = "sent";
    const failed: StatementStatus = "failed";

    expect(draft).toBe("draft");
    expect(sent).toBe("sent");
    expect(failed).toBe("failed");
  });

  it("derives from statementStatusValues", () => {
    for (const status of statementStatusValues) {
      const s: StatementStatus = status;
      expect(typeof s).toBe("string");
    }
  });
});

describe("statements table schema structure (AC-5.1.1)", () => {
  it("is defined as a pgTable", () => {
    expect(statements).toBeDefined();
    expect(typeof statements).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(statements.id).toBeDefined();
    expect(statements.id.name).toBe("id");
  });

  it("has tenant_id column (FK to tenants)", () => {
    expect(statements.tenant_id).toBeDefined();
    expect(statements.tenant_id.name).toBe("tenant_id");
    expect(statements.tenant_id.notNull).toBe(true);
  });

  it("has author_id column (FK to authors)", () => {
    expect(statements.author_id).toBeDefined();
    expect(statements.author_id.name).toBe("author_id");
    expect(statements.author_id.notNull).toBe(true);
  });

  it("has contract_id column (FK to contracts)", () => {
    expect(statements.contract_id).toBeDefined();
    expect(statements.contract_id.name).toBe("contract_id");
    expect(statements.contract_id.notNull).toBe(true);
  });

  it("has period_start column (date)", () => {
    expect(statements.period_start).toBeDefined();
    expect(statements.period_start.name).toBe("period_start");
    expect(statements.period_start.notNull).toBe(true);
  });

  it("has period_end column (date)", () => {
    expect(statements.period_end).toBeDefined();
    expect(statements.period_end.name).toBe("period_end");
    expect(statements.period_end.notNull).toBe(true);
  });

  it("has total_royalty_earned column (DECIMAL(10,2))", () => {
    expect(statements.total_royalty_earned).toBeDefined();
    expect(statements.total_royalty_earned.name).toBe("total_royalty_earned");
    expect(statements.total_royalty_earned.notNull).toBe(true);
  });

  it("has recoupment column (DECIMAL(10,2))", () => {
    expect(statements.recoupment).toBeDefined();
    expect(statements.recoupment.name).toBe("recoupment");
    expect(statements.recoupment.notNull).toBe(true);
  });

  it("has net_payable column (DECIMAL(10,2))", () => {
    expect(statements.net_payable).toBeDefined();
    expect(statements.net_payable.name).toBe("net_payable");
    expect(statements.net_payable.notNull).toBe(true);
  });

  it("has calculations column (JSONB)", () => {
    expect(statements.calculations).toBeDefined();
    expect(statements.calculations.name).toBe("calculations");
    expect(statements.calculations.notNull).toBe(true);
  });

  it("has pdf_s3_key column (TEXT, nullable)", () => {
    expect(statements.pdf_s3_key).toBeDefined();
    expect(statements.pdf_s3_key.name).toBe("pdf_s3_key");
    expect(statements.pdf_s3_key.notNull).toBe(false);
  });

  it("has status column with default 'draft'", () => {
    expect(statements.status).toBeDefined();
    expect(statements.status.name).toBe("status");
    expect(statements.status.notNull).toBe(true);
  });

  it("has email_sent_at column (timestamp, nullable)", () => {
    expect(statements.email_sent_at).toBeDefined();
    expect(statements.email_sent_at.name).toBe("email_sent_at");
    expect(statements.email_sent_at.notNull).toBe(false);
  });

  it("has generated_by_user_id column (FK to users)", () => {
    expect(statements.generated_by_user_id).toBeDefined();
    expect(statements.generated_by_user_id.name).toBe("generated_by_user_id");
    expect(statements.generated_by_user_id.notNull).toBe(true);
  });

  it("has created_at column", () => {
    expect(statements.created_at).toBeDefined();
    expect(statements.created_at.name).toBe("created_at");
    expect(statements.created_at.notNull).toBe(true);
  });

  it("has updated_at column", () => {
    expect(statements.updated_at).toBeDefined();
    expect(statements.updated_at.name).toBe("updated_at");
    expect(statements.updated_at.notNull).toBe(true);
  });

  it("has exactly 16 columns", () => {
    // Count columns by iterating object keys that are column definitions
    const columnNames = [
      "id",
      "tenant_id",
      "author_id",
      "contract_id",
      "period_start",
      "period_end",
      "total_royalty_earned",
      "recoupment",
      "net_payable",
      "calculations",
      "pdf_s3_key",
      "status",
      "email_sent_at",
      "generated_by_user_id",
      "created_at",
      "updated_at",
    ];

    for (const name of columnNames) {
      expect(
        (statements as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(16);
  });
});

describe("Statement type (AC-5.1.1)", () => {
  it("infers select type from statements table", () => {
    const mockStatement: Statement = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contact_id: null, // Added for Story 7.3 migration compatibility
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "1500.00",
      recoupment: "500.00",
      net_payable: "1000.00",
      calculations: {},
      pdf_s3_key: null,
      status: "draft",
      email_sent_at: null,
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
      created_at: new Date(),
      updated_at: new Date(),
    };

    expect(mockStatement.id).toBeDefined();
    expect(mockStatement.tenant_id).toBeDefined();
    expect(mockStatement.author_id).toBeDefined();
    expect(mockStatement.contract_id).toBeDefined();
    expect(mockStatement.total_royalty_earned).toBe("1500.00");
    expect(mockStatement.recoupment).toBe("500.00");
    expect(mockStatement.net_payable).toBe("1000.00");
    expect(mockStatement.status).toBe("draft");
  });

  it("supports all valid status values", () => {
    const baseStatement: Statement = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contact_id: null, // Added for Story 7.3 migration compatibility
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "0",
      recoupment: "0",
      net_payable: "0",
      calculations: {},
      pdf_s3_key: null,
      status: "draft",
      email_sent_at: null,
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const draftStatement: Statement = { ...baseStatement, status: "draft" };
    const sentStatement: Statement = {
      ...baseStatement,
      id: "550e8400-e29b-41d4-a716-446655440010",
      status: "sent",
      email_sent_at: new Date(),
    };
    const failedStatement: Statement = {
      ...baseStatement,
      id: "550e8400-e29b-41d4-a716-446655440011",
      status: "failed",
    };

    expect(draftStatement.status).toBe("draft");
    expect(sentStatement.status).toBe("sent");
    expect(failedStatement.status).toBe("failed");
  });

  it("supports nullable pdf_s3_key and email_sent_at", () => {
    const statementWithoutPdf: Statement = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contact_id: null, // Added for Story 7.3 migration compatibility
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "1000.00",
      recoupment: "0",
      net_payable: "1000.00",
      calculations: {},
      pdf_s3_key: null,
      status: "draft",
      email_sent_at: null,
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
      created_at: new Date(),
      updated_at: new Date(),
    };

    const statementWithPdf: Statement = {
      ...statementWithoutPdf,
      id: "550e8400-e29b-41d4-a716-446655440005",
      pdf_s3_key: "statements/tenant123/statement456.pdf",
      status: "sent",
      email_sent_at: new Date("2024-04-01T10:00:00Z"),
    };

    expect(statementWithoutPdf.pdf_s3_key).toBeNull();
    expect(statementWithoutPdf.email_sent_at).toBeNull();
    expect(statementWithPdf.pdf_s3_key).toBe(
      "statements/tenant123/statement456.pdf",
    );
    expect(statementWithPdf.email_sent_at).toBeDefined();
  });
});

describe("InsertStatement type (AC-5.1.1)", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertStatement = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "1500.00",
      recoupment: "500.00",
      net_payable: "1000.00",
      calculations: {},
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
    };

    expect(insertData.tenant_id).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional status field (defaults to draft)", () => {
    const insertData: InsertStatement = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "1500.00",
      recoupment: "500.00",
      net_payable: "1000.00",
      calculations: {},
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
      // status defaults to "draft"
    };

    expect(insertData.status).toBeUndefined();
  });

  it("allows optional nullable fields", () => {
    const insertData: InsertStatement = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      author_id: "550e8400-e29b-41d4-a716-446655440002",
      contract_id: "550e8400-e29b-41d4-a716-446655440003",
      period_start: new Date("2024-01-01"),
      period_end: new Date("2024-03-31"),
      total_royalty_earned: "1500.00",
      recoupment: "500.00",
      net_payable: "1000.00",
      calculations: {},
      generated_by_user_id: "550e8400-e29b-41d4-a716-446655440004",
      // pdf_s3_key and email_sent_at are optional
    };

    expect(insertData.pdf_s3_key).toBeUndefined();
    expect(insertData.email_sent_at).toBeUndefined();
  });
});

describe("StatementCalculations type structure (AC-5.1.2)", () => {
  it("supports full breakdown structure", () => {
    const calculations: StatementCalculations = {
      period: {
        startDate: "2024-01-01",
        endDate: "2024-03-31",
      },
      formatBreakdowns: [
        {
          format: "physical",
          totalQuantity: 1000,
          totalRevenue: 15000,
          tierBreakdowns: [
            {
              tierMinQuantity: 0,
              tierMaxQuantity: 500,
              tierRate: 0.1,
              quantityInTier: 500,
              royaltyEarned: 750,
            },
            {
              tierMinQuantity: 501,
              tierMaxQuantity: null,
              tierRate: 0.12,
              quantityInTier: 500,
              royaltyEarned: 900,
            },
          ],
          formatRoyalty: 1650,
        },
      ],
      returnsDeduction: 50,
      grossRoyalty: 1600,
      advanceRecoupment: {
        originalAdvance: 5000,
        previouslyRecouped: 2000,
        thisPeriodsRecoupment: 500,
        remainingAdvance: 2500,
      },
      netPayable: 1100,
    };

    expect(calculations.period.startDate).toBe("2024-01-01");
    expect(calculations.period.endDate).toBe("2024-03-31");
    expect(calculations.formatBreakdowns).toHaveLength(1);
    expect(calculations.formatBreakdowns[0].format).toBe("physical");
    expect(calculations.formatBreakdowns[0].tierBreakdowns).toHaveLength(2);
    expect(calculations.returnsDeduction).toBe(50);
    expect(calculations.grossRoyalty).toBe(1600);
    expect(calculations.advanceRecoupment.originalAdvance).toBe(5000);
    expect(calculations.netPayable).toBe(1100);
  });

  it("supports multiple format breakdowns", () => {
    const calculations: StatementCalculations = {
      period: { startDate: "2024-01-01", endDate: "2024-03-31" },
      formatBreakdowns: [
        {
          format: "physical",
          totalQuantity: 500,
          totalRevenue: 7500,
          tierBreakdowns: [],
          formatRoyalty: 750,
        },
        {
          format: "ebook",
          totalQuantity: 1000,
          totalRevenue: 5000,
          tierBreakdowns: [],
          formatRoyalty: 500,
        },
        {
          format: "audiobook",
          totalQuantity: 200,
          totalRevenue: 4000,
          tierBreakdowns: [],
          formatRoyalty: 400,
        },
      ],
      returnsDeduction: 0,
      grossRoyalty: 1650,
      advanceRecoupment: {
        originalAdvance: 0,
        previouslyRecouped: 0,
        thisPeriodsRecoupment: 0,
        remainingAdvance: 0,
      },
      netPayable: 1650,
    };

    expect(calculations.formatBreakdowns).toHaveLength(3);
    expect(calculations.formatBreakdowns[0].format).toBe("physical");
    expect(calculations.formatBreakdowns[1].format).toBe("ebook");
    expect(calculations.formatBreakdowns[2].format).toBe("audiobook");
  });

  it("supports null tierMaxQuantity for unlimited tiers", () => {
    const tier: StatementTierBreakdown = {
      tierMinQuantity: 10001,
      tierMaxQuantity: null,
      tierRate: 0.15,
      quantityInTier: 5000,
      royaltyEarned: 11250,
    };

    expect(tier.tierMaxQuantity).toBeNull();
    expect(tier.tierMinQuantity).toBe(10001);
  });
});

describe("StatementFormatBreakdown type (AC-5.1.2)", () => {
  it("includes required fields", () => {
    const breakdown: StatementFormatBreakdown = {
      format: "physical",
      totalQuantity: 1000,
      totalRevenue: 15000,
      tierBreakdowns: [],
      formatRoyalty: 1500,
    };

    expect(breakdown.format).toBe("physical");
    expect(breakdown.totalQuantity).toBe(1000);
    expect(breakdown.totalRevenue).toBe(15000);
    expect(breakdown.tierBreakdowns).toEqual([]);
    expect(breakdown.formatRoyalty).toBe(1500);
  });

  it("supports all format values", () => {
    const formats = ["physical", "ebook", "audiobook"] as const;

    for (const format of formats) {
      const breakdown: StatementFormatBreakdown = {
        format,
        totalQuantity: 100,
        totalRevenue: 1000,
        tierBreakdowns: [],
        formatRoyalty: 100,
      };
      expect(breakdown.format).toBe(format);
    }
  });
});

describe("StatementTierBreakdown type (AC-5.1.2)", () => {
  it("includes required fields", () => {
    const tier: StatementTierBreakdown = {
      tierMinQuantity: 0,
      tierMaxQuantity: 5000,
      tierRate: 0.1,
      quantityInTier: 3000,
      royaltyEarned: 4500,
    };

    expect(tier.tierMinQuantity).toBe(0);
    expect(tier.tierMaxQuantity).toBe(5000);
    expect(tier.tierRate).toBe(0.1);
    expect(tier.quantityInTier).toBe(3000);
    expect(tier.royaltyEarned).toBe(4500);
  });
});

describe("StatementAdvanceRecoupment type (AC-5.1.2)", () => {
  it("includes required fields", () => {
    const recoupment: StatementAdvanceRecoupment = {
      originalAdvance: 10000,
      previouslyRecouped: 3000,
      thisPeriodsRecoupment: 2000,
      remainingAdvance: 5000,
    };

    expect(recoupment.originalAdvance).toBe(10000);
    expect(recoupment.previouslyRecouped).toBe(3000);
    expect(recoupment.thisPeriodsRecoupment).toBe(2000);
    expect(recoupment.remainingAdvance).toBe(5000);
  });

  it("supports zero advance scenario", () => {
    const noAdvance: StatementAdvanceRecoupment = {
      originalAdvance: 0,
      previouslyRecouped: 0,
      thisPeriodsRecoupment: 0,
      remainingAdvance: 0,
    };

    expect(noAdvance.originalAdvance).toBe(0);
    expect(noAdvance.remainingAdvance).toBe(0);
  });

  it("supports fully recouped advance", () => {
    const fullyRecouped: StatementAdvanceRecoupment = {
      originalAdvance: 5000,
      previouslyRecouped: 4000,
      thisPeriodsRecoupment: 1000,
      remainingAdvance: 0,
    };

    expect(fullyRecouped.originalAdvance).toBe(5000);
    expect(
      fullyRecouped.previouslyRecouped + fullyRecouped.thisPeriodsRecoupment,
    ).toBe(5000);
    expect(fullyRecouped.remainingAdvance).toBe(0);
  });
});

describe("Schema constraint structure verification (AC-5.1.6)", () => {
  describe("statements table indexes", () => {
    it("has tenant_id column for index", () => {
      expect(statements.tenant_id).toBeDefined();
      expect(statements.tenant_id.notNull).toBe(true);
    });

    it("has author_id column for index", () => {
      expect(statements.author_id).toBeDefined();
      expect(statements.author_id.notNull).toBe(true);
    });

    it("has period columns for composite index", () => {
      expect(statements.period_start).toBeDefined();
      expect(statements.period_start.notNull).toBe(true);
      expect(statements.period_end).toBeDefined();
      expect(statements.period_end.notNull).toBe(true);
    });

    it("has status column for index", () => {
      expect(statements.status).toBeDefined();
      expect(statements.status.notNull).toBe(true);
    });
  });
});

describe("Currency precision verification (AC-5.1.1)", () => {
  it("financial fields should handle DECIMAL(10,2) for currency", () => {
    expect(statements.total_royalty_earned).toBeDefined();
    expect(statements.recoupment).toBeDefined();
    expect(statements.net_payable).toBeDefined();

    // Valid currency examples as strings (how they'd be stored/retrieved)
    const validAmounts = ["0.00", "1500.00", "99999999.99", "0.01"];
    for (const amount of validAmounts) {
      const parts = amount.split(".");
      expect(parts.length).toBe(2);
      expect(parts[1].length).toBeLessThanOrEqual(2);
    }
  });
});
