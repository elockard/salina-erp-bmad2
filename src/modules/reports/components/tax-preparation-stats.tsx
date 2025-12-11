"use client";

/**
 * Tax Preparation Summary Stats Cards Component
 *
 * Displays statistics cards for Total Authors, Requiring 1099, Total Earnings,
 * and Missing TIN count.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.6: Four stat cards with totals calculated from UNFILTERED data
 */

import { AlertTriangle, DollarSign, FileCheck, Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { TaxPreparationStats as TaxPreparationStatsType } from "../queries/tax-preparation";

interface TaxPreparationStatsProps {
  stats: TaxPreparationStatsType;
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

export function TaxPreparationStats({ stats }: TaxPreparationStatsProps) {
  const {
    totalAuthors,
    authorsRequiring1099,
    totalEarnings,
    authorsMissingTin,
  } = stats;

  return (
    <div
      className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
      data-testid="tax-preparation-stats"
    >
      {/* Total Authors Card (AC-11.2.6) */}
      <Card data-testid="total-authors-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Authors</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold" data-testid="total-authors-value">
            {totalAuthors}
          </div>
          <CardDescription className="mt-2">
            With earnings this year
          </CardDescription>
        </CardContent>
      </Card>

      {/* Requiring 1099 Card (AC-11.2.6) */}
      <Card data-testid="requiring-1099-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Requiring 1099</CardTitle>
          <FileCheck className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold"
            data-testid="requiring-1099-value"
          >
            {authorsRequiring1099}
          </div>
          <CardDescription className="mt-2">Earnings &gt;= $10</CardDescription>
        </CardContent>
      </Card>

      {/* Total Earnings Card (AC-11.2.6) */}
      <Card data-testid="total-earnings-card">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className="text-2xl font-bold text-[#1e3a5f]"
            data-testid="total-earnings-value"
          >
            {formatCurrency(totalEarnings)}
          </div>
          <CardDescription className="mt-2">
            Combined author earnings
          </CardDescription>
        </CardContent>
      </Card>

      {/* Missing TIN Card (AC-11.2.6) */}
      <Card
        data-testid="missing-tin-card"
        className={authorsMissingTin > 0 ? "border-yellow-500" : ""}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Missing TIN</CardTitle>
          <AlertTriangle
            className={`h-4 w-4 ${authorsMissingTin > 0 ? "text-yellow-600" : "text-muted-foreground"}`}
          />
        </CardHeader>
        <CardContent>
          <div
            className={`text-2xl font-bold ${authorsMissingTin > 0 ? "text-yellow-600" : ""}`}
            data-testid="missing-tin-value"
          >
            {authorsMissingTin}
          </div>
          <CardDescription className="mt-2">
            Requiring 1099 without Tax ID
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
