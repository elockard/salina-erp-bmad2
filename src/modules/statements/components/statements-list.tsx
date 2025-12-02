"use client";

/**
 * Statements List Table Component
 *
 * TanStack Table data grid for statements with:
 * - Period, Author, Generated On, Status, Net Payable, Actions columns
 * - Row actions: View, Download PDF, Resend Email
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
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
import { Download, Eye, Mail, MoreHorizontal } from "lucide-react";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StatementWithRelations } from "../types";
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
        cell: ({ row }) => row.original.author?.name || "Unknown",
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
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No statements found.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  }

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
