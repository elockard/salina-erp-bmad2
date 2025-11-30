"use client";

/**
 * Pending Returns List Component
 *
 * Left panel list for the approval queue Split View.
 * Story 3.6: AC 2 (queue display with title, quantity, amount, reason, date)
 *
 * Features:
 * - Displays queue items with key info
 * - Format quantity/amount as negative values
 * - Sorted by date (oldest first - FIFO)
 * - Visual selection indicator
 * - Click to select item
 */

import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PendingReturn } from "../types";
import { formatNegativeCurrency, formatNegativeQuantity } from "../utils";

interface PendingReturnsListProps {
  returns: PendingReturn[];
  selectedReturnId: string | null;
  onSelectReturn: (returnId: string) => void;
  loading?: boolean;
}

/**
 * Truncate text to a maximum length with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

function LoadingSkeleton() {
  return (
    <div className="p-2 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
        <div key={`skeleton-${i}`} className="p-3 space-y-2 border rounded-md">
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function PendingReturnsList({
  returns,
  selectedReturnId,
  onSelectReturn,
  loading,
}: PendingReturnsListProps) {
  if (loading) {
    return <LoadingSkeleton />;
  }

  if (returns.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 text-muted-foreground">
        <p>No pending returns</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-2 space-y-1">
      {returns.map((returnItem) => {
        const isSelected = returnItem.id === selectedReturnId;

        return (
          <button
            key={returnItem.id}
            type="button"
            onClick={() => onSelectReturn(returnItem.id)}
            className={cn(
              "w-full text-left p-3 rounded-md border transition-colors",
              "hover:bg-accent hover:border-accent",
              isSelected
                ? "bg-accent border-accent ring-2 ring-primary ring-offset-1"
                : "bg-background border-border",
            )}
          >
            {/* Title */}
            <div className="font-medium text-sm truncate">
              {returnItem.title.title}
            </div>

            {/* Quantity and Amount row */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-sm text-red-600 dark:text-red-400 font-medium">
                {formatNegativeQuantity(returnItem.quantity)} units
              </span>
              <span className="text-sm text-red-600 dark:text-red-400 font-semibold">
                {formatNegativeCurrency(returnItem.total_amount)}
              </span>
            </div>

            {/* Reason */}
            {returnItem.reason && (
              <div className="text-xs text-muted-foreground mt-1 truncate">
                {truncateText(returnItem.reason, 50)}
              </div>
            )}

            {/* Date submitted */}
            <div className="text-xs text-muted-foreground mt-1">
              {format(new Date(returnItem.created_at), "MMM d, yyyy")}
            </div>
          </button>
        );
      })}
    </div>
  );
}
