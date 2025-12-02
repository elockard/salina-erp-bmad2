"use client";

/**
 * Statement Wizard Step 4: Generate & Send
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * AC-5.3.5: Submit enqueues Inngest job for background processing
 *
 * Features:
 * - Confirmation summary (period, author count, total net payable)
 * - Delivery options checkboxes
 * - Final "Generate Statements" button (handled by parent)
 */

import { format } from "date-fns";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Mail,
  Users,
} from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PreviewCalculation } from "../types";
import type { WizardFormData } from "./statement-wizard-modal";

interface StatementStepGenerateProps {
  periodStart: Date;
  periodEnd: Date;
  authorCount: number;
  previewData: PreviewCalculation[];
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

export function StatementStepGenerate({
  periodStart,
  periodEnd,
  authorCount,
  previewData,
}: StatementStepGenerateProps) {
  const { watch, setValue } = useFormContext<WizardFormData>();
  const sendEmail = watch("sendEmail");
  const exportCsv = watch("exportCsv");

  // Calculate totals from preview data
  const totalNetPayable = previewData.reduce(
    (sum, row) => sum + row.netPayable,
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Confirm & Generate</h3>
        <p className="text-sm text-muted-foreground">
          Review your selections and generate statements
        </p>
      </div>

      {/* Confirmation Summary */}
      <div className="bg-muted rounded-lg p-6 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          Summary
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Period */}
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Period</p>
              <p className="font-medium">
                {format(periodStart, "MMM d, yyyy")} -{" "}
                {format(periodEnd, "MMM d, yyyy")}
              </p>
            </div>
          </div>

          {/* Author Count */}
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Authors</p>
              <p className="font-medium">
                {authorCount} author{authorCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Total Net Payable */}
          <div className="flex items-start gap-3 p-3 bg-background rounded-lg">
            <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Total Net Payable</p>
              <p className="font-medium">{formatCurrency(totalNetPayable)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Options (AC-5.3.5) */}
      <div className="space-y-4">
        <h4 className="font-medium">Delivery Options</h4>

        <div className="space-y-3">
          {/* Email PDF statements (default on) */}
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id="send-email"
              checked={sendEmail}
              onCheckedChange={(checked) =>
                setValue("sendEmail", checked as boolean)
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="send-email"
                className="cursor-pointer font-medium flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email PDF statements to authors
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Statements will be emailed to each author's registered email
                address
              </p>
            </div>
          </div>

          {/* Author portal access (always on, disabled) */}
          <div className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30">
            <Checkbox id="portal-access" checked={true} disabled />
            <div className="flex-1">
              <Label
                htmlFor="portal-access"
                className="cursor-pointer font-medium flex items-center gap-2 text-muted-foreground"
              >
                <FileText className="h-4 w-4" />
                Make available in author portal
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Statements will always be accessible in the author portal
              </p>
            </div>
          </div>

          {/* Export CSV (optional) */}
          <div className="flex items-start gap-3 p-3 border rounded-lg">
            <Checkbox
              id="export-csv"
              checked={exportCsv}
              onCheckedChange={(checked) =>
                setValue("exportCsv", checked as boolean)
              }
            />
            <div className="flex-1">
              <Label
                htmlFor="export-csv"
                className="cursor-pointer font-medium flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export CSV summary
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Download a CSV file with statement summary data
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Info Note */}
      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Note:</strong> Statement generation runs in the background.
          You can close this dialog and continue working - you'll be notified
          when generation is complete.
        </p>
      </div>
    </div>
  );
}
