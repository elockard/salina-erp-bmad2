/**
 * Amazon SP-API Reports Client
 *
 * Story 17.3 - Import Amazon Sales Data
 *
 * Uses AWS Signature V4 for authentication (from Story 17.1 api-client.ts)
 * Reference: https://developer-docs.amazon.com/sp-api/docs/reports-api-v2021-06-30-reference
 *
 * Reports API Flow:
 * 1. Create report request (POST /reports)
 * 2. Poll for report completion (GET /reports/{reportId})
 * 3. Get report document (GET /documents/{reportDocumentId})
 * 4. Download and decompress report content
 */

import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import {
  type AmazonCredentials,
  getEndpointForRegion,
  signRequest,
} from "./api-client";

/**
 * Sales report type for all orders
 * Reference: https://developer-docs.amazon.com/sp-api/docs/report-type-values-analytics
 */
export const SALES_REPORT_TYPE =
  "GET_FLAT_FILE_ALL_ORDERS_DATA_BY_ORDER_DATE_GENERAL";

/**
 * Result from creating a report request
 */
export interface CreateReportResult {
  reportId: string;
}

/**
 * Report processing status from Amazon
 */
export interface ReportStatus {
  reportId: string;
  reportType: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  reportDocumentId?: string;
  processingStartTime?: string;
  processingEndTime?: string;
}

/**
 * Report document with download URL
 */
export interface ReportDocument {
  reportDocumentId: string;
  url: string;
  compressionAlgorithm?: "GZIP";
}

/**
 * Options for polling report completion
 */
export interface ReportPollOptions {
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

/**
 * Default timeout values
 */
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds
const DEFAULT_MAX_WAIT_MS = 600000; // 10 minutes per AC2
const DEFAULT_POLL_INTERVAL_MS = 30000; // 30 seconds per AC2

/**
 * Request a sales report for the specified date range
 *
 * Story 17.3 - AC1: Request Amazon Sales Reports
 *
 * POST /reports/2021-06-30/reports
 */
export async function createReport(
  credentials: AmazonCredentials,
  startDate: Date,
  endDate: Date,
  reportType: string = SALES_REPORT_TYPE,
): Promise<CreateReportResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/reports/2021-06-30/reports";
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const body = JSON.stringify({
    reportType,
    marketplaceIds: [credentials.marketplaceId],
    dataStartTime: startDate.toISOString(),
    dataEndTime: endDate.toISOString(),
  });

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": createHash("sha256").update(body).digest("hex"),
    "content-type": "application/json",
  };

  const authorization = signRequest(
    "POST",
    url,
    headers,
    body,
    credentials,
    timestamp,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        ...headers,
        Authorization: authorization,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to create report: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as CreateReportResult;
    return { reportId: data.reportId };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Create report request timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Get report processing status
 *
 * Story 17.3 - AC2: Poll for Report Completion
 *
 * GET /reports/2021-06-30/reports/{reportId}
 */
export async function getReportStatus(
  credentials: AmazonCredentials,
  reportId: string,
): Promise<ReportStatus> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = `/reports/2021-06-30/reports/${encodeURIComponent(reportId)}`;
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": createHash("sha256").update("").digest("hex"),
  };

  const authorization = signRequest(
    "GET",
    url,
    headers,
    "",
    credentials,
    timestamp,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...headers,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to get report status: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as ReportStatus;
    return {
      reportId: data.reportId,
      reportType: data.reportType,
      processingStatus: data.processingStatus,
      reportDocumentId: data.reportDocumentId,
      processingStartTime: data.processingStartTime,
      processingEndTime: data.processingEndTime,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Get report status timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Get report document download URL
 *
 * Story 17.3 - AC3: Download and Parse Sales Report
 *
 * GET /reports/2021-06-30/documents/{reportDocumentId}
 */
export async function getReportDocument(
  credentials: AmazonCredentials,
  reportDocumentId: string,
): Promise<ReportDocument> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = `/reports/2021-06-30/documents/${encodeURIComponent(reportDocumentId)}`;
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": createHash("sha256").update("").digest("hex"),
  };

  const authorization = signRequest(
    "GET",
    url,
    headers,
    "",
    credentials,
    timestamp,
  );

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...headers,
        Authorization: authorization,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to get report document: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as ReportDocument;
    return {
      reportDocumentId: data.reportDocumentId,
      url: data.url,
      compressionAlgorithm: data.compressionAlgorithm,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Get report document timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Download report content from pre-signed URL
 * Handles GZIP decompression if needed
 *
 * Story 17.3 - AC3: Download and Parse Sales Report
 */
export async function downloadReportContent(
  document: ReportDocument,
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(document.url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(
        `Failed to download report: ${response.status} - ${response.statusText}`,
      );
    }

    const buffer = await response.arrayBuffer();

    // Handle GZIP compression per AC3
    if (document.compressionAlgorithm === "GZIP") {
      return gunzipSync(Buffer.from(buffer)).toString("utf-8");
    }

    return Buffer.from(buffer).toString("utf-8");
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Download report timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Poll for report completion with timeout
 *
 * Story 17.3 - AC2: Poll for Report Completion
 * - Polls every 30 seconds
 * - Max wait time of 10 minutes
 * - Returns final status when processing completes
 *
 * NOTE: For Inngest jobs, use step.sleep instead of this function
 * to allow proper job checkpointing during long waits.
 */
export async function pollReportCompletion(
  credentials: AmazonCredentials,
  reportId: string,
  options: ReportPollOptions = {},
): Promise<ReportStatus> {
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getReportStatus(credentials, reportId);

    // Terminal states: DONE, CANCELLED, FATAL
    if (
      status.processingStatus === "DONE" ||
      status.processingStatus === "CANCELLED" ||
      status.processingStatus === "FATAL"
    ) {
      return status;
    }

    // Still processing, wait and try again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timed out
  throw new Error(
    `Report processing timed out after ${maxWaitMs / 1000} seconds`,
  );
}

/**
 * Complete report request flow
 *
 * Combines all steps: create report, poll for completion, get document, download content
 * This is a convenience function for use outside of Inngest jobs.
 *
 * For Inngest jobs, execute each step separately with step.run/step.sleep
 * to enable proper checkpointing.
 */
export async function requestReportAndDownload(
  credentials: AmazonCredentials,
  startDate: Date,
  endDate: Date,
  pollOptions?: ReportPollOptions,
): Promise<string> {
  // Step 1: Create report request
  const report = await createReport(credentials, startDate, endDate);

  // Step 2: Poll for completion
  const status = await pollReportCompletion(
    credentials,
    report.reportId,
    pollOptions,
  );

  if (status.processingStatus !== "DONE") {
    throw new Error(`Report processing failed: ${status.processingStatus}`);
  }

  if (!status.reportDocumentId) {
    throw new Error("Report completed but no document ID returned");
  }

  // Step 3: Get report document
  const document = await getReportDocument(
    credentials,
    status.reportDocumentId,
  );

  // Step 4: Download content
  const content = await downloadReportContent(document);

  return content;
}
