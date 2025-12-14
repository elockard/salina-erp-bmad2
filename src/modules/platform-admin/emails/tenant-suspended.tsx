/**
 * Tenant Suspended Email Template
 *
 * React Email template for tenant suspension notification.
 *
 * Story: 13.4 - Implement Tenant Suspension and Reactivation
 * Task 5: Create Suspension Email Templates
 * AC-13.4.9: Suspension events trigger notification to tenant owner (email)
 */

import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  render,
  Section,
  Text,
} from "@react-email/components";

/**
 * Get the base URL for email links
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "https://salina-erp.com";
}

/**
 * Props for the tenant suspended email template
 */
export interface TenantSuspendedEmailProps {
  /** Tenant/organization name */
  tenantName: string;
  /** Reason for suspension */
  reason: string;
  /** Date suspended */
  suspendedAt: Date;
}

/**
 * Tenant Suspended Email Template Component
 *
 * Notifies tenant owner that their organization has been suspended.
 * Includes reason for suspension and contact information.
 */
export function TenantSuspendedEmail({
  tenantName,
  reason,
  suspendedAt,
}: TenantSuspendedEmailProps) {
  const preheader = `Your organization ${tenantName} has been suspended`;
  const formattedDate = suspendedAt.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const baseUrl = getBaseUrl();

  return (
    <Html>
      <Head />
      <Preview>{preheader}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={headerSection}>
            <Text style={logoText}>Salina ERP</Text>
          </Section>

          <Hr style={hr} />

          {/* Main Content */}
          <Heading style={heading}>Account Suspended</Heading>
          <Text style={paragraph}>
            The account for <strong>{tenantName}</strong> has been suspended as
            of {formattedDate}.
          </Text>

          {/* Reason Box */}
          <Section style={reasonSection}>
            <Text style={reasonLabel}>Reason for Suspension:</Text>
            <Text style={reasonText}>{reason}</Text>
          </Section>

          <Text style={paragraph}>
            All users of your organization are currently unable to access the
            application. If you believe this suspension was made in error or
            would like to discuss resolution, please contact our support team.
          </Text>

          {/* Contact Support */}
          <Section style={ctaSection}>
            <Link href={`${baseUrl}/contact`} style={button}>
              Contact Support
            </Link>
          </Section>

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated notification from Salina ERP.
            </Text>
            <Text style={footerText}>
              If you have questions, please{" "}
              <Link href={`${baseUrl}/contact`} style={link}>
                contact our support team
              </Link>
              .
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render the tenant suspended email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderTenantSuspendedEmail(
  props: TenantSuspendedEmailProps,
): Promise<string> {
  return await render(<TenantSuspendedEmail {...props} />);
}

// =============================================================================
// Email Styles (inline for client compatibility)
// =============================================================================

const main = {
  backgroundColor: "#f4f4f5",
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

const logoText = {
  fontSize: "24px",
  fontWeight: "bold" as const,
  color: "#1a1a1a",
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e5e7eb",
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
  color: "#374151",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 30px",
};

const reasonSection = {
  margin: "24px 30px",
  padding: "16px",
  backgroundColor: "#fef2f2",
  borderRadius: "8px",
  border: "1px solid #fecaca",
};

const reasonLabel = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const reasonText = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#0f172a",
  borderRadius: "6px",
  color: "#ffffff",
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
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "4px 0",
  textAlign: "center" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};
