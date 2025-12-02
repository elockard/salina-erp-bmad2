"use client";

/**
 * Statements Pagination Component
 *
 * Pagination controls for statements list with:
 * - Previous/Next buttons
 * - Page info display
 * - Items per page display
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Task 1.2: Implement pagination with page/pageSize parameters
 *
 * Related:
 * - src/modules/statements/queries.ts (getStatements pagination)
 */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface StatementsPaginationProps {
  /** Current page (1-indexed) */
  page: number;
  /** Total pages */
  totalPages: number;
  /** Total items count */
  total: number;
  /** Items per page */
  pageSize: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Loading state */
  loading?: boolean;
}

/**
 * Pagination controls for statements list
 */
export function StatementsPagination({
  page,
  totalPages,
  total,
  pageSize,
  onPageChange,
  loading = false,
}: StatementsPaginationProps) {
  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        {total > 0 ? (
          <>
            Showing {startItem} to {endItem} of {total} statements
          </>
        ) : (
          "No statements"
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || loading}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <div className="text-sm text-muted-foreground">
          Page {page} of {Math.max(totalPages, 1)}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || loading}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
