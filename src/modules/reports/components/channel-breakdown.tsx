"use client";

/**
 * Channel Breakdown Chart Component
 *
 * Pie chart showing revenue distribution by channel (retail/wholesale/direct/distributor).
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC-4: Revenue breakdown by channel (retail/wholesale/direct/distributor) is displayed with percentages
 */

import { PieChart } from "@/components/charts";
import type { RevenueChannelBreakdown } from "../types";

interface ChannelBreakdownProps {
  /** Revenue data by channel */
  data: RevenueChannelBreakdown[];
  /** Chart height in pixels */
  height?: number;
}

/**
 * Channel labels for display
 */
const CHANNEL_LABELS: Record<string, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  direct: "Direct",
  distributor: "Distributor",
};

/**
 * Custom colors for channels
 */
const CHANNEL_COLORS = [
  "#1e3a5f", // Editorial Navy (retail)
  "#2d5a87", // Lighter navy (wholesale)
  "#4a7ab0", // Medium blue (direct)
  "#7ba3cf", // Light blue (distributor)
];

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

export function ChannelBreakdown({
  data,
  height = 300,
}: ChannelBreakdownProps) {
  // Transform data for chart component
  const chartData = data.map((item) => ({
    name: CHANNEL_LABELS[item.channel] || item.channel,
    value: item.amount,
    percentage: item.percentage,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No channel breakdown data available
      </div>
    );
  }

  // Verify percentages sum to 100% (with small tolerance for rounding)
  const totalPercentage = data.reduce((sum, item) => sum + item.percentage, 0);
  const isValid = Math.abs(totalPercentage - 100) < 1; // Allow 1% tolerance

  return (
    <div className="space-y-2">
      <PieChart
        data={chartData}
        height={height}
        colors={CHANNEL_COLORS}
        tooltipFormatter={(value, _name, percentage) =>
          `${formatCurrency(value)} (${percentage?.toFixed(1) ?? 0}%)`
        }
        innerRadius={40}
        outerRadius={80}
      />
      {!isValid && data.length > 0 && (
        <p className="text-center text-xs text-amber-600">
          Note: Percentages total {totalPercentage.toFixed(1)}%
        </p>
      )}
    </div>
  );
}
