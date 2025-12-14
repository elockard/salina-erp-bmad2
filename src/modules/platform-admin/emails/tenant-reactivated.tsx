/**
 * Tenant Reactivated Email Template
 *
 * React Email template for tenant reactivation notification.
 *
 * Story: 13.4 - Implement Tenant Suspension and Reactivation
 * Task 5: Create Suspension Email Templates
 * AC-13.4.9: Reactivation events trigger notification to tenant owner (email)
 */

import {
  Body,
  Button,
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
 * Props for the tenant reactivated email template
 */
export interface TenantReactivatedEmailProps {
  /** Tenant/organization name */
  tenantName: string;
  /** Date reactivated */
  reactivatedAt: Date;
}

/**
 * Tenant Reactivated Email Template Component
 *
 * Notifies tenant owner that their organization has been reactivated.
 * Includes login link and welcome back message.
 */
export function TenantReactivatedEmail({
  tenantName,
  reactivatedAt,
}: TenantReactivatedEmailProps) {
  const preheader = `Great news! Your organization ${tenantName} has been reactivated`;
  const formattedDate = reactivatedAt.toLocaleDateString("en-US", {
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
          <Heading style={heading}>Account Reactivated</Heading>
          <Text style={paragraph}>
            Great news! The account for <strong>{tenantName}</strong> has been
            reactivated as of {formattedDate}.
          </Text>

          <Text style={paragraph}>
            You and your team can now log in and access all features. All your
            data remains intact and available.
          </Text>

          {/* CTA Button */}
          <Section style={ctaSection}>
            <Button href={`${baseUrl}/sign-in`} style={button}>
              Log In Now
            </Button>
          </Section>

          <Text style={paragraphSmall}>
            If you have any questions about your account or need assistance
            getting started again, our support team is here to help.
          </Text>

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
 * Render the tenant reactivated email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderTenantReactivatedEmail(
  props: TenantReactivatedEmailProps,
): Promise<string> {
  return await render(<TenantReactivatedEmail {...props} />);
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
  color: "#059669",
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

const paragraphSmall = {
  color: "#6b7280",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 30px",
  textAlign: "center" as const,
};

const ctaSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#059669",
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
