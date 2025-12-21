/**
 * Proof Correction Request Email Template
 *
 * React Email template for vendor correction notifications.
 * Sent when corrections are requested on a proof version.
 *
 * Story: 18.5 - Approve or Request Corrections on Proofs
 * AC-18.5.3: Email notification to vendor with correction details
 */

import {
  Body,
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
 * Props for the proof correction email template
 */
export interface ProofCorrectionEmailProps {
  /** Vendor contact name */
  vendorName: string;
  /** Project/title name */
  projectTitle: string;
  /** Proof version number */
  proofVersion: number;
  /** Correction notes/instructions */
  correctionNotes: string;
  /** Publisher/tenant name */
  publisherName: string;
  /** Name of the user who requested corrections */
  requestedBy: string;
}

/**
 * Generate email subject line
 * AC-18.5.3: Clear subject with correction request context
 */
export function generateCorrectionEmailSubject(
  projectTitle: string,
  proofVersion: number,
): string {
  return `Corrections Requested: ${projectTitle} - Proof v${proofVersion}`;
}

/**
 * Generate email preheader text
 */
export function generateCorrectionPreheader(
  projectTitle: string,
  proofVersion: number,
): string {
  return `Corrections needed for ${projectTitle} proof version ${proofVersion}`;
}

/**
 * Proof Correction Email Template Component
 *
 * Renders the complete email HTML using React Email components.
 * Uses inline styles for email client compatibility.
 */
export function ProofCorrectionEmailTemplate({
  vendorName,
  projectTitle,
  proofVersion,
  correctionNotes,
  publisherName,
  requestedBy,
}: ProofCorrectionEmailProps) {
  const preheader = generateCorrectionPreheader(projectTitle, proofVersion);

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Publisher Name Header */}
          <Section style={headerSection}>
            <Text style={headerText}>{publisherName}</Text>
          </Section>

          <Hr style={hr} />

          {/* Greeting and Main Message */}
          <Heading style={heading}>Corrections Requested</Heading>
          <Text style={paragraph}>Hello {vendorName},</Text>
          <Text style={paragraph}>
            Corrections have been requested for a proof you submitted. Please
            review the details below and submit a revised version.
          </Text>

          {/* Proof Details */}
          <Section style={detailsSection}>
            <table style={detailsTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={detailLabel}>Project/Title</td>
                  <td style={detailValue}>{projectTitle}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Proof Version</td>
                  <td style={detailValue}>v{proofVersion}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Requested By</td>
                  <td style={detailValue}>{requestedBy}</td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Correction Notes - Always present */}
          <Section style={correctionSection}>
            <Text style={correctionTitle}>Correction Notes:</Text>
            <Text style={correctionText}>{correctionNotes}</Text>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated notification from Salina ERP.
            </Text>
            <Text style={footerText}>
              If you have questions about these corrections, please contact{" "}
              {publisherName} directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render the proof correction email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderProofCorrectionEmail(
  props: ProofCorrectionEmailProps,
): Promise<string> {
  return await render(<ProofCorrectionEmailTemplate {...props} />);
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

const headerSection = {
  padding: "20px 30px",
};

const headerText = {
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
  color: "#dc2626",
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

const detailsSection = {
  margin: "30px 30px",
  padding: "20px",
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
};

const detailsTable = {
  width: "100%",
  borderCollapse: "collapse" as const,
};

const detailLabel = {
  color: "#525f7f",
  fontSize: "14px",
  padding: "8px 0",
  textAlign: "left" as const,
  width: "40%",
};

const detailValue = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "500" as const,
  padding: "8px 0",
  textAlign: "right" as const,
};

const correctionSection = {
  margin: "0 30px 20px",
  padding: "15px",
  backgroundColor: "#fef2f2",
  borderRadius: "6px",
  borderLeft: "4px solid #dc2626",
};

const correctionTitle = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const correctionText = {
  color: "#525f7f",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
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
