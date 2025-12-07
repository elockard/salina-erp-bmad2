"use client";

/**
 * Sales Report Charts Component
 *
 * Visualizations for sales report data using existing chart components.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 7 (Bar chart shows top 10 items by revenue)
 * AC: 8 (Pie chart shows distribution by selected grouping)
 *
 * Uses existing reusable chart components from src/components/charts/
 * - BarChart with Editorial Navy color scheme (#1e3a5f)
 * - PieChart with Editorial Navy palette
 */

import {
  BarChart,
  type BarChartDataPoint,
} from "@/components/charts/bar-chart";
import {
  PieChart,
  type PieChartDataPoint,
} from "@/components/charts/pie-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { SalesReportResult } from "../types";

interface SalesReportChartsProps {
  /** Report data with rows and totals */
  data: SalesReportResult | null;
  /** Whether charts are in loading state */
  isLoading: boolean;
  /** Grouping label for display */
  groupByLabel: string;
}

/**
 * Format currency for tooltips
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
 * Charts skeleton for loading state
 */
function ChartsSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Empty state for no data
 */
function EmptyState() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 10 by Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Revenue Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            No data to display
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SalesReportCharts({
  data,
  isLoading,
  groupByLabel,
}: SalesReportChartsProps) {
  if (isLoading) {
    return <ChartsSkeleton />;
  }

  if (!data || data.rows.length === 0) {
    return <EmptyState />;
  }

  // Prepare bar chart data - top 10 by revenue (AC-7, subtask 5.2)
  const barChartData: BarChartDataPoint[] = data.rows
    .slice(0, 10) // Already sorted by revenue DESC from query
    .map((row) => ({
      name:
        row.groupLabel.length > 20
          ? `${row.groupLabel.substring(0, 20)}...`
          : row.groupLabel,
      value: row.totalRevenue,
    }));

  // Prepare pie chart data - distribution by grouping (AC-8, subtask 5.3)
  // Show top items and aggregate rest
  const totalRevenue = data.totals.totalRevenue;
  let pieChartData: PieChartDataPoint[];

  if (data.rows.length <= 6) {
    // Show all items if 6 or fewer
    pieChartData = data.rows.map((row) => ({
      name: row.groupLabel,
      value: row.totalRevenue,
      percentage:
        totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0,
    }));
  } else {
    // Show top 5 and aggregate rest
    const top5 = data.rows.slice(0, 5);
    const otherRows = data.rows.slice(5);
    const otherRevenue = otherRows.reduce(
      (sum, row) => sum + row.totalRevenue,
      0,
    );

    pieChartData = [
      ...top5.map((row) => ({
        name: row.groupLabel,
        value: row.totalRevenue,
        percentage:
          totalRevenue > 0 ? (row.totalRevenue / totalRevenue) * 100 : 0,
      })),
      {
        name: `Other (${otherRows.length})`,
        value: otherRevenue,
        percentage: totalRevenue > 0 ? (otherRevenue / totalRevenue) * 100 : 0,
      },
    ];
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Bar chart - Top 10 by revenue (AC-7) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Top 10 {groupByLabel} by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={barChartData}
            height={300}
            yAxisFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
            tooltipFormatter={formatCurrency}
            legendLabel="Revenue"
          />
        </CardContent>
      </Card>

      {/* Pie chart - Distribution (AC-8) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Revenue Distribution by {groupByLabel}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PieChart
            data={pieChartData}
            height={300}
            showLegend={true}
            innerRadius={40}
            outerRadius={100}
            tooltipFormatter={(value, _name, percentage) =>
              `${formatCurrency(value)} (${percentage?.toFixed(1) ?? 0}%)`
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
