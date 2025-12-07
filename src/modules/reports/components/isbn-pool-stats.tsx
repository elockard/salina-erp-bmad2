"use client";

/**
 * ISBN Pool Stats Cards Component
 *
 * Displays unified statistics cards for ISBNs.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * Story: 7.6 - Remove ISBN Type Distinction (unified stats, no physical/ebook breakdown)
 * AC: 2 (Stats cards show Available/Assigned/Total)
 * AC: 3 (Utilization percentage is calculated and displayed)
 */

import { Book, TrendingUp } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ISBNPoolMetrics } from "../types";

interface ISBNPoolStatsProps {
  metrics: ISBNPoolMetrics;
}

export function ISBNPoolStats({ metrics }: ISBNPoolStatsProps) {
  const { available, assigned, total, utilizationPercent } = metrics;

  return (
    <div className="grid gap-4 md:grid-cols-2" data-testid="isbn-pool-stats">
      {/* ISBN Pool Card - Story 7.6: Unified stats */}
      <Card data-testid="isbn-pool-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">ISBN Pool</CardTitle>
          <Book className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Available</span>
              <span className="font-medium text-green-600">{available}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Assigned</span>
              <span className="font-medium text-blue-600">{assigned}</span>
            </div>
          </CardDescription>
          <Progress
            value={total > 0 ? (assigned / total) * 100 : 0}
            className="mt-3 h-1.5"
            aria-label={`ISBN utilization: ${total > 0 ? Math.round((assigned / total) * 100) : 0}% assigned`}
          />
        </CardContent>
      </Card>

      {/* Utilization Card */}
      <Card data-testid="utilization-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Utilization</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{utilizationPercent}%</div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Pool</span>
              <span className="font-medium">{total}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>In Use</span>
              <span className="font-medium">{assigned}</span>
            </div>
          </CardDescription>
          <Progress
            value={utilizationPercent}
            className="mt-3 h-1.5"
            aria-label={`Overall ISBN pool utilization: ${utilizationPercent}%`}
          />
        </CardContent>
      </Card>
    </div>
  );
}
