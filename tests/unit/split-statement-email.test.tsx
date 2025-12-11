/**
 * Split Statement Email Unit Tests
 *
 * Story 10.3: Generate Split Royalty Statements for Co-Authors
 * Task 3: Update Email Service for Split Context
 *
 * Tests that email template renders correctly with split calculation context.
 *
 * AC-10.3.5: Email Delivery Per Author
 * - Email body references their ownership percentage and title name
 */

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  type StatementEmailProps,
  StatementEmailTemplate,
} from "@/modules/statements/email-template";

// Helper to create base email props
function createBaseEmailProps(
  overrides: Partial<StatementEmailProps> = {},
): StatementEmailProps {
  return {
    authorName: "John Doe",
    publisherName: "Acme Publishing",
    periodLabel: "Q1 2025",
    grossRoyalties: 1000,
    recoupment: 0,
    netPayable: 1000,
    portalUrl: "https://portal.example.com",
    statementId: "stmt-test-123",
    ...overrides,
  };
}

describe("Split Statement Email", () => {
  describe("StatementEmailTemplate with split context", () => {
    it("should render co-author ownership paragraph when splitCalculation is present", () => {
      // AC-10.3.5: Email body references ownership percentage and title name
      const props = createBaseEmailProps({
        grossRoyalties: 600,
        netPayable: 600,
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should contain ownership percentage and title name
      expect(markup).toContain("60%");
      expect(markup).toContain("Co-Authored Book");
      expect(markup).toContain("ownership share");
    });

    it("should NOT render co-author paragraph for single-author emails", () => {
      // AC-10.3.10: Single-author emails have no split context
      const props = createBaseEmailProps({
        // No splitCalculation or titleName
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should NOT contain ownership text
      expect(markup).not.toContain("ownership share");
    });

    it("should display correct percentage for 40% ownership", () => {
      const props = createBaseEmailProps({
        grossRoyalties: 400,
        netPayable: 400,
        splitCalculation: {
          ownershipPercentage: 40,
          isSplitCalculation: true,
        },
        titleName: "Another Co-Authored Book",
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).toContain("40%");
      expect(markup).toContain("Another Co-Authored Book");
    });

    it("should not render co-author text when only titleName is present (no splitCalculation)", () => {
      const props = createBaseEmailProps({
        titleName: "Some Book",
        // No splitCalculation
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should NOT contain ownership text (needs both splitCalculation AND titleName)
      expect(markup).not.toContain("ownership share");
    });

    it("should not render co-author text when only splitCalculation is present (no titleName)", () => {
      const props = createBaseEmailProps({
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        // No titleName
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should NOT contain ownership text (needs both splitCalculation AND titleName)
      expect(markup).not.toContain("ownership share");
    });
  });

  describe("Email template structure", () => {
    it("should maintain existing email structure with split context", () => {
      const props = createBaseEmailProps({
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Verify essential email elements still exist
      expect(markup).toContain("Your Royalty Statement is Ready");
      expect(markup).toContain("Hi John Doe");
      expect(markup).toContain("Gross Royalties");
      expect(markup).toContain("Net Payable");
      expect(markup).toContain("View Statement in Portal");
    });

    it("should place co-author text after greeting and before summary", () => {
      const props = createBaseEmailProps({
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Get positions
      const greetingPos = markup.indexOf("Hi John Doe");
      const ownershipPos = markup.indexOf("ownership share");
      const summaryPos = markup.indexOf("Gross Royalties");

      // Co-author text should appear after greeting, before summary
      expect(greetingPos).toBeLessThan(ownershipPos);
      expect(ownershipPos).toBeLessThan(summaryPos);
    });
  });

  describe("Lifetime Context (Story 10.4: AC-10.4.6)", () => {
    it("should render lifetime section when lifetimeContext is present", () => {
      // AC-10.4.6: Email includes lifetime sales context
      const props = createBaseEmailProps({
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 4500,
          lifetimeSalesAfter: 5000,
          currentTierRate: 0.12,
          nextTierThreshold: 10000,
          unitsToNextTier: 5000,
        },
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should contain lifetime sales progress info
      expect(markup).toContain("Lifetime Sales Progress");
      expect(markup).toContain("5,000"); // lifetimeSalesAfter
      expect(markup).toContain("4,500"); // lifetimeSalesBefore
      expect(markup).toContain("12.0%"); // Current tier rate
    });

    it("should NOT render lifetime section when lifetimeContext is absent", () => {
      // Note: EmailLifetimeContext type only accepts "lifetime" mode,
      // so period mode is tested by absence of lifetimeContext
      const props = createBaseEmailProps({
        // No lifetimeContext
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      expect(markup).not.toContain("Lifetime Sales Progress");
    });

    it("should show highest tier message when unitsToNextTier is null", () => {
      const props = createBaseEmailProps({
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 15000,
          lifetimeSalesAfter: 15500,
          currentTierRate: 0.15,
          nextTierThreshold: null,
          unitsToNextTier: null,
        },
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should show highest tier message
      expect(markup).toContain("highest royalty tier");
    });

    it("should show units to next tier when available", () => {
      const props = createBaseEmailProps({
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 4500,
          lifetimeSalesAfter: 5000,
          currentTierRate: 0.12,
          nextTierThreshold: 10000,
          unitsToNextTier: 5000,
        },
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should show units to next tier
      expect(markup).toContain("5,000");
      expect(markup).toContain("next tier");
    });

    it("should place lifetime section after greeting and before summary", () => {
      const props = createBaseEmailProps({
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 4500,
          lifetimeSalesAfter: 5000,
          currentTierRate: 0.12,
          nextTierThreshold: 10000,
          unitsToNextTier: 5000,
        },
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Get positions
      const greetingPos = markup.indexOf("Hi John Doe");
      const lifetimePos = markup.indexOf("Lifetime Sales Progress");
      const summaryPos = markup.indexOf("Gross Royalties");

      // Lifetime section should appear after greeting, before summary
      expect(greetingPos).toBeLessThan(lifetimePos);
      expect(lifetimePos).toBeLessThan(summaryPos);
    });

    it("should render both split and lifetime context together", () => {
      // Test combination of split and lifetime features
      const props = createBaseEmailProps({
        splitCalculation: {
          ownershipPercentage: 60,
          isSplitCalculation: true,
        },
        titleName: "Co-Authored Book",
        lifetimeContext: {
          tierCalculationMode: "lifetime",
          lifetimeSalesBefore: 4500,
          lifetimeSalesAfter: 5000,
          currentTierRate: 0.12,
          nextTierThreshold: 10000,
          unitsToNextTier: 5000,
        },
      });

      const element = <StatementEmailTemplate {...props} />;
      const markup = renderToStaticMarkup(element);

      // Should contain both split and lifetime info
      expect(markup).toContain("60%");
      expect(markup).toContain("ownership share");
      expect(markup).toContain("Lifetime Sales Progress");
      expect(markup).toContain("12.0%");
    });
  });
});
