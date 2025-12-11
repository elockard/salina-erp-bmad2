/**
 * Split Statement PDF Unit Tests
 *
 * Story 10.3: Generate Split Royalty Statements for Co-Authors
 * Task 2: Implement PDF Co-Author Display
 *
 * Tests that CoAuthorSection component renders correctly for split statements.
 *
 * AC-10.3.4: Statement PDF clearly indicates this is a co-authored title
 * - Display: "Your share: X% of [Title Name]" in statement
 * - Show co-author's ownership percentage in header or summary section
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { StatementPDF } from "@/modules/statements/pdf/statement-pdf";
import type { StatementPDFData } from "@/modules/statements/types";

// Helper to create base PDF data
function createBasePDFData(
  overrides: Partial<StatementPDFData> = {},
): StatementPDFData {
  return {
    statementId: "stmt-test-123",
    titleName: "Test Book Title",
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
      formatBreakdowns: [
        {
          format: "physical",
          totalQuantity: 100,
          totalRevenue: 2000,
          tierBreakdowns: [
            {
              tierMinQuantity: 0,
              tierMaxQuantity: null,
              tierRate: 0.1,
              quantityInTier: 100,
              royaltyEarned: 200,
            },
          ],
          formatRoyalty: 200,
        },
      ],
      returnsDeduction: 0,
      grossRoyalty: 200,
      advanceRecoupment: {
        originalAdvance: 0,
        previouslyRecouped: 0,
        thisPeriodsRecoupment: 0,
        remainingAdvance: 0,
      },
      netPayable: 200,
    },
    ...overrides,
  };
}

describe("Split Statement PDF", () => {
  describe("CoAuthorSection", () => {
    it("should render co-author section when splitCalculation is present", () => {
      // AC-10.3.4: Display: "Your share: X% of [Title Name]" in statement
      const data = createBasePDFData({
        titleName: "Co-Authored Book",
        calculations: {
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
        },
      });

      // Render PDF to static markup (without PDF-specific components)
      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should contain ownership percentage and title name
      expect(markup).toContain("60%");
      expect(markup).toContain("Co-Authored Book");
      expect(markup).toContain("Your share");
    });

    it("should NOT render co-author section for single-author statements", () => {
      // AC-10.3.10: No splitCalculation object for single-author statements
      const data = createBasePDFData({
        titleName: "Solo Author Book",
        // No splitCalculation in calculations
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should NOT contain "Your share" text
      expect(markup).not.toContain("Your share");
    });

    it("should display correct percentage for 40% ownership", () => {
      const data = createBasePDFData({
        titleName: "Another Co-Authored Book",
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 400,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 400,
          splitCalculation: {
            titleTotalRoyalty: 1000,
            ownershipPercentage: 40,
            isSplitCalculation: true,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).toContain("40%");
      expect(markup).toContain("Another Co-Authored Book");
    });

    it("should apply correct styling (light blue background)", () => {
      // AC-10.3.4: Style: light blue background (#dbeafe)
      const data = createBasePDFData({
        calculations: {
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
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Check for styling indicators (backgroundColor in style)
      expect(markup).toContain("#dbeafe");
    });
  });

  describe("PDF structure with co-author section", () => {
    it("should maintain correct section order with co-author section", () => {
      // AC-10.3.4: Insert between Header and AuthorInfo sections
      const data = createBasePDFData({
        calculations: {
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
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Verify section order: Header -> CoAuthor -> AuthorInfo -> Summary
      const headerPos = markup.indexOf("ROYALTY STATEMENT");
      const coAuthorPos = markup.indexOf("Your share");
      const authorInfoPos = markup.indexOf("Author Information");
      const summaryPos = markup.indexOf("Summary");

      expect(headerPos).toBeLessThan(coAuthorPos);
      expect(coAuthorPos).toBeLessThan(authorInfoPos);
      expect(authorInfoPos).toBeLessThan(summaryPos);
    });
  });

  describe("LifetimeSection (Story 10.4: AC-10.4.6)", () => {
    it("should render lifetime section when lifetimeContext is present", () => {
      // AC-10.4.6: PDF includes lifetime sales context
      const data = createBasePDFData({
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 500,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 500,
          lifetimeContext: {
            tierCalculationMode: "lifetime",
            lifetimeSalesBefore: 4500,
            lifetimeSalesAfter: 5000,
            lifetimeRevenueBefore: 90000,
            lifetimeRevenueAfter: 100000,
            currentTierRate: 0.12,
            nextTierThreshold: 10000,
            unitsToNextTier: 5000,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should contain lifetime sales progress info
      expect(markup).toContain("Lifetime Sales Progress");
      expect(markup).toContain("4,500"); // Before
      expect(markup).toContain("5,000"); // After
      expect(markup).toContain("12.0%"); // Current tier rate
    });

    it("should NOT render lifetime section for period mode", () => {
      // AC-10.4.6: Only shows for lifetime tier calculation mode
      const data = createBasePDFData({
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 500,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 500,
          lifetimeContext: {
            tierCalculationMode: "period",
            lifetimeSalesBefore: 4500,
            lifetimeSalesAfter: 5000,
            lifetimeRevenueBefore: 90000,
            lifetimeRevenueAfter: 100000,
            currentTierRate: 0.1,
            nextTierThreshold: null,
            unitsToNextTier: null,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should NOT contain lifetime sales progress
      expect(markup).not.toContain("Lifetime Sales Progress");
    });

    it("should NOT render lifetime section when lifetimeContext is absent", () => {
      const data = createBasePDFData({
        // No lifetimeContext
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).not.toContain("Lifetime Sales Progress");
    });

    it("should show highest tier message when unitsToNextTier is null", () => {
      const data = createBasePDFData({
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 500,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 500,
          lifetimeContext: {
            tierCalculationMode: "lifetime",
            lifetimeSalesBefore: 15000,
            lifetimeSalesAfter: 15500,
            lifetimeRevenueBefore: 300000,
            lifetimeRevenueAfter: 310000,
            currentTierRate: 0.15,
            nextTierThreshold: null,
            unitsToNextTier: null,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should show highest tier message
      expect(markup).toContain("Highest tier reached");
    });

    it("should show units to next tier when available", () => {
      const data = createBasePDFData({
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 500,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 500,
          lifetimeContext: {
            tierCalculationMode: "lifetime",
            lifetimeSalesBefore: 4500,
            lifetimeSalesAfter: 5000,
            lifetimeRevenueBefore: 90000,
            lifetimeRevenueAfter: 100000,
            currentTierRate: 0.12,
            nextTierThreshold: 10000,
            unitsToNextTier: 5000,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Should show units to next tier
      expect(markup).toContain("5,000");
      expect(markup).toContain("next tier");
    });

    it("should apply green background styling for lifetime section", () => {
      // AC-10.4.6: Style with green theme for progress
      const data = createBasePDFData({
        calculations: {
          period: { startDate: "2025-01-01", endDate: "2025-03-31" },
          formatBreakdowns: [],
          returnsDeduction: 0,
          grossRoyalty: 500,
          advanceRecoupment: {
            originalAdvance: 0,
            previouslyRecouped: 0,
            thisPeriodsRecoupment: 0,
            remainingAdvance: 0,
          },
          netPayable: 500,
          lifetimeContext: {
            tierCalculationMode: "lifetime",
            lifetimeSalesBefore: 4500,
            lifetimeSalesAfter: 5000,
            lifetimeRevenueBefore: 90000,
            lifetimeRevenueAfter: 100000,
            currentTierRate: 0.12,
            nextTierThreshold: 10000,
            unitsToNextTier: 5000,
          },
        },
      });

      const element = <StatementPDF data={data} />;
      const markup = renderToStaticMarkup(element);

      // Check for green styling indicators
      expect(markup).toContain("#f0fdf4"); // Green background
    });
  });
});
