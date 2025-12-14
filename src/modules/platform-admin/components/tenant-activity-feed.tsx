/**
 * Tenant Activity Feed Component
 *
 * Story 13.3: Build Tenant Detail View (AC: 6)
 * Displays recent audit log entries for a tenant, grouped by date.
 */

import { format, isToday, isYesterday } from "date-fns";
import { Activity } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

import type { TenantActivityLog } from "../types";

interface TenantActivityFeedProps {
  activity: TenantActivityLog[];
  isLoading?: boolean;
}

/**
 * Format action type for display
 */
function formatActionType(action: string): string {
  const labels: Record<string, string> = {
    CREATE: "Created",
    UPDATE: "Updated",
    DELETE: "Deleted",
    APPROVE: "Approved",
    REJECT: "Rejected",
    VIEW: "Viewed",
  };
  return labels[action] || action;
}

/**
 * Group activity by date category (Today, Yesterday, or specific date)
 */
function groupActivityByDate(
  activity: TenantActivityLog[],
): Map<string, TenantActivityLog[]> {
  const groups = new Map<string, TenantActivityLog[]>();

  for (const item of activity) {
    const date = new Date(item.created_at);
    let groupKey: string;

    if (isToday(date)) {
      groupKey = "Today";
    } else if (isYesterday(date)) {
      groupKey = "Yesterday";
    } else {
      // Show specific date for older entries (e.g., "Dec 10")
      groupKey = format(date, "MMM d");
    }

    const existing = groups.get(groupKey) || [];
    existing.push(item);
    groups.set(groupKey, existing);
  }

  return groups;
}

export function TenantActivityFeed({
  activity,
  isLoading,
}: TenantActivityFeedProps) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
        <Skeleton className="mb-4 h-6 w-32 bg-slate-700" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Skeleton items
            <Skeleton key={i} className="h-12 w-full bg-slate-700" />
          ))}
        </div>
      </div>
    );
  }

  const groupedActivity = groupActivityByDate(activity);

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800">
      <div className="border-b border-slate-700 p-4">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
          <Activity className="h-5 w-5 text-slate-400" />
          Recent Activity
        </h2>
      </div>

      {activity.length === 0 ? (
        // biome-ignore lint/a11y/useSemanticElements: Using div with role for consistent styling
        <div className="p-8 text-center" role="status" aria-label="No activity">
          <Activity
            className="mx-auto mb-3 h-12 w-12 text-slate-600"
            aria-hidden="true"
          />
          <p className="font-medium text-slate-400">No activity recorded</p>
          <p className="text-sm text-slate-500">
            Activity will appear here as users take actions
          </p>
        </div>
      ) : (
        <div
          className="max-h-96 overflow-y-auto p-4"
          role="feed"
          aria-label="Recent tenant activity"
        >
          {Array.from(groupedActivity.entries()).map(([dateGroup, items]) => (
            <div key={dateGroup} className="mb-4 last:mb-0">
              <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
                {dateGroup}
              </h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-md bg-slate-700/30 p-3 text-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <span className="font-medium text-white">
                          {formatActionType(item.action_type)}
                        </span>{" "}
                        <span className="text-slate-400">
                          {item.resource_type}
                        </span>
                        {item.user_email && (
                          <div className="mt-1 text-xs text-slate-500">
                            by {item.user_email}
                          </div>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs text-slate-500">
                        {format(new Date(item.created_at), "h:mm a")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
