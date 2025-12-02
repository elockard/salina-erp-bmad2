"use client";

/**
 * Reusable Bar Chart Component
 *
 * Wrapper around Recharts BarChart for consistent styling across the app.
 * Used for categorical comparisons (e.g., revenue by channel).
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 3, 4 (Revenue breakdowns by format/channel)
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

export interface BarChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

/** Formatter type - functions can't cross server/client boundary */
export type FormatterType = "currency" | "number" | "percent";

/** Built-in formatters for serializable prop passing from server components */
const formatters: Record<FormatterType, (value: number) => string> = {
  currency: (value: number) =>
    `$${value.toLocaleString("en-US", { minimumFractionDigits: 0 })}`,
  number: (value: number) => value.toLocaleString("en-US"),
  percent: (value: number) => `${value.toFixed(1)}%`,
};

interface BarChartProps {
  /** Data array with name and value properties */
  data: BarChartDataPoint[];
  /** Data key for the bar values (default: "value") */
  dataKey?: string;
  /** Bar fill color (default: Editorial Navy #1e3a5f) */
  fillColor?: string;
  /** Height in pixels (default: 300) */
  height?: number;
  /** Formatter type for Y-axis and tooltip values (use for server→client) */
  formatterType?: FormatterType;
  /** Custom Y-axis formatter (client components only, takes precedence) */
  yAxisFormatter?: (value: number) => string;
  /** Custom tooltip formatter (client components only, takes precedence) */
  tooltipFormatter?: (value: number) => string;
  /** Show legend (default: false) */
  showLegend?: boolean;
  /** Legend label */
  legendLabel?: string;
}

export function BarChart({
  data,
  dataKey = "value",
  fillColor = "#1e3a5f",
  height = 300,
  formatterType,
  yAxisFormatter,
  tooltipFormatter,
  showLegend = false,
  legendLabel,
}: BarChartProps) {
  // Function props take precedence over formatterType
  const builtinFormatter = formatterType ? formatters[formatterType] : undefined;
  const yFormatter = yAxisFormatter || builtinFormatter;
  const tipFormatter = tooltipFormatter || builtinFormatter;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="name"
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#e5e7eb" }}
        />
        <YAxis
          tick={{ fill: "#6b7280", fontSize: 12 }}
          axisLine={{ stroke: "#e5e7eb" }}
          tickFormatter={yFormatter}
        />
        <Tooltip
          formatter={
            tipFormatter
              ? (value: number) => [tipFormatter(value), legendLabel || "Value"]
              : undefined
          }
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}
        />
        {showLegend && <Legend />}
        <Bar
          dataKey={dataKey}
          fill={fillColor}
          name={legendLabel}
          radius={[4, 4, 0, 0]}
        />
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
