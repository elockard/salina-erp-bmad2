"use client";

/**
 * AR Aging Report Table Component
 *
 * Data table for accounts receivable aging report using TanStack Table.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.3: Aging report table with customer + buckets + total
 * AC-8.5.4: Click customer row to show drill-down panel
 *
 * Features:
 * - Sortable columns (default: Total DESC)
 * - Click to drill-down into customer detail
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
import type { AgingReportRow } from "../types";

interface ARAgingTableProps {
  /** Aging report rows */
  data: AgingReportRow[];
  /** Whether the table is in loading state */
  isLoading: boolean;
  /** Callback when a customer row is clicked for drill-down */
  onCustomerClick?: (customerId: string) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string): string {
  const num = Number.parseFloat(amount) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Create column definitions for aging table
 */
function createColumns(
  onCustomerClick?: (customerId: string) => void,
): ColumnDef<AgingReportRow>[] {
  return [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) => (
        <button
          type="button"
          className="text-left font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          onClick={() => onCustomerClick?.(row.original.customerId)}
          aria-label={`View details for ${row.original.customerName}`}
        >
          {row.original.customerName}
        </button>
      ),
    },
    {
      accessorKey: "current",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`Current, ${sortLabel}`}
          >
            Current
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-green-600">
          {formatCurrency(row.original.current)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.current) -
        Number.parseFloat(rowB.original.current),
    },
    {
      accessorKey: "days1to30",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`1-30 Days, ${sortLabel}`}
          >
            1-30 Days
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-yellow-600">
          {formatCurrency(row.original.days1to30)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.days1to30) -
        Number.parseFloat(rowB.original.days1to30),
    },
    {
      accessorKey: "days31to60",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`31-60 Days, ${sortLabel}`}
          >
            31-60 Days
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-orange-600">
          {formatCurrency(row.original.days31to60)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.days31to60) -
        Number.parseFloat(rowB.original.days31to60),
    },
    {
      accessorKey: "days61to90",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`61-90 Days, ${sortLabel}`}
          >
            61-90 Days
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-red-500">
          {formatCurrency(row.original.days61to90)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.days61to90) -
        Number.parseFloat(rowB.original.days61to90),
    },
    {
      accessorKey: "days90plus",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`90+ Days, ${sortLabel}`}
          >
            90+ Days
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums text-red-700 font-semibold">
          {formatCurrency(row.original.days90plus)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.days90plus) -
        Number.parseFloat(rowB.original.days90plus),
    },
    {
      accessorKey: "total",
      header: ({ column }) => {
        const sorted = column.getIsSorted();
        const sortLabel = sorted === "asc" ? "sorted ascending" : sorted === "desc" ? "sorted descending" : "click to sort";
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(sorted === "asc")}
            className="-ml-4"
            aria-label={`Total, ${sortLabel}`}
          >
            Total
            <ArrowUpDown className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <span className="tabular-nums font-bold">
          {formatCurrency(row.original.total)}
        </span>
      ),
      sortingFn: (rowA, rowB) =>
        Number.parseFloat(rowA.original.total) -
        Number.parseFloat(rowB.original.total),
    },
  ];
}

/**
 * Calculate totals row from data
 */
function calculateTotals(data: AgingReportRow[]): AgingReportRow {
  let current = 0;
  let days1to30 = 0;
  let days31to60 = 0;
  let days61to90 = 0;
  let days90plus = 0;
  let total = 0;

  for (const row of data) {
    current += Number.parseFloat(row.current) || 0;
    days1to30 += Number.parseFloat(row.days1to30) || 0;
    days31to60 += Number.parseFloat(row.days31to60) || 0;
    days61to90 += Number.parseFloat(row.days61to90) || 0;
    days90plus += Number.parseFloat(row.days90plus) || 0;
    total += Number.parseFloat(row.total) || 0;
  }

  return {
    customerId: "totals",
    customerName: "TOTAL",
    current: current.toFixed(2),
    days1to30: days1to30.toFixed(2),
    days31to60: days31to60.toFixed(2),
    days61to90: days61to90.toFixed(2),
    days90plus: days90plus.toFixed(2),
    total: total.toFixed(2),
  };
}

/**
 * Table skeleton for loading state
 */
function TableSkeleton() {
  return (
    <div className="space-y-3" data-testid="ar-aging-table-skeleton">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static loading skeleton
        <Skeleton key={`skeleton-${i}`} className="h-12 w-full" />
      ))}
    </div>
  );
}

export function ARAgingTable({
  data,
  isLoading,
  onCustomerClick,
}: ARAgingTableProps) {
  // Default sort: Total DESC
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "total", desc: true },
  ]);

  const columns = React.useMemo(
    () => createColumns(onCustomerClick),
    [onCustomerClick],
  );

  const table = useReactTable({
    data,
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
        pageSize: 20,
      },
    },
  });

  const totals = React.useMemo(() => calculateTotals(data), [data]);

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (data.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-lg border py-12 text-center"
        data-testid="ar-aging-table-empty"
      >
        <p className="text-muted-foreground mb-2">No outstanding receivables</p>
        <p className="text-sm text-muted-foreground">
          All invoices have been paid
        </p>
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div className="space-y-4" data-testid="ar-aging-table">
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
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onCustomerClick?.(row.original.customerId)}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {/* Sticky totals row at bottom */}
          <TableFooter className="sticky bottom-0 bg-muted/80 backdrop-blur-sm">
            <TableRow className="font-bold">
              <TableCell>{totals.customerName}</TableCell>
              <TableCell className="tabular-nums text-green-600">
                {formatCurrency(totals.current)}
              </TableCell>
              <TableCell className="tabular-nums text-yellow-600">
                {formatCurrency(totals.days1to30)}
              </TableCell>
              <TableCell className="tabular-nums text-orange-600">
                {formatCurrency(totals.days31to60)}
              </TableCell>
              <TableCell className="tabular-nums text-red-500">
                {formatCurrency(totals.days61to90)}
              </TableCell>
              <TableCell className="tabular-nums text-red-700">
                {formatCurrency(totals.days90plus)}
              </TableCell>
              <TableCell className="tabular-nums">
                {formatCurrency(totals.total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Pagination controls */}
      {pageCount > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-muted-foreground">
            Showing {table.getRowModel().rows.length} of {data.length} customers
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
