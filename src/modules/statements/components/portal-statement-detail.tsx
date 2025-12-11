"use client";

/**
 * Portal Statement Detail Component
 *
 * Full-page statement detail view for author portal:
 * - Summary card with net payable
 * - Sales breakdown table
 * - Returns section (if applicable)
 * - Advance recoupment with progress bar
 * - Final payment calculation
 *
 * Story: 5.6 - Build Author Portal Statement Access
 * Task 6: Create portal statement detail component (AC: 3)
 *
 * Related:
 * - src/modules/statements/components/statement-detail-modal.tsx (base pattern)
 * - src/modules/statements/types.ts (StatementCalculations)
 */

import { format } from "date-fns";
import { ArrowLeft, Download, Printer, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getMyStatementPDFUrl } from "../actions";
import type { StatementCalculations, StatementWithDetails } from "../types";

export interface PortalStatementDetailProps {
  /** Statement data with full details */
  statement: StatementWithDetails;
}

/**
 * Format period dates to "Q4 2025" pattern
 */
function formatPeriod(periodStart: Date): string {
  const quarter = Math.ceil((new Date(periodStart).getMonth() + 1) / 3);
  const year = new Date(periodStart).getFullYear();
  return `Q${quarter} ${year}`;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string | number): string {
  const numAmount =
    typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

/**
 * Format percentage for display
 */
function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Portal status badge
 */
function PortalStatusBadge({
  status,
  emailSentAt,
}: {
  status: string;
  emailSentAt: Date | null;
}) {
  const isPaid = status === "sent" && emailSentAt;
  const isPending = status === "sent" && !emailSentAt;

  if (isPaid) {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200"
      >
        Paid
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200"
      >
        Pending Payment
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className="bg-blue-50 text-blue-700 border-blue-200"
    >
      New
    </Badge>
  );
}

/**
 * Portal statement detail view
 *
 * AC-5.6.3: Statement detail view matches PDF content structure
 * AC-5.6.4: Download PDF button
 * AC-5.6.6: Mobile-responsive design
 */
export function PortalStatementDetail({
  statement,
}: PortalStatementDetailProps) {
  const [isPending, startTransition] = useTransition();

  // Parse calculations from JSONB
  const calculations = statement.calculations as StatementCalculations | null;

  // Calculate advance recoupment progress
  const advanceProgress = calculations?.advanceRecoupment
    ? ((calculations.advanceRecoupment.previouslyRecouped +
        calculations.advanceRecoupment.thisPeriodsRecoupment) /
        calculations.advanceRecoupment.originalAdvance) *
      100
    : 0;

  /**
   * Handle PDF download
   * AC-5.6.4: Download PDF button generates presigned S3 URL
   */
  const handleDownloadPDF = () => {
    startTransition(async () => {
      const result = await getMyStatementPDFUrl(statement.id);

      if (!result.success) {
        toast.error(result.error || "Failed to get download URL");
        return;
      }

      // Open presigned URL in new tab
      window.open(result.data.url, "_blank");
      toast.success(
        `Download started. Link expires in ${result.data.expiresInMinutes} minutes.`,
      );
    });
  };

  /**
   * Handle print
   */
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Back link and header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/portal"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Statements
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {formatPeriod(statement.period_start)} Royalty Statement
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <PortalStatusBadge
              status={statement.status}
              emailSentAt={statement.email_sent_at}
            />
            <span className="text-sm text-muted-foreground">
              Generated {format(new Date(statement.created_at), "MMM dd, yyyy")}
            </span>
          </div>
        </div>

        {/* Action buttons - AC-5.6.4 */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrint}
            className="min-h-[44px]" // Touch target
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            disabled={isPending}
            className="min-h-[44px]" // Touch target
          >
            <Download className="h-4 w-4 mr-2" />
            {isPending ? "Loading..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Summary Card - AC-5.6.3 */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">
              Net Amount Payable
            </p>
            <p className="text-4xl font-bold text-green-700">
              {formatCurrency(statement.net_payable)}
            </p>
            <p className="text-sm text-muted-foreground mt-3">
              {formatCurrency(statement.total_royalty_earned)} Gross Royalties
              {Number(statement.recoupment) > 0 &&
                ` - ${formatCurrency(statement.recoupment)} Advance Recoupment`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Co-Author Ownership Section - Story 10.3: AC-10.3.6 */}
      {calculations?.splitCalculation?.isSplitCalculation && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-full">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="font-medium text-blue-900">Co-Authored Title</p>
                <p className="text-sm text-blue-700">
                  Your {calculations.splitCalculation.ownershipPercentage}%
                  ownership share of &quot;{statement.title?.title}&quot;
                </p>
                {calculations.splitCalculation.titleTotalRoyalty > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Total title royalty:{" "}
                    {formatCurrency(
                      calculations.splitCalculation.titleTotalRoyalty,
                    )}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lifetime Sales Progress Section - Story 10.4: AC-10.4.6 */}
      {calculations?.lifetimeContext?.tierCalculationMode === "lifetime" && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-full">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-green-900">
                  Lifetime Sales Progress
                </p>
                <p className="text-sm text-green-700">
                  Your lifetime sales:{" "}
                  {calculations.lifetimeContext.lifetimeSalesAfter.toLocaleString()}{" "}
                  units (up from{" "}
                  {calculations.lifetimeContext.lifetimeSalesBefore.toLocaleString()}
                  )
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Current tier rate:{" "}
                  {formatPercent(calculations.lifetimeContext.currentTierRate)}
                </p>
                {calculations.lifetimeContext.unitsToNextTier !== null ? (
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-green-600 mb-1">
                      <span>Progress to next tier</span>
                      <span>
                        {calculations.lifetimeContext.unitsToNextTier.toLocaleString()}{" "}
                        units to go
                      </span>
                    </div>
                    <Progress
                      value={
                        (calculations.lifetimeContext.lifetimeSalesAfter /
                          (calculations.lifetimeContext.nextTierThreshold ||
                            calculations.lifetimeContext.lifetimeSalesAfter)) *
                        100
                      }
                      className="h-2 bg-green-200"
                    />
                  </div>
                ) : (
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    Congratulations! You&apos;ve reached the highest royalty
                    tier.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales Breakdown - AC-5.6.3 */}
      {calculations?.formatBreakdowns &&
        calculations.formatBreakdowns.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sales Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Mobile: Cards */}
              <div className="md:hidden space-y-4">
                {calculations.formatBreakdowns.map((fb) => (
                  <div
                    key={`mobile-${fb.format}`}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium capitalize">
                        {fb.format}
                      </span>
                      <Badge variant="outline">{statement.title?.title}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <span className="text-muted-foreground">Units Sold:</span>
                      <span className="text-right">
                        {fb.totalQuantity.toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">Revenue:</span>
                      <span className="text-right">
                        {formatCurrency(fb.totalRevenue)}
                      </span>
                      <span className="text-muted-foreground">Your Rate:</span>
                      <span className="text-right">
                        {fb.tierBreakdowns && fb.tierBreakdowns.length > 0
                          ? formatPercent(fb.tierBreakdowns[0].tierRate)
                          : "N/A"}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        Royalty Earned:
                      </span>
                      <span className="text-right font-bold">
                        {formatCurrency(fb.formatRoyalty)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead className="text-right">Units Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                      <TableHead className="text-right">Your Rate</TableHead>
                      <TableHead className="text-right">
                        Royalty Earned
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calculations.formatBreakdowns.map((fb) => (
                      <TableRow key={`desktop-${fb.format}`}>
                        <TableCell>{statement.title?.title}</TableCell>
                        <TableCell className="capitalize">
                          {fb.format}
                        </TableCell>
                        <TableCell className="text-right">
                          {fb.totalQuantity.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(fb.totalRevenue)}
                        </TableCell>
                        <TableCell className="text-right">
                          {fb.tierBreakdowns && fb.tierBreakdowns.length > 0
                            ? formatPercent(fb.tierBreakdowns[0].tierRate)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(fb.formatRoyalty)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

      {/* Returns Section - AC-5.6.3 (if applicable) */}
      {calculations && calculations.returnsDeduction > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Returns Deduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
              <span className="text-muted-foreground">Returns Impact</span>
              <span className="font-bold text-red-700">
                -{formatCurrency(calculations.returnsDeduction)}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Advance Recoupment - AC-5.6.3 (if applicable) */}
      {calculations?.advanceRecoupment &&
        calculations.advanceRecoupment.originalAdvance > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Advance Recoupment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Original Advance
                  </p>
                  <p className="font-medium">
                    {formatCurrency(
                      calculations.advanceRecoupment.originalAdvance,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    Previously Recouped
                  </p>
                  <p className="font-medium">
                    {formatCurrency(
                      calculations.advanceRecoupment.previouslyRecouped,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Period</p>
                  <p className="font-medium text-orange-600">
                    -
                    {formatCurrency(
                      calculations.advanceRecoupment.thisPeriodsRecoupment,
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="font-medium">
                    {formatCurrency(
                      calculations.advanceRecoupment.remainingAdvance,
                    )}
                  </p>
                </div>
              </div>

              {/* Progress bar */}
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">
                    Recoupment Progress
                  </span>
                  <span className="font-medium">
                    {Math.min(advanceProgress, 100).toFixed(0)}%
                  </span>
                </div>
                <Progress value={Math.min(advanceProgress, 100)} />
              </div>
            </CardContent>
          </Card>
        )}

      {/* Final Payment Calculation - AC-5.6.3 */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Gross Royalties</span>
              <span>{formatCurrency(statement.total_royalty_earned)}</span>
            </div>
            {calculations && calculations.returnsDeduction > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Returns Deduction</span>
                <span className="text-red-600">
                  -{formatCurrency(calculations.returnsDeduction)}
                </span>
              </div>
            )}
            {Number(statement.recoupment) > 0 && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">
                  Advance Recoupment
                </span>
                <span className="text-orange-600">
                  -{formatCurrency(statement.recoupment)}
                </span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between py-2">
              <span className="font-semibold">Net Amount Payable</span>
              <span className="text-xl font-bold text-green-700">
                {formatCurrency(statement.net_payable)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer - AC-5.6.3 */}
      <div className="text-center text-sm text-muted-foreground space-y-1 py-4">
        {statement.email_sent_at && (
          <p>
            Statement sent:{" "}
            {format(new Date(statement.email_sent_at), "MMMM dd, yyyy")}
          </p>
        )}
        <p>
          Generated: {format(new Date(statement.created_at), "MMMM dd, yyyy")}
        </p>
        <p className="mt-2">
          Questions about your statement? Contact your publisher.
        </p>
      </div>
    </div>
  );
}
