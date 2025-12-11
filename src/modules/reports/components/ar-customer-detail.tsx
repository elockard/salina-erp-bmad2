"use client";

/**
 * AR Customer Detail Panel Component
 *
 * Slide-out panel showing detailed AR info for a specific customer.
 *
 * Story: 8.5 - Build Accounts Receivable Dashboard
 * AC-8.5.4: Customer drill-down showing invoices and payment history
 *
 * Features:
 * - Customer summary stats
 * - Open invoices list with days overdue
 * - Payment history summary
 * - Link to record payment
 */

import { format } from "date-fns";
import {
  AlertCircle,
  Calendar,
  Clock,
  DollarSign,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CustomerARDetail, CustomerInvoiceDetail } from "../types";

interface ARCustomerDetailProps {
  /** Customer AR detail data */
  data: CustomerARDetail | null;
  /** Whether the panel is open */
  isOpen: boolean;
  /** Callback to close the panel */
  onClose: () => void;
  /** Whether data is loading */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
}

/**
 * Format currency for display
 */
function formatCurrency(value: string): string {
  const num = Number.parseFloat(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

/**
 * Get status badge color based on invoice status and days overdue
 */
function getStatusBadge(status: string, daysOverdue: number) {
  if (status === "paid") {
    return <Badge variant="default">Paid</Badge>;
  }
  if (daysOverdue > 90) {
    return <Badge variant="destructive">90+ Days Overdue</Badge>;
  }
  if (daysOverdue > 60) {
    return <Badge variant="destructive">61-90 Days</Badge>;
  }
  if (daysOverdue > 30) {
    return (
      <Badge variant="secondary" className="bg-orange-100 text-orange-700">
        31-60 Days
      </Badge>
    );
  }
  if (daysOverdue > 0) {
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
        1-30 Days
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="bg-green-100 text-green-700">
      Current
    </Badge>
  );
}

/**
 * Loading skeleton for the detail panel
 */
function DetailSkeleton() {
  return (
    <div className="space-y-6" data-testid="ar-customer-detail-skeleton">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/**
 * Invoice row in the detail panel
 */
function InvoiceRow({ invoice }: { invoice: CustomerInvoiceDetail }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/invoices/${invoice.id}`}
          className="font-medium text-primary hover:underline"
        >
          {invoice.invoiceNumber}
        </Link>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(invoice.invoiceDate), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {format(new Date(invoice.dueDate), "MMM d, yyyy")}
      </TableCell>
      <TableCell className="tabular-nums">
        {formatCurrency(invoice.total)}
      </TableCell>
      <TableCell className="tabular-nums font-semibold">
        {formatCurrency(invoice.balanceDue)}
      </TableCell>
      <TableCell>
        {getStatusBadge(invoice.status, invoice.daysOverdue)}
      </TableCell>
      <TableCell>
        <Link href={`/invoices/${invoice.id}?action=payment`}>
          <Button variant="outline" size="sm">
            Record Payment
          </Button>
        </Link>
      </TableCell>
    </TableRow>
  );
}

export function ARCustomerDetail({
  data,
  isOpen,
  onClose,
  isLoading = false,
  error = null,
}: ARCustomerDetailProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        data-testid="ar-customer-detail-panel"
      >
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {isLoading ? (
              <Skeleton className="h-6 w-48" />
            ) : (
              data?.customerName || "Customer Details"
            )}
          </SheetTitle>
          <SheetDescription>
            Accounts receivable details and open invoices
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <DetailSkeleton />
          ) : error ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center"
              data-testid="ar-customer-detail-error"
            >
              <AlertCircle className="h-12 w-12 text-destructive mb-4" />
              <p className="text-destructive font-medium">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Payment History Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Billed
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {formatCurrency(data.paymentHistory.totalBilled)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Paid
                    </CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold text-green-600">
                      {formatCurrency(data.paymentHistory.totalPaid)}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Avg Days to Pay
                    </CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {data.paymentHistory.avgDaysToPay}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Open Invoices */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    Open Invoices ({data.invoices.length})
                  </CardTitle>
                  <CardDescription>
                    Invoices with outstanding balance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {data.invoices.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-muted-foreground">
                        No open invoices for this customer
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Invoice #</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Due Date</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Balance</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.invoices.map((invoice) => (
                            <InvoiceRow key={invoice.id} invoice={invoice} />
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Link href={`/contacts/${data.customerId}`}>
                  <Button variant="outline">View Customer</Button>
                </Link>
                <Link href={`/invoices/new?customerId=${data.customerId}`}>
                  <Button>Create Invoice</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-muted-foreground">
                Select a customer to view details
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
