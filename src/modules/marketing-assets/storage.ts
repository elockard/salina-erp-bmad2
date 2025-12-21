/**
 * Marketing Assets S3 Storage Utilities
 *
 * Handles file upload, download URL generation, and validation for marketing assets.
 * Uses AWS S3 SDK for object storage operations.
 *
 * Story: 21.2 - Access Marketing Asset Library
 * AC-21.2.3: Asset downloads to device
 * AC-21.2.4: 15-minute presigned URL expiry
 *
 * Related:
 * - src/modules/statements/storage.ts (pattern reference)
 * - src/modules/production/storage.ts (pattern reference)
 * - docs/architecture.md (File Storage integration pattern)
 */

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import type { AssetType } from "@/db/schema/marketing-assets";

/**
 * S3 client singleton
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-assets";

/**
 * Presigned URL expiry in seconds (15 minutes per AC-21.2.4)
 */
const PRESIGNED_URL_EXPIRY = 900;

// =============================================================================
// File Validation Constants
// =============================================================================

/**
 * Maximum file sizes by asset type (in bytes)
 * Story 21.2: Task 2.2 - Define file validation constants
 */
export const MAX_FILE_SIZES: Record<string, number> = {
  cover_thumbnail: 1 * 1024 * 1024, // 1 MB
  cover_web: 5 * 1024 * 1024, // 5 MB
  cover_print: 50 * 1024 * 1024, // 50 MB (high-res)
  press_release: 10 * 1024 * 1024, // 10 MB
};

/**
 * Allowed MIME types by asset type
 * Story 21.2: Task 2.2 - Define file validation constants
 */
export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  cover_thumbnail: ["image/jpeg", "image/png", "image/webp"],
  cover_web: ["image/jpeg", "image/png", "image/webp"],
  cover_print: ["image/jpeg", "image/png", "image/tiff", "application/pdf"],
  press_release: ["application/pdf"],
};

/**
 * Validate asset file before upload
 * Story 21.2: Task 2.3 - Implement validateAssetFile
 *
 * @param buffer - File content as Buffer
 * @param contentType - MIME type of the file
 * @param assetType - Type of asset being uploaded
 * @returns Validation result with error message if invalid
 */
export function validateAssetFile(
  buffer: Buffer,
  contentType: string,
  assetType: AssetType,
): { valid: true } | { valid: false; error: string } {
  const maxSize = MAX_FILE_SIZES[assetType];
  if (maxSize && buffer.length > maxSize) {
    const maxSizeMB = maxSize / 1024 / 1024;
    return {
      valid: false,
      error: `File exceeds maximum size of ${maxSizeMB}MB for ${assetType}`,
    };
  }

  const allowedTypes = ALLOWED_MIME_TYPES[assetType];
  if (allowedTypes && !allowedTypes.includes(contentType)) {
    return {
      valid: false,
      error: `Invalid file type for ${assetType}. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  return { valid: true };
}

// =============================================================================
// S3 Key Generation
// =============================================================================

/**
 * Generate S3 key for marketing asset
 * Pattern: assets/{tenant_id}/{title_id}/{asset_type}/{timestamp}-{filename}
 *
 * Story 21.2: Task 2.4 - Implement generateAssetS3Key with timestamp
 *
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param assetType - Type of asset
 * @param filename - Original filename
 * @returns S3 object key
 */
export function generateAssetS3Key(
  tenantId: string,
  titleId: string,
  assetType: AssetType,
  filename: string,
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `assets/${tenantId}/${titleId}/${assetType}/${timestamp}-${sanitizedFilename}`;
}

// =============================================================================
// Upload Operations
// =============================================================================

/**
 * Upload marketing asset to S3
 * Story 21.2: Task 2.5 - Implement uploadMarketingAsset
 *
 * @param buffer - File content as Buffer
 * @param tenantId - Tenant UUID
 * @param titleId - Title UUID
 * @param assetType - Type of asset
 * @param filename - Original filename
 * @param contentType - MIME type
 * @returns Object with S3 key, filename, and size
 * @throws Error on S3 upload failure or validation failure
 */
export async function uploadMarketingAsset(
  buffer: Buffer,
  tenantId: string,
  titleId: string,
  assetType: AssetType,
  filename: string,
  contentType: string,
): Promise<{ key: string; fileName: string; fileSize: number }> {
  // Validate file first
  const validation = validateAssetFile(buffer, contentType, assetType);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const s3Key = generateAssetS3Key(tenantId, titleId, assetType, filename);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: buffer,
    ContentType: contentType,
    Metadata: {
      "tenant-id": tenantId,
      "title-id": titleId,
      "asset-type": assetType,
      "original-name": filename,
      "uploaded-at": new Date().toISOString(),
    },
  });

  try {
    await s3Client.send(command);
    return {
      key: s3Key,
      fileName: filename,
      fileSize: buffer.length,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 upload error";
    console.error(
      `[S3] Marketing asset upload failed for title ${titleId}:`,
      message,
    );
    throw new Error(`Failed to upload marketing asset to S3: ${message}`);
  }
}

// =============================================================================
// Download Operations
// =============================================================================

/**
 * Generate presigned download URL for marketing asset
 * Story 21.2: Task 2.6 - Implement getAssetDownloadUrl
 * AC-21.2.4: 15-minute presigned URL expiry with Content-Disposition header
 *
 * @param s3Key - S3 object key
 * @param filename - Filename for Content-Disposition header
 * @returns Presigned URL valid for 15 minutes
 * @throws Error if URL generation fails
 */
export async function getAssetDownloadUrl(
  s3Key: string,
  filename: string,
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
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

// =============================================================================
// Delete Operations
// =============================================================================

/**
 * Delete marketing asset from S3
 * Story 21.2: Task 2.7 - Implement deleteMarketingAsset
 *
 * Note: This performs a hard delete from S3. For compliance,
 * the database record uses soft delete (deleted_at timestamp).
 *
 * @param s3Key - S3 object key to delete
 * @throws Error if deletion fails
 */
export async function deleteMarketingAsset(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  try {
    await s3Client.send(command);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown S3 delete error";
    console.error(
      `[S3] Marketing asset deletion failed for ${s3Key}:`,
      message,
    );
    throw new Error(`Failed to delete marketing asset from S3: ${message}`);
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

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
