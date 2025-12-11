"use client";

/**
 * Tax Information Display Component
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.9: Tax Information Display in Contact Detail
 *
 * Provides:
 * - Read-only display of tax information
 * - Masked TIN with show/hide toggle
 * - W-9 status indicator
 * - Tax completeness status badge
 * - Permission-gated visibility
 */

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Shield,
} from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { maskTIN } from "@/lib/tin-validation";

/**
 * Props for TaxInfoDisplay component
 */
interface TaxInfoDisplayProps {
  /** TIN type: ssn or ein */
  tinType: "ssn" | "ein" | null;
  /** Last 4 digits of TIN (from database) */
  tinLastFour: string | null;
  /** Whether contact is US-based */
  isUSBased: boolean;
  /** Whether W-9 has been received */
  w9Received: boolean;
  /** Date W-9 was received */
  w9ReceivedDate: Date | null;
  /** Whether user can view full TIN (VIEW_TAX_ID permission) */
  canViewTIN?: boolean;
}

/**
 * Tax Information Display Component
 *
 * Shows tax information in a read-only format with proper masking
 * and status indicators.
 */
export function TaxInfoDisplay({
  tinType,
  tinLastFour,
  isUSBased,
  w9Received,
  w9ReceivedDate,
  canViewTIN = false,
}: TaxInfoDisplayProps) {
  const [showTIN, setShowTIN] = useState(false);

  // Determine completeness status
  const hasTIN = tinType && tinLastFour;
  const isComplete = !isUSBased || (hasTIN && w9Received);
  const needsAttention = isUSBased && (!hasTIN || !w9Received);

  // Format the date for display
  const formatDate = (date: Date | null) => {
    if (!date) return null;
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get masked TIN display
  const getMaskedDisplay = () => {
    if (!tinLastFour || !tinType) return null;

    if (showTIN) {
      // When showing, display the mask pattern with last 4
      return maskTIN(tinLastFour, tinType);
    }
    // When hidden, show only dots
    return tinType === "ssn" ? "•••-••-••••" : "••-•••••••";
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-600" />
          <h4 className="font-medium text-sm">Tax Information</h4>
        </div>
        {/* Status Badge */}
        {isComplete ? (
          <Badge
            variant="outline"
            className="text-green-700 border-green-300 bg-green-50"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Badge>
        ) : needsAttention ? (
          <Badge
            variant="outline"
            className="text-amber-700 border-amber-300 bg-amber-50"
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            Incomplete
          </Badge>
        ) : null}
      </div>

      {/* US-Based Status */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">US-Based</span>
        <span>{isUSBased ? "Yes" : "No"}</span>
      </div>

      {/* TIN Section (only for US-based) */}
      {isUSBased && (
        <>
          {/* Permission warning if cannot view TIN */}
          {!canViewTIN && hasTIN && (
            <Alert className="bg-slate-50 border-slate-200 py-2">
              <Lock className="h-4 w-4 text-slate-500" />
              <AlertDescription className="text-slate-600 text-sm">
                TIN on file (access restricted)
              </AlertDescription>
            </Alert>
          )}

          {/* TIN Display (only if can view and has TIN) */}
          {canViewTIN && hasTIN && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {tinType === "ssn" ? "SSN" : "EIN"}
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono">{getMaskedDisplay()}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setShowTIN(!showTIN)}
                >
                  {showTIN ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="sr-only">
                    {showTIN ? "Hide" : "Show"} TIN
                  </span>
                </Button>
              </div>
            </div>
          )}

          {/* Missing TIN Warning */}
          {canViewTIN && !hasTIN && (
            <Alert className="bg-amber-50 border-amber-200 py-2">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                No TIN on file - required for 1099 reporting
              </AlertDescription>
            </Alert>
          )}

          {/* W-9 Status */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">W-9 Received</span>
            <div className="flex items-center gap-2">
              {w9Received ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-700">Yes</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-amber-700">No</span>
                </>
              )}
            </div>
          </div>

          {/* W-9 Date (if received) */}
          {w9Received && w9ReceivedDate && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">W-9 Date</span>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span>{formatDate(w9ReceivedDate)}</span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Non-US info */}
      {!isUSBased && (
        <p className="text-sm text-muted-foreground">
          Non-US contacts are not subject to 1099 reporting requirements.
        </p>
      )}
    </div>
  );
}
