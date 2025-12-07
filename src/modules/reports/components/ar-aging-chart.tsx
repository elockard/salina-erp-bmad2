"use client";

/**
 * AR Aging Chart Component
 *
 * Stacked bar chart showing aging distribution by customer or as totals.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.5: Visual aging chart showing distribution across buckets
 */

import {
  Bar,
  CartesianGrid,
  Legend,
  BarChart as RechartsBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgingReportRow } from "../types";

interface ARAgingChartProps {
  /** Aging report rows */
  data: AgingReportRow[];
  /** Whether the chart is in loading state */
  isLoading?: boolean;
  /** Chart height in pixels (default: 350) */
  height?: number;
  /** Show as summary (single stacked bar) vs per-customer (multiple bars) */
  variant?: "summary" | "byCustomer";
}

/** Color palette for aging buckets - green to red progression */
const BUCKET_COLORS = {
  current: "#22c55e", // green-500
  days1to30: "#eab308", // yellow-500
  days31to60: "#f97316", // orange-500
  days61to90: "#ef4444", // red-500
  days90plus: "#b91c1c", // red-700
};

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Prepare data for summary chart (single stacked bar)
 */
function prepareSummaryData(data: AgingReportRow[]) {
  let current = 0;
  let days1to30 = 0;
  let days31to60 = 0;
  let days61to90 = 0;
  let days90plus = 0;

  for (const row of data) {
    current += Number.parseFloat(row.current) || 0;
    days1to30 += Number.parseFloat(row.days1to30) || 0;
    days31to60 += Number.parseFloat(row.days31to60) || 0;
    days61to90 += Number.parseFloat(row.days61to90) || 0;
    days90plus += Number.parseFloat(row.days90plus) || 0;
  }

  return [
    {
      name: "AR Aging",
      current,
      days1to30,
      days31to60,
      days61to90,
      days90plus,
    },
  ];
}

/**
 * Prepare data for per-customer chart
 */
function prepareCustomerData(data: AgingReportRow[]) {
  // Take top 10 customers by total
  const sorted = [...data].sort(
    (a, b) =>
      Number.parseFloat(b.total) - Number.parseFloat(a.total),
  );
  const top10 = sorted.slice(0, 10);

  return top10.map((row) => ({
    name: row.customerName.length > 15
      ? `${row.customerName.substring(0, 15)}...`
      : row.customerName,
    current: Number.parseFloat(row.current) || 0,
    days1to30: Number.parseFloat(row.days1to30) || 0,
    days31to60: Number.parseFloat(row.days31to60) || 0,
    days61to90: Number.parseFloat(row.days61to90) || 0,
    days90plus: Number.parseFloat(row.days90plus) || 0,
  }));
}

/**
 * Chart skeleton for loading state
 */
function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="space-y-3" data-testid="ar-aging-chart-skeleton">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="w-full" style={{ height: height - 40 }} />
    </div>
  );
}

export function ARAgingChart({
  data,
  isLoading = false,
  height = 350,
  variant = "summary",
}: ARAgingChartProps) {
  if (isLoading) {
    return <ChartSkeleton height={height} />;
  }

  if (data.length === 0) {
    return (
      <Card data-testid="ar-aging-chart-empty">
        <CardContent className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">No aging data available</p>
        </CardContent>
      </Card>
    );
  }

  const chartData =
    variant === "summary" ? prepareSummaryData(data) : prepareCustomerData(data);

  // Indicate when chart is limited to top 10
  const customerCountNote =
    variant === "byCustomer" && data.length > 10
      ? ` (showing 10 of ${data.length})`
      : "";

  return (
    <Card data-testid="ar-aging-chart">
      <CardHeader>
        <CardTitle className="text-lg">
          {variant === "summary" ? "Aging Distribution" : "Top 10 Customers by AR"}
        </CardTitle>
        <CardDescription>
          {variant === "summary"
            ? "Outstanding receivables by aging bucket"
            : `Largest receivable balances by customer${customerCountNote}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <RechartsBarChart
            data={chartData}
            layout={variant === "summary" ? "vertical" : "horizontal"}
            margin={{ top: 5, right: 30, left: variant === "byCustomer" ? 100 : 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            {variant === "summary" ? (
              <>
                <YAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                />
                <XAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="name"
                  type="category"
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  interval={0}
                />
                <YAxis
                  type="number"
                  tick={{ fill: "#6b7280", fontSize: 12 }}
                  axisLine={{ stroke: "#e5e7eb" }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
              </>
            )}
            <Tooltip
              formatter={(value: number, name: string) => {
                const labelMap: Record<string, string> = {
                  current: "Current",
                  days1to30: "1-30 Days",
                  days31to60: "31-60 Days",
                  days61to90: "61-90 Days",
                  days90plus: "90+ Days",
                };
                return [formatCurrency(value), labelMap[name] || name];
              }}
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #e5e7eb",
                borderRadius: "6px",
              }}
            />
            <Legend
              formatter={(value) => {
                const labelMap: Record<string, string> = {
                  current: "Current",
                  days1to30: "1-30 Days",
                  days31to60: "31-60 Days",
                  days61to90: "61-90 Days",
                  days90plus: "90+ Days",
                };
                return labelMap[value] || value;
              }}
            />
            <Bar
              dataKey="current"
              stackId="a"
              fill={BUCKET_COLORS.current}
              name="current"
              radius={variant === "summary" ? [0, 0, 0, 0] : [0, 0, 0, 0]}
            />
            <Bar
              dataKey="days1to30"
              stackId="a"
              fill={BUCKET_COLORS.days1to30}
              name="days1to30"
            />
            <Bar
              dataKey="days31to60"
              stackId="a"
              fill={BUCKET_COLORS.days31to60}
              name="days31to60"
            />
            <Bar
              dataKey="days61to90"
              stackId="a"
              fill={BUCKET_COLORS.days61to90}
              name="days61to90"
            />
            <Bar
              dataKey="days90plus"
              stackId="a"
              fill={BUCKET_COLORS.days90plus}
              name="days90plus"
              radius={[4, 4, 0, 0]}
            />
          </RechartsBarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
