"use client";

/**
 * Tenant Growth Chart Component
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 2)
 *
 * Line chart showing tenant growth trend over time using Recharts.
 */

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TenantGrowthDataPoint } from "../types";

interface TenantGrowthChartProps {
  data: TenantGrowthDataPoint[];
}

export function TenantGrowthChart({ data }: TenantGrowthChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">Tenant Growth</h3>
        <p className="mt-4 text-slate-400">No data available</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">Tenant Growth</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f1f5f9" }}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ fill: "#3b82f6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
