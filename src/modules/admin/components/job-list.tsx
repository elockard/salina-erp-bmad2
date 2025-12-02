"use client";

/**
 * Job List Table Component
 *
 * Displays a table of background jobs with filtering, pagination, and expandable rows.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.3: Job types displayed: PDF generation, Batch statement generation
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 * AC-6.6.5: Failed jobs show error message and retry count
 *
 * Related:
 * - src/modules/admin/queries.ts (data source)
 * - src/app/(dashboard)/admin/system/page.tsx (consumer)
 */

import { format, formatDistanceStrict } from "date-fns";
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAvailableJobTypes, getJobTypeLabel } from "../queries";
import type { JobEntry, JobFilters, JobStatus, JobType } from "../types";

interface JobListProps {
  jobs: JobEntry[];
  total: number;
  page: number;
  pageSize: number;
  filters: JobFilters;
  onFiltersChange: (filters: JobFilters) => void;
  onPageChange: (page: number) => void;
}

/**
 * Status badge styling
 * AC-6.6.4: Status badge styling: running (blue pulse), completed (green), failed (red), queued (amber)
 */
const STATUS_CONFIG: Record<
  JobStatus,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  },
  running: {
    label: "Running",
    icon: Loader2,
    variant: "default",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    variant: "secondary",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    variant: "destructive",
    className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    variant: "outline",
    className: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
};

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: JobStatus }) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isRunning = status === "running";

  return (
    <Badge className={`${config.className} flex items-center gap-1`}>
      <Icon className={`h-3 w-3 ${isRunning ? "animate-spin" : ""}`} />
      {config.label}
    </Badge>
  );
}

/**
 * Format duration in human-readable format
 */
function formatDuration(durationMs: number | null): string {
  if (durationMs === null) return "-";
  if (durationMs < 1000) return `${durationMs}ms`;
  return formatDistanceStrict(0, durationMs, { unit: "second" });
}

/**
 * Truncate job ID for display
 */
function truncateId(id: string): string {
  if (id.length <= 8) return id;
  return `${id.slice(0, 8)}...`;
}

/**
 * Expandable job row with error details
 * AC-6.6.5: Failed jobs show error message and retry count
 */
function JobRow({
  job,
  isExpanded,
  onToggle,
}: {
  job: JobEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = job.error || job.retryCount;

  return (
    <>
      <TableRow
        className={hasDetails ? "cursor-pointer hover:bg-muted/50" : ""}
        onClick={hasDetails ? onToggle : undefined}
        data-testid={`job-row-${job.id}`}
      >
        <TableCell>
          {hasDetails && (
            <Button variant="ghost" size="sm" className="p-0 h-6 w-6">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="font-mono text-xs" title={job.id}>
          {truncateId(job.id)}
        </TableCell>
        <TableCell>{getJobTypeLabel(job.type)}</TableCell>
        <TableCell>
          <StatusBadge status={job.status} />
        </TableCell>
        <TableCell>
          {job.startedAt
            ? format(new Date(job.startedAt), "MMM d, HH:mm:ss")
            : "-"}
        </TableCell>
        <TableCell>{formatDuration(job.durationMs)}</TableCell>
      </TableRow>

      {/* Expandable error details row */}
      {isExpanded && hasDetails && (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="py-3">
            <div className="space-y-2 pl-8">
              {job.error && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Error Message
                    </p>
                    <p className="text-sm text-muted-foreground font-mono">
                      {job.error}
                    </p>
                  </div>
                </div>
              )}
              {job.retryCount !== undefined && job.retryCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Retry Count:</span>
                  <Badge variant="outline">{job.retryCount}</Badge>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Job List Component
 * AC-6.6.4: Job detail view shows ID, Type, Status, Started/Completed times, Duration
 */
export function JobList({
  jobs,
  total,
  page,
  pageSize,
  filters,
  onFiltersChange,
  onPageChange,
}: JobListProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const jobTypes = getAvailableJobTypes();

  const toggleRow = (jobId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4" data-testid="job-list-section">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent Jobs</h2>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <Select
            value={filters.type || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                type: value === "all" ? undefined : (value as JobType),
              })
            }
          >
            <SelectTrigger className="w-[180px]" data-testid="filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {jobTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.status || "all"}
            onValueChange={(value) =>
              onFiltersChange({
                ...filters,
                status: value === "all" ? undefined : (value as JobStatus),
              })
            }
          >
            <SelectTrigger className="w-[150px]" data-testid="filter-status">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="running">Running</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  <p className="text-muted-foreground">
                    No jobs found. Use the Inngest dashboard for detailed job
                    monitoring.
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              jobs.map((job) => (
                <JobRow
                  key={job.id}
                  job={job}
                  isExpanded={expandedRows.has(job.id)}
                  onToggle={() => toggleRow(job.id)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{" "}
            {Math.min(page * pageSize, total)} of {total} jobs
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => onPageChange(page - 1)}
            >
              Previous
            </Button>
            <span className="text-sm">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
