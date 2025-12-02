"use client";

/**
 * Statement Status Badge Component
 *
 * Displays statement status with semantic colors:
 * - Sent: green (#2d7d3e)
 * - Draft: gray
 * - Failed: red (#b91c1c)
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Task 4.5: Create status badge component (AC: 1)
 *
 * Related:
 * - docs/ux-design-specification.md (Semantic Colors)
 * - src/db/schema/statements.ts (StatementStatus type)
 */

import { Badge } from "@/components/ui/badge";
import type { StatementStatus } from "@/db/schema/statements";
import { cn } from "@/lib/utils";

export interface StatementStatusBadgeProps {
  /** Statement status value */
  status: StatementStatus;
  /** Additional className */
  className?: string;
}

/**
 * Status badge with semantic colors per UX spec
 *
 * AC-5.5.1: Status badge with correct colors
 * - Sent = green
 * - Draft = gray
 * - Failed = red
 */
export function StatementStatusBadge({
  status,
  className,
}: StatementStatusBadgeProps) {
  const statusConfig = {
    sent: {
      label: "Sent",
      className:
        "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    },
    draft: {
      label: "Draft",
      className: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50",
    },
    failed: {
      label: "Failed",
      className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
