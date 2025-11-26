"use client";

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
 *
 * Displays:
 * - Physical ISBNs: X available / Y total with progress bar
 * - Ebook ISBNs: X available / Y total with progress bar
 * - Warning badge if available < 10 for either type
 * - Clickable to navigate to /isbn-pool
 */
export function ISBNPoolWidget({ stats }: ISBNPoolWidgetProps) {
  const physicalAvailable = stats.availableByType.physical;
  const physicalTotal = stats.byType.physical;
  const ebookAvailable = stats.availableByType.ebook;
  const ebookTotal = stats.byType.ebook;

  // Low inventory warning if either type has < 10 available
  const showWarning = physicalAvailable < 10 || ebookAvailable < 10;

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
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Physical</span>
              <span className="font-medium">
                {physicalAvailable} / {physicalTotal}
                {physicalAvailable < 10 && physicalTotal > 0 && (
                  <span className="ml-1 text-amber-600">!</span>
                )}
              </span>
            </div>
            <ProgressBar value={physicalAvailable} max={physicalTotal} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Ebook</span>
              <span className="font-medium">
                {ebookAvailable} / {ebookTotal}
                {ebookAvailable < 10 && ebookTotal > 0 && (
                  <span className="ml-1 text-amber-600">!</span>
                )}
              </span>
            </div>
            <ProgressBar value={ebookAvailable} max={ebookTotal} />
          </div>

          <CardDescription className="text-xs">
            Click to view full ISBN pool details
          </CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
