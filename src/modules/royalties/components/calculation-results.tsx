"use client";

/**
 * Royalty Calculation Results Display
 *
 * Displays detailed breakdown of royalty calculation results.
 * Includes summary card, net sales table, tier breakdown, and JSON output.
 *
 * Story 4.5: Build Manual Royalty Calculation Trigger (Testing)
 * AC 5: Display summary card, net sales by format, tier-by-tier breakdown
 * AC 6: Contract details, formatted currency and percentages
 * AC 7: Collapsible JSON output section
 * AC 11: Clear/Reset functionality
 */

import { format } from "date-fns";
import { ChevronDown, ChevronUp, Code, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getContractById } from "../queries";
import type { ContractWithRelations, RoyaltyCalculation } from "../types";

interface CalculationResultsProps {
  calculation: RoyaltyCalculation;
  onClear: () => void;
}

/**
 * Format currency value as USD - AC 6
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format rate as percentage - AC 6
 */
function formatPercentage(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Format tier range for display
 */
function formatTierRange(min: number, max: number | null): string {
  if (max === null) {
    return `${min.toLocaleString()}+`;
  }
  return `${min.toLocaleString()}-${max.toLocaleString()}`;
}

export function CalculationResults({
  calculation,
  onClear,
}: CalculationResultsProps) {
  // JSON toggle state - AC 7
  const [jsonOpen, setJsonOpen] = useState(false);

  // Contract details for display - AC 6
  const [contract, setContract] = useState<ContractWithRelations | null>(null);

  // Load contract details on mount
  useEffect(() => {
    async function loadContract() {
      try {
        const result = await getContractById(calculation.contractId);
        setContract(result);
      } catch (error) {
        console.error("Failed to load contract details:", error);
      }
    }
    loadContract();
  }, [calculation.contractId]);

  // Format period dates - AC 6
  const periodDisplay = `${format(calculation.period.startDate, "MMM d, yyyy")} - ${format(calculation.period.endDate, "MMM d, yyyy")}`;

  return (
    <div className="space-y-6">
      {/* Results Header with Clear Button - AC 11 */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Calculation Results</h2>
        <Button variant="outline" onClick={onClear}>
          <X className="mr-2 h-4 w-4" />
          Clear Results
        </Button>
      </div>

      {/* Contract Details - AC 6 */}
      {contract && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Author:</span>{" "}
                <span className="font-medium">
                  {contract.author?.name ?? "Author"}
                </span>
              </div>
              <div className="text-muted-foreground">|</div>
              <div>
                <span className="text-muted-foreground">Title:</span>{" "}
                <span className="font-medium">{contract.title.title}</span>
              </div>
              <div className="text-muted-foreground">|</div>
              <div>
                <span className="text-muted-foreground">Period:</span>{" "}
                <span className="font-medium">{periodDisplay}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Card - AC 5 */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Royalty Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(calculation.totalRoyaltyEarned)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Advance Recoupment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(calculation.advanceRecoupment)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Net Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(calculation.netPayable)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advance Information - AC 5 */}
      {contract && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Advance Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 text-sm">
              <div>
                <span className="text-muted-foreground">Total Advance:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(parseFloat(contract.advance_amount || "0"))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Already Recouped:</span>{" "}
                <span className="font-medium">
                  {formatCurrency(parseFloat(contract.advance_recouped || "0"))}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">This Period:</span>{" "}
                <span className="font-medium text-amber-600">
                  {formatCurrency(calculation.advanceRecoupment)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Net Sales by Format Table - AC 5 */}
      {calculation.formatCalculations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Net Sales by Format</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right">Gross Qty</TableHead>
                  <TableHead className="text-right">Returns</TableHead>
                  <TableHead className="text-right">Net Qty</TableHead>
                  <TableHead className="text-right">Net Revenue</TableHead>
                  <TableHead className="text-right">Royalty</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculation.formatCalculations.map((fc) => (
                  <TableRow key={fc.format}>
                    <TableCell className="font-medium capitalize">
                      {fc.format}
                    </TableCell>
                    <TableCell className="text-right">
                      {fc.netSales.grossQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {fc.netSales.returnsQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {fc.netSales.netQuantity.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(fc.netSales.netRevenue)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(fc.formatRoyalty)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tier Breakdown per Format - AC 5 */}
      {calculation.formatCalculations.map(
        (fc) =>
          fc.tierBreakdowns.length > 0 && (
            <Card key={`tier-${fc.format}`}>
              <CardHeader>
                <CardTitle className="text-base capitalize">
                  Tier Breakdown: {fc.format}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier Range</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">
                        Units Applied
                      </TableHead>
                      <TableHead className="text-right">
                        Royalty Amount
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fc.tierBreakdowns.map((tier, idx) => (
                      <TableRow key={`${fc.format}-tier-${idx}`}>
                        <TableCell>
                          {formatTierRange(tier.minQuantity, tier.maxQuantity)}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPercentage(tier.rate)}
                        </TableCell>
                        <TableCell className="text-right">
                          {tier.unitsApplied.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(tier.royaltyAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ),
      )}

      {/* Collapsible JSON Output - AC 7 */}
      <Card>
        <Collapsible open={jsonOpen} onOpenChange={setJsonOpen}>
          <CardHeader className="pb-3">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto"
              >
                <CardTitle className="text-base flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Raw JSON Output
                </CardTitle>
                {jsonOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="pt-0">
              <pre className="p-4 bg-muted rounded-md overflow-auto text-xs max-h-96">
                <code>{JSON.stringify(calculation, null, 2)}</code>
              </pre>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
