"use client";

/**
 * System Monitoring Client Component
 *
 * Client-side orchestration of system monitoring components.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.1: Admin/Owner users can access /admin/system page
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 * AC-6.6.6: Link to Inngest dashboard provided for detailed monitoring
 * AC-6.6.7: System health section shows status of Database, Clerk, S3, Resend, Inngest
 *
 * Related:
 * - src/modules/admin/components/ (UI components)
 * - src/app/(dashboard)/admin/system/page.tsx (parent)
 */

import { RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  HealthStatus,
  InngestLink,
  JobList,
  JobSummaryCards,
} from "@/modules/admin/components";
import { getJobSummary, getRecentJobs } from "@/modules/admin/queries";
import type { JobEntry, JobFilters, JobSummary } from "@/modules/admin/types";

/**
 * Default page size for job list
 */
const DEFAULT_PAGE_SIZE = 20;

/**
 * System Monitoring Client Component
 * AC-6.6.1-8: Assembles all monitoring components
 */
export function SystemMonitoringClient() {
  // Job summary state
  const [jobSummary, setJobSummary] = useState<JobSummary>({
    active: 0,
    queued: 0,
    completedLast24h: 0,
    failedLast24h: 0,
  });

  // Job list state
  const [jobs, setJobs] = useState<JobEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<JobFilters>({});

  // Loading state
  const [isPending, startTransition] = useTransition();

  /**
   * Fetch job data
   */
  const fetchJobData = useCallback(async () => {
    const [summaryData, jobsData] = await Promise.all([
      getJobSummary(),
      getRecentJobs(filters, page, DEFAULT_PAGE_SIZE),
    ]);

    setJobSummary(summaryData);
    setJobs(jobsData.jobs);
    setTotal(jobsData.total);
  }, [filters, page]);

  /**
   * Refresh all data
   */
  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      await fetchJobData();
    });
  }, [fetchJobData]);

  /**
   * Handle filter change from summary cards
   */
  const handleSummaryFilter = useCallback((filterValue: string) => {
    setFilters((prev) => ({
      ...prev,
      status: filterValue as JobFilters["status"],
    }));
    setPage(1);
  }, []);

  /**
   * Handle filter change from job list
   */
  const handleFiltersChange = useCallback((newFilters: JobFilters) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  /**
   * Handle page change
   */
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchJobData();
  }, [fetchJobData]);

  return (
    <div className="space-y-8" data-testid="system-monitoring-container">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <InngestLink />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isPending}
          data-testid="refresh-all-button"
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`}
          />
          Refresh All
        </Button>
      </div>

      {/* Health Status Section */}
      <HealthStatus />

      {/* Job Summary Cards */}
      <JobSummaryCards
        summary={jobSummary}
        onFilterChange={handleSummaryFilter}
      />

      {/* Job List Table */}
      <JobList
        jobs={jobs}
        total={total}
        page={page}
        pageSize={DEFAULT_PAGE_SIZE}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
