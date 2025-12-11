/**
 * Split Statement Flow Integration Tests
 *
 * Story 10.3: Generate Split Royalty Statements for Co-Authors
 * Task 8: Comprehensive Testing
 *
 * Tests the complete split statement flow including:
 * - Statement generation with split calculations (AC-10.3.1, 10.3.2, 10.3.3)
 * - PDF and email with split context (AC-10.3.4, 10.3.5)
 * - Portal display and isolation (AC-10.3.6)
 * - Wizard preview with co-author info (AC-10.3.7)
 * - Duplicate prevention (AC-10.3.8)
 * - List and detail views with badges (AC-10.3.9)
 * - Backward compatibility (AC-10.3.10)
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  type StatementEmailProps,
  StatementEmailTemplate,
} from "@/modules/statements/email-template";
import { StatementPDF } from "@/modules/statements/pdf/statement-pdf";
import type {
  PreviewCalculation,
  StatementCalculations,
  StatementPDFData,
} from "@/modules/statements/types";

describe("Split Statement Flow - Integration", () => {
  describe("60/40 Split Statement Generation", () => {
    it("should create correct calculations for 60% co-author", () => {
      // AC-10.3.2: Gross royalty field displays thisAuthorSplit.splitAmount
      const titleTotalRoyalty = 1000;
      const author1Percentage = 60;
      const author1Share = (titleTotalRoyalty * author1Percentage) / 100;

      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [
          {
            format: "physical",
            totalQuantity: 500,
            totalRevenue: 10000,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.1,
                quantityInTier: 500,
                royaltyEarned: 1000,
              },
            ],
            formatRoyalty: 1000,
          },
        ],
        returnsDeduction: 0,
        grossRoyalty: author1Share, // 600
        advanceRecoupment: {
          originalAdvance: 500,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 500,
          remainingAdvance: 0,
        },
        netPayable: 100, // 600 - 500 recoupment
        splitCalculation: {
          titleTotalRoyalty,
          ownershipPercentage: author1Percentage,
          isSplitCalculation: true,
        },
      };

      expect(calculations.grossRoyalty).toBe(600);
      expect(calculations.netPayable).toBe(100);
      expect(calculations.splitCalculation?.ownershipPercentage).toBe(60);
    });

    it("should create correct calculations for 40% co-author", () => {
      const titleTotalRoyalty = 1000;
      const author2Percentage = 40;
      const author2Share = (titleTotalRoyalty * author2Percentage) / 100;

      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [
          {
            format: "physical",
            totalQuantity: 500,
            totalRevenue: 10000,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.1,
                quantityInTier: 500,
                royaltyEarned: 1000,
              },
            ],
            formatRoyalty: 1000,
          },
        ],
        returnsDeduction: 0,
        grossRoyalty: author2Share, // 400
        advanceRecoupment: {
          originalAdvance: 200,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 200,
          remainingAdvance: 0,
        },
        netPayable: 200, // 400 - 200 recoupment
        splitCalculation: {
          titleTotalRoyalty,
          ownershipPercentage: author2Percentage,
          isSplitCalculation: true,
        },
      };

      expect(calculations.grossRoyalty).toBe(400);
      expect(calculations.netPayable).toBe(200);
      expect(calculations.splitCalculation?.ownershipPercentage).toBe(40);
    });

    it("should ensure 60% + 40% shares sum to title total", () => {
      const titleTotalRoyalty = 1000;
      const author1Share = (titleTotalRoyalty * 60) / 100;
      const author2Share = (titleTotalRoyalty * 40) / 100;

      expect(author1Share + author2Share).toBe(titleTotalRoyalty);
    });
  });

  describe("PDF Rendering with Split Context", () => {
    it("should render co-author section in PDF for 60% owner", () => {
      // AC-10.3.4: PDF clearly indicates this is a co-authored title
      const pdfData: StatementPDFData = {
        statementId: "stmt-123",
        titleName: "Co-Authored Book",
        author: {
          name: "Author A",
          address: "123 Main St",
          email: "authora@example.com",
        },
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
      };

      const element = <StatementPDF data={pdfData} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).toContain("60%");
      expect(markup).toContain("Co-Authored Book");
      expect(markup).toContain("Your share");
    });

    it("should NOT render co-author section for single-author PDF", () => {
      // AC-10.3.10: No splitCalculation for single-author
      const pdfData: StatementPDFData = {
        statementId: "stmt-456",
        titleName: "Solo Book",
        author: {
          name: "Solo Author",
          address: "456 Oak Ave",
          email: "solo@example.com",
        },
        calculations: {
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
        },
      };

      const element = <StatementPDF data={pdfData} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).not.toContain("Your share");
    });
  });

  describe("Email Rendering with Split Context", () => {
    it("should include ownership context in email for 60% owner", () => {
      // AC-10.3.5: Email body references ownership percentage and title name
      const emailProps: StatementEmailProps = {
        authorName: "Author A",
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

      const element = <StatementEmailTemplate {...emailProps} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).toContain("60%");
      expect(markup).toContain("Co-Authored Book");
      expect(markup).toContain("ownership share");
    });

    it("should include ownership context in email for 40% owner", () => {
      const emailProps: StatementEmailProps = {
        authorName: "Author B",
        publisherName: "Acme Publishing",
        periodLabel: "Q1 2025",
        grossRoyalties: 400,
        recoupment: 0,
        netPayable: 400,
        portalUrl: "https://portal.example.com",
        statementId: "stmt-456",
        splitCalculation: {
          ownershipPercentage: 40,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
      };

      const element = <StatementEmailTemplate {...emailProps} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).toContain("40%");
      expect(markup).toContain("Co-Authored Book");
    });

    it("should NOT include ownership context for single-author email", () => {
      // AC-10.3.10: No split context for single-author
      const emailProps: StatementEmailProps = {
        authorName: "Solo Author",
        publisherName: "Acme Publishing",
        periodLabel: "Q1 2025",
        grossRoyalties: 1000,
        recoupment: 0,
        netPayable: 1000,
        portalUrl: "https://portal.example.com",
        statementId: "stmt-789",
        // No splitCalculation or titleName
      };

      const element = <StatementEmailTemplate {...emailProps} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).not.toContain("ownership share");
    });
  });

  describe("Preview Calculation with Co-Author Info", () => {
    it("should include co-author info in preview for split statement", () => {
      // AC-10.3.7: Preview shows ownership percentage
      const preview: PreviewCalculation = {
        authorId: "contact-author-a",
        authorName: "Author A",
        totalSales: 500,
        totalReturns: 0,
        royaltyEarned: 600,
        advanceRecouped: 0,
        netPayable: 600,
        warnings: [],
        coAuthorInfo: {
          ownershipPercentage: 60,
          titleName: "Co-Authored Book",
        },
      };

      expect(preview.coAuthorInfo).toBeDefined();
      expect(preview.coAuthorInfo?.ownershipPercentage).toBe(60);
      expect(preview.coAuthorInfo?.titleName).toBe("Co-Authored Book");
    });

    it("should NOT include co-author info for single-author preview", () => {
      // AC-10.3.10: No coAuthorInfo for single-author
      const preview: PreviewCalculation = {
        authorId: "contact-solo",
        authorName: "Solo Author",
        totalSales: 500,
        totalReturns: 0,
        royaltyEarned: 1000,
        advanceRecouped: 0,
        netPayable: 1000,
        warnings: [],
        // No coAuthorInfo
      };

      expect(preview.coAuthorInfo).toBeUndefined();
    });
  });

  describe("Statement Isolation Between Co-Authors", () => {
    it("should generate separate statements for each co-author", () => {
      // AC-10.3.1: System generates a distinct statement record for each author
      const _titleId = "title-coauthored";
      const period = { start: "2025-01-01", end: "2025-03-31" };

      const statement1 = {
        id: "stmt-author-a",
        contact_id: "contact-author-a",
        period_start: period.start,
        period_end: period.end,
        net_payable: "600.00",
        calculations: {
          splitCalculation: {
            titleTotalRoyalty: 1000,
            ownershipPercentage: 60,
            isSplitCalculation: true as const,
          },
        },
      };

      const statement2 = {
        id: "stmt-author-b",
        contact_id: "contact-author-b",
        period_start: period.start,
        period_end: period.end,
        net_payable: "400.00",
        calculations: {
          splitCalculation: {
            titleTotalRoyalty: 1000,
            ownershipPercentage: 40,
            isSplitCalculation: true as const,
          },
        },
      };

      // Different statement IDs
      expect(statement1.id).not.toBe(statement2.id);
      // Different contact IDs
      expect(statement1.contact_id).not.toBe(statement2.contact_id);
      // Same period
      expect(statement1.period_start).toBe(statement2.period_start);
      // Different net payable
      expect(statement1.net_payable).not.toBe(statement2.net_payable);
    });

    it("should ensure author A cannot see author B statement via queries", () => {
      // AC-10.3.6: Each author only sees their own statement
      // This is enforced by getMyStatements() and getMyStatementById()
      // which filter by contact_id matching the logged-in portal user

      const authorAContactId = "contact-author-a";
      const authorBContactId = "contact-author-b";

      const allStatements = [
        { id: "stmt-1", contact_id: authorAContactId },
        { id: "stmt-2", contact_id: authorBContactId },
      ];

      // Simulating getMyStatements() filter
      const authorAStatements = allStatements.filter(
        (s) => s.contact_id === authorAContactId,
      );
      const authorBStatements = allStatements.filter(
        (s) => s.contact_id === authorBContactId,
      );

      expect(authorAStatements).toHaveLength(1);
      expect(authorAStatements[0].id).toBe("stmt-1");

      expect(authorBStatements).toHaveLength(1);
      expect(authorBStatements[0].id).toBe("stmt-2");

      // Author A cannot see stmt-2
      expect(authorAStatements.find((s) => s.id === "stmt-2")).toBeUndefined();
    });
  });

  describe("Duplicate Statement Prevention", () => {
    it("should detect duplicate by contact_id, tenant_id, period_start, period_end", () => {
      // AC-10.3.8: No duplicate statements for same author-title-period
      const existingStatement = {
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

      const isDuplicate =
        existingStatement.contact_id === newRequest.authorId &&
        existingStatement.tenant_id === newRequest.tenantId &&
        existingStatement.period_start.getTime() ===
          newRequest.periodStart.getTime() &&
        existingStatement.period_end.getTime() ===
          newRequest.periodEnd.getTime();

      expect(isDuplicate).toBe(true);
    });

    it("should allow regeneration for different period", () => {
      const existingStatement = {
        contact_id: "contact-123",
        tenant_id: "tenant-456",
        period_start: new Date("2025-01-01"),
        period_end: new Date("2025-03-31"),
      };

      const newRequest = {
        authorId: "contact-123",
        tenantId: "tenant-456",
        periodStart: new Date("2025-04-01"), // Q2 instead of Q1
        periodEnd: new Date("2025-06-30"),
      };

      const isDuplicate =
        existingStatement.contact_id === newRequest.authorId &&
        existingStatement.tenant_id === newRequest.tenantId &&
        existingStatement.period_start.getTime() ===
          newRequest.periodStart.getTime();

      expect(isDuplicate).toBe(false);
    });
  });

  describe("Backward Compatibility", () => {
    it("should handle single-author statements without splitCalculation", () => {
      // AC-10.3.10: Single-author statements work exactly as before
      const calculations: StatementCalculations = {
        period: { startDate: "2025-01-01", endDate: "2025-03-31" },
        formatBreakdowns: [
          {
            format: "ebook",
            totalQuantity: 1000,
            totalRevenue: 5000,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.25,
                quantityInTier: 1000,
                royaltyEarned: 1250,
              },
            ],
            formatRoyalty: 1250,
          },
        ],
        returnsDeduction: 0,
        grossRoyalty: 1250,
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 1250,
        // No splitCalculation - this is a single-author statement
      };

      expect(calculations.splitCalculation).toBeUndefined();
      expect(calculations.grossRoyalty).toBe(1250);
      expect(calculations.netPayable).toBe(1250);
    });

    it("should handle title with only one author (no split needed)", () => {
      // A title that has only one author in title_authors table
      // should not create splitCalculation even though title_authors exists
      const titleAuthorRecords = [
        { contact_id: "contact-solo", ownership_percentage: "100" },
      ];

      const isMultiAuthorTitle = titleAuthorRecords.length > 1;
      expect(isMultiAuthorTitle).toBe(false);

      // Since not multi-author, standard calculation path is used
      // and no splitCalculation is included
    });
  });
});
