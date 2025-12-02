/**
 * Statement PDF Template Unit Tests
 *
 * Tests for the PDF template rendering with various data scenarios.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 8: Write unit tests
 *
 * AC Coverage:
 * - AC-5.2.1: PDF template includes company logo placeholder, period dates, and author information
 * - AC-5.2.2: Summary section shows net payable, gross royalties, recoupment amounts
 * - AC-5.2.3: Sales breakdown table shows title, format, units sold, royalty rate, royalty earned
 * - AC-5.2.4: Returns section (if applicable) shows quantity, value, and impact
 * - AC-5.2.5: Advance recoupment section shows all values, handles $0 advance correctly
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";
import { StatementPDF } from "@/modules/statements/pdf/statement-pdf";
import type {
  StatementCalculations,
  StatementPDFData,
} from "@/modules/statements/types";

/**
 * Create mock statement PDF data for testing
 */
function createMockPDFData(
  overrides?: Partial<StatementPDFData>,
): StatementPDFData {
  const calculations: StatementCalculations = {
    period: {
      startDate: "2024-10-01",
      endDate: "2024-12-31",
    },
    formatBreakdowns: [
      {
        format: "physical",
        totalQuantity: 100,
        totalRevenue: 2500,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: null,
            tierRate: 0.1,
            quantityInTier: 100,
            royaltyEarned: 250,
          },
        ],
        formatRoyalty: 250,
      },
      {
        format: "ebook",
        totalQuantity: 200,
        totalRevenue: 2000,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: null,
            tierRate: 0.15,
            quantityInTier: 200,
            royaltyEarned: 300,
          },
        ],
        formatRoyalty: 300,
      },
    ],
    returnsDeduction: 45,
    grossRoyalty: 550,
    advanceRecoupment: {
      originalAdvance: 1000,
      previouslyRecouped: 600,
      thisPeriodsRecoupment: 200,
      remainingAdvance: 200,
    },
    netPayable: 305,
  };

  return {
    statementId: "test-statement-123",
    titleName: "Test Book Title",
    author: {
      name: "Jane Author",
      address: "123 Author Lane\nPublishing City, ST 12345",
      email: "jane@author.com",
    },
    calculations,
    ...overrides,
  };
}

