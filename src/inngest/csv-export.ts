/**
 * CSV Export Inngest Function
 *
 * Story 19.3 - FR173: Background CSV export processing
 *
 * Handles large exports (>1000 rows) asynchronously:
 * - Generates CSV using export generators
 * - Uploads to S3 with presigned URL
 * - Updates export record with status and download URL
 *
 * Note: Uses adminDb because Inngest jobs run outside HTTP request context
 */

import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { eq } from "drizzle-orm";

import { adminDb } from "@/db";
import { csvExports } from "@/db/schema/csv-exports";
import {
  generateContactsCsv,
  generateSalesCsv,
  generateTitlesCsv,
} from "@/modules/import-export/exporters/csv-exporter";
import type {
  ExportDataType,
  ExportFilters,
} from "@/modules/import-export/types";
import { inngest } from "./client";

/**
 * S3 client singleton
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
});

/**
 * S3 bucket name from environment
 */
const BUCKET_NAME = process.env.AWS_S3_BUCKET ?? "salina-erp-exports";

/**
 * Presigned URL expiry in seconds (24 hours per story spec)
 */
const PRESIGNED_URL_EXPIRY = 86400;

/**
 * Generate S3 key for export CSV
 * Pattern: exports/{tenant_id}/{export_id}.csv
 */
function generateExportS3Key(tenantId: string, exportId: string): string {
  return `exports/${tenantId}/${exportId}.csv`;
}

/**
 * Upload CSV to S3 and return presigned URL
 */
async function uploadCsvToS3(
  csv: string,
  tenantId: string,
  exportId: string,
): Promise<{ s3Key: string; fileUrl: string }> {
  const s3Key = generateExportS3Key(tenantId, exportId);

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: csv,
    ContentType: "text/csv;charset=utf-8",
    Metadata: {
      "tenant-id": tenantId,
      "export-id": exportId,
      "generated-at": new Date().toISOString(),
    },
  });

  await s3Client.send(command);

  // Generate presigned URL for download
  const getCommand = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
  });

  const fileUrl = await getSignedUrl(s3Client, getCommand, {
    expiresIn: PRESIGNED_URL_EXPIRY,
  });

  return { s3Key, fileUrl };
}

/**
 * CSV Export event data
 */
interface CsvExportEventData {
  exportId: string;
  tenantId: string;
  exportType: ExportDataType;
  filters?: ExportFilters;
}

/**
 * CSV Export Inngest function
 *
 * Triggered by: csv-export/generate event
 * Handles background processing of large CSV exports
 */
export const csvExportGenerate = inngest.createFunction(
  {
    id: "csv-export-generate",
    retries: 3,
    onFailure: async ({ event }) => {
      // Called after ALL retries exhausted - mark as final failure
      const { exportId } = event.data as unknown as CsvExportEventData;

      await adminDb
        .update(csvExports)
        .set({
          status: "failed",
          error_message: "All retry attempts exhausted",
          completed_at: new Date(),
        })
        .where(eq(csvExports.id, exportId));
    },
  },
  { event: "csv-export/generate" },
  async ({ event, step }) => {
    const { exportId, tenantId, exportType, filters } =
      event.data as CsvExportEventData;

    // Step 1: Mark as processing
    await step.run("mark-processing", async () => {
      await adminDb
        .update(csvExports)
        .set({
          status: "processing",
          started_at: new Date(),
        })
        .where(eq(csvExports.id, exportId));
    });

    // Step 2: Generate CSV based on export type
    const csv = await step.run("generate-csv", async () => {
      // Reconstruct Date objects from filters (JSON serialization loses Date types)
      const parsedFilters: ExportFilters | undefined = filters
        ? {
            ...filters,
            dateRange: filters.dateRange
              ? {
                  from: new Date(filters.dateRange.from),
                  to: new Date(filters.dateRange.to),
                }
              : undefined,
          }
        : undefined;

      switch (exportType) {
        case "titles":
          return generateTitlesCsv(tenantId, parsedFilters);
        case "contacts":
          return generateContactsCsv(tenantId, parsedFilters);
        case "sales":
          return generateSalesCsv(tenantId, parsedFilters);
        default:
          throw new Error(`Unknown export type: ${exportType}`);
      }
    });

    // Step 3: Upload to S3
    const { fileUrl } = await step.run("upload-to-s3", async () => {
      return uploadCsvToS3(csv, tenantId, exportId);
    });

    // Step 4: Calculate row count (minus header rows: timestamp + empty + column headers = 3)
    const rowCount = csv.split("\n").length - 3;
    const fileSize = Buffer.byteLength(csv, "utf8");

    // Step 5: Update record with completion info
    await step.run("complete", async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + PRESIGNED_URL_EXPIRY * 1000);

      await adminDb
        .update(csvExports)
        .set({
          status: "completed",
          file_url: fileUrl,
          row_count: rowCount,
          file_size: fileSize,
          completed_at: now,
          expires_at: expiresAt,
        })
        .where(eq(csvExports.id, exportId));
    });

    return {
      status: "completed",
      exportId,
      rowCount,
      fileSize,
    };
  },
);
