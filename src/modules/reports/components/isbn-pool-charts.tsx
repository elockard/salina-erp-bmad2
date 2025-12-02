"use client";

/**
 * ISBN Pool Charts Component
 *
 * Displays pie chart for Available vs Assigned breakdown and
 * timeline chart for assignment history.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 4 (Pie chart shows Available vs Assigned breakdown by type)
 * AC: 5 (Timeline chart shows ISBN assignments over time)
 */

import { LineChart } from "@/components/charts/line-chart";
import { PieChart } from "@/components/charts/pie-chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ISBNAssignmentHistoryItem, ISBNPoolMetrics } from "../types";

interface ISBNPoolChartsProps {
  metrics: ISBNPoolMetrics;
  history: ISBNAssignmentHistoryItem[];
}

export function ISBNPoolCharts({ metrics, history }: ISBNPoolChartsProps) {
  const { physical, ebook } = metrics;

  // Prepare pie chart data - Available vs Assigned breakdown
  const pieData = [
    {
      name: "Physical Available",
      value: physical.available,
      percentage:
        physical.total > 0
          ? (physical.available / (physical.total + ebook.total)) * 100
          : 0,
    },
    {
      name: "Physical Assigned",
      value: physical.assigned,
      percentage:
        physical.total > 0
          ? (physical.assigned / (physical.total + ebook.total)) * 100
          : 0,
    },
    {
      name: "Ebook Available",
      value: ebook.available,
      percentage:
        ebook.total > 0
          ? (ebook.available / (physical.total + ebook.total)) * 100
          : 0,
    },
    {
      name: "Ebook Assigned",
      value: ebook.assigned,
      percentage:
        ebook.total > 0
          ? (ebook.assigned / (physical.total + ebook.total)) * 100
          : 0,
    },
  ].filter((d) => d.value > 0);

  // Prepare line chart data
  const lineData = history.map((item) => ({
    name: item.month,
    value: item.assigned,
  }));

  const hasPoolData = physical.total > 0 || ebook.total > 0;
  const hasHistoryData = history.some((h) => h.assigned > 0);

  // Custom pie chart colors: greens for available, blues for assigned
  const pieColors = [
    "#22c55e", // green-500 for Physical Available
    "#1e3a5f", // Editorial Navy for Physical Assigned
    "#86efac", // green-300 for Ebook Available
    "#4a7ab0", // Lighter navy for Ebook Assigned
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="isbn-pool-charts">
      {/* Pie Chart - Available vs Assigned */}
      <Card data-testid="isbn-distribution-chart">
        <CardHeader>
          <CardTitle className="text-base">ISBN Distribution</CardTitle>
          <CardDescription>Available vs Assigned by type</CardDescription>
        </CardHeader>
        <CardContent>
          {hasPoolData ? (
            <PieChart
              data={pieData}
              height={280}
              colors={pieColors}
              showLegend={true}
              innerRadius={50}
              outerRadius={90}
              tooltipFormatter={(value, _name, percentage) =>
                `${value} ISBNs (${percentage?.toFixed(1) ?? 0}%)`
              }
            />
          ) : (
            <div
              className="flex h-[280px] items-center justify-center text-muted-foreground"
              data-testid="empty-pie-chart"
            >
              No ISBN data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline Chart - Assignments over time */}
      <Card data-testid="isbn-timeline-chart">
        <CardHeader>
          <CardTitle className="text-base">Assignment History</CardTitle>
          <CardDescription>
            ISBNs assigned per month (last 6 months)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasHistoryData ? (
            <LineChart
              data={lineData}
              height={280}
              strokeColor="#1e3a5f"
              legendLabel="ISBNs Assigned"
              tooltipFormatter={(value) => `${value} ISBN${value !== 1 ? "s" : ""}`}
              yAxisFormatter={(value) => String(Math.round(value))}
            />
          ) : (
            <div
              className="flex h-[280px] items-center justify-center text-muted-foreground"
              data-testid="empty-timeline-chart"
            >
              No assignment history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
