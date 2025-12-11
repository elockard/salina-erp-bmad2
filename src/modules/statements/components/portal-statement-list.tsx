"use client";

/**
 * Portal Statement List Component
 *
 * Simplified data table for author portal showing their statements:
 * - Period, Date Generated, Status, Gross Royalties, Net Payable, Actions (View)
 * - Mobile responsive with card layout on small screens
 *
 * Story: 5.6 - Build Author Portal Statement Access
 * Task 4: Create portal statement list component (AC: 2)
 *
 * Related:
 * - src/modules/statements/types.ts (StatementWithRelations)
 * - src/modules/statements/components/statements-list.tsx (base pattern)
 */

import { format } from "date-fns";
import { Eye, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { StatementCalculations, StatementWithRelations } from "../types";

export interface PortalStatementListProps {
  /** Statement data to display */
  statements: StatementWithRelations[];
}

/**
 * Format period dates to "Q4 2025" pattern
 *
 * AC-5.6.2: Period formatted as quarter
 */
function formatPeriod(periodStart: Date): string {
  const quarter = Math.ceil((new Date(periodStart).getMonth() + 1) / 3);
  const year = new Date(periodStart).getFullYear();
  return `Q${quarter} ${year}`;
}

/**
 * Format currency for display
 *
 * AC-5.6.2: Currency formatted with Intl.NumberFormat
 */
function formatCurrency(amount: string | number): string {
  const numAmount =
    typeof amount === "string" ? Number.parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numAmount);
}

/**
 * Check if statement is from a co-authored title
 * Story 10.3: AC-10.3.6 - Portal indicates co-authored statements
 */
function isCoAuthoredStatement(statement: StatementWithRelations): boolean {
  const calculations = statement.calculations as
    | StatementCalculations
    | undefined;
  return calculations?.splitCalculation?.isSplitCalculation === true;
}

/**
 * Get ownership percentage from statement
 * Story 10.3: AC-10.3.6 - Display ownership in tooltip
 */
function getOwnershipPercentage(
  statement: StatementWithRelations,
): number | undefined {
  const calculations = statement.calculations as
    | StatementCalculations
    | undefined;
  return calculations?.splitCalculation?.ownershipPercentage;
}

/**
 * Portal status badge with author-friendly labels
 *
 * AC-5.6.2: Status badges (Paid=green, Pending Payment=amber, New=blue)
 *
 * Maps internal statuses to author-facing labels:
 * - sent → Paid (green)
 * - draft → Pending Payment (amber)
 * - failed → New (blue) - from author POV, they just haven't received it
 */
function PortalStatusBadge({
  status,
  emailSentAt,
}: {
  status: string;
  emailSentAt: Date | null;
}) {
  // Determine author-facing status
  // Paid = sent with email delivered
  // Pending Payment = sent but waiting for payment
  // New = draft or failed (not yet delivered to author)
  const isPaid = status === "sent" && emailSentAt;
  const isPending = status === "sent" && !emailSentAt;

  if (isPaid) {
    return (
      <Badge
        variant="outline"
        className="bg-green-50 text-green-700 border-green-200"
      >
        Paid
      </Badge>
    );
  }

  if (isPending) {
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 text-amber-700 border-amber-200"
      >
        Pending Payment
      </Badge>
    );
  }

  // New (draft or failed - author just sees it's new)
  return (
    <Badge
      variant="outline"
      className="bg-blue-50 text-blue-700 border-blue-200"
    >
      New
    </Badge>
  );
}

/**
 * Mobile card layout for a single statement
 *
 * AC-5.6.6: Mobile-responsive design with touch-optimized interface
 */
function StatementCard({ statement }: { statement: StatementWithRelations }) {
  const isCoAuthored = isCoAuthoredStatement(statement);
  const ownershipPct = getOwnershipPercentage(statement);

  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-medium text-lg flex items-center gap-2">
              {formatPeriod(statement.period_start)}
              {/* Story 10.3: AC-10.3.6 - Show co-author badge */}
              {isCoAuthored && (
                <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  <Users className="h-3 w-3" />
                  {ownershipPct}%
                </span>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {format(new Date(statement.created_at), "MMM dd, yyyy")}
            </div>
          </div>
          <PortalStatusBadge
            status={statement.status}
            emailSentAt={statement.email_sent_at}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-muted-foreground">Gross Royalties</div>
            <div className="font-medium">
              {formatCurrency(statement.total_royalty_earned)}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Net Payable</div>
            <div className="font-bold text-lg">
              {formatCurrency(statement.net_payable)}
            </div>
          </div>
        </div>

        <Link href={`/portal/statements/${statement.id}`}>
          <Button
            variant="outline"
            className="w-full min-h-[44px]" // AC-5.6.6: 44px touch target
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

/**
 * Portal statements list with responsive design
 *
 * AC-5.6.2: Statement list shows only author's own statements
 * AC-5.6.6: Mobile-responsive design
 */
export function PortalStatementList({ statements }: PortalStatementListProps) {
  // Empty state
  if (statements.length === 0) {
    return (
      <div className="rounded-md border bg-muted/20 p-8 text-center">
        <div className="text-4xl mb-4">📄</div>
        <p className="text-muted-foreground font-medium">
          No statements available yet.
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Royalty statements will appear here once they are generated.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile: Card layout (hidden on md+) */}
      <div className="md:hidden space-y-3">
        {statements.map((statement) => (
          <StatementCard key={statement.id} statement={statement} />
        ))}
      </div>

      {/* Desktop: Table layout (hidden on mobile) */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Date Generated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Gross Royalties</TableHead>
              <TableHead className="text-right">Net Payable</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statements.map((statement) => {
              const isCoAuthored = isCoAuthoredStatement(statement);
              const ownershipPct = getOwnershipPercentage(statement);

              return (
                <TableRow key={statement.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {formatPeriod(statement.period_start)}
                      {/* Story 10.3: AC-10.3.6 - Show co-author badge */}
                      {isCoAuthored && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                              <Users className="h-3 w-3" />
                              {ownershipPct}%
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Your ownership share: {ownershipPct}%</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(statement.created_at), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell>
                    <PortalStatusBadge
                      status={statement.status}
                      emailSentAt={statement.email_sent_at}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(statement.total_royalty_earned)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    {formatCurrency(statement.net_payable)}
                  </TableCell>
                  <TableCell>
                    <Link href={`/portal/statements/${statement.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="min-h-[44px] min-w-[44px]" // AC-5.6.6: 44px touch target
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
