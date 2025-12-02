"use client";

/**
 * ISBN Pool Warning Alert Component
 *
 * Displays warning alerts when available ISBNs fall below threshold.
 *
 * Story: 6.3 - Build ISBN Pool Status Report
 * AC: 6 (Warning alert displayed when available ISBNs < 10 physical or ebook)
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
  const { physical, ebook } = metrics;

  const physicalLow = physical.available < threshold && physical.total > 0;
  const ebookLow = ebook.available < threshold && ebook.total > 0;

  // No warnings needed
  if (!physicalLow && !ebookLow) {
    return null;
  }

  return (
    <div className="space-y-3" data-testid="isbn-pool-alerts">
      {physicalLow && (
        <Alert
          variant="destructive"
          className="border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
          data-testid="physical-isbn-alert"
        >
          <AlertTriangle className="h-4 w-4 !text-amber-600" />
          <AlertTitle>Low Physical ISBN Inventory</AlertTitle>
          <AlertDescription>
            Only <strong>{physical.available}</strong> Physical ISBNs remaining
            - consider importing more to avoid running out.
          </AlertDescription>
        </Alert>
      )}

      {ebookLow && (
        <Alert
          variant="destructive"
          className="border-amber-500/50 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-950 dark:text-amber-100"
          data-testid="ebook-isbn-alert"
        >
          <AlertTriangle className="h-4 w-4 !text-amber-600" />
          <AlertTitle>Low Ebook ISBN Inventory</AlertTitle>
          <AlertDescription>
            Only <strong>{ebook.available}</strong> Ebook ISBNs remaining -
            consider importing more to avoid running out.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
