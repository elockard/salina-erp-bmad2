"use client";

/**
 * Platform Dashboard Component
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 1-7)
 *
 * Main dashboard container with auto-refresh and manual refresh capabilities.
 */

import {
  AlertTriangle,
  Building2,
  RefreshCw,
  TrendingUp,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

import type { PlatformDashboardData } from "../types";
import { PlatformStatsCard } from "./platform-stats-card";
import { SystemHealthCard } from "./system-health-card";
import { TenantGrowthChart } from "./tenant-growth-chart";
import { UserRoleDistribution } from "./user-role-distribution";

interface PlatformDashboardProps {
  initialData: PlatformDashboardData;
}

export function PlatformDashboard({ initialData }: PlatformDashboardProps) {
  const [data, setData] = useState(initialData);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Update local state when initialData changes (from server refresh)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => router.refresh());
    }, 60000);
    return () => clearInterval(interval);
  }, [router]);

  const handleManualRefresh = () => {
    startTransition(() => router.refresh());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">Platform Analytics</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleManualRefresh}
          disabled={isPending}
          className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600"
        >
          <RefreshCw
            className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Tenant Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <PlatformStatsCard
          title="Total Tenants"
          value={data.tenantMetrics.total}
          icon={Building2}
        />
        <PlatformStatsCard
          title="Active (30d)"
          value={data.tenantMetrics.activeLastThirtyDays}
          icon={Users}
        />
        <PlatformStatsCard
          title="New This Month"
          value={data.tenantMetrics.newThisMonth}
          icon={TrendingUp}
        />
        <PlatformStatsCard
          title="Suspended"
          value={data.tenantMetrics.suspended}
          icon={AlertTriangle}
          variant={data.tenantMetrics.suspended > 0 ? "warning" : "default"}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TenantGrowthChart data={data.tenantGrowthTrend} />
        <UserRoleDistribution data={data.userMetrics.byRole} />
      </div>

      {/* Usage & Health */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Platform Usage</h3>
          <div className="grid grid-cols-3 gap-4">
            <PlatformStatsCard
              title="Total Titles"
              value={data.usageMetrics.totalTitles}
              compact
            />
            <PlatformStatsCard
              title="Sales (Month)"
              value={data.usageMetrics.salesThisMonth}
              compact
            />
            <PlatformStatsCard
              title="Statements (Month)"
              value={data.usageMetrics.statementsThisMonth}
              compact
            />
          </div>
        </div>
        <SystemHealthCard health={data.health} />
      </div>

      <p className="text-xs text-slate-500">
        Last updated:{" "}
        {new Date(data.generatedAt).toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })}{" "}
        (auto-refreshes every 60s)
      </p>
    </div>
  );
}
