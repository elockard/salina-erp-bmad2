"use client";

/**
 * ISBN Pool Widget Component
 * Story 7.6: Simplified to unified stats - removed Physical/Ebook type distinction
 */

import { Hash } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ISBNPoolStats } from "../types";

/**
 * Simple progress bar component
 * Using inline styles to avoid needing a separate progress component
 */
function ProgressBar({ value, max }: { value: number; max: number }) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const isLow = value < 10;

  return (
    <div className="h-2 w-full rounded-full bg-secondary">
      <div
        className={`h-2 rounded-full transition-all ${
          isLow ? "bg-amber-500" : "bg-primary"
        }`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface ISBNPoolWidgetProps {
  stats: ISBNPoolStats;
}

/**
 * Dashboard widget showing ISBN pool summary
 * Story 2.8 - AC 1, 2
 * Story 7.6: Simplified to unified stats - removed Physical/Ebook type distinction
 *
 * Displays:
 * - Total ISBNs: X available / Y total with progress bar
 * - Warning badge if available < 10
 * - Clickable to navigate to /isbn-pool
 */
export function ISBNPoolWidget({ stats }: ISBNPoolWidgetProps) {
  // Story 7.6: Use unified stats instead of type-based counts
  const { available, total, assigned, registered, retired } = stats;

  // Low inventory warning if < 10 available
  const showWarning = available < 10 && total > 0;

  return (
    <Link href="/isbn-pool" className="block">
      <Card className="cursor-pointer transition-colors hover:bg-accent/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ISBN Pool</CardTitle>
          <div className="flex items-center gap-2">
            {showWarning && (
              <Badge
                variant="outline"
                className="border-amber-500 bg-amber-50 text-amber-700"
              >
                Low
              </Badge>
            )}
            <Hash className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary stat: Available ISBNs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{available}</span>
              <span className="text-sm text-muted-foreground">
                / {total} total
              </span>
            </div>
            <ProgressBar value={available} max={total} />
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <div className="font-medium">{assigned}</div>
              <div className="text-muted-foreground">Assigned</div>
            </div>
            <div>
              <div className="font-medium">{registered}</div>
              <div className="text-muted-foreground">Registered</div>
            </div>
            <div>
              <div className="font-medium">{retired}</div>
              <div className="text-muted-foreground">Retired</div>
            </div>
          </div>

          <CardDescription className="text-xs">
            Click to view full ISBN pool details
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
