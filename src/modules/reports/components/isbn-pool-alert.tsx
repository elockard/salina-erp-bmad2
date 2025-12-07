"use client";

/**
 * ISBN Pool Warning Alert Component
 *
 * Displays warning alert when available ISBNs fall below threshold.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * Story: 7.6 - Remove ISBN Type Distinction (unified alert, no physical/ebook breakdown)
 * AC: 6 (Warning alert displayed when available ISBNs < 10)
 */

import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ISBNPoolMetrics } from "../types";

interface ISBNPoolAlertProps {
  metrics: ISBNPoolMetrics;
  /** Warning threshold (default: 10) */
  threshold?: number;
}

const LOW_ISBN_THRESHOLD = 10;

export function ISBNPoolAlert({
  metrics,
  threshold = LOW_ISBN_THRESHOLD,
}: ISBNPoolAlertProps) {
  const { available, total } = metrics;

  // Story 7.6: Unified alert - check total available ISBNs
  const isLow = available < threshold && total > 0;

  // No warnings needed
  if (!isLow) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="isbn-pool-alerts">
      <Alert
        variant="destructive"
        className="border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
        data-testid="isbn-pool-alert"
      >
        <AlertTriangle className="h-4 w-4 !text-amber-600" />
        <AlertTitle>Low ISBN Inventory</AlertTitle>
        <AlertDescription>
          Only <strong>{available}</strong> ISBNs remaining - consider importing
          more to avoid running out.
        </AlertDescription>
      </Alert>
    </div>
  );
}
