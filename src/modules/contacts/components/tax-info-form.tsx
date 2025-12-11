"use client";

/**
 * Tax Information Form Component
 *
 * Story 11.1 - Collect and Validate Tax Identification Information
 * AC-11.1.5: Tax Information Form Section UI
 *
 * Provides:
 * - TIN type selection (SSN/EIN)
 * - Masked TIN input with auto-formatting
 * - US-based checkbox
 * - W-9 received tracking with date
 * - Real-time format validation
 * - Permission-gated visibility
 */

import { AlertCircle, Calendar, Eye, EyeOff, Lock, Shield } from "lucide-react";
import { useCallback, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatEIN,
  formatSSN,
  validateEIN,
  validateSSN,
} from "@/lib/tin-validation";
import { cn } from "@/lib/utils";
import type { TinTypeInput } from "../schema";

/**
 * Tax info form data structure
 */
export interface TaxInfoFormData {
  tin_type: TinTypeInput | "";
  tin: string;
  is_us_based: boolean;
  w9_received: boolean;
  w9_received_date: string | null;
}

/**
 * Props for TaxInfoForm component
 */
interface TaxInfoFormProps {
  /** Current form values */
  value: TaxInfoFormData;
  /** Callback when values change */
  onChange: (data: TaxInfoFormData) => void;
  /** Whether to show the TIN value (requires VIEW_TAX_ID permission) */
  canViewTIN?: boolean;
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Whether to show validation errors */
  showErrors?: boolean;
  /** Optional existing TIN last 4 digits for display */
  existingTINLastFour?: string | null;
  /** Whether this is an existing contact with TIN already saved */
  hasExistingTIN?: boolean;
}

/**
 * Tax Information Form Section
 *
 * Renders form fields for collecting tax identification information.
 * Supports SSN (XXX-XX-XXXX) and EIN (XX-XXXXXXX) formats with auto-formatting.
 */
