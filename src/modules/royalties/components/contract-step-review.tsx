"use client";

/**
 * Contract Step 5: Review & Create
 *
 * Summary display of all configured contract details before submission.
 * Shows tiers by format, advance information, and author/title confirmation.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * AC 5: Display summary of all tiers by format, advance info, author/title confirmation
 */

import { AlertCircle, BookOpen, DollarSign, User } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface TierData {
  min_quantity: number;
  max_quantity: number | null;
  rate: number;
}

const STATUS_LABELS: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  active: { label: "Active", variant: "default" },
  suspended: { label: "Suspended", variant: "secondary" },
  terminated: { label: "Terminated", variant: "destructive" },
};

const FORMAT_LABELS: Record<string, string> = {
  physical: "Physical Book",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

export function ContractStepReview() {
  const { watch } = useFormContext();

  const authorName = watch("author_name");
  const titleName = watch("title_name");
  const status = watch("status") as string;
  const advanceAmount = watch("advance_amount") as string;
  const advancePaid = watch("advance_paid") as string;

  const physicalEnabled = watch("physical_enabled") as boolean;
  const ebookEnabled = watch("ebook_enabled") as boolean;
  const audiobookEnabled = watch("audiobook_enabled") as boolean;

  const physicalTiers = watch("physical_tiers") as TierData[];
  const ebookTiers = watch("ebook_tiers") as TierData[];
  const audiobookTiers = watch("audiobook_tiers") as TierData[];

  // Format currency for display
  const formatCurrency = (amount: string): string => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format rate as percentage
  const formatRate = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  // Format quantity range
  const formatRange = (min: number, max: number | null): string => {
    if (max === null) {
      return `${min.toLocaleString()}+`;
    }
    return `${min.toLocaleString()} - ${max.toLocaleString()}`;
  };

  // Check if contract has any tiers configured
  const hasAnyTiers =
    (physicalEnabled && physicalTiers.length > 0) ||
    (ebookEnabled && ebookTiers.length > 0) ||
    (audiobookEnabled && audiobookTiers.length > 0);

  // Render tier table for a format
  const renderTierTable = (
    format: string,
    tiers: TierData[],
    enabled: boolean,
  ) => {
    if (!enabled || tiers.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="font-medium text-sm flex items-center gap-2">
          <Badge variant="outline">{FORMAT_LABELS[format]}</Badge>
          <span className="text-muted-foreground">
            ({tiers.length} tier{tiers.length !== 1 ? "s" : ""})
          </span>
        </h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Tier</TableHead>
              <TableHead>Units Sold</TableHead>
              <TableHead className="text-right">Royalty Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier, index) => (
              <TableRow key={`tier-${tier.min_quantity}-${tier.rate}`}>
                <TableCell className="font-medium">Tier {index + 1}</TableCell>
                <TableCell>
                  {formatRange(tier.min_quantity, tier.max_quantity)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatRate(tier.rate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  const statusInfo = STATUS_LABELS[status] || STATUS_LABELS.active;

  return (
    <div className="space-y-6">
      {/* Summary header */}
      <div className="text-center pb-4">
        <h3 className="text-lg font-semibold">Review Contract Details</h3>
        <p className="text-sm text-muted-foreground">
          Please review all details before creating the contract
        </p>
      </div>

      {/* Warning if no tiers */}
      {!hasAnyTiers && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Royalty Tiers Configured</AlertTitle>
          <AlertDescription>
            You must configure at least one format with royalty tiers before
            creating the contract. Go back to configure Physical, Ebook, or
            Audiobook tiers.
          </AlertDescription>
        </Alert>
      )}

      {/* Author & Title (AC 5) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" />
            Contract Parties
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Author</p>
              <p className="font-medium">{authorName || "Not selected"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Title</p>
              <p className="font-medium">{titleName || "Not selected"}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-sm text-muted-foreground">Contract Status</p>
            <Badge variant={statusInfo.variant} className="mt-1">
              {statusInfo.label}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Advance Information (AC 5) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            Advance Payment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Advance Amount</p>
              <p className="text-xl font-semibold">
                {formatCurrency(advanceAmount)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Already Paid</p>
              <p className="text-xl font-semibold">
                {formatCurrency(advancePaid)}
              </p>
            </div>
          </div>
          {parseFloat(advanceAmount || "0") > 0 && (
            <div className="mt-4 p-3 bg-muted/50 rounded-md">
              <p className="text-sm text-muted-foreground">
                Remaining advance:{" "}
                <span className="font-medium text-foreground">
                  {formatCurrency(
                    String(
                      parseFloat(advanceAmount || "0") -
                        parseFloat(advancePaid || "0"),
                    ),
                  )}
                </span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                This amount will be recouped from future royalty earnings
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Royalty Tiers by Format (AC 5) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Royalty Tiers
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {renderTierTable("physical", physicalTiers, physicalEnabled)}
          {renderTierTable("ebook", ebookTiers, ebookEnabled)}
          {renderTierTable("audiobook", audiobookTiers, audiobookEnabled)}

          {!hasAnyTiers && (
            <p className="text-center text-muted-foreground py-4">
              No royalty tiers configured
            </p>
          )}
        </CardContent>
      </Card>

      {/* Final confirmation */}
      {hasAnyTiers && (
        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
          <p className="text-sm text-green-800 dark:text-green-200">
            <strong>Ready to create contract.</strong> Click "Create Contract"
            below to finalize this royalty agreement.
          </p>
        </div>
      )}
    </div>
  );
}
