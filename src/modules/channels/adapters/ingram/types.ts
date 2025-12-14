/**
 * Ingram Channel Adapter Types
 *
 * Story 16.1 - Configure Ingram Account Connection
 */

/**
 * Ingram FTP credentials structure
 */
export interface IngramCredentials {
  host: string;
  username: string;
  password: string;
  port: number;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
}

/**
 * Ingram integration status
 */
export interface IngramStatus {
  connected: boolean;
  lastTest: Date | null;
  lastStatus: string | null;
}

/**
 * Feed schedule configuration
 * Story 16.2 - AC1: Feed Schedule Configuration
 */
export interface IngramSchedule {
  frequency: "disabled" | "daily" | "weekly";
  hour: number;
  dayOfWeek?: number;
  feedType: "full" | "delta";
}
