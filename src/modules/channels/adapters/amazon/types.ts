/**
 * Amazon Channel Types
 *
 * Story 17.1 - Configure Amazon Account Connection
 * Story 17.2 - Schedule Automated ONIX Feeds to Amazon
 */

/**
 * Amazon integration status for UI display
 */
export interface AmazonStatus {
  connected: boolean;
  programType?: string; // 'kdp' or 'advantage'
  marketplace?: string; // 'US', 'UK', etc.
  accessKeyId?: string; // For pre-populating edit form (AC6)
  lastTest: Date | null;
  lastStatus: string | null;
}

// NOTE: ConnectionTestResult is defined in api-client.ts
// Import from there if needed: import { ConnectionTestResult } from "./api-client";

/**
 * Feed schedule configuration
 * Story 17.2 - AC1: Feed Schedule Configuration
 */
export interface AmazonSchedule {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}

/**
 * Feed status from Amazon SP-API
 * Story 17.2 - AC5: Feed Status Polling
 */
export interface AmazonFeedStatus {
  feedId: string;
  feedType: string;
  processingStatus: "IN_QUEUE" | "IN_PROGRESS" | "DONE" | "CANCELLED" | "FATAL";
  resultFeedDocumentId?: string;
}