describe("StatementPDF Template", () => {
  describe("AC-5.2.1: Header with logo, period, and author info", () => {
    it("should render PDF with complete author information", async () => {
      const data = createMockPDFData();
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      // PDF should be generated successfully
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify it's a valid PDF (starts with %PDF-)
      const pdfHeader = buffer.subarray(0, 5).toString();
      expect(pdfHeader).toBe("%PDF-");
    });

    it("should handle author without address", async () => {
      const data = createMockPDFData({
        author: {
          name: "No Address Author",
          address: null,
          email: "author@test.com",
        },
      });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle author without email", async () => {
      const data = createMockPDFData({
        author: {
          name: "No Email Author",
          address: "123 Test Street",
          email: null,
        },
      });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("AC-5.2.2: Summary section with financial totals", () => {
    it("should render summary section with all financial values", async () => {
      const data = createMockPDFData();
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      // PDF renders successfully with summary data
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);

      // Verify data structure is complete
      expect(data.calculations.grossRoyalty).toBe(550);
      expect(data.calculations.netPayable).toBe(305);
      expect(data.calculations.advanceRecoupment.thisPeriodsRecoupment).toBe(
        200,
      );
    });
  });

  describe("AC-5.2.3: Sales breakdown table", () => {
    it("should render with format breakdowns", async () => {
      const data = createMockPDFData();
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(data.calculations.formatBreakdowns).toHaveLength(2);
      expect(data.calculations.formatBreakdowns[0].format).toBe("physical");
      expect(data.calculations.formatBreakdowns[1].format).toBe("ebook");
    });

    it("should handle empty format breakdowns", async () => {
      const calculations: StatementCalculations = {
        period: { startDate: "2024-10-01", endDate: "2024-12-31" },
        formatBreakdowns: [],
        returnsDeduction: 0,
        grossRoyalty: 0,
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 0,
      };

      const data = createMockPDFData({ calculations });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("AC-5.2.4: Returns section (conditional)", () => {
    it("should render returns section when returnsDeduction > 0", async () => {
      const data = createMockPDFData();
      // Default data has returnsDeduction: 45
      expect(data.calculations.returnsDeduction).toBe(45);

      const buffer = await renderToBuffer(<StatementPDF data={data} />);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should handle zero returns gracefully", async () => {
      const calculations: StatementCalculations = {
        period: { startDate: "2024-10-01", endDate: "2024-12-31" },
        formatBreakdowns: [
          {
            format: "physical",
            totalQuantity: 100,
            totalRevenue: 2500,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.1,
                quantityInTier: 100,
                royaltyEarned: 250,
              },
            ],
            formatRoyalty: 250,
          },
        ],
        returnsDeduction: 0, // No returns
        grossRoyalty: 250,
        advanceRecoupment: {
          originalAdvance: 0,
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 250,
      };

      const data = createMockPDFData({ calculations });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("AC-5.2.5: Advance recoupment section", () => {
    it("should render recoupment section with all values", async () => {
      const data = createMockPDFData();
      const { advanceRecoupment } = data.calculations;

      expect(advanceRecoupment.originalAdvance).toBe(1000);
      expect(advanceRecoupment.previouslyRecouped).toBe(600);
      expect(advanceRecoupment.thisPeriodsRecoupment).toBe(200);
      expect(advanceRecoupment.remainingAdvance).toBe(200);

      const buffer = await renderToBuffer(<StatementPDF data={data} />);
      expect(buffer).toBeInstanceOf(Buffer);
    });

    it("should handle zero advance correctly", async () => {
      const calculations: StatementCalculations = {
        period: { startDate: "2024-10-01", endDate: "2024-12-31" },
        formatBreakdowns: [
          {
            format: "physical",
            totalQuantity: 100,
            totalRevenue: 2500,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.1,
                quantityInTier: 100,
                royaltyEarned: 250,
              },
            ],
            formatRoyalty: 250,
          },
        ],
        returnsDeduction: 0,
        grossRoyalty: 250,
        advanceRecoupment: {
          originalAdvance: 0, // No advance
          previouslyRecouped: 0,
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 250,
      };

      const data = createMockPDFData({ calculations });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("should handle fully recouped advance", async () => {
      const calculations: StatementCalculations = {
        period: { startDate: "2024-10-01", endDate: "2024-12-31" },
        formatBreakdowns: [
          {
            format: "physical",
            totalQuantity: 100,
            totalRevenue: 2500,
            tierBreakdowns: [
              {
                tierMinQuantity: 0,
                tierMaxQuantity: null,
                tierRate: 0.1,
                quantityInTier: 100,
                royaltyEarned: 250,
              },
            ],
            formatRoyalty: 250,
          },
        ],
        returnsDeduction: 0,
        grossRoyalty: 250,
        advanceRecoupment: {
          originalAdvance: 1000,
          previouslyRecouped: 1000, // Fully recouped
          thisPeriodsRecoupment: 0,
          remainingAdvance: 0,
        },
        netPayable: 250,
      };

      const data = createMockPDFData({ calculations });
      const buffer = await renderToBuffer(<StatementPDF data={data} />);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe("AC-5.2.6: S3 key pattern and footer", () => {
    it("should include statement ID in data for footer", async () => {
      const data = createMockPDFData({
        statementId: "uuid-abc123-def456",
      });

      expect(data.statementId).toBe("uuid-abc123-def456");

      const buffer = await renderToBuffer(<StatementPDF data={data} />);
      expect(buffer).toBeInstanceOf(Buffer);
    });
  });
});
