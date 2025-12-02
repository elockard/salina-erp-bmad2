"use client";

/**
 * Liability By Author Table Component (Enhanced)
 *
 * TanStack Table component showing liability grouped by author with additional columns.
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 4 (Liability by author table shows: Author, Titles, Unpaid Statements, Total Owed, Oldest Statement)
 * AC: 5 (Table is sortable by amount owed, default: highest first)
 *
 * Features:
 * - TanStack Table for sortable columns
 * - Columns: Author Name, Title Count, Unpaid Statements, Total Owed, Oldest Statement, Payment Method
 * - Default sort by Total Owed DESC
 * - Pagination (20 per page)
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
import { format } from "date-fns";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuthorLiabilityRow } from "../types";

interface LiabilityByAuthorTableProps {
  /** Liability data by author */
  data: AuthorLiabilityRow[];
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Format payment method for display
 */
function formatPaymentMethod(method: string | null): string {
  if (!method) return "Not specified";
  const labels: Record<string, string> = {
    direct_deposit: "Direct Deposit",
    check: "Check",
    wire_transfer: "Wire Transfer",
  };
  return labels[method] ?? method;
}

/**
 * Table columns definition (AC-4)
 */
const columns: ColumnDef<AuthorLiabilityRow>[] = [
  {
    accessorKey: "authorName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Author Name
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("authorName")}</span>
    ),
  },
  {
    accessorKey: "titleCount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Titles
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue("titleCount")}</span>
    ),
  },
  {
    accessorKey: "unpaidStatements",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Unpaid Statements
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">{row.getValue("unpaidStatements")}</span>
    ),
  },
  {
    accessorKey: "totalOwed",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Total Owed
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-[#1e3a5f]">
        {formatCurrency(row.getValue("totalOwed"))}
      </span>
    ),
  },
  {
    accessorKey: "oldestStatement",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Oldest Statement
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const date = row.getValue("oldestStatement") as Date;
      return (
        <span className="tabular-nums text-muted-foreground">
          {format(date, "MMM d, yyyy")}
        </span>
      );
    },
  },
  {
    accessorKey: "paymentMethod",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Payment Method
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">
        {formatPaymentMethod(row.getValue("paymentMethod"))}
      </span>
    ),
  },
];

export function LiabilityByAuthorTable({ data }: LiabilityByAuthorTableProps) {
  // AC-5: Default sort by Total Owed DESC
  const [sorting, setSorting] = useState<SortingState>([
    { id: "totalOwed", desc: true },
  ]);

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

  return (
    <Card data-testid="liability-by-author-table">
      <CardHeader>
        <CardTitle>Liability by Author</CardTitle>
        <CardDescription>
          Outstanding royalty payments grouped by author
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex h-[200px] items-center justify-center text-muted-foreground"
            data-testid="no-liability-data"
          >
            No pending payments - all authors are paid up
          </div>
        ) : (
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
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={row.getIsSelected() && "selected"}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={columns.length}
                        className="h-24 text-center"
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center justify-between px-2">
              <div className="text-sm text-muted-foreground">
                Page {table.getState().pagination.pageIndex + 1} of{" "}
                {table.getPageCount()}
                {" · "}
                {data.length} total authors
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
