"use client";

/**
 * Invoice Status Badge Component
 *
 * Displays invoice status with semantic colors:
 * - Draft: gray
 * - Sent: blue
 * - Paid: green
 * - Partially Paid: yellow
 * - Overdue: red
 * - Void: muted gray
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 1: Create Invoice Status Badge Component (AC: 8.3.1)
 *
 * Related:
 * - src/modules/statements/components/statement-status-badge.tsx (pattern)
 * - src/modules/invoices/types.ts (InvoiceStatusType)
 */

import { Badge } from "@/components/ui/badge";
import type { InvoiceStatusType } from "@/modules/invoices/types";
import { cn } from "@/lib/utils";

export interface InvoiceStatusBadgeProps {
  /** Invoice status value */
  status: InvoiceStatusType;
  /** Additional className */
  className?: string;
}

/**
 * Status badge with semantic colors per AC-8.3.1:
 * - Draft = gray
 * - Sent = blue
 * - Paid = green
 * - Partially Paid = yellow
 * - Overdue = red
 * - Void = muted
 */
export function InvoiceStatusBadge({
  status,
  className,
}: InvoiceStatusBadgeProps) {
  const statusConfig: Record<
    InvoiceStatusType,
    { label: string; className: string }
  > = {
    draft: {
      label: "Draft",
      className: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50",
    },
    sent: {
      label: "Sent",
      className: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
    },
    paid: {
      label: "Paid",
      className:
        "bg-green-50 text-green-700 border-green-200 hover:bg-green-50",
    },
    partially_paid: {
      label: "Partially Paid",
      className:
        "bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50",
    },
    overdue: {
      label: "Overdue",
      className: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
    },
    void: {
      label: "Void",
      className: "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-100",
    },
  };

  const config = statusConfig[status] || statusConfig.draft;

  return (
    <Badge variant="outline" className={cn(config.className, className)}>
      {config.label}
    </Badge>
  );
}
