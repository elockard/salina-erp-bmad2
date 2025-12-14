"use client";

/**
 * Email Delivery Card Component
 *
 * Story 13.7: Build System Health and Job Monitoring (AC: 5)
 *
 * Displays email service metrics:
 * - Sent/delivered/failed counts for last 24h
 * - Delivery rate calculation
 * - Link to Resend dashboard
 */

import { ExternalLink, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailMetrics } from "../types";

interface EmailDeliveryCardProps {
  metrics: EmailMetrics;
}

const statusColors = {
  healthy: "bg-green-500",
  degraded: "bg-amber-500",
  error: "bg-red-500",
  unknown: "bg-slate-500",
};

const statusLabels = {
  healthy: "Healthy",
  degraded: "Degraded",
  error: "Error",
  unknown: "Check Dashboard",
};

export function EmailDeliveryCard({ metrics }: EmailDeliveryCardProps) {
  const hasApiData = metrics.sentLast24h !== null;

  // Calculate delivery rate if we have the data
  let deliveryRate: number | null = null;
  if (
    metrics.sentLast24h !== null &&
    metrics.deliveredLast24h !== null &&
    metrics.sentLast24h > 0
  ) {
    deliveryRate = Math.round(
      (metrics.deliveredLast24h / metrics.sentLast24h) * 100,
    );
  }

  return (
    <Card className="border-slate-700 bg-slate-800">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Mail className="h-5 w-5" />
          Email Service
          <span
            className={`ml-auto h-2.5 w-2.5 rounded-full ${statusColors[metrics.status]}`}
            title={statusLabels[metrics.status]}
          />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasApiData ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Sent (24h)</span>
              <span className="text-sm font-medium text-slate-200">
                {metrics.sentLast24h}
              </span>
            </div>
            {metrics.deliveredLast24h !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Delivered (24h)</span>
                <span className="text-sm font-medium text-green-400">
                  {metrics.deliveredLast24h}
                </span>
              </div>
            )}
            {metrics.failedLast24h !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Failed (24h)</span>
                <span
                  className={`text-sm font-medium ${
                    metrics.failedLast24h > 0
                      ? "text-red-400"
                      : "text-slate-200"
                  }`}
                >
                  {metrics.failedLast24h}
                </span>
              </div>
            )}
            {deliveryRate !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Delivery Rate</span>
                <span
                  className={`text-sm font-medium ${
                    deliveryRate >= 95
                      ? "text-green-400"
                      : deliveryRate >= 80
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {deliveryRate}%
                </span>
              </div>
            )}
          </>
        ) : (
          <div className="rounded bg-slate-900/50 p-3 text-center">
            <p className="text-sm text-slate-400">
              {metrics.status === "error"
                ? "API error - check dashboard for email status"
                : "API unavailable - check dashboard for email status"}
            </p>
          </div>
        )}
        <div className="border-t border-slate-700 pt-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => window.open(metrics.dashboardUrl, "_blank")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Resend Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
