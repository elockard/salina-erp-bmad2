"use client";

/**
 * Status Badge Component
 *
 * Displays return status with appropriate color coding.
 * Story 3.7: AC 2 (Status badge in table columns)
 *
 * Status Colors:
 * - Pending: warning/amber (awaiting Finance approval)
 * - Approved: success/green (affects royalty calculations)
 * - Rejected: destructive/red (excluded from calculations)
 */

import { Badge } from "@/components/ui/badge";
import type { ReturnStatus } from "@/db/schema/returns";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: ReturnStatus;
  className?: string;
}

const statusConfig: Record<
  ReturnStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
    className: string;
  }
> = {
  pending: {
    label: "Pending",
    variant: "secondary",
    className:
      "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200 hover:bg-amber-100",
  },
  approved: {
    label: "Approved",
    variant: "default",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 hover:bg-green-100",
  },
  rejected: {
    label: "Rejected",
    variant: "destructive",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 hover:bg-red-100",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
