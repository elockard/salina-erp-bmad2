/**
 * Statement Email Template
 *
 * React Email template for royalty statement notifications.
 * Renders HTML email with subject, preheader, summary, and CTA button.
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Task 2: Create React Email template for statements
 * AC-5.4.1: Email template with subject, summary, and CTA button
 *
 * Template Structure (per epics.md Story 5.4):
 * - Subject: "Your Q4 2025 Royalty Statement is Ready - [Publisher Name]"
 * - Preheader: "Total earned: $6,165.00 | Net payable: $4,165.00"
 * - Body: Logo, greeting, message, summary table, CTA button, footer
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";

/**
 * Split calculation context for email template
 * Story 10.3: AC-10.3.5 - Email includes ownership percentage context
 */
export interface EmailSplitContext {
  /** This author's ownership percentage (e.g., 60 for 60%) */
  ownershipPercentage: number;
  /** Indicates split calculation statement */
  isSplitCalculation: true;
}

/**
 * Lifetime sales context for email template
 * Story 10.4: AC-10.4.6 - Email includes lifetime context for escalating rates
 */
export interface EmailLifetimeContext {
  /** Tier calculation mode: 'lifetime' when this context is present */
  tierCalculationMode: "lifetime";
  /** Total lifetime sales before this period */
  lifetimeSalesBefore: number;
  /** Total lifetime sales after this period */
  lifetimeSalesAfter: number;
  /** Current tier rate based on lifetime position */
  currentTierRate: number;
  /** Next tier threshold (null if at highest tier) */
  nextTierThreshold: number | null;
  /** Units until next tier (null if at highest tier) */
  unitsToNextTier: number | null;
}

/**
 * Props for the statement email template
 *
 * Story 10.3: Added splitCalculation and titleName for co-author emails
 */
export interface StatementEmailProps {
  /** Author's display name */
  authorName: string;
  /** Publisher/tenant name for branding */
  publisherName: string;
  /** Period label (e.g., "Q4 2025") */
  periodLabel: string;
  /** Gross royalties earned before recoupment */
  grossRoyalties: number;
  /** Amount recouped from advance */
  recoupment: number;
  /** Net amount payable to author */
  netPayable: number;
  /** Base URL for the author portal */
  portalUrl: string;
  /** Statement ID for deep linking */
  statementId: string;
  /**
   * Split calculation context for co-authored titles
   * Story 10.3: AC-10.3.5 - Email body references ownership percentage
   */
  splitCalculation?: EmailSplitContext;
  /**
   * Title name for co-author context
   * Story 10.3: AC-10.3.5 - Email body references title name
   */
  titleName?: string;
  /**
   * Lifetime sales context for escalating royalty rates
   * Story 10.4: AC-10.4.6 - Email includes lifetime context when applicable
   */
  lifetimeContext?: EmailLifetimeContext;
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Generate email subject line
 * AC-5.4.1: Subject format "Your Q4 2025 Royalty Statement is Ready - [Publisher Name]"
 */
export function generateSubject(
  periodLabel: string,
  publisherName: string,
): string {
  return `Your ${periodLabel} Royalty Statement is Ready - ${publisherName}`;
}

/**
 * Generate email preheader text
 * AC-5.4.1: Preheader shows total earned and net payable
 */
export function generatePreheader(
  grossRoyalties: number,
  netPayable: number,
): string {
  return `Total earned: ${formatCurrency(grossRoyalties)} | Net payable: ${formatCurrency(netPayable)}`;
}

/**
 * Statement Email Template Component
 *
 * Renders the complete email HTML using React Email components.
 * Uses inline styles for email client compatibility.
 */
export function StatementEmailTemplate({
  authorName,
  publisherName,
  periodLabel,
  grossRoyalties,
  recoupment,
  netPayable,
  portalUrl,
  statementId,
  splitCalculation,
  titleName,
  lifetimeContext,
}: StatementEmailProps) {
  const preheader = generatePreheader(grossRoyalties, netPayable);
  const statementUrl = `${portalUrl}/portal/statements/${statementId}`;

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Publisher Logo Placeholder */}
          <Section style={logoSection}>
            <Text style={logoText}>{publisherName}</Text>
          </Section>

          <Hr style={hr} />

          {/* Greeting */}
          <Heading style={heading}>Your Royalty Statement is Ready</Heading>
          <Text style={paragraph}>Hi {authorName},</Text>
          <Text style={paragraph}>
            Your royalty statement for {periodLabel} is now available. Below is
            a summary of your earnings for this period.
          </Text>

          {/* Co-Author Ownership Context (Story 10.3: AC-10.3.5) */}
          {splitCalculation?.isSplitCalculation && titleName && (
            <Text style={paragraph}>
              This statement reflects your{" "}
              {splitCalculation.ownershipPercentage}% ownership share of &quot;
              {titleName}&quot;.
            </Text>
          )}

