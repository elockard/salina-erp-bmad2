"use client";

import { BookOpen, Hash, Smartphone } from "lucide-react";
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
 * Story 2.8 - AC 3: Full /isbn-pool page displays stats cards
 * - Physical ISBNs card: Available / Assigned / Registered / Retired counts
 * - Ebook ISBNs card: Available / Assigned / Registered / Retired counts
 * - Total ISBNs card: Combined counts across both types
 * - Visual progress bar showing pool utilization
 * - Warning badge when available < 10
 */
export function ISBNPoolStats({ stats }: ISBNPoolStatsProps) {
  const physicalAvailable = stats.availableByType.physical;
  const physicalTotal = stats.byType.physical;
  const ebookAvailable = stats.availableByType.ebook;
  const ebookTotal = stats.byType.ebook;

  // Calculate used counts (non-available)
  const physicalUsed = physicalTotal - physicalAvailable;
  const ebookUsed = ebookTotal - ebookAvailable;
  const totalUsed = stats.total - stats.available;

  // Low inventory warnings
  const physicalLow = physicalAvailable < 10 && physicalTotal > 0;
  const ebookLow = ebookAvailable < 10 && ebookTotal > 0;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Physical ISBNs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Physical ISBNs</CardTitle>
          <div className="flex items-center gap-2">
            {physicalLow && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-700"
              >
                Low
              </Badge>
            )}
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-2xl font-bold">
            {physicalAvailable}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              / {physicalTotal}
            </span>
          </div>
          <CardDescription>Available physical ISBNs</CardDescription>

          <UtilizationBar
            used={physicalUsed}
            total={physicalTotal}
            showWarning={physicalLow}
          />

          <div className="space-y-1 border-t pt-4">
            <StatRow
              label="Available"
              value={physicalAvailable}
              variant="outline"
              className="border-green-500 bg-green-50 text-green-700"
            />
            <StatRow
              label="Assigned"
              value={
                stats.byType.physical > 0
                  ? Math.round((stats.assigned / stats.total) * physicalTotal)
                  : 0
              }
              variant="secondary"
            />
            <StatRow
              label="Registered"
              value={
                stats.byType.physical > 0
                  ? Math.round((stats.registered / stats.total) * physicalTotal)
                  : 0
              }
              variant="secondary"
            />
            <StatRow
              label="Retired"
              value={
                stats.byType.physical > 0
                  ? Math.round((stats.retired / stats.total) * physicalTotal)
                  : 0
              }
              variant="destructive"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ebook ISBNs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ebook ISBNs</CardTitle>
          <div className="flex items-center gap-2">
            {ebookLow && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-700"
              >
                Low
              </Badge>
            )}
            <Smartphone className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-2xl font-bold">
            {ebookAvailable}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              / {ebookTotal}
            </span>
          </div>
          <CardDescription>Available ebook ISBNs</CardDescription>

          <UtilizationBar
            used={ebookUsed}
            total={ebookTotal}
            showWarning={ebookLow}
          />

          <div className="space-y-1 border-t pt-4">
            <StatRow
              label="Available"
              value={ebookAvailable}
              variant="outline"
              className="border-green-500 bg-green-50 text-green-700"
            />
            <StatRow
              label="Assigned"
              value={
                stats.byType.ebook > 0
                  ? Math.round((stats.assigned / stats.total) * ebookTotal)
                  : 0
              }
              variant="secondary"
            />
            <StatRow
              label="Registered"
              value={
                stats.byType.ebook > 0
                  ? Math.round((stats.registered / stats.total) * ebookTotal)
                  : 0
              }
              variant="secondary"
            />
            <StatRow
              label="Retired"
              value={
                stats.byType.ebook > 0
                  ? Math.round((stats.retired / stats.total) * ebookTotal)
                  : 0
              }
              variant="destructive"
            />
          </div>
        </CardContent>
      </Card>

      {/* Total ISBNs Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total ISBNs</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-2xl font-bold">
            {stats.available}{" "}
            <span className="text-lg font-normal text-muted-foreground">
              / {stats.total}
            </span>
          </div>
          <CardDescription>Total available across all types</CardDescription>

          <UtilizationBar used={totalUsed} total={stats.total} />

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
    </div>
  );
}
