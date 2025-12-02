/**
 * Email Utility Module
 *
 * Provides Resend email client and utility functions for sending
 * transactional emails with attachment support.
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * Task 1: Create Resend email utility
 * AC-5.4.1: Email template created using React Email
 * AC-5.4.2: PDF statement attached to email
 *
 * Related:
 * - docs/architecture.md (Email Service pattern)
 * - src/modules/statements/email-service.ts (consumer)
 */

import { Resend } from "resend";

/**
 * Resend client singleton
 * Configured via RESEND_API_KEY environment variable
 *
 * @throws Error if RESEND_API_KEY is not set (at runtime when sending)
 */
export const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Email attachment type for Resend
 */
export interface EmailAttachment {
  /** Filename displayed to recipient */
  filename: string;
  /** File content as Buffer or base64 string */
  content: Buffer | string;
  /** Optional MIME type (defaults to application/octet-stream) */
  contentType?: string;
}

/**
 * Email send parameters
 */
export interface SendEmailParams {
  /** Sender email address */
  from: string;
  /** Recipient email address(es) */
  to: string | string[];
  /** Email subject line */
  subject: string;
  /** HTML content of email */
  html: string;
  /** Optional plain text fallback */
  text?: string;
  /** Optional file attachments */
  attachments?: EmailAttachment[];
  /** Optional reply-to address */
  replyTo?: string;
  /** Optional email tags for tracking */
  tags?: Array<{ name: string; value: string }>;
}

/**
 * Email send result
 */
export interface SendEmailResult {
  /** Whether send was successful */
  success: boolean;
  /** Resend message ID (on success) */
  messageId?: string;
  /** Error message (on failure) */
  error?: string;
}

/**
 * Send an email via Resend
 *
 * Handles error logging and provides consistent result format.
 * Supports attachments for PDF statements.
 *
 * AC-5.4.2: Supports PDF attachment via attachments parameter
 *
 * @param params - Email parameters
 * @returns Result with messageId on success, error on failure
 *
 * @example
 * ```typescript
 * const result = await sendEmail({
 *   from: 'statements@example.com',
 *   to: 'author@example.com',
 *   subject: 'Your Royalty Statement',
 *   html: '<h1>Statement Ready</h1>',
 *   attachments: [{
 *     filename: 'statement-Q4-2025.pdf',
 *     content: pdfBuffer,
 *     contentType: 'application/pdf',
 *   }],
 * });
 * ```
 */
export async function sendEmail(
  params: SendEmailParams,
): Promise<SendEmailResult> {
  // Verify API key is configured
  if (!process.env.RESEND_API_KEY) {
    console.error("[Email] RESEND_API_KEY environment variable not configured");
    return {
      success: false,
      error: "Email service not configured: RESEND_API_KEY is missing",
    };
  }

  try {
    const response = await resend.emails.send({
      from: params.from,
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
      replyTo: params.replyTo,
      attachments: params.attachments?.map((att) => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType,
      })),
      tags: params.tags,
    });

    // Check for Resend error response
    if (response.error) {
      console.error("[Email] Resend API error:", response.error);
      return {
        success: false,
        error: response.error.message || "Failed to send email",
      };
    }

    // Success
    console.log(`[Email] Sent successfully: ${response.data?.id}`);
    return {
      success: true,
      messageId: response.data?.id,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error";
    console.error("[Email] Send failed:", message);
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Get configured sender email address
 *
 * Falls back to environment variable or default if not configured.
 * Per architecture.md, sender address should be configurable per tenant
 * (future enhancement).
 *
 * @returns Sender email address
 */
export function getDefaultFromEmail(): string {
  return process.env.FROM_EMAIL || "statements@salina-erp.com";
}
