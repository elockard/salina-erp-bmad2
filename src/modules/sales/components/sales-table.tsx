"use client";

/**
 * Sales Table Component
 *
 * Data table for sales transaction history using TanStack Table.
 * Story 3.3: AC 3 (table columns), AC 5 (sorting, pagination)
 *
 * Columns:
 * - Date: Formatted as "Nov 21, 2025"
 * - Title: Title name
 * - Format: Badge (P/E/A)
 * - Quantity: Integer
 * - Unit Price: Formatted currency
 * - Total Amount: Formatted currency, bold
 * - Channel: Badge (color-coded)
 * - Recorded By: User name
 *
 * Features:
 * - Sortable columns (Date desc default, Total Amount)
 * - Pagination (20 items per page)
 * - Row click opens detail modal
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaginatedSales, SaleWithRelations } from "../types";

interface SalesTableProps {
  data: PaginatedSales | null;
  isLoading: boolean;
  onRowClick: (sale: SaleWithRelations) => void;
  onPageChange: (page: number) => void;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Format badge for format column
 */
function FormatBadge({ format: formatValue }: { format: string }) {
  const labels: Record<
    string,
    { label: string; variant: "default" | "secondary" | "outline" }
  > = {
    physical: { label: "P", variant: "default" },
    ebook: { label: "E", variant: "secondary" },
    audiobook: { label: "A", variant: "outline" },
  };
  const config = labels[formatValue] || {
    label: formatValue,
    variant: "outline" as const,
  };
  return (
    <Badge variant={config.variant} className="font-mono">
      {config.label}
    </Badge>
  );
}

/**
 * Format badge for channel column
 */
function ChannelBadge({ channel }: { channel: string }) {
  const colors: Record<string, string> = {
    retail: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    wholesale:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    direct:
      "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    distributor:
      "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  };
  const labels: Record<string, string> = {
    retail: "Retail",
    wholesale: "Wholesale",
    direct: "Direct",
    distributor: "Distributor",
  };
  return (
    <Badge variant="outline" className={colors[channel] || ""}>
      {labels[channel] || channel}
    </Badge>
  );
}

/**
 * Column definitions for sales table
 */
const columns: ColumnDef<SaleWithRelations>[] = [
  {
    accessorKey: "sale_date",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Date
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = new Date(row.original.sale_date);
      return format(date, "MMM d, yyyy");
    },
  },
  {
    accessorKey: "title.title",
    header: "Title",
    cell: ({ row }) => (
      <span
        className="max-w-[200px] truncate block"
        title={row.original.title.title}
      >
        {row.original.title.title}
      </span>
    ),
  },
  {
    accessorKey: "format",
    header: "Format",
    cell: ({ row }) => <FormatBadge format={row.original.format} />,
  },
  {
    accessorKey: "quantity",
    header: "Qty",
    cell: ({ row }) => row.original.quantity,
  },
  {
    accessorKey: "unit_price",
    header: "Unit Price",
    cell: ({ row }) => formatCurrency(row.original.unit_price),
  },
  {
    accessorKey: "total_amount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Total
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-bold">
        {formatCurrency(row.original.total_amount)}
      </span>
    ),
  },
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
  },
  {
    accessorKey: "createdBy.name",
    header: "Recorded By",
    cell: ({ row }) => row.original.createdBy.name,
  },
];

/**
 * Table skeleton for loading state
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

export function SalesTable({
  data,
  isLoading,
  onRowClick,
  onPageChange,
}: SalesTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "sale_date", desc: true },
  ]);

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    manualPagination: true,
    pageCount: data?.totalPages ?? 0,
  });

  if (isLoading) {
    return <TableSkeleton />;
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">
          No sales transactions found
        </p>
        <p className="text-sm text-muted-foreground">
          Record your first sale to see it here
        </p>
      </div>
    );
  }

  const startItem = (data.page - 1) * data.pageSize + 1;
  const endItem = Math.min(data.page * data.pageSize, data.total);

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
                          header.getContext()
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
                className="cursor-pointer"
                onClick={() => onRowClick(row.original)}
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

      {/* Pagination controls */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {data.total} transactions
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(data.page - 1)}
            disabled={data.page <= 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.page} of {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(data.page + 1)}
            disabled={data.page >= data.totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
