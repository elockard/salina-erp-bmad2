"use client";

/**
 * Contract Projection Section Component
 *
 * Displays royalty projections for lifetime-mode contracts.
 * Story 10.4: Implement Escalating Lifetime Royalty Rates
 *
 * AC-10.4.7: Royalty Projection
 * - Finance users can view royalty projection based on current sales trajectory
 * - Show estimated tier crossover date based on recent sales velocity
 * - Display projected annual royalty at current rate vs escalated rate
 */

import { ArrowUp, Calendar, TrendingUp } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type {
  AnnualRoyaltyProjection,
  SalesVelocity,
  TierCrossoverProjection,
} from "../types";

interface ContractProjectionSectionProps {
  velocity: SalesVelocity;
  tierCrossovers: Map<string, TierCrossoverProjection>;
  annualProjection: AnnualRoyaltyProjection;
  warnings: string[];
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format rate as percentage
 */
function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
  }).format(date);
}

export function ContractProjectionSection({
  velocity,
  tierCrossovers,
  annualProjection,
  warnings,
}: ContractProjectionSectionProps) {
  // Convert Map to array for iteration
  const crossoverEntries = Array.from(tierCrossovers.entries());

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Royalty Projection</h2>
        <Badge variant="secondary" className="flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Based on {velocity.monthsAnalyzed}-month velocity
        </Badge>
      </div>

      {warnings.length > 0 && (
        <Alert variant="destructive">
          <AlertDescription>
            {warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Sales Velocity Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sales Velocity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {velocity.unitsPerMonth.toFixed(0)} units/month
            </div>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(velocity.revenuePerMonth)}/month revenue
            </p>
          </CardContent>
        </Card>

        {/* Annual Projection Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Projected Annual Royalty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {formatCurrency(annualProjection.royaltyWithEscalation)}
              </span>
              {annualProjection.escalationBenefit > 0 && (
                <Badge variant="default" className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />+
                  {formatCurrency(annualProjection.escalationBenefit)}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              vs {formatCurrency(annualProjection.royaltyAtCurrentRate)} at{" "}
              {formatRate(annualProjection.currentRate)} fixed rate
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {annualProjection.projectedAnnualUnits.toFixed(0)} units,{" "}
              {formatCurrency(annualProjection.projectedAnnualRevenue)} revenue
            </p>
          </CardContent>
        </Card>

        {/* Tier Crossover Card - show first format's projection */}
        {crossoverEntries.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Next Tier Crossover
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                // Show the first format's crossover data
                const [, crossover] = crossoverEntries[0];
                if (crossover.unitsToNextTier === null) {
                  return (
                    <div className="space-y-2">
                      <Badge variant="default">Highest Tier Reached</Badge>
                      <p className="text-sm text-muted-foreground">
                        Currently earning{" "}
                        {formatRate(crossover.currentTier.rate)}
                      </p>
                    </div>
                  );
                }

                const progressPercent =
                  crossover.nextTierThreshold !== null
                    ? Math.min(
                        100,
                        (crossover.currentLifetimeSales /
                          crossover.nextTierThreshold) *
                          100,
                      )
                    : 100;

                return (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>
                          {crossover.currentLifetimeSales.toLocaleString()}{" "}
                          units
                        </span>
                        <span>
                          {crossover.nextTierThreshold?.toLocaleString()} units
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {crossover.unitsToNextTier.toLocaleString()} units to
                        next tier
                      </p>
                    </div>

                    {crossover.estimatedCrossoverDate && (
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium">
                          Est. {formatDate(crossover.estimatedCrossoverDate)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ~{crossover.monthsToNextTier} months at current
                          velocity
                        </p>
                      </div>
                    )}

                    {!crossover.estimatedCrossoverDate &&
                      velocity.unitsPerMonth === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Unable to estimate - no recent sales
                        </p>
                      )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Escalation Benefit Callout */}
      {annualProjection.wouldCrossoverInYear &&
        annualProjection.escalationBenefit > 0 && (
          <Alert className="bg-green-50 border-green-200">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Projected to earn{" "}
              <strong>
                {formatCurrency(annualProjection.escalationBenefit)}
              </strong>{" "}
              more this year due to tier escalation!
            </AlertDescription>
          </Alert>
        )}
    </div>
  );
}
