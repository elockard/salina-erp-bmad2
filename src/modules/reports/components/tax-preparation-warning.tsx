"use client";

/**
 * Tax Preparation Missing TIN Warning Alert
 *
 * Displays warning when authors earning $10+ (royalty threshold) are missing Tax ID information.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.7: Missing TIN Warning System
 * - Warning Alert (shadcn Alert, variant="warning") when Missing TIN count > 0
 * - Message: "{count} author(s) earning $10+ are missing Tax ID information"
 * - Link to /contacts?role=author to address issues
 * - Alert positioned between filters and table
 */

import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TaxPreparationWarningProps {
  missingTinCount: number;
}

export function TaxPreparationWarning({
  missingTinCount,
}: TaxPreparationWarningProps) {
  // AC-11.2.7: Only show when Missing TIN count > 0
  if (missingTinCount === 0) {
    return null;
  }

  return (
    <Alert variant="destructive" data-testid="missing-tin-warning-alert">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Missing Tax Information</AlertTitle>
      <AlertDescription>
        {/* AC-11.2.7: Message format */}
        {missingTinCount} author{missingTinCount !== 1 ? "s" : ""} earning $10+{" "}
        {missingTinCount !== 1 ? "are" : "is"} missing Tax ID information.{" "}
        {/* AC-11.2.7: Link to /contacts?role=author */}
        <Link
          href="/contacts?role=author"
          className="font-medium underline underline-offset-4 hover:no-underline"
        >
          View contacts
        </Link>{" "}
        to address this issue.
      </AlertDescription>
    </Alert>
  );
}
