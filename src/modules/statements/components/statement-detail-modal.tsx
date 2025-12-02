"use client";

/**
 * Statement Detail Modal Component
 *
 * Shows full calculation breakdown for a statement:
 * - Header: author, period, status, generated date
 * - Summary: net payable, gross royalties, recoupment
 * - Calculation breakdown with tier details
 * - Expandable JSON view for full calculations
 * - Email delivery status and timestamp
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Task 6: Build statement detail modal (AC: 3)
 *
 * Related:
 * - src/modules/statements/types.ts (StatementCalculations)
 */

import { format } from "date-fns";
import { ChevronDown, ChevronRight, Download, Mail } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import type { StatementCalculations, StatementWithRelations } from "../types";
import { StatementStatusBadge } from "./statement-status-badge";

export interface StatementDetailModalProps {
  /** Statement to display (null when closed) */
  statement: StatementWithRelations | null;
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Callback when Download PDF action clicked */
  onDownloadPDF: (statement: StatementWithRelations) => void;
  /** Callback when Resend Email action clicked */
  onResendEmail: (statement: StatementWithRelations) => void;
  /** Loading state for actions */
  actionLoading?: boolean;
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
 * Statement detail modal
 *
 * AC-5.5.3: Detail modal shows full calculation breakdown with expandable JSON
 */
export function StatementDetailModal({
  statement,
  open,
  onOpenChange,
  onDownloadPDF,
  onResendEmail,
  actionLoading = false,
}: StatementDetailModalProps) {
  const [showJson, setShowJson] = useState(false);

  if (!statement) {
    return null;
  }

  // Parse calculations from JSONB
  const calculations = statement.calculations as StatementCalculations | null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Statement Details</DialogTitle>
          <DialogDescription>
            Royalty statement for {statement.author?.name || "Unknown Author"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Author</p>
              <p className="font-medium">
                {statement.author?.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">
                {formatPeriod(statement.period_start)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <StatementStatusBadge
                status={statement.status as "draft" | "sent" | "failed"}
              />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Generated</p>
              <p className="font-medium">
                {format(
                  new Date(statement.created_at),
                  "MMM dd, yyyy 'at' h:mm a",
                )}
              </p>
            </div>
          </div>

          <Separator />

          {/* Summary Section */}
          <div>
            <h3 className="font-semibold mb-3">Summary</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Gross Royalties</p>
                <p className="text-lg font-bold">
                  {formatCurrency(statement.total_royalty_earned)}
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Recoupment</p>
                <p className="text-lg font-bold text-orange-600">
                  -{formatCurrency(statement.recoupment)}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-muted-foreground">Net Payable</p>
                <p className="text-lg font-bold text-green-700">
                  {formatCurrency(statement.net_payable)}
                </p>
              </div>
            </div>
          </div>

          {/* Calculation Breakdown */}
          {calculations?.formatBreakdowns &&
            calculations.formatBreakdowns.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Calculation Breakdown</h3>
                  <div className="space-y-4">
                    {calculations.formatBreakdowns.map((fb) => (
                      <div
                        key={`format-${fb.format}`}
                        className="border rounded-lg p-4"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="capitalize">
                            {fb.format}
                          </Badge>
                          <span className="font-semibold">
                            {formatCurrency(fb.formatRoyalty)}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>
                            Quantity: {fb.totalQuantity.toLocaleString()} units
                          </p>
                          <p>Revenue: {formatCurrency(fb.totalRevenue)}</p>
                        </div>

                        {/* Tier Breakdown */}
                        {fb.tierBreakdowns && fb.tierBreakdowns.length > 0 && (
                          <div className="mt-3 pt-3 border-t">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Tier Breakdown
                            </p>
                            <div className="space-y-1">
                              {fb.tierBreakdowns.map((tier) => (
                                <div
                                  key={`tier-${fb.format}-${tier.tierMinQuantity}-${tier.tierRate}`}
                                  className="flex justify-between text-xs"
                                >
                                  <span>
                                    {tier.tierMinQuantity.toLocaleString()}-
                                    {tier.tierMaxQuantity
                                      ? tier.tierMaxQuantity.toLocaleString()
                                      : "∞"}{" "}
                                    @ {formatPercent(tier.tierRate)}
                                  </span>
                                  <span>
                                    {tier.quantityInTier.toLocaleString()} units
                                    = {formatCurrency(tier.royaltyEarned)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Returns Deduction */}
                    {calculations.returnsDeduction > 0 && (
                      <div className="flex justify-between p-3 border rounded-lg">
                        <span className="text-muted-foreground">
                          Returns Deduction
                        </span>
                        <span className="font-medium text-red-600">
                          -{formatCurrency(calculations.returnsDeduction)}
                        </span>
                      </div>
                    )}

                    {/* Advance Recoupment */}
                    {calculations.advanceRecoupment && (
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm font-medium mb-2">
                          Advance Recoupment
                        </p>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <p className="text-muted-foreground">
                            Original Advance:
                          </p>
                          <p className="text-right">
                            {formatCurrency(
                              calculations.advanceRecoupment.originalAdvance,
                            )}
                          </p>
                          <p className="text-muted-foreground">
                            Previously Recouped:
                          </p>
                          <p className="text-right">
                            {formatCurrency(
                              calculations.advanceRecoupment.previouslyRecouped,
                            )}
                          </p>
                          <p className="text-muted-foreground">This Period:</p>
                          <p className="text-right font-medium">
                            -
                            {formatCurrency(
                              calculations.advanceRecoupment
                                .thisPeriodsRecoupment,
                            )}
                          </p>
                          <p className="text-muted-foreground">Remaining:</p>
                          <p className="text-right">
                            {formatCurrency(
                              calculations.advanceRecoupment.remainingAdvance,
                            )}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

          {/* Email Delivery Status */}
          <Separator />
          <div>
            <h3 className="font-semibold mb-3">Email Delivery</h3>
            {statement.email_sent_at ? (
              <p className="text-sm text-muted-foreground">
                Sent on{" "}
                {format(
                  new Date(statement.email_sent_at),
                  "MMM dd, yyyy 'at' h:mm a",
                )}
              </p>
            ) : statement.status === "failed" ? (
              <p className="text-sm text-red-600">Email delivery failed</p>
            ) : (
              <p className="text-sm text-muted-foreground">Not yet sent</p>
            )}
          </div>

          {/* Expandable JSON View */}
          <Separator />
          <div>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              {showJson ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Raw Calculation Data
            </button>
            {showJson && (
              <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto max-h-64">
                {JSON.stringify(calculations, null, 2)}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onDownloadPDF(statement)}
              disabled={actionLoading || !statement.pdf_s3_key}
            >
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => onResendEmail(statement)}
              disabled={actionLoading || !statement.pdf_s3_key}
            >
              <Mail className="mr-2 h-4 w-4" />
              Resend Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
