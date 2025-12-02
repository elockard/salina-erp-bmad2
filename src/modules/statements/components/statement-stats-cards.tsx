"use client";

/**
 * Statement Stats Cards Component
 *
 * Displays dashboard statistics for statements:
 * - Statements Generated This Quarter
 * - Total Liability (sum of net_payable)
 * - Pending Emails (count where status != 'sent')
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Task 2: Create stats aggregation queries (AC: 1)
 *
 * Related:
 * - src/modules/statements/queries.ts (getStatementStats)
 */

import { DollarSign, FileText, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface StatementStatsCardsProps {
  /** Count of statements generated this quarter */
  thisQuarterCount: number;
  /** Sum of net_payable for current quarter */
  totalLiability: number;
  /** Count of statements with status != 'sent' */
  pendingEmailCount: number;
  /** Loading state */
  loading?: boolean;
}

/**
 * Format currency value for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Stats cards component for statements dashboard
 *
 * AC-5.5.1: Stats cards section at top of page
 */
export function StatementStatsCards({
  thisQuarterCount,
  totalLiability,
  pendingEmailCount,
  loading = false,
}: StatementStatsCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Statements This Quarter */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">This Quarter</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{thisQuarterCount}</div>
          <p className="text-xs text-muted-foreground">statements generated</p>
        </CardContent>
      </Card>

      {/* Total Liability */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Liability</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalLiability)}
          </div>
          <p className="text-xs text-muted-foreground">
            net payable this quarter
          </p>
        </CardContent>
      </Card>

      {/* Pending Emails */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Emails</CardTitle>
          <Mail className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{pendingEmailCount}</div>
          <p className="text-xs text-muted-foreground">awaiting delivery</p>
        </CardContent>
      </Card>
    </div>
  );
}
