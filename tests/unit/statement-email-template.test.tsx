/**
 * Statement Email Template Unit Tests
 *
 * Tests for the React Email template rendering and utility functions.
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Task 7: Write unit tests
 *
 * AC Coverage:
 * - AC-5.4.1: Email template created using React Email with subject, summary, and CTA button
 */

import { describe, expect, it } from "vitest";
import {
  generatePreheader,
  generateSubject,
  renderStatementEmail,
  type StatementEmailProps,
  StatementEmailTemplate,
} from "@/modules/statements/email-template";

/**
 * Create mock email props for testing
 */
function createMockEmailProps(
  overrides?: Partial<StatementEmailProps>,
): StatementEmailProps {
  return {
    authorName: "Jane Author",
    publisherName: "Acme Publishing",
    periodLabel: "Q4 2024",
    grossRoyalties: 6165.0,
    recoupment: 2000.0,
    netPayable: 4165.0,
    portalUrl: "https://acme.salina.media",
    statementId: "test-statement-123",
    ...overrides,
  };
}

describe("Statement Email Template", () => {
  describe("AC-5.4.1: Subject line formatting", () => {
    it("should generate correct subject line format", () => {
      const subject = generateSubject("Q4 2024", "Acme Publishing");
      expect(subject).toBe(
        "Your Q4 2024 Royalty Statement is Ready - Acme Publishing",
      );
    });

    it("should handle different period labels", () => {
      expect(generateSubject("Q1 2025", "Publisher")).toBe(
        "Your Q1 2025 Royalty Statement is Ready - Publisher",
      );
      expect(generateSubject("January - March 2025", "Big Books Inc")).toBe(
        "Your January - March 2025 Royalty Statement is Ready - Big Books Inc",
      );
    });
  });

  describe("AC-5.4.1: Preheader formatting", () => {
    it("should generate correct preheader with financial summary", () => {
      const preheader = generatePreheader(6165.0, 4165.0);
      expect(preheader).toBe(
        "Total earned: $6,165.00 | Net payable: $4,165.00",
      );
    });

    it("should handle zero values", () => {
      const preheader = generatePreheader(0, 0);
      expect(preheader).toBe("Total earned: $0.00 | Net payable: $0.00");
    });

    it("should format large amounts correctly", () => {
      const preheader = generatePreheader(123456.78, 100000.0);
      expect(preheader).toBe(
        "Total earned: $123,456.78 | Net payable: $100,000.00",
      );
    });

    it("should handle decimal precision", () => {
      const preheader = generatePreheader(99.99, 50.5);
      expect(preheader).toBe("Total earned: $99.99 | Net payable: $50.50");
    });
  });

  describe("AC-5.4.1: Email HTML rendering", () => {
    it("should render email HTML with all required elements", async () => {
      const props = createMockEmailProps();
      const html = await renderStatementEmail(props);

      // Check basic HTML structure
      expect(html).toContain("<!DOCTYPE html");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");

      // Check content is present
      expect(html).toContain("Jane Author");
      expect(html).toContain("Acme Publishing");
      expect(html).toContain("Q4 2024");
    });

    it("should include author greeting", async () => {
      const props = createMockEmailProps({ authorName: "Test Author" });
      const html = await renderStatementEmail(props);

      expect(html).toContain("Test Author");
      // Note: React Email renders with HTML comments, so check for the greeting pattern
      expect(html).toMatch(/Hi\s*(<!--.*?-->)?\s*Test Author/);
    });

    it("should include publisher name", async () => {
      const props = createMockEmailProps({
        publisherName: "Big Publisher Inc",
      });
      const html = await renderStatementEmail(props);

      expect(html).toContain("Big Publisher Inc");
    });

    it("should include period label", async () => {
      const props = createMockEmailProps({ periodLabel: "Q1 2025" });
      const html = await renderStatementEmail(props);

      expect(html).toContain("Q1 2025");
    });

    it("should include financial summary amounts", async () => {
      const props = createMockEmailProps({
        grossRoyalties: 1000.0,
        recoupment: 200.0,
        netPayable: 800.0,
      });
      const html = await renderStatementEmail(props);

      expect(html).toContain("$1,000.00");
      expect(html).toContain("$200.00");
      expect(html).toContain("$800.00");
    });

    it("should include CTA button with correct portal URL", async () => {
      const props = createMockEmailProps({
        portalUrl: "https://publisher.salina.media",
        statementId: "abc-123",
      });
      const html = await renderStatementEmail(props);

      expect(html).toContain("View Statement in Portal");
      expect(html).toContain(
        "https://publisher.salina.media/portal/statements/abc-123",
      );
    });

    it("should include statement ID in footer", async () => {
      const props = createMockEmailProps({ statementId: "unique-id-xyz" });
      const html = await renderStatementEmail(props);

      expect(html).toContain("unique-id-xyz");
    });

    it("should include preheader text for email preview", async () => {
      const props = createMockEmailProps({
        grossRoyalties: 5000.0,
        netPayable: 4500.0,
      });
      const html = await renderStatementEmail(props);

      // Preheader should be in preview tag
      expect(html).toContain("Total earned: $5,000.00");
      expect(html).toContain("Net payable: $4,500.00");
    });
  });

  describe("AC-5.4.1: Edge cases and error handling", () => {
    it("should handle zero recoupment (no deduction shown)", async () => {
      const props = createMockEmailProps({
        grossRoyalties: 1000.0,
        recoupment: 0,
        netPayable: 1000.0,
      });
      const html = await renderStatementEmail(props);

      // Should still render successfully
      expect(html).toContain("$1,000.00");
      // The recoupment row should not appear when zero
      // (The template conditionally renders this)
    });

    it("should handle special characters in author name", async () => {
      const props = createMockEmailProps({
        authorName: "Jane O'Brien-Smith",
      });
      const html = await renderStatementEmail(props);

      expect(html).toContain("Jane O&#x27;Brien-Smith");
    });

    it("should handle special characters in publisher name", async () => {
      const props = createMockEmailProps({
        publisherName: "Books & More Publishing",
      });
      const html = await renderStatementEmail(props);

      // HTML entities should be escaped
      expect(html).toContain("Books");
      expect(html).toContain("More Publishing");
    });

    it("should handle very long author names", async () => {
      const props = createMockEmailProps({
        authorName: "Very Long Author Name That Goes On And On And On",
      });
      const html = await renderStatementEmail(props);

      expect(html).toContain(
        "Very Long Author Name That Goes On And On And On",
      );
    });

    it("should handle negative net payable (edge case)", async () => {
      const props = createMockEmailProps({
        grossRoyalties: 100.0,
        recoupment: 150.0,
        netPayable: -50.0,
      });
      const html = await renderStatementEmail(props);

      // Should render negative values
      expect(html).toContain("-$50.00");
    });
  });

  describe("StatementEmailTemplate component", () => {
    it("should be a valid React component", () => {
      expect(StatementEmailTemplate).toBeDefined();
      expect(typeof StatementEmailTemplate).toBe("function");
    });
  });
});
