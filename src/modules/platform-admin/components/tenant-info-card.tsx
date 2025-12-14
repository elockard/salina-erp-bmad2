/**
 * Tenant Info Card Component
 *
 * Story 13.3: Build Tenant Detail View (AC: 2, 3, 7)
 * Story 13.4: Add suspension actions and display suspension info (AC: 1, 6)
 *
 * Displays basic tenant info, configuration, last activity,
 * and suspension actions/details.
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  Globe,
  Settings,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import type { TenantDetail } from "../types";
import { ReactivateTenantDialog } from "./reactivate-tenant-dialog";
import { SuspendTenantDialog } from "./suspend-tenant-dialog";

interface TenantInfoCardProps {
  tenant: TenantDetail;
  isLoading?: boolean;
}

/**
 * Format royalty period type for display
 */
function formatRoyaltyPeriodType(type: string): string {
  const labels: Record<string, string> = {
    calendar_year: "Calendar Year",
    fiscal_year: "Fiscal Year",
    custom: "Custom",
  };
  return labels[type] || type;
}

/**
 * Format statement frequency for display
 */
function formatStatementFrequency(frequency: string): string {
  const labels: Record<string, string> = {
    monthly: "Monthly",
    quarterly: "Quarterly",
    semi_annual: "Semi-Annual",
    annual: "Annual",
  };
  return labels[frequency] || frequency;
}

/**
 * Format suspension duration for display
 * Returns "X days" or "X hours" depending on duration
 */
function formatSuspensionDuration(suspendedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(suspendedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }
  return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
}

export function TenantInfoCard({ tenant, isLoading }: TenantInfoCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <Skeleton className="mb-4 h-6 w-32 bg-slate-700" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items
            <Skeleton key={i} className="h-5 w-full bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  const suspensionDuration = tenant.suspended_at
    ? formatSuspensionDuration(tenant.suspended_at)
    : undefined;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Building2 className="h-5 w-5 text-slate-400" />
          Tenant Information
        </h2>

        {/* Suspension Actions - Story 13.4 */}
        <div>
          {tenant.status === "active" ? (
            <SuspendTenantDialog
              tenantId={tenant.id}
              tenantName={tenant.name}
            />
          ) : (
            <ReactivateTenantDialog
              tenantId={tenant.id}
              tenantName={tenant.name}
              suspendedDuration={suspensionDuration}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Basic Info */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-slate-400">Basic Info</h3>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Status</span>
            <Badge
              className={
                tenant.status === "active"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {tenant.status}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Subdomain</span>
            <span className="text-sm text-white">{tenant.subdomain}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Created</span>
            <span className="text-sm text-white">
              {format(new Date(tenant.created_at), "MMM dd, yyyy")}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Users</span>
            <span className="text-sm text-white">{tenant.user_count}</span>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-3">
          <h3 className="flex items-center gap-1 text-sm font-medium text-slate-400">
            <Settings className="h-4 w-4" />
            Configuration
          </h3>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-slate-400">
              <Globe className="h-3 w-3" />
              Timezone
            </span>
            <span className="text-sm text-white">{tenant.timezone}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1 text-sm text-slate-400">
              <Calendar className="h-3 w-3" />
              Fiscal Year Start
            </span>
            <span className="text-sm text-white">
              {tenant.fiscal_year_start || "Not set"}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Statement Frequency</span>
            <span className="text-sm text-white">
              {formatStatementFrequency(tenant.statement_frequency)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Royalty Period</span>
            <span className="text-sm text-white">
              {formatRoyaltyPeriodType(tenant.royalty_period_type)}
            </span>
          </div>
        </div>
      </div>

      {/* Suspension Details - Story 13.4 */}
      {tenant.status === "suspended" && tenant.suspended_at && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-900/20 p-4">
          <h4 className="flex items-center gap-2 text-sm font-medium text-red-400">
            <AlertCircle className="h-4 w-4" />
            Suspension Details
          </h4>
          <div className="mt-2 space-y-1 text-sm text-slate-300">
            <p>
              <span className="text-slate-400">Suspended for: </span>
              {suspensionDuration}
            </p>
            <p>
              <span className="text-slate-400">Reason: </span>
              {tenant.suspended_reason}
            </p>
            <p>
              <span className="text-slate-400">By: </span>
              {tenant.suspended_by_admin_email}
            </p>
            <p>
              <span className="text-slate-400">Date: </span>
              {format(new Date(tenant.suspended_at), "MMM dd, yyyy h:mm a")}
            </p>
          </div>
        </div>
      )}

      {/* Last Activity */}
      <div className="mt-6 border-t border-slate-700 pt-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-slate-400">
            <Clock className="h-4 w-4" />
            Last Activity
          </span>
          <span className="text-sm text-white">
            {tenant.last_activity_at
              ? format(new Date(tenant.last_activity_at), "MMM dd, yyyy h:mm a")
              : "No activity recorded"}
          </span>
        </div>
      </div>
    </div>
  );
}
