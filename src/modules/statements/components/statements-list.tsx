"use client";

/**
 * Statements List Table Component
 *
 * TanStack Table data grid for statements with:
 * - Period, Author, Generated On, Status, Net Payable, Actions columns
 * - Row actions: View, Download PDF, Resend Email
 * - Mobile: Card-based layout (Story 20.4)
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 * Task 4: Build statements list table component (AC: 1)
 *
 * Related:
 * - src/modules/statements/types.ts (StatementWithRelations)
 * - docs/architecture.md (TanStack Table pattern)
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Download, Eye, Mail, MoreHorizontal, Users } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileCardSkeleton } from "@/components/ui/responsive-table";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import type { StatementCalculations, StatementWithRelations } from "../types";
import { StatementStatusBadge } from "./statement-status-badge";

export interface StatementsListProps {
  /** Statement data to display */
  statements: StatementWithRelations[];
  /** Loading state */
  loading?: boolean;
  /** Callback when View action clicked */
  onView: (statement: StatementWithRelations) => void;
  /** Callback when Download PDF action clicked */
  onDownloadPDF: (statement: StatementWithRelations) => void;
  /** Callback when Resend Email action clicked */
  onResendEmail: (statement: StatementWithRelations) => void;
}

/**
 * Format period dates to "Q4 2025" pattern
 *
 * AC-5.5.1: Period formatted as quarter
 */
function formatPeriod(periodStart: Date): string {
  const quarter = Math.ceil((new Date(periodStart).getMonth() + 1) / 3);
  const year = new Date(periodStart).getFullYear();
  return `Q${quarter} ${year}`;
}

/**
 * Format currency for display
 *
 * AC-5.5.1: Net payable with currency formatting (bold)
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
 * Get author name from statement
 * Story 7.3: Supports both legacy author relation and new contact relation
 */
function getAuthorName(statement: StatementWithRelations): string {
  // Try new contact relation first (Story 7.3)
  if (statement.contact) {
    const firstName = statement.contact.first_name || "";
    const lastName = statement.contact.last_name || "";
    const fullName = `${firstName} ${lastName}`.trim();
    if (fullName) return fullName;
  }
  // Fall back to legacy author relation
  if (statement.author?.name) {
    return statement.author.name;
  }
  return "Unknown";
}

/**
 * Check if statement is from a co-authored title
 * Story 10.3: AC-10.3.9 - List indicates co-authored statements
 */
function isCoAuthoredStatement(statement: StatementWithRelations): boolean {
  const calculations = statement.calculations as
    | StatementCalculations
    | undefined;
  return calculations?.splitCalculation?.isSplitCalculation === true;
}

/**
 * Get ownership percentage from statement
 * Story 10.3: AC-10.3.9 - Display ownership in tooltip
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
 * Mobile card component for statements
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 */
function StatementMobileCard({
  statement,
  onView,
  onDownloadPDF,
  onResendEmail,
}: {
  statement: StatementWithRelations;
  onView: () => void;
  onDownloadPDF: () => void;
  onResendEmail: () => void;
}) {
  const isCoAuthored = isCoAuthoredStatement(statement);
  const ownershipPct = getOwnershipPercentage(statement);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium flex items-center gap-2">
            {getAuthorName(statement)}
            {isCoAuthored && (
              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                <Users className="h-3 w-3" />
                {ownershipPct}%
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatPeriod(statement.period_start)}
          </div>
        </div>
        <StatementStatusBadge
          status={statement.status as "draft" | "sent" | "failed"}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Generated:</span>
          <span className="ml-1">
            {format(new Date(statement.created_at), "MMM dd, yyyy")}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Net Payable:</span>
          <span className="ml-1 font-bold">
            {formatCurrency(statement.net_payable)}
          </span>
        </div>
      </div>
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 h-11"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadPDF}
          className="flex-1 h-11"
        >
          <Download className="h-4 w-4 mr-1" />
          PDF
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onResendEmail}
          className="flex-1 h-11"
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
      </div>
    </div>
  );
}

/**
 * Statements data table with TanStack Table
 *
 * AC-5.5.1: Table displays period, author, generated on date, status badge,
 * net payable, and actions (View/Download PDF/Resend Email)
 */
export function StatementsList({
  statements,
  loading = false,
  onView,
  onDownloadPDF,
  onResendEmail,
}: StatementsListProps) {
  const isMobile = useIsMobile();

  // Define columns
  const columns: ColumnDef<StatementWithRelations>[] = useMemo(
    () => [
      {
        accessorKey: "period_start",
        header: "Period",
        cell: ({ row }) => formatPeriod(row.original.period_start),
      },
      {
        accessorKey: "author.name",
        header: "Author",
        // Story 7.3: Use helper to get author name from contact or legacy author
        // Story 10.3: AC-10.3.9 - Show co-author badge with ownership percentage
        cell: ({ row }) => {
          const isCoAuthored = isCoAuthoredStatement(row.original);
          const ownershipPct = getOwnershipPercentage(row.original);
          return (
            <div className="flex items-center gap-2">
              {getAuthorName(row.original)}
              {isCoAuthored && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                      <Users className="h-3 w-3" />
                      {ownershipPct}%
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Co-authored: {ownershipPct}% ownership</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "created_at",
        header: "Generated On",
        cell: ({ row }) =>
          format(new Date(row.original.created_at), "MMM dd, yyyy"),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatementStatusBadge
            status={row.original.status as "draft" | "sent" | "failed"}
          />
        ),
      },
      {
        accessorKey: "net_payable",
        header: "Net Payable",
        cell: ({ row }) => (
          <span className="font-bold">
            {formatCurrency(row.original.net_payable)}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(row.original)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownloadPDF(row.original)}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onResendEmail(row.original)}>
                <Mail className="mr-2 h-4 w-4" />
                Resend Email
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [onView, onDownloadPDF, onResendEmail],
  );

  const table = useReactTable({
    data: statements,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Loading state
  if (loading) {
    // Mobile: Card skeletons (Story 20.4)
    if (isMobile) {
      return <MobileCardSkeleton count={5} />;
    }
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Generated On</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Net Payable</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-14" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  // Empty state
  if (statements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border">
        <p className="text-muted-foreground">No statements found.</p>
      </div>
    );
  }

  // Mobile: Card layout (Story 20.4)
  if (isMobile) {
    return (
      <div className="space-y-3">
        {statements.map((statement) => (
          <StatementMobileCard
            key={statement.id}
            statement={statement}
            onView={() => onView(statement)}
            onDownloadPDF={() => onDownloadPDF(statement)}
            onResendEmail={() => onResendEmail(statement)}
          />
        ))}
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
