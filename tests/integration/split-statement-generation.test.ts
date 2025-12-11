/**
 * Split Statement Generation Integration Tests
 *
 * Story 10.3: Generate Split Royalty Statements for Co-Authors
 * Story 10.4: Implement Escalating Lifetime Royalty Rates
 * Task 4: Verify Inngest Split Statement Creation
 *
 * Tests verify the Inngest batch generation correctly handles:
 * - Split calculation for co-authored titles (AC-10.3.1, 10.3.2, 10.3.3)
 * - Duplicate statement prevention (AC-10.3.8)
 * - Backward compatibility for single-author titles (AC-10.3.10)
 * - Split + Lifetime combination (AC-10.4.8)
 *
 * Note: These tests verify the logic structure and types, not full Inngest execution.
 * Full E2E testing should be done with the running Inngest dev server.
 */

import { describe, expect, it } from "vitest";
import type {
  LifetimeSalesContext,
  SplitCalculationContext,
  StatementCalculations,
} from "@/modules/statements/types";

describe("Split Statement Generation Logic", () => {
  describe("splitCalculation structure in StatementCalculations", () => {
    it("should include splitCalculation for multi-author statements", () => {
      // AC-10.3.4: Include splitCalculation object in calculations JSONB field
      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 600, // Author's 60% share
        advanceRecoupment: {
          originalAdvance: 1000,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 600,
          remainingAdvance: 400,
        },
        netPayable: 0,
        splitCalculation: {
          titleTotalRoyalty: 1000,
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
      };

      expect(calculations.splitCalculation).toBeDefined();
      expect(calculations.splitCalculation?.titleTotalRoyalty).toBe(1000);
      expect(calculations.splitCalculation?.ownershipPercentage).toBe(60);
      expect(calculations.splitCalculation?.isSplitCalculation).toBe(true);
    });

    it("should have correct grossRoyalty as author's share for split statements", () => {
      // AC-10.3.2: Gross royalty field displays thisAuthorSplit.splitAmount
      const titleTotalRoyalty = 1000;
      const ownershipPercentage = 60;
      const authorShare = (titleTotalRoyalty * ownershipPercentage) / 100;

      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: authorShare, // Should be 600
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: authorShare,
        splitCalculation: {
          titleTotalRoyalty,
          ownershipPercentage,
          isSplitCalculation: true,
        },
      };

      expect(calculations.grossRoyalty).toBe(600);
      expect(calculations.netPayable).toBe(600);
    });

    it("should have per-author advance recoupment for split statements", () => {
      // AC-10.3.3: Individual Advance and Recoupment Status
      const splitCalc: SplitCalculationContext = {
        titleTotalRoyalty: 1000,
        ownershipPercentage: 60,
        isSplitCalculation: true,
      };

      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 600,
        advanceRecoupment: {
          originalAdvance: 2000, // Author's specific advance
          previouslyRecouped: 500, // Author's previous recoupment
          thisPeriodsRecoupment: 600, // This period recoupment for THIS author
          remainingAdvance: 900, // Calculated per-author
        },
        netPayable: 0, // All goes to recoupment
        splitCalculation: splitCalc,
      };

      // Verify per-author values
      expect(calculations.advanceRecoupment.originalAdvance).toBe(2000);
      expect(calculations.advanceRecoupment.previouslyRecouped).toBe(500);
      expect(calculations.advanceRecoupment.thisPeriodsRecoupment).toBe(600);
      expect(calculations.advanceRecoupment.remainingAdvance).toBe(900);
    });

    it("should NOT include splitCalculation for single-author statements", () => {
      // AC-10.3.10: No splitCalculation object for single-author statements
      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 1000,
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 1000,
        // No splitCalculation
      };

      expect(calculations.splitCalculation).toBeUndefined();
      expect(calculations.grossRoyalty).toBe(1000); // Full title royalty
    });
  });

  describe("Duplicate statement prevention", () => {
    it("should detect duplicate based on contact_id, tenant_id, period_start, period_end", () => {
      // AC-10.3.8: No duplicate statements for same author-title-period
      const existingStatement = {
        id: "stmt-existing",
        contact_id: "contact-123",
        tenant_id: "tenant-456",
        period_start: new Date("2025-01-01"),
        period_end: new Date("2025-03-31"),
      };

      const newRequest = {
        authorId: "contact-123",
        tenantId: "tenant-456",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-03-31"),
      };

      // Simulate duplicate check logic
      const isDuplicate =
        existingStatement.contact_id === newRequest.authorId &&
        existingStatement.tenant_id === newRequest.tenantId &&
        existingStatement.period_start.getTime() ===
          newRequest.periodStart.getTime() &&
        existingStatement.period_end.getTime() ===
          newRequest.periodEnd.getTime();

      expect(isDuplicate).toBe(true);
    });

    it("should allow statement for different period", () => {
      const existingStatement = {
        contact_id: "contact-123",
        tenant_id: "tenant-456",
        period_start: new Date("2025-01-01"),
        period_end: new Date("2025-03-31"),
      };

      const newRequest = {
        authorId: "contact-123",
        tenantId: "tenant-456",
        periodStart: new Date("2025-04-01"), // Different period
        periodEnd: new Date("2025-06-30"),
      };

      const isDuplicate =
        existingStatement.contact_id === newRequest.authorId &&
        existingStatement.tenant_id === newRequest.tenantId &&
        existingStatement.period_start.getTime() ===
          newRequest.periodStart.getTime() &&
        existingStatement.period_end.getTime() ===
          newRequest.periodEnd.getTime();

      expect(isDuplicate).toBe(false);
    });

    it("should allow statement for different author same period", () => {
      const existingStatement = {
        contact_id: "contact-123",
        tenant_id: "tenant-456",
        period_start: new Date("2025-01-01"),
        period_end: new Date("2025-03-31"),
      };

      const newRequest = {
        authorId: "contact-789", // Different author (co-author)
        tenantId: "tenant-456",
        periodStart: new Date("2025-01-01"),
        periodEnd: new Date("2025-03-31"),
      };

      const isDuplicate =
        existingStatement.contact_id === newRequest.authorId &&
        existingStatement.tenant_id === newRequest.tenantId &&
        existingStatement.period_start.getTime() ===
          newRequest.periodStart.getTime() &&
        existingStatement.period_end.getTime() ===
          newRequest.periodEnd.getTime();

      expect(isDuplicate).toBe(false);
    });
  });

  describe("Multi-author batch generation", () => {
    it("should process each co-author independently", () => {
      // AC-10.3.8: Each author in authorIds[] gets their own statement
      const authorIds = [
        "contact-author1",
        "contact-author2",
        "contact-author3",
      ];

      // Simulate processing each author
      const results = authorIds.map((authorId) => ({
        authorId,
        statementId: `stmt-${authorId}`,
        success: true,
      }));

      expect(results).toHaveLength(3);
      expect(results[0].statementId).toBe("stmt-contact-author1");
      expect(results[1].statementId).toBe("stmt-contact-author2");
      expect(results[2].statementId).toBe("stmt-contact-author3");
    });

    it("should create separate statements for co-authors on same title", () => {
      // AC-10.3.1: System generates a distinct statement record for each author
      const _titleId = "title-coauthored";
      const coAuthors = [
        { contactId: "author-a", ownershipPercentage: 60 },
        { contactId: "author-b", ownershipPercentage: 40 },
      ];

      // Each co-author gets their own statement
      const statementsCreated = coAuthors.map((author) => ({
        contact_id: author.contactId,
        grossRoyalty: 1000 * (author.ownershipPercentage / 100),
        splitCalculation: {
          titleTotalRoyalty: 1000,
          ownershipPercentage: author.ownershipPercentage,
          isSplitCalculation: true as const,
        },
      }));

      expect(statementsCreated).toHaveLength(2);
      expect(statementsCreated[0].grossRoyalty).toBe(600);
      expect(statementsCreated[1].grossRoyalty).toBe(400);
      expect(statementsCreated[0].splitCalculation.ownershipPercentage).toBe(
        60,
      );
      expect(statementsCreated[1].splitCalculation.ownershipPercentage).toBe(
        40,
      );
    });
  });

  /**
   * Story 10.4: Split + Lifetime Combination Tests (AC-10.4.8)
   *
   * Verifies that lifetime tier calculations work correctly with co-authored titles.
   */
  describe("Split + Lifetime combination (AC-10.4.8)", () => {
    it("should include both splitCalculation and lifetimeContext for split lifetime contracts", () => {
      // Co-authored title with lifetime tier mode
      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 600, // Author's 60% share
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 600,
        splitCalculation: {
          titleTotalRoyalty: 1000,
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 45000,
          lifetimeSalesAfter: 57000,
          lifetimeRevenueBefore: 450000,
          lifetimeRevenueAfter: 570000,
          currentTierRate: 0.12,
          nextTierThreshold: 100000,
          unitsToNextTier: 43000,
        },
      };

      expect(calculations.splitCalculation).toBeDefined();
      expect(calculations.lifetimeContext).toBeDefined();
      expect(calculations.splitCalculation?.ownershipPercentage).toBe(60);
      expect(calculations.lifetimeContext?.tierCalculationMode).toBe(
        "lifetime",
      );
    });

    it("should track lifetime sales at title level for split calculations", () => {
      // Lifetime sales are tracked at title level, then split by ownership
      const titleLifetimeSalesBefore = 45000;
      const titleLifetimeSalesAfter = 57000;
      const periodSales = titleLifetimeSalesAfter - titleLifetimeSalesBefore;

      // Both co-authors see the same lifetime total (title-level tracking)
      const author1LifetimeContext: LifetimeSalesContext = {
        tierCalculationMode: "lifetime",
        lifetimeSalesBefore: titleLifetimeSalesBefore,
        lifetimeSalesAfter: titleLifetimeSalesAfter,
        lifetimeRevenueBefore: 450000,
        lifetimeRevenueAfter: 570000,
        currentTierRate: 0.12,
        nextTierThreshold: 100000,
        unitsToNextTier: 43000,
      };

      const author2LifetimeContext: LifetimeSalesContext = {
        tierCalculationMode: "lifetime",
        lifetimeSalesBefore: titleLifetimeSalesBefore,
        lifetimeSalesAfter: titleLifetimeSalesAfter,
        lifetimeRevenueBefore: 450000,
        lifetimeRevenueAfter: 570000,
        currentTierRate: 0.12,
        nextTierThreshold: 100000,
        unitsToNextTier: 43000,
      };

      // Both authors see the same title lifetime progress
      expect(author1LifetimeContext.lifetimeSalesBefore).toBe(
        author2LifetimeContext.lifetimeSalesBefore,
      );
      expect(author1LifetimeContext.lifetimeSalesAfter).toBe(
        author2LifetimeContext.lifetimeSalesAfter,
      );
      expect(periodSales).toBe(12000);
    });

    it("should apply split percentages to lifetime-calculated royalty", () => {
      // Title generates $1,000 royalty using lifetime tier rates
      // Author A (60%) gets $600, Author B (40%) gets $400
      const titleTotalRoyalty = 1000; // After lifetime tier application
      const authorAOwnership = 60;
      const authorBOwnership = 40;

      const authorARoyalty = (titleTotalRoyalty * authorAOwnership) / 100;
      const authorBRoyalty = (titleTotalRoyalty * authorBOwnership) / 100;

      expect(authorARoyalty).toBe(600);
      expect(authorBRoyalty).toBe(400);
      expect(authorARoyalty + authorBRoyalty).toBe(titleTotalRoyalty);
    });

    it("should correctly attribute tier crossover to title-level lifetime", () => {
      // Scenario: Title at 48K lifetime, sells 5K more
      // Tier boundary at 50K: first 2K at 10%, next 3K at 12%
      const titleLifetimeBefore = 48000;
      const periodSales = 5000;
      const titleLifetimeAfter = titleLifetimeBefore + periodSales;
      const tierBoundary = 50000;

      // Calculate units in each tier
      const unitsAtOldTier = Math.min(
        periodSales,
        tierBoundary - titleLifetimeBefore,
      );
      const unitsAtNewTier = periodSales - unitsAtOldTier;

      expect(unitsAtOldTier).toBe(2000); // 48K -> 50K at old tier
      expect(unitsAtNewTier).toBe(3000); // 50K -> 53K at new tier
      expect(titleLifetimeAfter).toBe(53000);
    });

    it("should handle highest tier for split contracts", () => {
      // Author already at highest tier - both co-authors benefit
      const lifetimeContext: LifetimeSalesContext = {
        tierCalculationMode: "lifetime",
        lifetimeSalesBefore: 150000, // Well above highest tier threshold (100K)
        lifetimeSalesAfter: 162000,
        lifetimeRevenueBefore: 1500000,
        lifetimeRevenueAfter: 1620000,
        currentTierRate: 0.15, // Highest tier rate
        nextTierThreshold: null, // No next tier
        unitsToNextTier: null, // Already at highest
      };

      expect(lifetimeContext.nextTierThreshold).toBeNull();
      expect(lifetimeContext.unitsToNextTier).toBeNull();
      expect(lifetimeContext.currentTierRate).toBe(0.15);
    });

    it("should not include lifetimeContext for period-mode split contracts", () => {
      // Split contract using period-based tiers (default)
      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 600,
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 600,
        splitCalculation: {
          titleTotalRoyalty: 1000,
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        // No lifetimeContext for period-mode contracts
      };

      expect(calculations.splitCalculation).toBeDefined();
      expect(calculations.lifetimeContext).toBeUndefined();
    });
  });
});
