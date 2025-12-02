"use client";

/**
 * Contract Advance Section Component
 *
 * Displays advance tracking information with progress bar.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 3: Advance Tracking section displays complete advance information
 * - Advance Amount (total agreed advance)
 * - Advance Paid (amount actually paid to author)
 * - Advance Recouped to Date (calculated from statements)
 * - Remaining Balance (advance_amount - advance_recouped)
 * - Progress bar showing percentage recouped (0-100%)
 */

import Decimal from "decimal.js";
import { DollarSign, Info } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ContractWithRelations } from "../types";

interface ContractAdvanceSectionProps {
  contract: ContractWithRelations;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string): string {
  const num = parseFloat(amount || "0");
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function ContractAdvanceSection({
  contract,
}: ContractAdvanceSectionProps) {
  // Use Decimal.js for precise financial calculations
  const advanceAmount = new Decimal(contract.advance_amount || "0");
  const _advancePaid = new Decimal(contract.advance_paid || "0");
  const advanceRecouped = new Decimal(contract.advance_recouped || "0");

  // Calculate remaining balance: advance_amount - advance_recouped
  const remainingBalance = advanceAmount.minus(advanceRecouped);

  // Calculate progress percentage: (recouped / amount) * 100, capped at 100%
  let progressPercentage = 0;
  if (advanceAmount.greaterThan(0)) {
    progressPercentage = Math.min(
      100,
      advanceRecouped.dividedBy(advanceAmount).times(100).toNumber(),
    );
  } else if (advanceRecouped.greaterThan(0)) {
    // Edge case: recouped amount exists but no advance amount
    progressPercentage = 100;
  }

  // Determine if advance is fully recouped
  const isFullyRecouped = remainingBalance.lessThanOrEqualTo(0);

  // Handle edge case where recouped exceeds amount
  const hasExcessRecoupment = advanceRecouped.greaterThan(advanceAmount);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Advance Tracking
        </CardTitle>
        <CardDescription>
          Track advance payments and recoupment progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Amount Details */}
        <div className="grid gap-3">
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">
              Advance Amount
            </span>
            <span className="font-medium">
              {formatCurrency(contract.advance_amount)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">Advance Paid</span>
            <span className="font-medium">
              {formatCurrency(contract.advance_paid)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b">
            <span className="text-sm text-muted-foreground">
              Recouped to Date
            </span>
            <span className="font-medium">
              {formatCurrency(contract.advance_recouped)}
            </span>
          </div>
          <div className="flex justify-between items-center py-2">
            <span className="text-sm font-medium">Remaining Balance</span>
            <span
              className={`font-bold ${isFullyRecouped ? "text-green-600" : ""}`}
            >
              {isFullyRecouped
                ? "$0.00"
                : formatCurrency(remainingBalance.toString())}
              {hasExcessRecoupment && (
                <span className="text-xs text-muted-foreground ml-1">
                  (over-recouped)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recoupment Progress</span>
            <span className="font-medium">
              {progressPercentage.toFixed(1)}%
            </span>
          </div>
          <Progress
            value={progressPercentage}
            className={`h-3 ${isFullyRecouped ? "[&>div]:bg-green-500" : ""}`}
          />
        </div>

        {/* Status Indicator */}
        {isFullyRecouped && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
            <span className="text-sm text-green-700 dark:text-green-400">
              Advance fully recouped - author now earning royalties
            </span>
          </div>
        )}

        {/* Note */}
        <div className="flex items-start gap-2 text-xs text-muted-foreground">
          <Info className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>
            Recoupment is updated automatically with each royalty statement
            generation.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
