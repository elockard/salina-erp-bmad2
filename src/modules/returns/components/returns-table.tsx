"use client";

/**
 * Returns Table Component
 *
 * Data table for returns history using TanStack Table.
 * Story 3.7: AC 2 (table columns), AC 7 (sorting), AC 8 (pagination), AC 9 (view detail)
 *
 * Columns:
 * - Date: Formatted as "Nov 21, 2025"
 * - Title: Title name (linked to title detail)
 * - Format: Badge (P/E/A)
 * - Quantity: Negative integer (-25)
 * - Amount: Negative currency (-$312.50)
 * - Reason: Truncated with tooltip
 * - Status: Badge (Pending/Approved/Rejected)
 * - Reviewed By: User name or "-" if pending
 * - Actions: View Detail button
 *
 * Features:
 * - Sortable columns (Date, Amount, Status) - AC 7
 * - Default sort: Date descending
 * - Pagination (20 items default, options 10/20/50) - AC 8
 * - Row click opens detail page - AC 9
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PaginatedReturns, ReturnWithRelations } from "../types";
import { StatusBadge } from "./status-badge";

interface ReturnsTableProps {
  data: PaginatedReturns | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSortChange: (sort: string, order: "asc" | "desc") => void;
}

/**
 * Format currency for display (negative for returns)
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "-$0.00";
  return `-${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num)}`;
}

/**
 * Format badge for format column
 */
function FormatBadge({ format: formatValue }: { format: string }) {
  const labels: Record<
    string,
    { label: string; variant: "default" | "secondary" | "outline" }
  > = {
    physical: { label: "Physical", variant: "default" },
    ebook: { label: "Ebook", variant: "secondary" },
    audiobook: { label: "Audio", variant: "outline" },
  };
  const config = labels[formatValue] || {
    label: formatValue,
    variant: "outline" as const,
  };
  return (
    <Badge variant={config.variant} className="font-mono text-xs">
      {config.label}
    </Badge>
  );
}

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

export function ReturnsTable({
  data,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onSortChange,
}: ReturnsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "return_date", desc: true },
  ]);

  // Column definitions for returns table
  const columns: ColumnDef<ReturnWithRelations>[] = React.useMemo(
    () => [
      {
        accessorKey: "return_date",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              column.toggleSorting(!isDesc);
              onSortChange("date", isDesc ? "asc" : "desc");
            }}
            className="-ml-4"
          >
            Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const date = new Date(row.original.return_date);
          return format(date, "MMM dd, yyyy");
        },
      },
      {
        accessorKey: "title.title",
        header: "Title",
        cell: ({ row }) => (
          <Link
            href={`/titles/${row.original.title.id}`}
            className="max-w-[200px] truncate block text-primary hover:underline"
            title={row.original.title.title}
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.title.title}
          </Link>
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
        cell: ({ row }) => (
          <span className="font-mono text-destructive">
            -{row.original.quantity}
          </span>
        ),
      },
      {
        accessorKey: "total_amount",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              column.toggleSorting(!isDesc);
              onSortChange("amount", isDesc ? "asc" : "desc");
            }}
            className="-ml-4"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-bold text-destructive">
            {formatCurrency(row.original.total_amount)}
          </span>
        ),
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => {
          const reason = row.original.reason;
          if (!reason) return <span className="text-muted-foreground">-</span>;
          const truncated =
            reason.length > 30 ? `${reason.slice(0, 30)}...` : reason;
          if (reason.length > 30) {
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-[150px] truncate block cursor-help">
                      {truncated}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-[300px]">{reason}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span>{reason}</span>;
        },
      },
      {
        accessorKey: "status",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => {
              const isDesc = column.getIsSorted() === "desc";
              column.toggleSorting(!isDesc);
              onSortChange("status", isDesc ? "asc" : "desc");
            }}
            className="-ml-4"
          >
            Status
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "reviewedBy",
        header: "Reviewed By",
        cell: ({ row }) => (
          <span
            className={row.original.reviewedBy ? "" : "text-muted-foreground"}
          >
            {row.original.reviewedBy?.name ?? "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/returns/${row.original.id}`);
            }}
          >
            <Eye className="h-4 w-4" />
            <span className="sr-only">View details</span>
          </Button>
        ),
      },
    ],
    [router, onSortChange],
  );

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
    manualSorting: true,
    pageCount: data?.totalPages ?? 0,
  });

  // Handle row click to navigate to detail page (AC 9)
  const handleRowClick = (returnItem: ReturnWithRelations) => {
    router.push(`/returns/${returnItem.id}`);
  };

  if (isLoading) {
    return <TableSkeleton />;
  }

  // Empty state (AC 11)
  if (!data || data.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground mb-2">No returns found</p>
        <p className="text-sm text-muted-foreground mb-4">
          Try adjusting your filters or date range
        </p>
        <Button asChild variant="outline">
          <Link href="/returns/new">Record a Return</Link>
        </Button>
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
                onClick={() => handleRowClick(row.original)}
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

      {/* Pagination controls (AC 8) */}
      <div className="flex items-center justify-between px-2">
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {data.total} returns
        </p>
        <div className="flex items-center gap-4">
          {/* Page size selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={data.pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[70px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Page navigation */}
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
    </div>
  );
}
