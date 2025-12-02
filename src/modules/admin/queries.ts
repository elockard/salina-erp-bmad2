/**
 * Admin Module Queries
 *
 * Query functions for system monitoring and job status.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 * AC-6.6.3: Job types displayed: PDF generation, Batch statement generation
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 *
 * Note: Per dev notes, Inngest SDK doesn't expose job status methods directly.
 * This module provides mock data for development and links to Inngest dashboard
 * for production monitoring (AC-6.6.6).
 *
 * Related:
 * - src/inngest/functions.ts (job definitions)
 * - src/app/(dashboard)/admin/system/page.tsx (consumer)
 */

import type {
  JobEntry,
  JobFilters,
  JobListResponse,
  JobSummary,
  JobType,
} from "./types";

/**
 * Map JobType to display label
 */
export const JOB_TYPE_LABELS: Record<JobType, string> = {
  "pdf-generation": "PDF Generation",
  "batch-statements": "Batch Statements",
};

/**
 * Get job summary counts
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 *
 * Note: In production, this would query Inngest REST API.
 * Currently returns simulated data for development.
 *
 * @returns JobSummary with counts for each status
 */
export async function getJobSummary(): Promise<JobSummary> {
  // TODO: Integrate with Inngest REST API when available
  // For now, return empty counts - actual monitoring via Inngest dashboard
  return {
    active: 0,
    queued: 0,
    completedLast24h: 0,
    failedLast24h: 0,
  };
}

/**
 * Get recent jobs with pagination and filtering
 * AC-6.6.3: Job types displayed: PDF generation, Batch statement generation
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 *
 * Note: In production, this would query Inngest REST API.
 * Currently returns empty list - use Inngest dashboard for actual monitoring.
 *
 * @param filters - Optional filters for type and status
 * @param page - Page number (1-indexed)
 * @param pageSize - Number of items per page
 * @returns Paginated list of jobs
 */
export async function getRecentJobs(
  _filters: JobFilters = {},
  _page = 1,
  _pageSize = 20,
): Promise<JobListResponse> {
  // TODO: Integrate with Inngest REST API when available
  // For now, return empty list - actual monitoring via Inngest dashboard
  return {
    jobs: [],
    total: 0,
  };
}

/**
 * Get job detail by ID
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 * AC-6.6.5: Failed jobs show error message and retry count
 *
 * Note: In production, this would query Inngest REST API.
 * Currently returns null - use Inngest dashboard for actual monitoring.
 *
 * @param jobId - Job identifier
 * @returns Job entry or null if not found
 */
export async function getJobDetail(_jobId: string): Promise<JobEntry | null> {
  // TODO: Integrate with Inngest REST API when available
  // For now, return null - actual monitoring via Inngest dashboard
  return null;
}

/**
 * Get the Inngest dashboard URL
 * AC-6.6.6: Link to Inngest dashboard provided for detailed monitoring
 *
 * @returns URL to Inngest dashboard
 */
export function getInngestDashboardUrl(): string {
  // Use environment variable if set, otherwise default to dev URL
  const baseUrl =
    process.env.INNGEST_DASHBOARD_URL ||
    "https://app.inngest.com/env/development/apps/salina-erp";

  return baseUrl;
}

/**
 * Get job type label for display
 *
 * @param type - JobType
 * @returns Human-readable label
 */
export function getJobTypeLabel(type: JobType): string {
  return JOB_TYPE_LABELS[type] || type;
}

/**
 * Get all available job types
 * AC-6.6.3: Job types displayed: PDF generation, Batch statement generation
 *
 * @returns Array of job types
 */
export function getAvailableJobTypes(): Array<{
  value: JobType;
  label: string;
}> {
  return [
    { value: "pdf-generation", label: "PDF Generation" },
    { value: "batch-statements", label: "Batch Statements" },
  ];
}
