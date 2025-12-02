"use client";

/**
 * Sales Report Table Component
 *
 * Data table for sales report results using TanStack Table.
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 5 (Results table shows: Group, Total Units, Total Revenue, Avg Unit Price)
 * AC: 6 (Totals row displays at bottom of table summing all visible rows)
 *
 * Features:
 * - Sortable columns (default: Total Revenue DESC)
 * - Pagination (20 rows per page)
 * - Sticky totals row at bottom
 * - Loading skeleton state
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SalesReportRow, SalesReportResult } from "../types";

interface SalesReportTableProps {
  /** Report data with rows and totals */
  data: SalesReportResult | null;
  /** Whether the table is in loading state */
  isLoading: boolean;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

/**
 * Format number with comma separators
 */
function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-US").format(num);
}

/**
 * Column definitions for sales report table (AC-5)
 */
const columns: ColumnDef<SalesReportRow>[] = [
  {
    accessorKey: "groupLabel",
    header: "Group",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.groupLabel}</span>
    ),
  },
  {
    accessorKey: "totalUnits",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Total Units
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatNumber(row.original.totalUnits)}
      </span>
    ),
  },
  {
    accessorKey: "totalRevenue",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Total Revenue
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums font-semibold">
        {formatCurrency(row.original.totalRevenue)}
      </span>
    ),
  },
  {
    accessorKey: "avgUnitPrice",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Avg Unit Price
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.original.avgUnitPrice)}
      </span>
    ),
  },
];

/**
 * Table skeleton for loading state (subtask 4.7)
 */
function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
        <Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function SalesReportTable({ data, isLoading }: SalesReportTableProps) {
  // Default sort: Total Revenue DESC (subtask 4.4)
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "totalRevenue", desc: true },
  ]);

  const table = useReactTable({
    data: data?.rows ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 20, // subtask 4.5
      },
    },
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border py-12 text-center">
        <p className="text-muted-foreground mb-2">No results found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or date range
        </p>
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-4">
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
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {/* Sticky totals row at bottom (AC-6, subtask 4.6) */}
          <TableFooter className="sticky bottom-0 bg-muted/80 backdrop-blur-sm">
            <TableRow className="font-bold">
              <TableCell>{data.totals.groupLabel}</TableCell>
              <TableCell className="tabular-nums">
                {formatNumber(data.totals.totalUnits)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(data.totals.totalRevenue)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(data.totals.avgUnitPrice)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination controls (subtask 4.5) */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {data.rows.length} rows
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
