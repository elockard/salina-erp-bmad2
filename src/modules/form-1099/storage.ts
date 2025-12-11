/**
 * Form 1099 S3 Storage Utilities
 *
 * Handles PDF upload and presigned URL generation for 1099 form storage.
 * Uses AWS S3 SDK for object storage operations.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 * AC-11.3.6: PDF storage in S3 with key pattern 1099/{tenant_id}/{tax_year}/{form_id}.pdf
 *
 * Related:
 * - src/modules/form-1099/generator.tsx (PDF generation)
 * - src/modules/statements/storage.ts (pattern reference)
 */

import { PassThrough } from "node:stream";
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import archiver from "archiver";
import { generate1099S3Key } from "./generator";

/**
 * S3 client singleton
 * Configured via environment variables
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 * Uses same bucket as statements for consistency
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-statements";

/**
 * Presigned URL expiry in seconds (15 minutes per architecture spec)
 */
const PRESIGNED_URL_EXPIRY = 900;

/**
 * Upload 1099 PDF to S3
 *
 * @param buffer - PDF file as Buffer
 * @param tenantId - Tenant UUID for key generation
 * @param taxYear - Tax year (e.g., 2024)
 * @param formId - Form 1099 UUID
 * @returns S3 key where PDF was uploaded
 * @throws Error on S3 upload failure
 */
export async function upload1099PDF(
  buffer: Buffer,
  tenantId: string,
  taxYear: number,
  formId: string,
): Promise<string> {
  const s3Key = generate1099S3Key(tenantId, taxYear, formId);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: "application/pdf",
    // Add metadata for traceability
    Metadata: {
      "tenant-id": tenantId,
      "form-id": formId,
      "tax-year": String(taxYear),
      "generated-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return s3Key;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(`[S3] Upload failed for 1099 form ${formId}:`, message);
    throw new Error(`Failed to upload 1099 PDF to S3: ${message}`);
  }
}

/**
 * Generate presigned download URL for 1099 PDF
 * 15-minute expiry per architecture spec
 *
 * @param s3Key - S3 object key (from upload1099PDF)
 * @returns Presigned URL valid for 15 minutes
 * @throws Error if URL generation fails
 */
export async function get1099DownloadUrl(s3Key: string): Promise<string> {
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
    throw new Error(`Failed to generate 1099 download URL: ${message}`);
  }
}

/**
 * Check if a 1099 PDF exists in S3
 *
 * @param s3Key - S3 object key to check
 * @returns true if object exists, false otherwise
 */
export async function form1099PDFExists(s3Key: string): Promise<boolean> {
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
 * Download 1099 PDF as Buffer
 *
 * @param s3Key - S3 object key for the PDF
 * @returns PDF content as Buffer
 * @throws Error if download fails or PDF not found
 */
export async function get1099PDFBuffer(s3Key: string): Promise<Buffer> {
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
    throw new Error(`Failed to download 1099 PDF from S3: ${message}`);
  }
}

/**
 * Generate ZIP file containing multiple 1099 PDFs
 *
 * @param forms - Array of form info with S3 keys and names
 * @returns Buffer containing the ZIP file
 * @throws Error if ZIP generation fails
 */
export async function generate1099ZipBuffer(
  forms: Array<{
    s3Key: string;
    fileName: string;
  }>,
): Promise<Buffer> {
  const archive = archiver("zip", {
    zlib: { level: 9 }, // Maximum compression
  });

  const chunks: Buffer[] = [];
  const passThrough = new PassThrough();

  const resultPromise = new Promise<Buffer>((resolve, reject) => {
    passThrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passThrough.on("end", () => resolve(Buffer.concat(chunks)));
    passThrough.on("error", reject);

    archive.on("error", (err: Error) => {
      console.error("[ZIP] Archive creation failed:", err.message);
      reject(new Error(`Failed to create 1099 ZIP archive: ${err.message}`));
    });
  });

  archive.pipe(passThrough);

  // Add each PDF to the archive
  for (const form of forms) {
    try {
      const pdfBuffer = await get1099PDFBuffer(form.s3Key);
      archive.append(pdfBuffer, { name: form.fileName });
    } catch (error) {
      console.error(`[ZIP] Failed to add ${form.fileName} to archive:`, error);
      // Continue with other files even if one fails
    }
  }

  await archive.finalize();

  return resultPromise;
}

/**
 * Upload ZIP file to S3 and return presigned download URL
 *
 * @param buffer - ZIP file buffer
 * @param tenantId - Tenant UUID
 * @param taxYear - Tax year
 * @returns Presigned URL for ZIP download (15-minute expiry)
 */
export async function upload1099ZipAndGetUrl(
  buffer: Buffer,
  tenantId: string,
  taxYear: number,
): Promise<string> {
  const timestamp = Date.now();
  const s3Key = `1099/${tenantId}/${taxYear}/batch-${timestamp}.zip`;

  const putCommand = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: "application/zip",
    Metadata: {
      "tenant-id": tenantId,
      "tax-year": String(taxYear),
      "generated-at": new Date().toISOString(),
    },
  });

  await s3Client.send(putCommand);

  // Generate presigned URL for download
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const url = await getSignedUrl(s3Client, getCommand, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  return url;
}
