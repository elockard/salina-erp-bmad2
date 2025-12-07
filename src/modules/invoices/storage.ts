/**
 * Invoice S3 Storage Utilities
 *
 * Handles PDF upload and presigned URL generation for invoice storage.
 * Uses AWS S3 SDK for object storage operations.
 *
 * Story: 8.6 - Implement Invoice PDF Generation and Email
 * Task 3: Create Invoice S3 Storage Utilities
 * AC-8.6.2: PDF uploads to S3 with key pattern invoices/{tenant_id}/{invoice_id}.pdf
 *
 * Related:
 * - docs/architecture.md (File Storage integration pattern)
 * - src/modules/statements/storage.ts (reference implementation)
 * - src/modules/invoices/pdf-generator.tsx (consumer)
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3 client singleton
 * Configured via environment variables
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-statements";

/**
 * Presigned URL expiry in seconds (15 minutes per AC-8.6.2)
 */
const PRESIGNED_URL_EXPIRY = 900;

/**
 * Generate S3 key for invoice PDF
 * AC-8.6.2: Pattern is invoices/{tenant_id}/{invoice_id}.pdf
 *
 * @param tenantId - Tenant UUID
 * @param invoiceId - Invoice UUID
 * @returns S3 object key
 */
export function generateInvoiceS3Key(
  tenantId: string,
  invoiceId: string,
): string {
  return `invoices/${tenantId}/${invoiceId}.pdf`;
}

/**
 * Upload invoice PDF to S3
 *
 * @param buffer - PDF file as Buffer
 * @param tenantId - Tenant UUID for key generation
 * @param invoiceId - Invoice UUID for key generation
 * @returns S3 key where PDF was uploaded
 * @throws Error on S3 upload failure
 */
export async function uploadInvoicePDF(
  buffer: Buffer,
  tenantId: string,
  invoiceId: string,
): Promise<string> {
  const s3Key = generateInvoiceS3Key(tenantId, invoiceId);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: "application/pdf",
    // Add metadata for traceability
    Metadata: {
      "tenant-id": tenantId,
      "invoice-id": invoiceId,
      "generated-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return s3Key;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(`[S3] Upload failed for invoice ${invoiceId}:`, message);
    throw new Error(`Failed to upload PDF to S3: ${message}`);
  }
}

/**
 * Generate presigned download URL for invoice PDF
 * AC-8.6.2: 15-minute expiry per architecture spec
 *
 * @param s3Key - S3 object key (from uploadInvoicePDF)
 * @returns Presigned URL valid for 15 minutes
 * @throws Error if URL generation fails
 */
export async function getInvoiceDownloadUrl(s3Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    const url = await getSignedUrl(s3Client, command, {
      expiresIn: PRESIGNED_URL_EXPIRY,
    });
    return url;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown presigned URL error";
    console.error(
      `[S3] Presigned URL generation failed for ${s3Key}:`,
      message,
    );
    throw new Error(`Failed to generate download URL: ${message}`);
  }
}

/**
 * Check if an invoice PDF exists in S3
 *
 * @param s3Key - S3 object key to check
 * @returns true if object exists, false otherwise
 */
export async function invoicePDFExists(s3Key: string): Promise<boolean> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    await s3Client.send(command);
    return true;
  } catch (error) {
    // NoSuchKey error means object doesn't exist
    if (error instanceof Error && error.name === "NoSuchKey") {
      return false;
    }
    // Other errors should be propagated
    throw error;
  }
}

/**
 * Download invoice PDF as Buffer for email attachment
 *
 * AC-8.6.3: PDF statement attached to email
 *
 * @param s3Key - S3 object key for the PDF
 * @returns PDF content as Buffer
 * @throws Error if download fails or PDF not found
 */
export async function getInvoicePDFBuffer(s3Key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error("Empty response body from S3");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    return Buffer.concat(chunks);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 download error";
    console.error(`[S3] Download failed for ${s3Key}:`, message);
    throw new Error(`Failed to download PDF from S3: ${message}`);
  }
}
