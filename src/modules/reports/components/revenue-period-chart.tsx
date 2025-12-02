"use client";

/**
 * Revenue Period Chart Component
 *
 * Line/area chart showing revenue trends over time periods.
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC-2: Revenue can be filtered by period (daily/weekly/monthly/quarterly/annual)
 */

import { AreaChart } from "@/components/charts";
import type { RevenuePeriodBreakdown } from "../types";

interface RevenuePeriodChartProps {
  /** Revenue data by period */
  data: RevenuePeriodBreakdown[];
  /** Chart height in pixels */
  height?: number;
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}

export function RevenuePeriodChart({
  data,
  height = 300,
}: RevenuePeriodChartProps) {
  // Transform data for chart component
  const chartData = data.map((item) => ({
    name: item.period,
    value: item.amount,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No revenue data available for the selected period
      </div>
    );
  }

  return (
    <AreaChart
      data={chartData}
      height={height}
      yAxisFormatter={formatCurrency}
      tooltipFormatter={formatCurrency}
      legendLabel="Revenue"
      strokeColor="#1e3a5f"
      fillColor="#1e3a5f"
      fillOpacity={0.2}
    />
  );
}
