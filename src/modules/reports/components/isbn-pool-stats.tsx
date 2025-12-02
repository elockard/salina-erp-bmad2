"use client";

/**
 * ISBN Pool Stats Cards Component
 *
 * Displays statistics cards for Physical ISBNs, Ebook ISBNs, and Utilization.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 2 (Stats cards show Physical ISBNs, Ebook ISBNs with Available/Assigned/Total)
 * AC: 3 (Utilization percentage is calculated and displayed)
 */

import { Book, Hash, TrendingUp } from "lucide-react";
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
  const { physical, ebook, utilizationPercent } = metrics;

  return (
    <div className="grid gap-4 md:grid-cols-3" data-testid="isbn-pool-stats">
      {/* Physical ISBNs Card */}
      <Card data-testid="physical-isbn-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Physical ISBNs</CardTitle>
          <Book className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{physical.total}</div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Available</span>
              <span className="font-medium text-green-600">
                {physical.available}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Assigned</span>
              <span className="font-medium text-blue-600">
                {physical.assigned}
              </span>
            </div>
          </CardDescription>
          <Progress
            value={
              physical.total > 0
                ? (physical.assigned / physical.total) * 100
                : 0
            }
            className="mt-3 h-1.5"
            aria-label={`Physical ISBN utilization: ${physical.total > 0 ? Math.round((physical.assigned / physical.total) * 100) : 0}% assigned`}
          />
        </CardContent>
      </Card>

      {/* Ebook ISBNs Card */}
      <Card data-testid="ebook-isbn-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ebook ISBNs</CardTitle>
          <Hash className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{ebook.total}</div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Available</span>
              <span className="font-medium text-green-600">
                {ebook.available}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Assigned</span>
              <span className="font-medium text-blue-600">
                {ebook.assigned}
              </span>
            </div>
          </CardDescription>
          <Progress
            value={ebook.total > 0 ? (ebook.assigned / ebook.total) * 100 : 0}
            className="mt-3 h-1.5"
            aria-label={`Ebook ISBN utilization: ${ebook.total > 0 ? Math.round((ebook.assigned / ebook.total) * 100) : 0}% assigned`}
          />
        </CardContent>
      </Card>

      {/* Utilization Card */}
      <Card data-testid="utilization-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Overall Utilization
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{utilizationPercent}%</div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Total Pool</span>
              <span className="font-medium">
                {physical.total + ebook.total}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>In Use</span>
              <span className="font-medium">
                {physical.assigned + ebook.assigned}
              </span>
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
