"use client";

/**
 * Format Breakdown Chart Component
 *
 * Pie chart showing revenue distribution by format (physical/ebook/audiobook).
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC-3: Revenue breakdown by format (physical/ebook/audiobook) is displayed with percentages
 */

import { PieChart } from "@/components/charts";
import type { RevenueFormatBreakdown } from "../types";

interface FormatBreakdownProps {
  /** Revenue data by format */
  data: RevenueFormatBreakdown[];
  /** Chart height in pixels */
  height?: number;
}

/**
 * Format labels for display
 */
const FORMAT_LABELS: Record<string, string> = {
  physical: "Physical",
  ebook: "eBook",
  audiobook: "Audiobook",
};

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

export function FormatBreakdown({ data, height = 300 }: FormatBreakdownProps) {
  // Transform data for chart component
  const chartData = data.map((item) => ({
    name: FORMAT_LABELS[item.format] || item.format,
    value: item.amount,
    percentage: item.percentage,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        No format breakdown data available
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
