/**
 * Invoice Email Template
 *
 * React Email template for invoice notifications.
 * Renders HTML email with subject, preheader, summary, and CTA button.
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 5: Create Invoice Email Template
 * AC-8.6.3: Email template with subject, summary, and CTA button
 *
 * Template Structure:
 * - Subject: "Invoice [#] from [Company Name]"
 * - Body: Logo placeholder, greeting, invoice summary, CTA button, footer
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
 * Props for the invoice email template
 */
export interface InvoiceEmailProps {
  /** Customer name */
  customerName: string;
  /** Company/publisher name for branding */
  companyName: string;
  /** Invoice number (e.g., INV-20251207-0001) */
  invoiceNumber: string;
  /** Invoice date formatted for display */
  invoiceDate: string;
  /** Due date formatted for display */
  dueDate: string;
  /** Total amount due formatted with currency */
  amountDue: string;
  /** Invoice ID for deep linking */
  invoiceId: string;
  /** Optional portal URL for CTA button */
  portalUrl?: string;
}

/**
 * Format currency amount for display
 */
function formatCurrency(amount: string): string {
  // Amount should already be formatted, but ensure $ prefix
  return amount.startsWith("$") ? amount : `$${amount}`;
}

/**
 * Generate email subject line
 * AC-8.6.3: Subject format "Invoice [#] from [Company Name]"
 */
export function generateInvoiceEmailSubject(
  invoiceNumber: string,
  companyName: string,
): string {
  return `Invoice ${invoiceNumber} from ${companyName}`;
}

/**
 * Generate email preheader text
 */
export function generatePreheader(amountDue: string, dueDate: string): string {
  return `Amount Due: ${formatCurrency(amountDue)} | Due: ${dueDate}`;
}

/**
 * Invoice Email Template Component
 *
 * Renders the complete email HTML using React Email components.
 * Uses inline styles for email client compatibility.
 */
export function InvoiceEmailTemplate({
  customerName,
  companyName,
  invoiceNumber,
  invoiceDate,
  dueDate,
  amountDue,
  invoiceId,
  portalUrl,
}: InvoiceEmailProps) {
  const preheader = generatePreheader(amountDue, dueDate);
  // Use portal URL if provided, otherwise link to invoice view
  const viewInvoiceUrl = portalUrl
    ? `${portalUrl}/invoices/${invoiceId}`
    : `#invoice-${invoiceId}`;

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Company Logo Placeholder */}
          <Section style={logoSection}>
            <Text style={logoText}>{companyName}</Text>
          </Section>

          <Hr style={hr} />

          {/* Greeting */}
          <Heading style={heading}>You Have a New Invoice</Heading>
          <Text style={paragraph}>Hi {customerName},</Text>
          <Text style={paragraph}>
            Please find attached invoice {invoiceNumber} from {companyName}.
            Below is a summary of your invoice.
          </Text>

          {/* Invoice Summary */}
          <Section style={summarySection}>
            <table style={summaryTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={summaryLabel}>Invoice Number</td>
                  <td style={summaryValue}>{invoiceNumber}</td>
                </tr>
                <tr>
                  <td style={summaryLabel}>Invoice Date</td>
                  <td style={summaryValue}>{invoiceDate}</td>
                </tr>
                <tr>
                  <td style={summaryLabel}>Due Date</td>
                  <td style={summaryValueDueDate}>{dueDate}</td>
                </tr>
                <tr>
                  <td style={{ ...summaryLabel, ...summaryTotalLabel }}>
                    Amount Due
                  </td>
                  <td style={{ ...summaryValue, ...summaryTotalValue }}>
                    {formatCurrency(amountDue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* CTA Button */}
          {portalUrl && (
            <Section style={buttonSection}>
              <Button style={button} href={viewInvoiceUrl}>
                View Invoice Online
              </Button>
            </Section>
          )}

          <Text style={paragraphSmall}>
            A PDF copy of this invoice is attached to this email for your
            records. Please remit payment by the due date shown above.
          </Text>

          <Hr style={hr} />

          {/* Payment Instructions */}
          <Section style={paymentSection}>
            <Text style={paymentTitle}>Payment Instructions</Text>
            <Text style={paymentText}>
              Please reference invoice number {invoiceNumber} with your payment.
            </Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This invoice was sent by {companyName}.
            </Text>
            <Text style={footerText}>
              If you have questions about this invoice, please contact us
              directly.
            </Text>
            <Text style={footerTextSmall}>Invoice ID: {invoiceId}</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render the invoice email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderInvoiceEmail(
  props: InvoiceEmailProps,
): Promise<string> {
  return await render(<InvoiceEmailTemplate {...props} />);
}

/**
 * Render the invoice email template synchronously
 * Use when async is not needed (e.g., in tests)
 */
export function renderInvoiceEmailSync(props: InvoiceEmailProps): string {
  return render(<InvoiceEmailTemplate {...props} />) as unknown as string;
}

// =============================================================================
// Email Styles (inline for client compatibility)
// =============================================================================

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

const summaryValueDueDate = {
  color: "#dc6900",
  fontSize: "14px",
  fontWeight: "bold" as const,
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
  color: "#1a1a1a",
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

const paymentSection = {
  padding: "0 30px",
};

const paymentTitle = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "bold" as const,
  marginBottom: "8px",
};

const paymentText = {
  color: "#525f7f",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "4px 0",
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
