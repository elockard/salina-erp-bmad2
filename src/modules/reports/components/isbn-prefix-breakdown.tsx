"use client";

/**
 * ISBN Prefix Breakdown Component
 *
 * Displays ISBN pool breakdown by prefix (or legacy).
 *
 * Story: 7.4 - Implement Publisher ISBN Prefix System
 * AC-7.4.7: ISBN pool report includes prefix breakdown
 */

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
export interface PrefixBreakdownItem {
  id: string | null;
  prefix: string | null;
  formattedPrefix: string;
  totalIsbns: number;
  availableCount: number;
  assignedCount: number;
  utilizationPercentage: number;
}

interface ISBNPrefixBreakdownProps {
  breakdown: PrefixBreakdownItem[];
}

export function ISBNPrefixBreakdown({ breakdown }: ISBNPrefixBreakdownProps) {
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <Card data-testid="isbn-prefix-breakdown">
      <CardHeader>
        <CardTitle className="text-base">ISBN Pool by Prefix</CardTitle>
        <CardDescription>
          Utilization breakdown by registered prefix
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {breakdown.map((item) => (
            <div
              key={item.id ?? "legacy"}
              className="flex items-center gap-4"
              data-testid={`prefix-row-${item.id ?? "legacy"}`}
            >
              {/* Prefix name or Legacy badge */}
              <div className="w-32 shrink-0">
                {item.id ? (
                  <span className="font-mono text-sm">
                    {item.formattedPrefix}
                  </span>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-amber-500 bg-amber-50 text-amber-700"
                  >
                    Legacy
                  </Badge>
                )}
              </div>

              {/* Story 7.6: Removed Type badge - ISBNs are unified */}

              {/* Utilization bar */}
              <div className="flex-1">
                <Progress value={item.utilizationPercentage} className="h-2" />
              </div>

              {/* Stats */}
              <div className="w-32 text-right text-sm">
                <span className="font-medium">{item.assignedCount}</span>
                <span className="text-muted-foreground">
                  {" "}
                  / {item.totalIsbns}
                </span>
              </div>

              {/* Percentage */}
              <div className="w-12 text-right text-sm font-medium">
                {item.utilizationPercentage}%
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
