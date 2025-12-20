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
import { useIsMobile } from "@/lib/hooks/useIsMobile";
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
 * Mobile card component for invoices
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 */
function InvoiceMobileCard({
  invoice,
  onView,
  onEdit,
  onRecordPayment,
  onSend,
  onVoid,
}: {
  invoice: InvoiceWithCustomer;
  onView: () => void;
  onEdit?: () => void;
  onRecordPayment?: () => void;
  onSend?: () => void;
  onVoid: () => void;
}) {
  const status = invoice.status as InvoiceStatusType;
  const balance = Number.parseFloat(invoice.balance_due);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-sm font-medium">
            {invoice.invoice_number}
          </div>
          <div className="text-sm text-muted-foreground">
            {getCustomerName(invoice.customer)}
          </div>
        </div>
        <InvoiceStatusBadge status={status} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">Date:</span>
          <span className="ml-1">
            {format(new Date(invoice.invoice_date), "MMM dd, yyyy")}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Amount:</span>
          <span className="ml-1 font-medium">
            {formatCurrency(invoice.total)}
          </span>
        </div>
        <div className="col-span-2">
          <span className="text-muted-foreground">Balance:</span>
          <span
            className={`ml-1 ${balance > 0 ? "font-bold text-amber-600" : ""}`}
          >
            {formatCurrency(invoice.balance_due)}
          </span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onView}
          className="flex-1 h-11 min-w-[80px]"
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {canEdit(status) && onEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={onEdit}
            className="flex-1 h-11 min-w-[80px]"
          >
            <Edit className="h-4 w-4 mr-1" />
            Edit
          </Button>
        )}
        {canRecordPayment(status) && onRecordPayment && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRecordPayment}
            className="flex-1 h-11 min-w-[80px]"
          >
            <CreditCard className="h-4 w-4 mr-1" />
            Pay
          </Button>
        )}
        {canSend(status) && onSend && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSend}
            className="flex-1 h-11 min-w-[80px]"
          >
            <Send className="h-4 w-4 mr-1" />
            Send
          </Button>
        )}
        {canVoid(status) && (
          <Button
            variant="outline"
            size="sm"
            onClick={onVoid}
            className="flex-1 h-11 min-w-[80px] text-red-600 hover:text-red-700"
          >
            <Ban className="h-4 w-4 mr-1" />
            Void
          </Button>
        )}
      </div>
    </div>
  );
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
  const isMobile = useIsMobile();
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
    // Mobile: Card skeletons (Story 20.4)
    if (isMobile) {
      return <MobileCardSkeleton count={5} />;
    }
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
      <div className="flex flex-col items-center justify-center py-12 text-center rounded-md border">
        <p className="text-muted-foreground mb-4">No invoices yet</p>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Your First Invoice
          </Link>
        </Button>
      </div>
    );
  }

  // Mobile: Card layout (Story 20.4)
  if (isMobile) {
    return (
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <InvoiceMobileCard
            key={invoice.id}
            invoice={invoice}
            onView={() => onView(invoice)}
            onEdit={onEdit ? () => onEdit(invoice) : undefined}
            onRecordPayment={
              onRecordPayment ? () => onRecordPayment(invoice) : undefined
            }
            onSend={onSend ? () => onSend(invoice) : undefined}
            onVoid={() => onVoid(invoice)}
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
