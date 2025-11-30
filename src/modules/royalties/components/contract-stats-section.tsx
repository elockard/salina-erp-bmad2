"use client";

/**
 * Contract Stats Section Component
 *
 * Displays contract statistics and related data.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 5: Related Data section displays contract statistics
 * - Royalty statements count linked to this contract
 * - Link to view statements filtered by this contract (future)
 * - Total lifetime royalties earned
 * - Total lifetime sales units
 * - Note: "No statements generated yet" if empty
 *
 * NOTE: Statements table will be created in Epic 5.
 * For now, this component shows empty state since no statements exist.
 */

import { BarChart3, FileText, TrendingUp, Package } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ContractStatsSectionProps {
  contractId: string;
}

export function ContractStatsSection({ contractId }: ContractStatsSectionProps) {
  // TODO: Epic 5 will add the statements table and queries
  // For now, show empty state per AC 5
  const statementCount = 0;
  const lifetimeRoyalties = "0";
  const lifetimeSales = 0;
  const hasStatements = statementCount > 0;

  /**
   * Format currency for display
   */
  const formatCurrency = (amount: string): string => {
    const num = parseFloat(amount || "0");
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Contract Statistics
        </CardTitle>
        <CardDescription>
          Royalty statement history and lifetime earnings
        </CardDescription>
      </CardHeader>
      <CardContent>
        {hasStatements ? (
          <div className="grid gap-4">
            {/* Statement Count */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Royalty Statements</span>
              </div>
              <span className="font-medium">{statementCount}</span>
            </div>

            {/* Lifetime Royalties */}
            <div className="flex items-center justify-between py-2 border-b">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Lifetime Royalties</span>
              </div>
              <span className="font-medium">{formatCurrency(lifetimeRoyalties)}</span>
            </div>

            {/* Lifetime Sales */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Total Lifetime Sales</span>
              </div>
              <span className="font-medium">{lifetimeSales.toLocaleString()} units</span>
            </div>

            {/* Link to statements (placeholder for future) */}
            <div className="pt-2">
              <span className="text-sm text-muted-foreground">
                View statements for this contract (coming soon)
              </span>
            </div>
          </div>
        ) : (
          /* Empty State - AC 5 */
          <div className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No statements generated yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Royalty statements will appear here once generated
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
