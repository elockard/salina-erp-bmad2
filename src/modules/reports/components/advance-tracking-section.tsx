"use client";

/**
 * Advance Tracking Section Component
 *
 * Displays authors with active advances and remaining balances.
 *
 * Story: 6.4 - Build Royalty Liability Summary Report
 * AC: 6 (Advance tracking section shows authors with active advances and remaining balances)
 *
 * Features:
 * - Table of authors with active advances
 * - Columns: Author, Title, Advance Amount, Recouped, Remaining Balance
 * - Progress bar for recoupment percentage
 * - Empty state when no active advances
 */

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AdvanceBalanceRow } from "../types";

interface AdvanceTrackingSectionProps {
  /** Active advance balance data */
  data: AdvanceBalanceRow[];
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
 * Table columns definition
 */
const columns: ColumnDef<AdvanceBalanceRow>[] = [
  {
    accessorKey: "authorName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Author
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-medium">{row.getValue("authorName")}</span>
    ),
  },
  {
    accessorKey: "titleName",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Title
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="text-sm">{row.getValue("titleName")}</span>
    ),
  },
  {
    accessorKey: "advanceAmount",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Advance Amount
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatCurrency(row.getValue("advanceAmount"))}
      </span>
    ),
  },
  {
    accessorKey: "advanceRecouped",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Recouped
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="tabular-nums text-green-600">
        {formatCurrency(row.getValue("advanceRecouped"))}
      </span>
    ),
  },
  {
    accessorKey: "advanceRemaining",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-4"
      >
        Remaining
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums text-[#1e3a5f]">
        {formatCurrency(row.getValue("advanceRemaining"))}
      </span>
    ),
  },
  {
    id: "progress",
    header: "Progress",
    cell: ({ row }) => {
      const amount = row.original.advanceAmount;
      const recouped = row.original.advanceRecouped;
      const percent = amount > 0 ? (recouped / amount) * 100 : 0;
      return (
        <div className="flex items-center space-x-2">
          <Progress
            value={percent}
            className="h-2 w-20"
            aria-label={`${Math.round(percent)}% recouped`}
          />
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round(percent)}%
          </span>
        </div>
      );
    },
  },
];

export function AdvanceTrackingSection({ data }: AdvanceTrackingSectionProps) {
  // Default sort by remaining balance DESC
  const [sorting, setSorting] = useState<SortingState>([
    { id: "advanceRemaining", desc: true },
  ]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // Calculate totals for summary
  const totalAdvance = data.reduce((sum, row) => sum + row.advanceAmount, 0);
  const totalRecouped = data.reduce((sum, row) => sum + row.advanceRecouped, 0);
  const totalRemaining = data.reduce(
    (sum, row) => sum + row.advanceRemaining,
    0,
  );

  return (
    <Card data-testid="advance-tracking-section">
      <CardHeader>
        <CardTitle>Active Advances</CardTitle>
        <CardDescription>
          Authors with outstanding advance balances being recouped
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <div
            className="flex h-[150px] items-center justify-center text-muted-foreground"
            data-testid="no-active-advances"
          >
            No active advances - all advances have been fully recouped
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="flex items-center justify-end gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Total Advance: </span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totalAdvance)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Recouped: </span>
                <span className="font-medium tabular-nums text-green-600">
                  {formatCurrency(totalRecouped)}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Total Remaining: </span>
                <span className="font-semibold tabular-nums text-[#1e3a5f]">
                  {formatCurrency(totalRemaining)}
                </span>
              </div>
            </div>

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
