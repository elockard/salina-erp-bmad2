"use client";

/**
 * Statement Wizard Step 3: Preview Calculations
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * AC-5.3.4: Preview step shows calculation estimates before generation
 *
 * Features:
 * - Preview table: Author | Sales | Returns | Royalty Earned | Advance Recouped | Net Payable
 * - Totals row with aggregated values
 * - Warning callouts for edge cases
 * - Loading state while calculations run
 */

import {
  AlertCircle,
  AlertTriangle,
  CircleDollarSign,
  Loader2,
  TrendingDown,
  Users,
} from "lucide-react";
import { useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  PreviewCalculation,
  PreviewTotals,
  PreviewWarningType,
} from "../types";

interface StatementStepPreviewProps {
  previewData: PreviewCalculation[];
  setPreviewData: (data: PreviewCalculation[]) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  periodStart: Date;
  periodEnd: Date;
  authorIds: string[];
}

/**
 * Get icon for warning type
 */
function getWarningIcon(type: PreviewWarningType) {
  switch (type) {
    case "negative_net":
      return <TrendingDown className="h-4 w-4" />;
    case "zero_net":
      return <CircleDollarSign className="h-4 w-4" />;
    case "no_sales":
      return <AlertCircle className="h-4 w-4" />;
  }
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format number with commas
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Calculate totals from preview data
 */
function calculateTotals(data: PreviewCalculation[]): PreviewTotals {
  return data.reduce(
    (acc, row) => ({
      totalSales: acc.totalSales + row.totalSales,
      totalReturns: acc.totalReturns + row.totalReturns,
      totalRoyaltyEarned: acc.totalRoyaltyEarned + row.royaltyEarned,
      totalAdvanceRecouped: acc.totalAdvanceRecouped + row.advanceRecouped,
      totalNetPayable: acc.totalNetPayable + row.netPayable,
      authorCount: acc.authorCount + 1,
      warningCount: acc.warningCount + row.warnings.length,
    }),
    {
      totalSales: 0,
      totalReturns: 0,
      totalRoyaltyEarned: 0,
      totalAdvanceRecouped: 0,
      totalNetPayable: 0,
      authorCount: 0,
      warningCount: 0,
    },
  );
}

export function StatementStepPreview({
  previewData,
  setPreviewData,
  isLoading,
  setIsLoading,
  periodStart,
  periodEnd,
  authorIds,
}: StatementStepPreviewProps) {
  // Load preview calculations on mount
  useEffect(() => {
    const loadPreview = async () => {
      // Skip if already loaded or no authors
      if (previewData.length > 0 || authorIds.length === 0) return;

      setIsLoading(true);

      try {
        const { previewStatementCalculations } = await import("../actions");
        const result = await previewStatementCalculations({
          periodStart,
          periodEnd,
          authorIds,
        });

        if (result.success) {
          setPreviewData(result.data);
        } else {
          console.error("Preview calculation failed:", result.error);
        }
      } catch (error) {
        console.error("Error loading preview:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreview();
  }, [
    authorIds,
    periodStart,
    periodEnd,
    previewData.length,
    setPreviewData,
    setIsLoading,
  ]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Calculating royalties...</p>
        <p className="text-sm text-muted-foreground">
          This may take a moment for large author lists
        </p>
      </div>
    );
  }

  if (previewData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <AlertCircle className="h-8 w-8 text-muted-foreground" />
        <p className="text-muted-foreground">No calculations available</p>
        <p className="text-sm text-muted-foreground">
          Go back and select authors to preview calculations
        </p>
      </div>
    );
  }

  const totals = calculateTotals(previewData);

  // Collect all warnings for display (AC-5.3.4)
  const allWarnings = previewData.flatMap((row) =>
    row.warnings.map((w) => ({
      authorId: row.authorId,
      authorName: row.authorName,
      ...w,
    })),
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Preview Calculations</h3>
        <p className="text-sm text-muted-foreground">
          Review calculation estimates before generating statements
        </p>
      </div>

      {/* Warning Callouts (AC-5.3.4) */}
      {allWarnings.length > 0 && (
        <div className="space-y-2">
          {allWarnings.map((warning) => (
            <Alert
              key={`warning-${warning.authorId}-${warning.type}`}
              variant={
                warning.type === "negative_net" ? "destructive" : "default"
              }
            >
              {getWarningIcon(warning.type)}
              <AlertTitle className="ml-2">{warning.authorName}</AlertTitle>
              <AlertDescription className="ml-6">
                {warning.message}
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Preview Table (AC-5.3.4) */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Sales</TableHead>
              <TableHead className="text-right">Returns</TableHead>
              <TableHead className="text-right">Royalty Earned</TableHead>
              <TableHead className="text-right">Advance Recouped</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {previewData.map((row) => (
              <TableRow
                key={row.authorId}
                className={cn(
                  row.warnings.length > 0 &&
                    "bg-yellow-50 dark:bg-yellow-950/10",
                )}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {row.warnings.length > 0 && (
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    )}
                    {/* Story 10.3: AC-10.3.7 - Show co-author indicator */}
                    {row.coAuthorInfo && (
                      <Users className="h-4 w-4 text-blue-500" />
                    )}
                    <div>
                      {row.authorName}
                      {/* Story 10.3: AC-10.3.7 - Show ownership percentage */}
                      {row.coAuthorInfo && (
                        <span className="text-xs text-muted-foreground ml-1">
                          ({row.coAuthorInfo.ownershipPercentage}% of{" "}
                          {row.coAuthorInfo.titleName})
                        </span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(row.totalSales)}
                </TableCell>
                <TableCell className="text-right">
                  {formatNumber(row.totalReturns)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.royaltyEarned)}
                </TableCell>
                <TableCell className="text-right">
                  {formatCurrency(row.advanceRecouped)}
                </TableCell>
                <TableCell
                  className={cn(
                    "text-right font-medium",
                    row.netPayable <= 0 && "text-destructive",
                  )}
                >
                  {formatCurrency(row.netPayable)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          {/* Totals Row (AC-5.3.4) */}
          <TableFooter>
            <TableRow>
              <TableCell className="font-bold">
                Total ({totals.authorCount} authors)
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(totals.totalSales)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatNumber(totals.totalReturns)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.totalRoyaltyEarned)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.totalAdvanceRecouped)}
              </TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(totals.totalNetPayable)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Summary */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          {totals.warningCount > 0 && (
            <span className="text-yellow-600 font-medium">
              {totals.warningCount} warning
              {totals.warningCount !== 1 ? "s" : ""} found.{" "}
            </span>
          )}
          Statements will be generated for {totals.authorCount} author
          {totals.authorCount !== 1 ? "s" : ""} with a total net payable of{" "}
          <span className="font-medium">
            {formatCurrency(totals.totalNetPayable)}
          </span>
          .
        </p>
      </div>
    </div>
  );
}