export function TaxInfoForm({
  value,
  onChange,
  canViewTIN = false,
  disabled = false,
  showErrors = true,
  existingTINLastFour,
  hasExistingTIN = false,
}: TaxInfoFormProps) {
  const [showTIN, setShowTIN] = useState(false);
  const [tinError, setTinError] = useState<string | null>(null);

  // Handle TIN type change
  const handleTINTypeChange = useCallback(
    (newType: string) => {
      const tinType = newType as TinTypeInput | "";
      onChange({
        ...value,
        tin_type: tinType,
        tin: "", // Clear TIN when type changes
      });
      setTinError(null);
    },
    [value, onChange],
  );

  // Handle TIN input with auto-formatting
  const handleTINChange = useCallback(
    (inputValue: string) => {
      let formatted = inputValue;
      let error: string | null = null;

      if (value.tin_type === "ssn") {
        formatted = formatSSN(inputValue);
        // Only validate when we have a complete input
        if (formatted.length === 11 && !validateSSN(formatted)) {
          error = "Invalid SSN format. Use XXX-XX-XXXX";
        }
      } else if (value.tin_type === "ein") {
        formatted = formatEIN(inputValue);
        // Only validate when we have a complete input
        if (formatted.length === 10 && !validateEIN(formatted)) {
          error = "Invalid EIN format. Use XX-XXXXXXX";
        }
      }

      setTinError(error);
      onChange({
        ...value,
        tin: formatted,
      });
    },
    [value, onChange],
  );

  // Handle US-based toggle
  const handleUSBasedChange = useCallback(
    (checked: boolean) => {
      onChange({
        ...value,
        is_us_based: checked,
        // Clear W-9 info if not US-based
        w9_received: checked ? value.w9_received : false,
        w9_received_date: checked ? value.w9_received_date : null,
      });
    },
    [value, onChange],
  );

  // Handle W-9 received toggle
  const handleW9ReceivedChange = useCallback(
    (checked: boolean) => {
      onChange({
        ...value,
        w9_received: checked,
        w9_received_date: checked
          ? value.w9_received_date || new Date().toISOString().split("T")[0]
          : null,
      });
    },
    [value, onChange],
  );

  // Handle W-9 date change
  const handleW9DateChange = useCallback(
    (date: string) => {
      onChange({
        ...value,
        w9_received_date: date || null,
      });
    },
    [value, onChange],
  );

  // Get masked display value for TIN
  const getMaskedTIN = () => {
    if (!value.tin) return "";
    if (showTIN) return value.tin;

    if (value.tin_type === "ssn") {
      return `***-**-${value.tin.slice(-4)}`;
    }
    if (value.tin_type === "ein") {
      return `**-***${value.tin.slice(-4)}`;
    }
    return value.tin;
  };

  // Get placeholder based on TIN type
  const getPlaceholder = () => {
    if (value.tin_type === "ssn") return "XXX-XX-XXXX";
    if (value.tin_type === "ein") return "XX-XXXXXXX";
    return "Select TIN type first";
  };

  // Calculate max length based on TIN type
  const getMaxLength = () => {
    if (value.tin_type === "ssn") return 11; // XXX-XX-XXXX
    if (value.tin_type === "ein") return 10; // XX-XXXXXXX
    return 0;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Shield className="h-4 w-4 text-blue-600" />
        <h4 className="font-medium text-sm">Tax Information</h4>
        <Badge variant="outline" className="text-xs">
          1099 Reporting
        </Badge>
      </div>

      {/* US-Based Checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="is-us-based"
          checked={value.is_us_based}
          onCheckedChange={handleUSBasedChange}
          disabled={disabled}
        />
        <Label htmlFor="is-us-based" className="text-sm font-normal">
          US-based (subject to 1099 reporting)
        </Label>
      </div>

      {/* TIN fields only shown for US-based contacts */}
      {value.is_us_based && (
        <>
          {/* Permission warning if cannot view TIN */}
          {!canViewTIN && (
            <Alert className="bg-amber-50 border-amber-200">
              <Lock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                You don&apos;t have permission to view or edit tax
                identification numbers.
              </AlertDescription>
            </Alert>
          )}

          {/* TIN Type and Value (only if can view) */}
          {canViewTIN && (
            <div className="grid grid-cols-3 gap-4">
              {/* TIN Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="tin-type">TIN Type</Label>
                <Select
                  value={value.tin_type}
                  onValueChange={handleTINTypeChange}
                  disabled={disabled}
                >
                  <SelectTrigger id="tin-type">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ssn">SSN (Individual)</SelectItem>
                    <SelectItem value="ein">EIN (Business)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* TIN Input */}
              <div className="col-span-2 space-y-2">
                <Label htmlFor="tin-value">
                  {value.tin_type === "ssn"
                    ? "Social Security Number"
                    : value.tin_type === "ein"
                      ? "Employer Identification Number"
                      : "Tax ID Number"}
                </Label>
                <div className="relative">
                  <Input
                    id="tin-value"
                    type={showTIN ? "text" : "password"}
                    value={showTIN ? value.tin : getMaskedTIN()}
                    onChange={(e) => handleTINChange(e.target.value)}
                    placeholder={getPlaceholder()}
                    maxLength={getMaxLength()}
                    disabled={disabled || !value.tin_type}
                    className={cn(
                      "pr-10 font-mono",
                      tinError &&
                        showErrors &&
                        "border-red-500 focus-visible:ring-red-500",
                    )}
                    autoComplete="off"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowTIN(!showTIN)}
                    disabled={disabled || !value.tin_type}
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
                {/* Validation error */}
                {tinError && showErrors && (
                  <p className="text-sm text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {tinError}
                  </p>
                )}
                {/* Existing TIN indicator */}
                {hasExistingTIN && existingTINLastFour && !value.tin && (
                  <p className="text-sm text-muted-foreground">
                    Current TIN on file: ***-**-{existingTINLastFour}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* W-9 Section */}
          <div className="space-y-3 pt-2 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="w9-received"
                checked={value.w9_received}
                onCheckedChange={handleW9ReceivedChange}
                disabled={disabled}
              />
              <Label htmlFor="w9-received" className="text-sm font-normal">
                W-9 form received
              </Label>
            </div>

            {/* W-9 Date (only if W-9 received) */}
            {value.w9_received && (
              <div className="space-y-2 pl-6">
                <Label htmlFor="w9-date" className="text-sm">
                  W-9 Received Date
                </Label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    id="w9-date"
                    type="date"
                    value={value.w9_received_date || ""}
                    onChange={(e) => handleW9DateChange(e.target.value)}
                    disabled={disabled}
                    className="w-auto"
                  />
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Non-US contact info */}
      {!value.is_us_based && (
        <p className="text-sm text-muted-foreground pl-6">
          Non-US contacts are not subject to 1099 reporting requirements.
        </p>
      )}
    </div>
  );
}

/**
 * Default/initial tax info form data
 */
export const defaultTaxInfoFormData: TaxInfoFormData = {
  tin_type: "",
  tin: "",
  is_us_based: true,
  w9_received: false,
  w9_received_date: null,
};
