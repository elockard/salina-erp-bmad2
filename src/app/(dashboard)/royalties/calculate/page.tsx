"use client";

/**
 * Royalty Calculation Testing Page
 *
 * Manual trigger for royalty calculations to verify calculations before statement generation.
 * This is a DRY-RUN only - no database writes, no statement creation, no advance updates.
 *
 * Story 4.5: Build Manual Royalty Calculation Trigger (Testing)
 * AC 1: Page accessible at /royalties/calculate for Finance, Admin, or Owner roles
 * AC 8: Warning banner prominently displayed
 * AC 9, 10: Does NOT create statement or update advance_recouped (dry run only)
 */

import { AlertTriangle, Calculator, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { checkUserPermission } from "@/lib/auth-actions";
import { CALCULATE_ROYALTIES } from "@/lib/permissions";
import { CalculationResults } from "@/modules/royalties/components/calculation-results";
import { CalculationTestForm } from "@/modules/royalties/components/calculation-test-form";
import type { RoyaltyCalculation } from "@/modules/royalties/types";

export default function RoyaltyCalculatePage() {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [calculationResult, setCalculationResult] =
    useState<RoyaltyCalculation | null>(null);

  // Permission check on mount - AC 1
  useEffect(() => {
    async function checkPermission() {
      const permitted = await checkUserPermission(CALCULATE_ROYALTIES);
      if (!permitted) {
        router.replace("/dashboard");
        return;
      }
      setIsAuthorized(true);
    }
    checkPermission();
  }, [router]);

  // Handle calculation result from form
  const handleCalculationComplete = (result: RoyaltyCalculation) => {
    setCalculationResult(result);
  };

  // Handle clear/reset - AC 11
  const handleClear = () => {
    setCalculationResult(null);
  };

  // Show nothing while checking permissions
  if (isAuthorized === null) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">Dashboard</span>
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <Link
          href="/royalties"
          className="hover:text-foreground transition-colors"
        >
          Royalty Contracts
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Calculate</span>
      </nav>

      {/* Warning Banner - AC 8 */}
      <Alert
        variant="destructive"
        className="border-amber-500 bg-amber-50 dark:bg-amber-950/20"
      >
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-400">
          Test Calculation Only
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          This is a test calculation only. No statements created. No contract
          balances updated.
        </AlertDescription>
      </Alert>

      {/* Page Header - AC 1 */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Calculator className="h-6 w-6" />
          Royalty Calculation Testing
        </h1>
        <p className="text-muted-foreground">
          Verify royalty calculations before generating statements
        </p>
      </div>

      {/* Calculation Form - AC 2, 3 */}
      <CalculationTestForm onCalculationComplete={handleCalculationComplete} />

      {/* Results Display - AC 5, 6, 7, 11 */}
      {calculationResult && (
        <CalculationResults
          calculation={calculationResult}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
