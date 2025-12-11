"use client";

/**
 * ISBN Pool Insights Component
 *
 * Displays burn rate, estimated runout date, and quick action button.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * Story: 7.6 - Remove ISBN Type Distinction (unified insights)
 * AC: 7 (Burn rate calculation shows ISBNs assigned per month)
 * AC: 8 (Estimated runout date displayed based on burn rate)
 * AC: 9 ("Import ISBN Block" quick action button links to ISBN import page)
 */

import { format } from "date-fns";
import { ArrowRight, Calendar, TrendingDown, Upload } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ISBNPoolMetrics } from "../types";

interface ISBNPoolInsightsProps {
  metrics: ISBNPoolMetrics;
}

export function ISBNPoolInsights({ metrics }: ISBNPoolInsightsProps) {
  // Story 7.6: Unified metrics - no physical/ebook breakdown
  const { available, burnRate, estimatedRunout } = metrics;

  // Calculate months until runout
  const monthsUntilRunout =
    burnRate > 0 ? Math.ceil(available / burnRate) : null;

  return (
    <Card data-testid="isbn-pool-insights">
      <CardHeader>
        <CardTitle className="text-base">Pool Insights & Actions</CardTitle>
        <CardDescription>Usage trends and recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Burn Rate & Runout Info */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Burn Rate */}
          <div
            className="flex items-start space-x-3"
            data-testid="burn-rate-info"
          >
            <div className="rounded-lg bg-muted p-2">
              <TrendingDown className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Burn Rate
              </p>
              <p className="text-lg font-semibold">
                {burnRate > 0 ? (
                  <>
                    {burnRate}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      ISBNs/month
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Average over last 6 months
              </p>
            </div>
          </div>

          {/* Runout Estimate */}
          <div
            className="flex items-start space-x-3"
            data-testid="runout-estimate-info"
          >
            <div className="rounded-lg bg-muted p-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Estimated Runout
              </p>
              <p className="text-lg font-semibold">
                {monthsUntilRunout !== null ? (
                  <>
                    ~{monthsUntilRunout}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      month{monthsUntilRunout !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                {estimatedRunout
                  ? `Target: ${format(estimatedRunout, "MMM yyyy")}`
                  : "No activity to estimate"}
              </p>
            </div>
          </div>

          {/* Available Summary */}
          <div
            className="flex items-start space-x-3"
            data-testid="available-summary"
          >
            <div className="rounded-lg bg-muted p-2">
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Available Now
              </p>
              <p className="text-lg font-semibold">
                {available}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ISBNs
                </span>
              </p>
              <p className="text-xs text-muted-foreground">Ready to assign</p>
            </div>
          </div>
        </div>

        {/* Quick Action Button - AC-9 */}
        <div className="flex justify-end pt-2">
          <Button asChild data-testid="import-isbn-button">
            <Link href="/titles">
              <Upload className="mr-2 h-4 w-4" />
              Import ISBN Block
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
