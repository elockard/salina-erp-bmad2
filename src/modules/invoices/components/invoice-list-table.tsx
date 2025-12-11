"use client";

/**
 * Invoice List Table Component
 *
 * TanStack Table data grid for invoices with:
 * - Invoice #, Date, Customer, Amount, Balance, Status, Actions columns
 * - Sortable columns (Date, Amount, Customer, Balance)
 * - Conditional row actions based on invoice status
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 2: Create Invoice List Table Component (AC: 8.3.1, 8.3.3, 8.3.4)
 *
 * Related:
 * - src/modules/statements/components/statements-list.tsx (pattern)
 * - src/modules/invoices/types.ts (InvoiceWithCustomer)
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
import {
  ArrowUpDown,
  Ban,
  CreditCard,
  Edit,
  Eye,
  MoreHorizontal,
  Plus,
  Send,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import type { InvoiceStatusType, InvoiceWithCustomer } from "../types";
import { InvoiceStatusBadge } from "./invoice-status-badge";

export interface InvoiceListTableProps {
  /** Invoice data to display */
  invoices: InvoiceWithCustomer[];
  /** Loading state */
  loading?: boolean;
  /** Callback when View action clicked */
  onView: (invoice: InvoiceWithCustomer) => void;
  /** Callback when Edit action clicked (draft only) */
  onEdit?: (invoice: InvoiceWithCustomer) => void;
  /** Callback when Record Payment action clicked */
  onRecordPayment?: (invoice: InvoiceWithCustomer) => void;
  /** Callback when Send action clicked */
  onSend?: (invoice: InvoiceWithCustomer) => void;
  /** Callback when Void action clicked */
  onVoid: (invoice: InvoiceWithCustomer) => void;
}

/**
 * Format currency for display
 *
 * AC-8.3.1: Amount and Balance displayed with currency formatting
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
 * Get full customer name from contact record
 */
function getCustomerName(customer: InvoiceWithCustomer["customer"]): string {
  if (!customer) return "Unknown Customer";
  return `${customer.first_name} ${customer.last_name}`.trim() || "Unknown";
}

/**
 * Check if action is available based on invoice status
 *
 * AC-8.3.4: Action availability rules
 * - Edit: only draft
 * - Record Payment: sent or partially_paid
 * - Send: only draft
 * - Void: not void or paid
 */
function canEdit(status: InvoiceStatusType): boolean {
  return status === "draft";
}

function canRecordPayment(status: InvoiceStatusType): boolean {
  return status === "sent" || status === "partially_paid";
}

function canSend(status: InvoiceStatusType): boolean {
  return status === "draft";
}

function canVoid(status: InvoiceStatusType): boolean {
  return status !== "void" && status !== "paid";
}

/**
 * Invoice data table with TanStack Table
 *
 * AC-8.3.1: Table displays Invoice #, Date, Customer, Amount, Balance, Status, Actions
 * AC-8.3.3: Sortable columns for Date, Amount, Customer, Balance
 * AC-8.3.4: Conditional actions based on invoice status
 */
export function InvoiceListTable({
  invoices,
  loading = false,
  onView,
  onEdit,
  onRecordPayment,
  onSend,
  onVoid,
}: InvoiceListTableProps) {
  const [sorting, setSorting] = useState<SortingState>([
    { id: "invoice_date", desc: true },
  ]);

  // Define columns with sorting support
  const columns: ColumnDef<InvoiceWithCustomer>[] = useMemo(
    () => [
      {
        accessorKey: "invoice_number",
        header: "Invoice #",
        cell: ({ row }) => (
          <span className="font-mono text-sm">
            {row.original.invoice_number}
          </span>
        ),
      },
      {
        accessorKey: "invoice_date",
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
        cell: ({ row }) =>
          format(new Date(row.original.invoice_date), "MMM dd, yyyy"),
      },
      {
        accessorKey: "customer",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Customer
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => getCustomerName(row.original.customer),
        sortingFn: (rowA, rowB) => {
          const nameA = getCustomerName(rowA.original.customer).toLowerCase();
          const nameB = getCustomerName(rowB.original.customer).toLowerCase();
          return nameA.localeCompare(nameB);
        },
      },
      {
        accessorKey: "total",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Amount
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-medium">
            {formatCurrency(row.original.total)}
          </span>
        ),
        sortingFn: (rowA, rowB) => {
          const amountA = Number.parseFloat(rowA.original.total);
          const amountB = Number.parseFloat(rowB.original.total);
          return amountA - amountB;
        },
      },
      {
        accessorKey: "balance_due",
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4"
          >
            Balance
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => {
          const balance = Number.parseFloat(row.original.balance_due);
          return (
            <span className={balance > 0 ? "font-bold text-amber-600" : ""}>
              {formatCurrency(row.original.balance_due)}
            </span>
          );
        },
        sortingFn: (rowA, rowB) => {
          const balanceA = Number.parseFloat(rowA.original.balance_due);
          const balanceB = Number.parseFloat(rowB.original.balance_due);
          return balanceA - balanceB;
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <InvoiceStatusBadge
            status={row.original.status as InvoiceStatusType}
          />
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const invoice = row.original;
          const status = invoice.status as InvoiceStatusType;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(invoice)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View
                </DropdownMenuItem>

                {canEdit(status) && onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(invoice)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                )}

                {canRecordPayment(status) && onRecordPayment && (
                  <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Record Payment
                  </DropdownMenuItem>
                )}

                {canSend(status) && onSend && (
                  <DropdownMenuItem onClick={() => onSend(invoice)}>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </DropdownMenuItem>
                )}

                {canVoid(status) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onVoid(invoice)}
                      className="text-red-600 focus:text-red-600"
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      Void
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [onView, onEdit, onRecordPayment, onSend, onVoid],
  );

  const table = useReactTable({
    data: invoices,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
  });

  // Loading state
  if (loading) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
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

  // Empty state (AC-8.3.10)
  if (invoices.length === 0) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell colSpan={7} className="h-48 text-center">
                <div className="flex flex-col items-center justify-center gap-4">
                  <p className="text-muted-foreground">No invoices yet</p>
                  <Button asChild>
                    <Link href="/invoices/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Create Your First Invoice
                    </Link>
                  </Button>
                </div>
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
