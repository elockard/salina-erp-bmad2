"use client";

/**
 * Contract Tiers Section Component
 *
 * Displays royalty rate tables grouped by format.
 * Story 4.3: Build Contract Detail View and Management
 *
 * AC 4: Royalty Rate Tables display by format
 * - Separate card/section for each format (Physical, Ebook, Audiobook)
 * - Table columns: Tier | Range | Royalty Rate
 * - Format sections only shown if contract has tiers for that format
 */

import { BookOpen, Headphones, Info, Tablet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { TierCalculationMode } from "@/db/schema/contracts";
import type { ContractTier } from "../types";

interface ContractTiersSectionProps {
  tiers: ContractTier[];
  tierCalculationMode?: TierCalculationMode;
}

/**
 * Format metadata for each tier type
 */
const FORMAT_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; description: string }
> = {
  physical: {
    label: "Physical Book Royalty Rates",
    icon: BookOpen,
    description: "Royalty rates for physical book sales",
  },
  ebook: {
    label: "Ebook Royalty Rates",
    icon: Tablet,
    description: "Royalty rates for digital ebook sales",
  },
  audiobook: {
    label: "Audiobook Royalty Rates",
    icon: Headphones,
    description: "Royalty rates for audiobook sales",
  },
};

/**
 * Format rate from decimal to percentage display
 * e.g., 0.10 -> "10.00%"
 */
function formatRate(rate: string): string {
  const decimal = parseFloat(rate || "0");
  return `${(decimal * 100).toFixed(2)}%`;
}

/**
 * Format quantity range for display
 * Handles null max_quantity as "+" for infinity
 */
function formatRange(minQuantity: number, maxQuantity: number | null): string {
  if (maxQuantity === null) {
    return `${minQuantity.toLocaleString()}+ units`;
  }
  return `${minQuantity.toLocaleString()} - ${maxQuantity.toLocaleString()} units`;
}

/**
 * Individual tier table for a format
 */
function TierTable({
  format,
  tiers,
}: {
  format: string;
  tiers: ContractTier[];
}) {
  const config = FORMAT_CONFIG[format];
  if (!config) return null;

  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Tier</TableHead>
              <TableHead>Range</TableHead>
              <TableHead className="text-right w-32">Royalty Rate</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tiers.map((tier, index) => (
              <TableRow key={tier.id}>
                <TableCell className="font-medium">{index + 1}</TableCell>
                <TableCell>
                  {formatRange(tier.min_quantity, tier.max_quantity)}
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatRate(tier.rate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Configuration for tier calculation modes
 * Story 10.4: Escalating Lifetime Royalty Rates
 */
const MODE_CONFIG: Record<
  TierCalculationMode,
  { label: string; description: string; variant: "default" | "secondary" }
> = {
  period: {
    label: "Period Mode",
    description:
      "Tiers reset each royalty period. Author starts at lowest tier every period.",
    variant: "secondary",
  },
  lifetime: {
    label: "Lifetime Mode",
    description:
      "Tiers based on cumulative lifetime sales. As sales grow, author earns higher rates on new sales.",
    variant: "default",
  },
};

export function ContractTiersSection({
  tiers,
  tierCalculationMode = "period",
}: ContractTiersSectionProps) {
  // Group tiers by format
  const tiersByFormat = tiers.reduce(
    (acc, tier) => {
      const format = tier.format;
      if (!acc[format]) {
        acc[format] = [];
      }
      acc[format].push(tier);
      return acc;
    },
    {} as Record<string, ContractTier[]>,
  );

  // Sort tiers within each format by min_quantity
  for (const format of Object.keys(tiersByFormat)) {
    tiersByFormat[format].sort((a, b) => a.min_quantity - b.min_quantity);
  }

  // Get formats in display order
  const formatOrder = ["physical", "ebook", "audiobook"];
  const availableFormats = formatOrder.filter(
    (format) => tiersByFormat[format],
  );

  const modeConfig = MODE_CONFIG[tierCalculationMode];

  if (availableFormats.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No royalty tiers configured for this contract.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">Royalty Rate Tables</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant={modeConfig.variant}
                className="cursor-help flex items-center gap-1"
              >
                {modeConfig.label}
                <Info className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p>{modeConfig.description}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {availableFormats.map((format) => (
          <TierTable
            key={format}
            format={format}
            tiers={tiersByFormat[format]}
          />
        ))}
      </div>
    </div>
  );
}
