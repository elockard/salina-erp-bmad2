/**
 * Task Assignment Email Template
 *
 * React Email template for vendor task notifications.
 * Sent when a production task is assigned to a vendor.
 *
 * Story: 18.2 - Assign Production Tasks to Vendors
 * Task 4.1: Create email template
 * AC-18.2.4: Email notification with task name, due date, project info
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
 * Props for the task assignment email template
 */
export interface TaskAssignmentEmailProps {
  /** Vendor contact name */
  vendorName: string;
  /** Task name */
  taskName: string;
  /** Task type (editing, design, etc.) */
  taskType: string;
  /** Optional due date formatted for display */
  dueDate?: string;
  /** Project/title name */
  projectTitle: string;
  /** Publisher/tenant name */
  publisherName: string;
  /** Optional notes */
  notes?: string;
}

/**
 * Generate email subject line
 * AC-18.2.4: Clear subject with task context
 */
export function generateTaskEmailSubject(
  taskName: string,
  publisherName: string,
): string {
  return `Task Assignment: ${taskName} - ${publisherName}`;
}

/**
 * Generate email preheader text
 */
export function generateTaskPreheader(
  taskType: string,
  projectTitle: string,
): string {
  return `New ${taskType} task for ${projectTitle}`;
}

/**
 * Task Assignment Email Template Component
 *
 * Renders the complete email HTML using React Email components.
 * Uses inline styles for email client compatibility.
 */
export function TaskAssignmentEmailTemplate({
  vendorName,
  taskName,
  taskType,
  dueDate,
  projectTitle,
  publisherName,
  notes,
}: TaskAssignmentEmailProps) {
  const preheader = generateTaskPreheader(taskType, projectTitle);

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
          <Heading style={heading}>Production Task Assignment</Heading>
          <Text style={paragraph}>Hello {vendorName},</Text>
          <Text style={paragraph}>
            You have been assigned a new production task from {publisherName}.
            Please review the details below.
          </Text>

          {/* Task Details */}
          <Section style={detailsSection}>
            <table style={detailsTable} cellPadding="0" cellSpacing="0">
              <tbody>
                <tr>
                  <td style={detailLabel}>Task</td>
                  <td style={detailValue}>{taskName}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Type</td>
                  <td style={detailValue}>{capitalizeFirst(taskType)}</td>
                </tr>
                <tr>
                  <td style={detailLabel}>Project/Title</td>
                  <td style={detailValue}>{projectTitle}</td>
                </tr>
                {dueDate && (
                  <tr>
                    <td style={detailLabel}>Due Date</td>
                    <td style={detailValueHighlight}>{dueDate}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Section>

          {/* Notes if provided */}
          {notes && (
            <Section style={notesSection}>
              <Text style={notesTitle}>Notes:</Text>
              <Text style={notesText}>{notes}</Text>
            </Section>
          )}

          <Hr style={hr} />

          {/* Footer */}
          <Section style={footerSection}>
            <Text style={footerText}>
              This is an automated notification from Salina ERP.
            </Text>
            <Text style={footerText}>
              If you have questions about this task, please contact{" "}
              {publisherName} directly.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Capitalize first letter of a string
 */
function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Render the task assignment email template to HTML string
 *
 * @param props - Template props
 * @returns HTML string for email body
 */
export async function renderTaskAssignmentEmail(
  props: TaskAssignmentEmailProps,
): Promise<string> {
  return await render(<TaskAssignmentEmailTemplate {...props} />);
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

const detailValueHighlight = {
  color: "#dc6900",
  fontSize: "14px",
  fontWeight: "bold" as const,
  padding: "8px 0",
  textAlign: "right" as const,
};

const notesSection = {
  margin: "0 30px 20px",
  padding: "15px",
  backgroundColor: "#fff8e1",
  borderRadius: "6px",
  borderLeft: "4px solid #ffc107",
};

const notesTitle = {
  color: "#1a1a1a",
  fontSize: "14px",
  fontWeight: "bold" as const,
  margin: "0 0 8px 0",
};

const notesText = {
  color: "#525f7f",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0",
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
