/**
 * Notification Email Template
 *
 * Story 20.3 - FR178: Configure Notification Preferences
 *
 * React Email template for notification emails.
 * Uses Editorial Navy (#1E3A5F) for branding consistency.
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
 * Props for the notification email template
 */
export interface NotificationEmailProps {
  /** Notification title */
  title: string;
  /** Notification description */
  description: string;
  /** Optional link URL */
  link?: string;
  /** Optional link button text (default: "View in Salina") */
  linkText?: string;
  /** Recipient name for greeting */
  recipientName?: string;
  /** Publisher/tenant name for branding */
  publisherName?: string;
}

/**
 * Notification Email Template Component
 *
 * AC 20.3.6: Email delivery based on preferences.
 * Renders HTML email for notification events.
 */
export function NotificationEmailTemplate({
  title,
  description,
  link,
  linkText = "View in Salina",
  recipientName,
  publisherName = "Salina ERP",
}: NotificationEmailProps) {
  const preheader = description.substring(0, 100);

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

          {/* Heading */}
          <Heading style={heading}>{title}</Heading>

          {/* Greeting (if recipient name provided) */}
          {recipientName && <Text style={paragraph}>Hi {recipientName},</Text>}

          {/* Description */}
          <Text style={paragraph}>{description}</Text>

          {/* CTA Button (if link provided) */}
          {link && (
            <Section style={buttonSection}>
              <Button style={button} href={link}>
                {linkText}
              </Button>
            </Section>
          )}

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This notification was sent by {publisherName}.
            </Text>
            <Text style={footerText}>
              You can manage your notification preferences in Settings.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Render the notification email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderNotificationEmail(
  props: NotificationEmailProps,
): Promise<string> {
  return await render(<NotificationEmailTemplate {...props} />);
}

// Email styles using Editorial Navy (#1E3A5F)
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
  color: "#1E3A5F", // Editorial Navy
  textAlign: "center" as const,
  margin: "0",
};

const hr = {
  borderColor: "#e6ebf1",
  margin: "20px 0",
};

const heading = {
  color: "#1E3A5F", // Editorial Navy
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

const buttonSection = {
  textAlign: "center" as const,
  margin: "30px 0",
};

const button = {
  backgroundColor: "#1E3A5F", // Editorial Navy
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
