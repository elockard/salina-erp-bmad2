/**
 * Platform Admin Inngest Job Monitoring
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 3)
 *
 * Provides job queue metrics for platform monitoring.
 * Note: Inngest SDK doesn't expose job stats programmatically (confirmed in Story 6.6).
 * Returns dashboard link for manual verification.
 */

import type { InngestJobMetrics } from "./types";

/**
 * Inngest dashboard URL
 * Can be overridden via INNGEST_DASHBOARD_URL environment variable
 */
const INNGEST_DASHBOARD_URL =
  process.env.INNGEST_DASHBOARD_URL ??
  "https://app.inngest.com/env/development/apps/salina-erp";

/**
 * Get Inngest job metrics
 *
 * Note: Inngest SDK doesn't expose job stats programmatically (per Story 6.6 notes).
 * Returns dashboard link for manual verification.
 *
 * @returns InngestJobMetrics with status "unknown" and dashboard link
 */
export function getInngestJobMetrics(): InngestJobMetrics {
  // Inngest SDK doesn't expose job stats programmatically
  // Return dashboard link for manual verification (same pattern as Story 6.6)
  return {
    queuedCount: null, // Unknown without API access
    runningCount: null,
    recentFailures: [],
    successRateLast24h: null,
    dashboardUrl: INNGEST_DASHBOARD_URL,
    status: "unknown", // Indicates manual check needed
  };
}
