/**
 * Admin Module Type Definitions
 *
 * Types for system monitoring, health checks, and background job tracking.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 */

/**
 * Health check status values
 * - healthy: Service is responding normally
 * - degraded: Service is slow but functional
 * - unhealthy: Service is not responding or erroring
 * - checking: Health check is in progress
 */
export type HealthStatus = "healthy" | "degraded" | "unhealthy" | "checking";

/**
 * Result of a single health check operation
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 * AC-6.6.8: Health check failures display warning indicators
 */
export interface HealthCheckResult {
  /** Service name (e.g., "database", "clerk", "s3", "resend", "inngest") */
  service: string;
  /** Current health status */
  status: HealthStatus;
  /** Response time in milliseconds */
  latencyMs: number;
  /** Optional error or status message */
  message?: string;
  /** Timestamp when check was performed */
  checkedAt: Date;
}

/**
 * Background job status values
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 */
export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

/**
 * Job types corresponding to Inngest functions
 * AC-6.6.3: Job types displayed: PDF generation, Batch statement generation
 */
export type JobType = "pdf-generation" | "batch-statements";

/**
 * Summary counts for job dashboard cards
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 */
export interface JobSummary {
  /** Currently running jobs */
  active: number;
  /** Jobs waiting to be processed */
  queued: number;
  /** Jobs completed in the last 24 hours */
  completedLast24h: number;
  /** Jobs failed in the last 24 hours */
  failedLast24h: number;
}

/**
 * Individual job entry for list view
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 * AC-6.6.5: Failed jobs show error message and retry count
 */
export interface JobEntry {
  /** Unique job identifier */
  id: string;
  /** Type of job (maps to Inngest function) */
  type: JobType;
  /** Current job status */
  status: JobStatus;
  /** Inngest function name (e.g., "statements/pdf.generate") */
  functionName: string;
  /** When the job started processing (null if queued) */
  startedAt: Date | null;
  /** When the job completed (null if not completed) */
  completedAt: Date | null;
  /** Execution duration in milliseconds (null if not completed) */
  durationMs: number | null;
  /** Error message for failed jobs */
  error?: string;
  /** Number of retry attempts for failed jobs */
  retryCount?: number;
  /** Job input parameters (for debugging) */
  input?: Record<string, unknown>;
}

/**
 * Filters for job list queries
 * AC-6.6.3: Job types displayed with filtering
 */
export interface JobFilters {
  /** Filter by job type */
  type?: JobType;
  /** Filter by job status */
  status?: JobStatus;
}

/**
 * Paginated job list response
 */
export interface JobListResponse {
  /** List of jobs */
  jobs: JobEntry[];
  /** Total count for pagination */
  total: number;
}
