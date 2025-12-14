"use client";

/**
 * Platform Stats Card Component
 *
 * Story 13.5: Build Platform Analytics Dashboard (AC: 1-4)
 *
 * Reusable stat card for displaying platform metrics.
 */

import type { LucideIcon } from "lucide-react";

interface PlatformStatsCardProps {
  title: string;
  value: number;
  icon?: LucideIcon;
  variant?: "default" | "warning";
  compact?: boolean;
}

export function PlatformStatsCard({
  title,
  value,
  icon: Icon,
  variant = "default",
  compact,
}: PlatformStatsCardProps) {
  return (
    <div
      className={`rounded-lg border border-slate-700 bg-slate-800 ${compact ? "p-3" : "p-4"}`}
    >
      <div className="flex items-center gap-2">
        {Icon && (
          <Icon
            className={`h-5 w-5 ${variant === "warning" ? "text-amber-400" : "text-blue-400"}`}
          />
        )}
        <span className="text-sm text-slate-400">{title}</span>
      </div>
      <p
        className={`mt-1 font-bold text-white ${compact ? "text-xl" : "text-2xl"}`}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
