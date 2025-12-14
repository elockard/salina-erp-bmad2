"use client";

/**
 * User Role Distribution Chart Component
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 3)
 *
 * Pie chart showing distribution of users by role using Recharts.
 */

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface UserRoleDistributionProps {
  data: {
    owner: number;
    admin: number;
    editor: number;
    finance: number;
    author: number;
  };
}

const COLORS = {
  owner: "#ef4444", // red
  admin: "#f59e0b", // amber
  editor: "#3b82f6", // blue
  finance: "#10b981", // emerald
  author: "#8b5cf6", // purple
};

const ROLE_LABELS = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  finance: "Finance",
  author: "Author",
};

export function UserRoleDistribution({ data }: UserRoleDistributionProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => ({
      name: ROLE_LABELS[role as keyof typeof ROLE_LABELS],
      value: count,
      color: COLORS[role as keyof typeof COLORS],
    }));

  const total = Object.values(data).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
        <h3 className="text-lg font-semibold text-white">User Roles</h3>
        <p className="mt-4 text-slate-400">No users in the platform</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">User Roles</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e293b",
                border: "1px solid #475569",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#f1f5f9" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value) => (
                <span className="text-slate-300">{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-sm text-slate-400">
        Total: {total.toLocaleString()} users
      </p>
    </div>
  );
}
