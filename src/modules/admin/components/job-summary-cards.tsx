"use client";

/**
 * Job Summary Cards Component
 *
 * Displays summary statistics for background jobs.
 *
 * Story: 6.6 - Build Background Job Monitoring for System Administration
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 *
 * Related:
 * - src/modules/admin/queries.ts (data source)
 * - src/app/(dashboard)/admin/system/page.tsx (consumer)
 */

import { Activity, CheckCircle2, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { JobSummary } from "../types";

interface JobSummaryCardsProps {
  summary: JobSummary;
  onFilterChange?: (filter: string) => void;
}

/**
 * Summary card configuration
 */
const CARDS = [
  {
    key: "active" as const,
    label: "Active Jobs",
    icon: Activity,
    colorClass: "text-blue-500",
    bgClass: "bg-blue-50 dark:bg-blue-950",
    borderClass: "border-blue-200 dark:border-blue-800",
    filter: "running",
  },
  {
    key: "queued" as const,
    label: "Queued Jobs",
    icon: Clock,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-50 dark:bg-amber-950",
    borderClass: "border-amber-200 dark:border-amber-800",
    filter: "queued",
  },
  {
    key: "completedLast24h" as const,
    label: "Completed (24h)",
    icon: CheckCircle2,
    colorClass: "text-green-500",
    bgClass: "bg-green-50 dark:bg-green-950",
    borderClass: "border-green-200 dark:border-green-800",
    filter: "completed",
  },
  {
    key: "failedLast24h" as const,
    label: "Failed (24h)",
    icon: XCircle,
    colorClass: "text-red-500",
    bgClass: "bg-red-50 dark:bg-red-950",
    borderClass: "border-red-200 dark:border-red-800",
    filter: "failed",
  },
] as const;

/**
 * Individual summary card
 */
function SummaryCard({
  label,
  value,
  icon: Icon,
  colorClass,
  bgClass,
  borderClass,
  onClick,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  onClick?: () => void;
}) {
  return (
    <Card
      className={`${bgClass} ${borderClass} ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
      onClick={onClick}
      data-testid={`job-summary-${label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
    >
      <CardContent className="flex items-center gap-4 p-4">
        <Icon className={`h-8 w-8 ${colorClass}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Job Summary Cards Container
 * AC-6.6.2: Dashboard shows Active Jobs, Queued Jobs, Recent Completions, Recent Failures
 */
export function JobSummaryCards({
  summary,
  onFilterChange,
}: JobSummaryCardsProps) {
  return (
    <div className="space-y-4" data-testid="job-summary-section">
      <h2 className="text-lg font-semibold">Job Summary</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {CARDS.map((card) => (
          <SummaryCard
            key={card.key}
            label={card.label}
            value={summary[card.key]}
            icon={card.icon}
            colorClass={card.colorClass}
            bgClass={card.bgClass}
            borderClass={card.borderClass}
            onClick={
              onFilterChange ? () => onFilterChange(card.filter) : undefined
            }
          />
        ))}
      </div>

      {summary.active === 0 &&
        summary.queued === 0 &&
        summary.completedLast24h === 0 &&
        summary.failedLast24h === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No job activity in the last 24 hours. Use the Inngest dashboard for
            detailed job monitoring.
          </p>
        )}
    </div>
  );
}
