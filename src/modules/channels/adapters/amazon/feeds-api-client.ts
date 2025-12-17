/**
 * Amazon SP-API Feeds Client
 *
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 *
 * Uses AWS Signature V4 for authentication (from Story 17.1 api-client.ts)
 * Reference: https://developer-docs.amazon.com/sp-api/docs/feeds-api-v2021-06-30-reference
 *
 * Feed Processing Flow:
 * 1. Create feed document (get upload URL)
 * 2. Upload ONIX XML to pre-signed S3 URL
 * 3. Create feed with document ID
 * 4. Poll for completion status
 * 5. Handle success/error
 */

import { createHash } from "node:crypto";
import {
  type AmazonCredentials,
  getEndpointForRegion,
  signRequest,
} from "./api-client";

/**
 * Result from creating a feed document
 */
export interface CreateFeedDocumentResult {
  feedDocumentId: string;
  url: string; // Pre-signed S3 URL for upload
}

/**
 * Result from creating a feed
 */
export interface CreateFeedResult {
  feedId: string;
}

/**
 * Feed processing status from Amazon
 */
export interface FeedStatus {
  feedId: string;
  feedType: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  resultFeedDocumentId?: string;
}

/**
 * Options for polling feed completion
 */
export interface PollOptions {
  maxWaitMs?: number;
  pollIntervalMs?: number;
}

/**
 * Default timeout values
 */
const DEFAULT_TIMEOUT_MS = 60000; // 60 seconds per AC3
const DEFAULT_MAX_WAIT_MS = 600000; // 10 minutes per AC5
const DEFAULT_POLL_INTERVAL_MS = 30000; // 30 seconds per AC5

/**
 * Create feed document to get pre-signed upload URL
 *
 * Story 17.2 - AC3: Amazon Feeds API Upload
 *
 * Step 1: POST /feeds/2021-06-30/documents
 */
export async function createFeedDocument(
  credentials: AmazonCredentials,
): Promise<CreateFeedDocumentResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/feeds/2021-06-30/documents";
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const body = JSON.stringify({
    contentType: "text/xml; charset=UTF-8",
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
        `Failed to create feed document: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as CreateFeedDocumentResult;
    return {
      feedDocumentId: data.feedDocumentId,
      url: data.url,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Create feed document timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Upload ONIX XML content to pre-signed S3 URL
 *
 * Story 17.2 - AC3: Amazon Feeds API Upload
 *
 * Step 2: PUT to pre-signed URL from createFeedDocument
 */
export async function uploadFeedContent(
  uploadUrl: string,
  xmlContent: string,
): Promise<{ success: boolean; message?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": "text/xml; charset=UTF-8",
      },
      body: xmlContent,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        message: `S3 upload failed: ${response.status} - ${errorBody.slice(0, 200)}`,
      };
    }

    return { success: true };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        message: "S3 upload timed out after 60 seconds",
      };
    }
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown upload error",
    };
  }
}

/**
 * Create feed submission
 *
 * Story 17.2 - AC3: Amazon Feeds API Upload
 *
 * Step 3: POST /feeds/2021-06-30/feeds with document ID
 */
export async function createFeed(
  credentials: AmazonCredentials,
  feedDocumentId: string,
): Promise<CreateFeedResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/feeds/2021-06-30/feeds";
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const body = JSON.stringify({
    feedType: "POST_PRODUCT_DATA",
    marketplaceIds: [credentials.marketplaceId],
    inputFeedDocumentId: feedDocumentId,
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
        `Failed to create feed: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as CreateFeedResult;
    return { feedId: data.feedId };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Create feed timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Get feed processing status
 *
 * Story 17.2 - AC5: Feed Status Polling
 *
 * Step 4: GET /feeds/2021-06-30/feeds/{feedId}
 */
export async function getFeedStatus(
  credentials: AmazonCredentials,
  feedId: string,
): Promise<FeedStatus> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = `/feeds/2021-06-30/feeds/${feedId}`;
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
        `Failed to get feed status: ${response.status} - ${errorBody.slice(0, 200)}`,
      );
    }

    const data = (await response.json()) as FeedStatus;
    return {
      feedId: data.feedId,
      feedType: data.feedType,
      processingStatus: data.processingStatus,
      resultFeedDocumentId: data.resultFeedDocumentId,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Get feed status timed out after 60 seconds");
    }
    throw error;
  }
}

/**
 * Poll for feed completion with timeout
 *
 * Story 17.2 - AC5: Feed Status Polling
 * - Polls every 30 seconds
 * - Max wait time of 10 minutes
 * - Returns final status when processing completes
 *
 * NOTE: For Inngest jobs, use step.sleep instead of this function
 * to allow proper job checkpointing during long waits.
 */
export async function pollFeedCompletion(
  credentials: AmazonCredentials,
  feedId: string,
  options: PollOptions = {},
): Promise<FeedStatus> {
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS;
  const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const status = await getFeedStatus(credentials, feedId);

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
    `Feed processing timed out after ${maxWaitMs / 1000} seconds`,
  );
}

/**
 * Complete feed upload flow
 *
 * Combines all steps: create document, upload, create feed, poll for completion
 * This is a convenience function for use outside of Inngest jobs.
 *
 * For Inngest jobs, execute each step separately with step.run/step.sleep
 * to enable proper checkpointing.
 */
export async function uploadFeedAndWait(
  credentials: AmazonCredentials,
  xmlContent: string,
  pollOptions?: PollOptions,
): Promise<FeedStatus> {
  // Step 1: Create feed document
  const document = await createFeedDocument(credentials);

  // Step 2: Upload content
  const uploadResult = await uploadFeedContent(document.url, xmlContent);
  if (!uploadResult.success) {
    throw new Error(uploadResult.message);
  }

  // Step 3: Create feed
  const feed = await createFeed(credentials, document.feedDocumentId);

  // Step 4: Poll for completion
  const status = await pollFeedCompletion(
    credentials,
    feed.feedId,
    pollOptions,
  );

  return status;
}
