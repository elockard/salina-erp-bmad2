/**
 * Production S3 Storage Utilities
 *
 * Handles manuscript file upload and presigned URL generation.
 * Uses AWS S3 SDK for object storage operations.
 *
 * Story: 18.1 - Create Production Projects
 * AC-18.1.3: Upload manuscript file (PDF/DOCX/DOC, max 50MB)
 *
 * Related:
 * - src/modules/statements/storage.ts (pattern reference)
 * - docs/architecture.md (File Storage integration pattern)
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * S3 client singleton
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-production";

/**
 * Presigned URL expiry in seconds (15 minutes)
 */
const PRESIGNED_URL_EXPIRY = 900;

/**
 * Maximum manuscript file size (50MB)
 * AC-18.1.3: max 50MB
 */
export const MANUSCRIPT_MAX_SIZE = 50 * 1024 * 1024;

/**
 * Allowed manuscript MIME types
 * AC-18.1.3: PDF/DOCX/DOC
 */
export const MANUSCRIPT_ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
];

/**
 * Allowed manuscript file extensions
 */
export const MANUSCRIPT_ALLOWED_EXTENSIONS = [".pdf", ".docx", ".doc"];

/**
 * Validate manuscript file
 *
 * @param file - File to validate
 * @throws Error if file is invalid
 */
export function validateManuscriptFile(file: File): void {
  if (!MANUSCRIPT_ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Invalid file type. Allowed: PDF, DOCX, DOC");
  }

  if (file.size > MANUSCRIPT_MAX_SIZE) {
    throw new Error("File too large. Maximum size is 50MB");
  }
}

/**
 * Generate S3 key for manuscript
 * Pattern: production/{tenant_id}/{project_id}/{timestamp}-{filename}
 *
 * @param tenantId - Tenant UUID
 * @param projectId - Production project UUID
 * @param fileName - Original filename
 * @returns S3 object key
 */
export function generateManuscriptS3Key(
  tenantId: string,
  projectId: string,
  fileName: string,
): string {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `production/${tenantId}/${projectId}/${timestamp}-${sanitizedName}`;
}

/**
 * Upload manuscript file to S3
 *
 * @param buffer - File content as Buffer
 * @param tenantId - Tenant UUID
 * @param projectId - Production project UUID
 * @param fileName - Original filename
 * @param contentType - MIME type
 * @returns Object with S3 key, filename, and size
 * @throws Error on S3 upload failure
 */
export async function uploadManuscript(
  buffer: Buffer,
  tenantId: string,
  projectId: string,
  fileName: string,
  contentType: string,
): Promise<{ key: string; fileName: string; fileSize: number }> {
  const s3Key = generateManuscriptS3Key(tenantId, projectId, fileName);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      "tenant-id": tenantId,
      "project-id": projectId,
      "original-name": fileName,
      "uploaded-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return {
      key: s3Key,
      fileName,
      fileSize: buffer.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(
      `[S3] Manuscript upload failed for project ${projectId}:`,
      message,
    );
    throw new Error(`Failed to upload manuscript to S3: ${message}`);
  }
}

/**
 * Generate presigned download URL for manuscript
 *
 * @param s3Key - S3 object key
 * @returns Presigned URL valid for 15 minutes
 * @throws Error if URL generation fails
 */
export async function getManuscriptDownloadUrl(s3Key: string): Promise<string> {
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
 * Delete manuscript from S3
 *
 * @param s3Key - S3 object key to delete
 * @throws Error if deletion fails
 */
export async function deleteManuscript(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 delete error";
    console.error(`[S3] Manuscript deletion failed for ${s3Key}:`, message);
    throw new Error(`Failed to delete manuscript from S3: ${message}`);
  }
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted size string (e.g., "2.5 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
