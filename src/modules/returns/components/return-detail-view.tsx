"use client";

/**
 * Return Detail View Component
 *
 * Displays full return information on detail page.
 * Story 3.7: AC 10 (Return detail page)
 *
 * Content:
 * - Status badge prominently displayed
 * - Return Information card: Title, Format, Quantity, Amount, Date, Reason
 * - Submission metadata: "Submitted by [User] on [Date]"
 * - Review metadata (if approved/rejected): "Reviewed by [User] on [Date]"
 * - Rejection reason displayed (if rejected)
 * - Back to Returns History link
 */

import { format } from "date-fns";
import { ArrowLeft, Calendar, Package, Tag, User } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ReturnWithRelations } from "../types";
import { StatusBadge } from "./status-badge";

interface ReturnDetailViewProps {
  returnData: ReturnWithRelations;
}

/**
 * Format currency for display (negative for returns)
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "-$0.00";
  return `-${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num)}`;
}

/**
 * Format badge for format display
 */
function FormatBadge({ format: formatValue }: { format: string }) {
  const labels: Record<string, string> = {
    physical: "Physical Book",
    ebook: "Ebook",
    audiobook: "Audiobook",
  };
  return (
    <Badge variant="outline" className="font-medium">
      {labels[formatValue] || formatValue}
    </Badge>
  );
}

export function ReturnDetailView({ returnData }: ReturnDetailViewProps) {
  return (
    <div className="space-y-6">
      {/* Back Link */}
      <Button variant="ghost" asChild className="-ml-4">
        <Link href="/returns">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Returns History
        </Link>
      </Button>

      {/* Status Badge - Prominently displayed */}
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Return Details</h1>
        <StatusBadge status={returnData.status} className="text-sm px-3 py-1" />
      </div>

      {/* Return Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Return Information
          </CardTitle>
          <CardDescription>Details of the return request</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title Information */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Title</p>
              <Link
                href={`/titles/${returnData.title.id}`}
                className="text-primary hover:underline font-medium"
              >
                {returnData.title.title}
              </Link>
              <p className="text-sm text-muted-foreground">
                by {returnData.title.author_name}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Format
              </p>
              <FormatBadge format={returnData.format} />
            </div>
          </div>

          <Separator />

          {/* Financial Information */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Quantity
              </p>
              <p className="text-lg font-bold text-destructive">
                -{returnData.quantity}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Unit Price
              </p>
              <p className="text-lg">
                ${parseFloat(returnData.unit_price).toFixed(2)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">
                Total Amount
              </p>
              <p className="text-lg font-bold text-destructive">
                {formatCurrency(returnData.total_amount)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Date and Reason */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Return Date
              </p>
              <p className="font-medium">
                {format(new Date(returnData.return_date), "MMMM d, yyyy")}
              </p>
            </div>

            {returnData.reason && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Reason
                </p>
                <p className="font-medium">{returnData.reason}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Submission and Review Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Audit Trail
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Submission Metadata */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Submitted by</span>
            <span className="font-medium">{returnData.createdBy.name}</span>
            <span className="text-muted-foreground">on</span>
            <span className="font-medium">
              {format(
                new Date(returnData.created_at),
                "MMMM d, yyyy 'at' h:mm a",
              )}
            </span>
          </div>

          {/* Review Metadata (if approved/rejected) */}
          {returnData.reviewedBy && returnData.reviewed_at && (
            <>
              <Separator />
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">
                  {returnData.status === "approved" ? "Approved" : "Rejected"}{" "}
                  by
                </span>
                <span className="font-medium">
                  {returnData.reviewedBy.name}
                </span>
                <span className="text-muted-foreground">on</span>
                <span className="font-medium">
                  {format(
                    new Date(returnData.reviewed_at),
                    "MMMM d, yyyy 'at' h:mm a",
                  )}
                </span>
              </div>
            </>
          )}

          {/* Rejection reason notice */}
          {returnData.status === "rejected" && (
            <div className="mt-4 p-4 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-medium text-destructive">
                This return was rejected and will not affect royalty
                calculations.
              </p>
            </div>
          )}

          {/* Pending notice */}
          {returnData.status === "pending" && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                This return is awaiting Finance approval.
              </p>
            </div>
          )}

          {/* Approved notice */}
          {returnData.status === "approved" && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                This return has been approved and will be reflected in royalty
                calculations.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
