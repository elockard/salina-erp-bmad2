"use client";

/**
 * Reusable Pie Chart Component
 *
 * Wrapper around Recharts PieChart for consistent styling across the app.
 * Used for showing distribution/percentages (e.g., revenue by format).
 *
 * Story: 6.1 - Implement Revenue and Liability Tracking
 * AC: 3, 4 (Revenue breakdowns with percentages)
 */

import {
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export interface PieChartDataPoint {
  name: string;
  value: number;
  percentage?: number;
  [key: string]: string | number | undefined;
}

interface PieChartProps {
  /** Data array with name and value properties */
  data: PieChartDataPoint[];
  /** Height in pixels (default: 300) */
  height?: number;
  /** Custom colors array (defaults to Editorial Navy palette) */
  colors?: string[];
  /** Show legend (default: true) */
  showLegend?: boolean;
  /** Show labels on slices (default: false) */
  showLabels?: boolean;
  /** Optional formatter for tooltip values */
  tooltipFormatter?: (
    value: number,
    name: string,
    percentage?: number,
  ) => string;
  /** Inner radius for donut chart (0 for full pie) */
  innerRadius?: number;
  /** Outer radius (default: 80) */
  outerRadius?: number;
}

// Editorial Navy palette with variations
const DEFAULT_COLORS = [
  "#1e3a5f", // Editorial Navy
  "#2d5a87", // Lighter navy
  "#4a7ab0", // Medium blue
  "#7ba3cf", // Light blue
  "#a8c5e0", // Very light blue
  "#d4e4f2", // Pale blue
];

export function PieChart({
  data,
  height = 300,
  colors = DEFAULT_COLORS,
  showLegend = true,
  showLabels = false,
  tooltipFormatter,
  innerRadius = 0,
  outerRadius = 80,
}: PieChartProps) {
  const renderCustomLabel = (props: {
    cx?: number;
    cy?: number;
    midAngle?: number;
    innerRadius?: number;
    outerRadius?: number;
    percent?: number;
    name?: string;
  }) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;

    // Guard against undefined values
    if (
      cx === undefined ||
      cy === undefined ||
      midAngle === undefined ||
      innerRadius === undefined ||
      outerRadius === undefined ||
      percent === undefined
    ) {
      return null;
    }

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    if (percent < 0.05) return null; // Don't show labels for small slices

    return (
      <text
        x={x}
        y={y}
        fill="#374151"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontSize={12}
      >
        {`${name ?? ""} (${(percent * 100).toFixed(0)}%)`}
      </text>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={showLabels}
          label={showLabels ? renderCustomLabel : undefined}
          outerRadius={outerRadius}
          innerRadius={innerRadius}
          dataKey="value"
          nameKey="name"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.name}`}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(
            value: number,
            name: string,
            props: { payload?: PieChartDataPoint },
          ) => {
            const percentage = props.payload?.percentage;
            if (tooltipFormatter) {
              return [tooltipFormatter(value, name, percentage), name];
            }
            const percentStr =
              percentage !== undefined ? ` (${percentage.toFixed(1)}%)` : "";
            return [`${value}${percentStr}`, name];
          }}
          contentStyle={{
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
          }}
        />
        {showLegend && (
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span style={{ color: "#374151", fontSize: 12 }}>{value}</span>
            )}
          />
        )}
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
