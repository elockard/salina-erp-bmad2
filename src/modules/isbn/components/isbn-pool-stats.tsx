"use client";

/**
 * ISBN Pool Stats Component
 * Story 7.6: Simplified to single card - removed type distinction
 */

import { Hash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ISBNPoolStats as ISBNPoolStatsType } from "../types";

/**
 * Progress bar component for utilization display
 */
function UtilizationBar({
  used,
  total,
  showWarning = false,
}: {
  used: number;
  total: number;
  showWarning?: boolean;
}) {
  const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
  const available = total - used;
  const isLow = available < 10 && total > 0;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{used} used</span>
        <span>{available} available</span>
      </div>
      <div className="h-2 w-full rounded-full bg-secondary">
        <div
          className={`h-2 rounded-full transition-all ${
            showWarning || isLow ? "bg-amber-500" : "bg-primary"
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Stat row for displaying count breakdown
 */
function StatRow({
  label,
  value,
  variant,
  className,
}: {
  label: string;
  value: number;
  variant?: "default" | "secondary" | "destructive" | "outline";
  className?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <Badge
        variant={variant || "outline"}
        className={`font-mono ${className || ""}`}
      >
        {value}
      </Badge>
    </div>
  );
}

interface ISBNPoolStatsProps {
  stats: ISBNPoolStatsType;
}

/**
 * ISBN Pool stats cards component
 *
 * Story 7.6: Simplified to single unified card - removed Physical/Ebook type distinction
 * - Total ISBNs card: Available / Assigned / Registered / Retired counts
 * - Visual progress bar showing pool utilization
 * - Warning badge when available < 10
 */
export function ISBNPoolStats({ stats }: ISBNPoolStatsProps) {
  const totalUsed = stats.total - stats.available;
  const isLow = stats.available < 10 && stats.total > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Total ISBNs Card - Story 7.6: Single unified card */}
      <Card className="lg:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ISBN Pool</CardTitle>
          <div className="flex items-center gap-2">
            {isLow && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-700"
              >
                Low Inventory
              </Badge>
            )}
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-2xl font-bold">
            {stats.available}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              / {stats.total} available
            </span>
          </div>
          <CardDescription>Total available ISBNs in your pool</CardDescription>

          <UtilizationBar
            used={totalUsed}
            total={stats.total}
            showWarning={isLow}
          />

          <div className="space-y-1 border-t pt-4">
            <StatRow
              label="Available"
              value={stats.available}
              variant="outline"
              className="border-green-500 bg-green-50 text-green-700"
            />
            <StatRow
              label="Assigned"
              value={stats.assigned}
              variant="secondary"
            />
            <StatRow
              label="Registered"
              value={stats.registered}
              variant="secondary"
            />
            <StatRow
              label="Retired"
              value={stats.retired}
              variant="destructive"
            />
          </div>
        </CardContent>
      </Card>

      {/* Placeholder for future stats card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-center py-4">
            Use the filters below to manage your ISBN pool
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
