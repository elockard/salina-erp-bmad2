/**
 * Form 1099 PDF Generator Service
 *
 * Generates 1099-MISC PDF documents from form data.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 * AC-11.3.5: 1099-MISC PDF format following IRS specifications
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { Form1099PDF } from "./pdf/form-1099-pdf";
import type { Form1099PDFData } from "./types";

/**
 * Generate 1099-MISC PDF as a Buffer
 *
 * @param data - Form data including payer, recipient, and amount
 * @returns Promise<Buffer> - PDF document as a Buffer
 *
 * Usage:
 * ```ts
 * const pdfBuffer = await generateForm1099PDF(formData);
 * // Upload to S3 or serve directly
 * ```
 */
export async function generateForm1099PDF(
  data: Form1099PDFData,
): Promise<Buffer> {
  const pdfBuffer = await renderToBuffer(<Form1099PDF data={data} />);
  return Buffer.from(pdfBuffer);
}

/**
 * Generate 1099-MISC PDF as a Uint8Array
 *
 * @param data - Form data including payer, recipient, and amount
 * @returns Promise<Uint8Array> - PDF document as Uint8Array
 *
 * Useful for browser environments or when Buffer is not available.
 */
export async function generateForm1099PDFUint8Array(
  data: Form1099PDFData,
): Promise<Uint8Array> {
  return await renderToBuffer(<Form1099PDF data={data} />);
}

/**
 * Generate S3 key for 1099 PDF storage
 *
 * Format: 1099/{tenant_id}/{tax_year}/{form_id}.pdf
 *
 * @param tenantId - Tenant UUID
 * @param taxYear - Tax year
 * @param formId - Form 1099 UUID
 * @returns S3 key string
 */
export function generate1099S3Key(
  tenantId: string,
  taxYear: number,
  formId: string,
): string {
  return `1099/${tenantId}/${taxYear}/${formId}.pdf`;
}

/**
 * Parse S3 key to extract components
 *
 * @param s3Key - S3 key in format: 1099/{tenant_id}/{tax_year}/{form_id}.pdf
 * @returns Parsed components or null if invalid format
 */
export function parse1099S3Key(s3Key: string): {
  tenantId: string;
  taxYear: number;
  formId: string;
} | null {
  // Match: 1099/{any-chars}}/{4-digit-year}/{any-chars}.pdf
  const match = s3Key.match(
    /^1099\/([a-zA-Z0-9-]+)\/(\d{4})\/([a-zA-Z0-9-]+)\.pdf$/,
  );

  if (!match) {
    return null;
  }

  return {
    tenantId: match[1],
    taxYear: parseInt(match[2], 10),
    formId: match[3],
  };
}
