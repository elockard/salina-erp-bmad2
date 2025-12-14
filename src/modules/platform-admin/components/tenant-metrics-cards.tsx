/**
 * Tenant Metrics Cards Component
 *
 * Story 13.3: Build Tenant Detail View (AC: 5)
 * Displays usage metrics for a tenant: contacts, titles, sales, statements.
 */

import { BookOpen, DollarSign, FileText, Users } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import type { TenantUsageMetrics } from "../types";

interface TenantMetricsCardsProps {
  metrics: TenantUsageMetrics;
  isLoading?: boolean;
}

const metricConfig = [
  { key: "contactCount", label: "Contacts", icon: Users },
  { key: "titleCount", label: "Titles", icon: BookOpen },
  { key: "salesCount", label: "Sales", icon: DollarSign },
  { key: "statementCount", label: "Statements", icon: FileText },
] as const;

export function TenantMetricsCards({
  metrics,
  isLoading,
}: TenantMetricsCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items
          <Skeleton key={i} className="h-24 bg-slate-700" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {metricConfig.map(({ key, label, icon: Icon }) => (
        <div
          key={key}
          className="rounded-lg border border-slate-700 bg-slate-800 p-4"
        >
          <div className="flex items-center gap-2 text-slate-400">
            <Icon className="h-4 w-4" />
            <span className="text-sm">{label}</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {metrics[key].toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
