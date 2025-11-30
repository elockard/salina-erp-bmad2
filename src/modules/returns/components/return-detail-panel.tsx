"use client";

/**
 * Return Detail Panel Component
 *
 * Right panel for the approval queue Split View showing return details.
 * Story 3.6: AC 3 (return request detail), AC 4 (impact statement)
 *
 * Sections:
 * - Header with "Return Request" title
 * - Metadata: Submitted by, date, status badge
 * - Return Information card
 * - Royalty impact statement (AC 4)
 * - Approval actions (approve/reject buttons)
 */

import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { PendingReturn } from "../types";
import {
  formatNegativeCurrency,
  formatNegativeQuantity,
  getFormatLabel,
} from "../utils";
import { ApprovalActions } from "./approval-actions";

interface ReturnDetailPanelProps {
  returnItem: PendingReturn;
  onApprove: (internalNote?: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
  loading?: boolean;
}

export function ReturnDetailPanel({
  returnItem,
  onApprove,
  onReject,
  loading,
}: ReturnDetailPanelProps) {
  const totalAmount = parseFloat(returnItem.total_amount);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Return Request</h2>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>
            Submitted by{" "}
            <span className="font-medium text-foreground">
              {returnItem.createdBy.name}
            </span>
          </span>
          <span>&bull;</span>
          <span>{format(new Date(returnItem.created_at), "MMMM d, yyyy")}</span>
        </div>
        {/* Status Badge - Pending Approval (AC 3) */}
        <Badge
          variant="secondary"
          className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        >
          Pending Approval
        </Badge>
      </div>

      <Separator />

      {/* Return Information Card (AC 3) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Return Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title with link */}
          <div className="flex justify-between items-start">
            <span className="text-sm text-muted-foreground">Title</span>
            <div className="text-right">
              <Link
                href={`/dashboard/titles`}
                className="font-medium text-primary hover:underline"
              >
                {returnItem.title.title}
              </Link>
              <div className="text-xs text-muted-foreground">
                by {returnItem.title.author_name}
              </div>
            </div>
          </div>

          {/* Format */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Format</span>
            <span className="font-medium">
              {getFormatLabel(returnItem.format)}
            </span>
          </div>

          {/* Quantity (negative) */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Quantity</span>
            <span className="font-medium text-red-600 dark:text-red-400">
              {formatNegativeQuantity(returnItem.quantity)} units
            </span>
          </div>

          {/* Amount (negative) */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Amount</span>
            <span className="font-semibold text-red-600 dark:text-red-400">
              {formatNegativeCurrency(returnItem.total_amount)}
            </span>
          </div>

          {/* Return Date */}
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Return Date</span>
            <span className="font-medium">
              {format(new Date(returnItem.return_date), "MMMM d, yyyy")}
            </span>
          </div>

          {/* Reason */}
          {returnItem.reason && (
            <div className="pt-2 border-t">
              <span className="text-sm text-muted-foreground block mb-1">
                Reason
              </span>
              <p className="text-sm">{returnItem.reason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Impact Statement (AC 4) */}
      <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="text-amber-600 dark:text-amber-400 text-lg">
              &#9888;
            </div>
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Royalty Impact
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                Approving this return will reduce Author royalties by{" "}
                <span className="font-semibold">
                  $
                  {totalAmount.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Approval Actions (AC 5, 7) */}
      <ApprovalActions
        returnItem={returnItem}
        onApprove={onApprove}
        onReject={onReject}
        loading={loading}
      />
    </div>
  );
}
