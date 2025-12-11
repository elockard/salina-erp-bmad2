/**
 * Split Statement Types Unit Tests
 *
 * Story 10.3: Generate Split Royalty Statements for Co-Authors
 * Task 1: Extend Types for Split Context
 *
 * Tests that SplitCalculationContext interface exists and integrates
 * correctly with StatementCalculations and StatementEmailProps.
 */

import { describe, expect, it } from "vitest";
import type { StatementEmailProps } from "@/modules/statements/email-template";
import type {
  SplitCalculationContext,
  StatementCalculations,
  StatementPDFData,
} from "@/modules/statements/types";

describe("Split Statement Types", () => {
  describe("SplitCalculationContext", () => {
    it("should define all required fields for split context", () => {
      // AC-10.3.4: Include splitCalculation object in calculations JSONB field
      const splitContext: SplitCalculationContext = {
        titleTotalRoyalty: 1000,
        ownershipPercentage: 60,
        isSplitCalculation: true,
      };

      expect(splitContext.titleTotalRoyalty).toBe(1000);
      expect(splitContext.ownershipPercentage).toBe(60);
      expect(splitContext.isSplitCalculation).toBe(true);
    });

    it("should enforce isSplitCalculation as true literal", () => {
      const splitContext: SplitCalculationContext = {
        titleTotalRoyalty: 500,
        ownershipPercentage: 40,
        isSplitCalculation: true,
      };

      // isSplitCalculation must always be true (discriminant for split statements)
      expect(splitContext.isSplitCalculation).toBe(true);
    });
  });

  describe("StatementCalculations with splitCalculation", () => {
    it("should allow optional splitCalculation in StatementCalculations", () => {
      // AC-10.3.4: splitCalculation is optional (single-author has none)
      const calculationsWithSplit: StatementCalculations = {
        period: {
          startDate: "2025-01-01",
          endDate: "2025-03-31",
        },
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
      };

      expect(calculationsWithSplit.splitCalculation).toBeDefined();
      expect(calculationsWithSplit.splitCalculation?.ownershipPercentage).toBe(
        60,
      );
    });

    it("should allow StatementCalculations without splitCalculation for single-author", () => {
      // AC-10.3.10: Single-author titles have no splitCalculation
      const calculationsWithoutSplit: StatementCalculations = {
        period: {
          startDate: "2025-01-01",
          endDate: "2025-03-31",
        },
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
      };

      expect(calculationsWithoutSplit.splitCalculation).toBeUndefined();
    });
  });

  describe("StatementPDFData with split context", () => {
    it("should include splitCalculation in calculations for PDF rendering", () => {
      // AC-10.3.4: PDF displays ownership percentage context
      const pdfData: StatementPDFData = {
        statementId: "stmt-123",
        titleName: "Co-Authored Book",
        author: {
          name: "John Doe",
          address: "123 Main St",
          email: "john@example.com",
        },
        calculations: {
          period: {
            startDate: "2025-01-01",
            endDate: "2025-03-31",
          },
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
        },
      };

      expect(pdfData.calculations.splitCalculation?.isSplitCalculation).toBe(
        true,
      );
      expect(pdfData.titleName).toBe("Co-Authored Book");
    });
  });

  describe("StatementEmailProps with split context", () => {
    it("should include optional splitCalculation and titleName for co-author emails", () => {
      // AC-10.3.5: Email includes ownership percentage context
      const emailProps: StatementEmailProps = {
        authorName: "John Doe",
        publisherName: "Acme Publishing",
        periodLabel: "Q1 2025",
        grossRoyalties: 600,
        recoupment: 0,
        netPayable: 600,
        portalUrl: "https://portal.example.com",
        statementId: "stmt-123",
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
      };

      expect(emailProps.splitCalculation?.ownershipPercentage).toBe(60);
      expect(emailProps.titleName).toBe("Co-Authored Book");
    });

    it("should allow StatementEmailProps without split context for single-author", () => {
      // AC-10.3.10: Single-author emails have no split context
      const emailProps: StatementEmailProps = {
        authorName: "Jane Smith",
        publisherName: "Acme Publishing",
        periodLabel: "Q1 2025",
        grossRoyalties: 1000,
        recoupment: 0,
        netPayable: 1000,
        portalUrl: "https://portal.example.com",
        statementId: "stmt-456",
      };

      expect(emailProps.splitCalculation).toBeUndefined();
      expect(emailProps.titleName).toBeUndefined();
    });
  });
});
