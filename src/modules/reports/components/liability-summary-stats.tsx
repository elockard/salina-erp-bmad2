"use client";

/**
 * Liability Summary Stats Cards Component
 *
 * Displays statistics cards for Total Unpaid Liability, Authors with Pending Payments,
 * Oldest Unpaid Statement, and Average Payment per Author.
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 2 (Summary stats show: Total Unpaid Liability, Authors with Pending Payments, Oldest Unpaid Statement)
 * AC: 3 (Average payment per author is calculated)
 */

import { format } from "date-fns";
import { Calendar, DollarSign, TrendingUp, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RoyaltyLiabilitySummary } from "../types";

interface LiabilitySummaryStatsProps {
  summary: RoyaltyLiabilitySummary;
}

/**
 * Format currency value with dollar sign and 2 decimal places
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function LiabilitySummaryStats({ summary }: LiabilitySummaryStatsProps) {
  const {
    totalUnpaidLiability,
    authorsWithPendingPayments,
    oldestUnpaidStatement,
    averagePaymentPerAuthor,
  } = summary;

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="liability-summary-stats"
    >
      {/* Total Unpaid Liability Card (AC-2.2) */}
      <Card data-testid="total-liability-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Unpaid Liability
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold text-[#1e3a5f]"
            data-testid="total-liability-value"
          >
            {formatCurrency(totalUnpaidLiability)}
          </div>
          <CardDescription className="mt-2">
            Outstanding royalty payments
          </CardDescription>
        </CardContent>
      </Card>

      {/* Authors with Pending Payments Card (AC-2.3) */}
      <Card data-testid="authors-pending-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Authors with Pending Payments
          </CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            data-testid="authors-pending-value"
          >
            {authorsWithPendingPayments}
          </div>
          <CardDescription className="mt-2">
            Awaiting royalty disbursement
          </CardDescription>
        </CardContent>
      </Card>

      {/* Oldest Unpaid Statement Card (AC-2.4) */}
      <Card data-testid="oldest-statement-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Oldest Unpaid Statement
          </CardTitle>
          <Calendar className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            data-testid="oldest-statement-value"
          >
            {oldestUnpaidStatement
              ? format(oldestUnpaidStatement, "MMM d, yyyy")
              : "None"}
          </div>
          <CardDescription className="mt-2">
            {oldestUnpaidStatement
              ? `${Math.ceil((Date.now() - oldestUnpaidStatement.getTime()) / (1000 * 60 * 60 * 24))} days outstanding`
              : "No pending statements"}
          </CardDescription>
        </CardContent>
      </Card>

      {/* Average Payment per Author Card (AC-3) */}
      <Card data-testid="average-payment-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Average Payment per Author
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold text-[#1e3a5f]"
            data-testid="average-payment-value"
          >
            {formatCurrency(averagePaymentPerAuthor)}
          </div>
          <CardDescription className="mt-2">
            Based on current liability
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
