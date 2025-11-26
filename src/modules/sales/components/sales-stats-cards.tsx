"use client";

/**
 * Sales Stats Cards Component
 *
 * Displays dashboard statistics cards for sales history view.
 * Story 3.3: AC 2 (stats cards)
 *
 * Cards:
 * - Total Sales This Month (formatted currency)
 * - Transactions This Month (integer count)
 * - Best Selling Title (title name with units)
 *
 * Features:
 * - Skeleton loading states
 * - Refreshes on filter changes
 * - Responsive grid layout
 */

import { DollarSign, ShoppingCart, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesStats } from "../types";

interface SalesStatsCardsProps {
  stats: SalesStats | null;
  isLoading: boolean;
}

/**
 * Format currency for display
 * Uses Intl.NumberFormat for proper locale formatting
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Stats card skeleton for loading state
 */
function StatsCardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-7 w-20 mb-1" />
        <Skeleton className="h-3 w-32" />
      </CardContent>
    </Card>
  );
}

export function SalesStatsCards({ stats, isLoading }: SalesStatsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total Sales This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Sales This Month
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(stats?.totalSalesThisMonth ?? "0")}
          </div>
          <p className="text-xs text-muted-foreground">
            Based on current filters
          </p>
        </CardContent>
      </Card>

      {/* Transactions This Month */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Transactions This Month
          </CardTitle>
          <ShoppingCart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {stats?.transactionsThisMonth ?? 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Total recorded transactions
          </p>
        </CardContent>
      </Card>

      {/* Best Selling Title */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Best Selling Title
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {stats?.bestSellingTitle ? (
            <>
              <div
                className="text-2xl font-bold truncate"
                title={stats.bestSellingTitle.title}
              >
                {stats.bestSellingTitle.title}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.bestSellingTitle.units} units sold
              </p>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-muted-foreground">—</div>
              <p className="text-xs text-muted-foreground">No sales recorded</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
