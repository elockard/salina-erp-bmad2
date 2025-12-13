"use client";

/**
 * ONIX Validation Results Display Component
 *
 * Story: 14.2 - Implement ONIX Schema Validation
 * Task 6: Build validation UI
 *
 * AC: 3 - User sees clear error messages with field paths
 * AC: 4 - User can fix errors and re-validate without re-generating
 *
 * Displays validation results with field-level errors and re-validate option.
 */

import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ValidationError, ValidationResult } from "../types";

interface ValidationResultsDisplayProps {
  result: ValidationResult;
  onRevalidate?: () => void;
  isLoading?: boolean;
}

/**
 * Single validation error card
 */
function ValidationErrorCard({ error }: { error: ValidationError }) {
  return (
    <div className="rounded-md border p-3 text-sm space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
        <span className="font-medium">{error.message}</span>
        <Badge variant="secondary" className="text-xs font-mono">
          {error.code}
        </Badge>
        {error.codelistRef && (
          <Badge variant="outline" className="text-xs">
            {error.codelistRef}
          </Badge>
        )}
      </div>
      <div className="pl-6 space-y-1 text-muted-foreground">
        <div className="font-mono text-xs">{error.path}</div>
        {error.expected && (
          <div>
            Expected:{" "}
            <span className="text-green-600 font-mono">{error.expected}</span>
          </div>
        )}
        {error.actual && (
          <div>
            Actual:{" "}
            <span className="text-red-600 font-mono">{error.actual}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Validation Results Display
 *
 * Shows validation status, errors grouped by type, and re-validate option.
 */
export function ValidationResultsDisplay({
  result,
  onRevalidate,
  isLoading = false,
}: ValidationResultsDisplayProps) {
  // Loading state
  if (isLoading) {
    return (
      <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Validating...
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Checking ONIX message against schema and business rules.
        </AlertDescription>
      </Alert>
    );
  }

  // Valid state
  if (result.valid) {
    return (
      <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Validation Passed
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          ONIX message is valid and ready for export.
        </AlertDescription>
      </Alert>
    );
  }

  // Invalid state - group errors by type
  const schemaErrors = result.errors.filter((e) => e.type === "schema");
  const businessErrors = result.errors.filter((e) => e.type === "business");

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertTitle className="flex items-center justify-between">
          <span>Validation Failed</span>
          {onRevalidate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRevalidate}
              disabled={isLoading}
              className="ml-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Re-validate
            </Button>
          )}
        </AlertTitle>
        <AlertDescription>
          {result.errors.length} error{result.errors.length === 1 ? "" : "s"}{" "}
          found. Fix issues and re-validate before export.
        </AlertDescription>
      </Alert>

      {schemaErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            Schema Errors
            <Badge variant="destructive" className="text-xs">
              {schemaErrors.length}
            </Badge>
          </h4>
          {schemaErrors.map((error, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static error list
            <ValidationErrorCard key={`schema-${i}`} error={error} />
          ))}
        </div>
      )}

      {businessErrors.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-sm flex items-center gap-2">
            Business Rule Errors
            <Badge variant="secondary" className="text-xs">
              {businessErrors.length}
            </Badge>
          </h4>
          {businessErrors.map((error, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: Static error list
            <ValidationErrorCard key={`business-${i}`} error={error} />
          ))}
        </div>
      )}
    </div>
  );
}
