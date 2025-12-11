"use client";

/**
 * AR Summary Stats Cards Component
 *
 * Displays accounts receivable summary statistics as dashboard cards.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.2: Summary stats cards showing total receivables, current, overdue, etc.
 */

import { AlertCircle, Clock, DollarSign, FileText } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { ARSummary } from "../types";

interface ARSummaryStatsProps {
  summary: ARSummary;
}

export function ARSummaryStats({ summary }: ARSummaryStatsProps) {
  const {
    totalReceivables,
    currentAmount,
    overdueAmount,
    averageDaysToPay,
    openInvoiceCount,
  } = summary;

  // Parse string amounts to numbers for calculations
  const totalNum = Number.parseFloat(totalReceivables) || 0;
  const overdueNum = Number.parseFloat(overdueAmount) || 0;
  const overduePercent =
    totalNum > 0 ? Math.round((overdueNum / totalNum) * 100) : 0;

  // Format currency
  const formatCurrency = (value: string) => {
    const num = Number.parseFloat(value) || 0;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="ar-summary-stats"
    >
      {/* Total Receivables Card */}
      <Card data-testid="total-receivables-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            Total Receivables
          </CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatCurrency(totalReceivables)}
          </div>
          <CardDescription className="mt-2">
            <span className="text-xs text-muted-foreground">
              {openInvoiceCount} open invoice{openInvoiceCount !== 1 ? "s" : ""}
            </span>
          </CardDescription>
        </CardContent>
      </Card>

      {/* Current (Not Yet Due) Card */}
      <Card data-testid="current-amount-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(currentAmount)}
          </div>
          <CardDescription className="mt-2">
            <span className="text-xs text-muted-foreground">Not yet due</span>
          </CardDescription>
        </CardContent>
      </Card>

      {/* Overdue Card */}
      <Card data-testid="overdue-amount-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Overdue</CardTitle>
          <AlertCircle className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">
            {formatCurrency(overdueAmount)}
          </div>
          <CardDescription className="mt-2 space-y-1">
            <div className="flex justify-between text-xs">
              <span>% of Total</span>
              <span className="font-medium text-destructive">
                {overduePercent}%
              </span>
            </div>
          </CardDescription>
          <Progress
            value={overduePercent}
            className="mt-3 h-1.5"
            aria-label={`Overdue percentage: ${overduePercent}%`}
          />
        </CardContent>
      </Card>

      {/* Average Days to Pay Card */}
      <Card data-testid="avg-days-to-pay-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Avg Days to Pay</CardTitle>
          <Clock className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageDaysToPay}</div>
          <CardDescription className="mt-2">
            <span className="text-xs text-muted-foreground">
              Based on paid invoices
            </span>
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