          {/* Lifetime Sales Context (Story 10.4: AC-10.4.6) */}
          {lifetimeContext?.tierCalculationMode === "lifetime" && (
            <Section style={lifetimeSection}>
              <Text style={lifetimeSectionTitle}>Lifetime Sales Progress</Text>
              <Text style={lifetimeText}>
                Your lifetime sales:{" "}
                {lifetimeContext.lifetimeSalesAfter.toLocaleString()} units (up
                from {lifetimeContext.lifetimeSalesBefore.toLocaleString()})
              </Text>
              <Text style={lifetimeText}>
                Current tier rate:{" "}
                {(lifetimeContext.currentTierRate * 100).toFixed(1)}%
              </Text>
              {lifetimeContext.unitsToNextTier !== null && (
                <Text style={lifetimeTextHighlight}>
                  {lifetimeContext.unitsToNextTier.toLocaleString()} units to
                  reach the next tier!
                </Text>
              )}
              {lifetimeContext.unitsToNextTier === null && (
                <Text style={lifetimeTextHighlight}>
                  Congratulations! You&apos;ve reached the highest royalty tier.
                </Text>
              )}
            </Section>
          )}

          {/* Summary Table */}
          <Section style={summarySection}>
            <table style={summaryTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={summaryLabel}>Gross Royalties</td>
                  <td style={summaryValue}>{formatCurrency(grossRoyalties)}</td>
                </tr>
                {recoupment > 0 && (
                  <tr>
                    <td style={summaryLabel}>Advance Recoupment</td>
                    <td style={summaryValueDeduction}>
                      -{formatCurrency(recoupment)}
                    </td>
                  </tr>
                )}
                <tr>
                  <td style={{ ...summaryLabel, ...summaryTotalLabel }}>
                    Net Payable
                  </td>
                  <td style={{ ...summaryValue, ...summaryTotalValue }}>
                    {formatCurrency(netPayable)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA Button */}
          <Section style={buttonSection}>
            <Button style={button} href={statementUrl}>
              View Statement in Portal
            </Button>
          </Section>

          <Text style={paragraphSmall}>
            Your complete statement with detailed breakdowns is available in
            your author portal. The PDF statement is also attached to this
            email.
          </Text>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This email was sent by {publisherName} regarding your royalty
              statement.
            </Text>
            <Text style={footerText}>
              If you have questions about your statement, please contact your
              publisher directly.
            </Text>
            <Text style={footerTextSmall}>Statement ID: {statementId}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render the statement email template to HTML string
 *
 * AC-5.4.1: Returns complete HTML for email delivery
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderStatementEmail(
  props: StatementEmailProps,
): Promise<string> {
  return await render(<StatementEmailTemplate {...props} />);
}

/**
 * Render the statement email template synchronously
 * Use when async is not needed (e.g., in tests)
 */
export function renderStatementEmailSync(props: StatementEmailProps): string {
  // The render function returns a promise but can be awaited in sync context
  // For sync rendering, we use the internal JSX
  return render(<StatementEmailTemplate {...props} />) as unknown as string;
}

// Email styles (inline for client compatibility)
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
};

const logoSection = {
  padding: "20px 30px",
};

const logoText = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const heading = {
  color: "#1a1a1a",
  fontSize: "24px",
  fontWeight: "bold" as const,
  margin: "30px 30px 10px",
  padding: "0",
  textAlign: "center" as const,
};

const paragraph = {
  color: "#525f7f",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 30px",
};

const paragraphSmall = {
  color: "#8898aa",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 30px",
  textAlign: "center" as const,
};

const summarySection = {
  margin: "30px 30px",
  padding: "20px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
};

const summaryTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const summaryLabel = {
  color: "#525f7f",
  fontSize: "14px",
  padding: "8px 0",
  textAlign: "left" as const,
};

const summaryValue = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "500" as const,
  padding: "8px 0",
  textAlign: "right" as const,
};

const summaryValueDeduction = {
  color: "#dc2626",
  fontSize: "14px",
  fontWeight: "500" as const,
  padding: "8px 0",
  textAlign: "right" as const,
};

const summaryTotalLabel = {
  borderTop: "1px solid #e6ebf1",
  paddingTop: "12px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
};

const summaryTotalValue = {
  borderTop: "1px solid #e6ebf1",
  paddingTop: "12px",
  fontWeight: "bold" as const,
  fontSize: "18px",
  color: "#059669",
};

const buttonSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#0070f3",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold" as const,
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const footerSection = {
  padding: "20px 30px",
};

const footerText = {
  color: "#8898aa",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "4px 0",
  textAlign: "center" as const,
};

const footerTextSmall = {
  color: "#aab7c4",
  fontSize: "10px",
  lineHeight: "14px",
  margin: "12px 0 0",
  textAlign: "center" as const,
};

// Lifetime sales section styles (Story 10.4: AC-10.4.6)
const lifetimeSection = {
  margin: "20px 30px",
  padding: "16px",
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  border: "1px solid #86efac",
};

const lifetimeSectionTitle = {
  color: "#166534",
  fontSize: "14px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const lifetimeText = {
  color: "#166534",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
};

const lifetimeTextHighlight = {
  color: "#15803d",
  fontSize: "14px",
  fontWeight: "bold" as const,
  lineHeight: "20px",
  margin: "8px 0 0 0",
};
