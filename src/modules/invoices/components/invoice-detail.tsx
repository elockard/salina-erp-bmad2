"use client";

/**
 * Invoice Detail Component
 *
 * Full invoice display with:
 * - Header: Company info, Invoice #, dates, status
 * - Bill-to / Ship-to addresses
 * - Line items table
 * - Totals section with payment summary
 * - Payment history table
 * - Action buttons
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 4: Create Invoice Detail Component (AC: 8.3.5, 8.3.6)
 *
 * Related:
 * - src/modules/statements/components/statement-detail-modal.tsx (pattern)
 * - docs/sprint-artifacts/8-3-build-invoice-list-and-detail-views.md (layout spec)
 */

import { format } from "date-fns";
import {
  Ban,
  CreditCard,
  Download,
  Edit,
  Loader2,
  Printer,
  RefreshCw,
  Send,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  InvoiceAddress,
  InvoiceStatusType,
  InvoiceWithDetails,
  PaymentWithUser,
} from "../types";
import { InvoiceStatusBadge } from "./invoice-status-badge";

export interface InvoiceDetailProps {
  /** Invoice with line items and payments */
  invoice: InvoiceWithDetails;
  /** Customer name for display */
  customerName: string;
  /** Company/tenant name for header */
  companyName?: string;
  /** Callback when Edit clicked (draft only) */
  onEdit?: () => void;
  /** Callback when Send clicked (draft only) */
  onSend?: () => void;
  /** Callback when Resend clicked (sent invoices) - AC-8.6.5 */
  onResend?: () => void;
  /** Callback when Record Payment clicked */
  onRecordPayment?: () => void;
  /** Callback when Void clicked */
  onVoid?: () => void;
  /** Callback when Download PDF clicked - AC-8.6.6 */
  onDownloadPDF?: () => Promise<void>;
}

/**
 * Format currency for display
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
 * Format address for display
 */
function formatAddress(address: InvoiceAddress | null | undefined): string[] {
  if (!address) return ["No address provided"];

  const lines: string[] = [];
  if (address.line1) lines.push(address.line1);
  if (address.line2) lines.push(address.line2);

  const cityStateZip = [address.city, address.state, address.postal_code]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) lines.push(cityStateZip);

  if (
    address.country &&
    address.country !== "USA" &&
    address.country !== "US"
  ) {
    lines.push(address.country);
  }

  return lines.length > 0 ? lines : ["No address provided"];
}

/**
 * Format payment terms for display
 */
function formatPaymentTerms(terms: string): string {
  const termsMap: Record<string, string> = {
    net_30: "Net 30",
    net_60: "Net 60",
    due_on_receipt: "Due on Receipt",
    custom: "Custom Terms",
  };
  return termsMap[terms] || terms;
}

/**
 * Format payment method for display
 * AC-8.4.9: Payment method display formatting
 */
function formatPaymentMethod(method: string): string {
  const methodMap: Record<string, string> = {
    check: "Check",
    wire: "Wire Transfer",
    credit_card: "Credit Card",
    ach: "ACH Transfer",
    other: "Other",
  };
  return methodMap[method] || method;
}

/**
 * Format user info for Recorded By display
 * AC-8.4.5: Show user email for payment recording
 */
function formatRecordedBy(payment: PaymentWithUser): string {
  if (payment.recordedBy?.email) {
    // Show email username (before @) for cleaner display
    const email = payment.recordedBy.email;
    const username = email.split("@")[0];
    return username;
  }
  return "-";
}

/**
 * Check if action is available based on status
 */
function canEdit(status: InvoiceStatusType): boolean {
  return status === "draft";
}

function canSend(status: InvoiceStatusType): boolean {
  return status === "draft";
}

function canRecordPayment(status: InvoiceStatusType): boolean {
  // AC-8.4.8: Allow payments for sent, partially_paid, and overdue invoices
  return (
    status === "sent" || status === "partially_paid" || status === "overdue"
  );
}

function canVoid(status: InvoiceStatusType): boolean {
  return status !== "void" && status !== "paid";
}

function canResend(status: InvoiceStatusType): boolean {
  // AC-8.6.5: Allow resend for sent, partially_paid, paid, or overdue invoices
  return (
    status === "sent" ||
    status === "partially_paid" ||
    status === "paid" ||
    status === "overdue"
  );
}

/**
 * Invoice detail view component
 *
 * AC-8.3.5: Full invoice display with all sections
 * AC-8.3.6: Action buttons based on status
 */
export function InvoiceDetail({
  invoice,
  customerName,
  companyName = "Your Company",
  onEdit,
  onSend,
  onResend,
  onRecordPayment,
  onVoid,
  onDownloadPDF,
}: InvoiceDetailProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const status = invoice.status as InvoiceStatusType;
  const billToLines = formatAddress(invoice.bill_to_address as InvoiceAddress);
  const shipToLines = formatAddress(invoice.ship_to_address as InvoiceAddress);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!onDownloadPDF) return;
    setIsDownloading(true);
    try {
      await onDownloadPDF();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto print:max-w-none print:mx-0 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 print:flex-row">
        <div>
          <h1 className="text-2xl font-bold print:text-xl">{companyName}</h1>
        </div>
        <div className="text-right space-y-1">
          <div className="flex items-center justify-end gap-2">
            <span className="text-xl font-semibold">
              Invoice #{invoice.invoice_number}
            </span>
            <InvoiceStatusBadge status={status} />
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5">
            <p>
              <span className="font-medium">Date:</span>{" "}
              {format(new Date(invoice.invoice_date), "MMMM d, yyyy")}
            </p>
            <p>
              <span className="font-medium">Due:</span>{" "}
              {format(new Date(invoice.due_date), "MMMM d, yyyy")}
            </p>
            <p>
              <span className="font-medium">Terms:</span>{" "}
              {formatPaymentTerms(invoice.payment_terms)}
            </p>
            {invoice.po_number && (
              <p>
                <span className="font-medium">PO #:</span> {invoice.po_number}
              </p>
            )}
          </div>
        </div>
      </div>

      <Separator />

      {/* Addresses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bill To
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-semibold">{customerName}</p>
            {billToLines.map((line) => (
              <p key={line} className="text-sm">
                {line}
              </p>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ship To
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoice.ship_to_address ? (
              <>
                <p className="font-semibold">{customerName}</p>
                {shipToLines.map((line) => (
                  <p key={line} className="text-sm">
                    {line}
                  </p>
                ))}
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Same as billing address
              </p>
            )}
            {invoice.shipping_method && (
              <p className="text-sm mt-2">
                <span className="font-medium">Method:</span>{" "}
                {invoice.shipping_method}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Line Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead className="w-[120px]">Item Code</TableHead>
                  <TableHead className="min-w-[200px]">Description</TableHead>
                  <TableHead className="w-[80px] text-right">Qty</TableHead>
                  <TableHead className="w-[120px] text-right">
                    Unit Price
                  </TableHead>
                  <TableHead className="w-[120px] text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.line_number}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {item.item_code || "-"}
                    </TableCell>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unit_price)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totals Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatCurrency(invoice.tax_amount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{formatCurrency(invoice.shipping_cost)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="text-green-600">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Balance Due</span>
                <span
                  className={
                    Number.parseFloat(invoice.balance_due) > 0
                      ? "text-amber-600"
                      : ""
                  }
                >
                  {formatCurrency(invoice.balance_due)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      {invoice.payments && invoice.payments.length > 0 && (
        <Card className="print:break-before-page">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Recorded By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        {/* AC-8.4.9: Proper payment method labels */}
                        {formatPaymentMethod(payment.payment_method)}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {payment.reference_number || "-"}
                      </TableCell>
                      <TableCell>
                        {/* AC-8.4.5: User name for Recorded By */}
                        {formatRecordedBy(payment)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {canEdit(status) && onEdit && (
          <Button variant="outline" onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
        )}

        {canSend(status) && onSend && (
          <Button variant="outline" onClick={onSend}>
            <Send className="mr-2 h-4 w-4" />
            Send
          </Button>
        )}

        {canResend(status) && onResend && (
          <Button variant="outline" onClick={onResend}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Resend
          </Button>
        )}

        {canRecordPayment(status) && onRecordPayment && (
          <Button variant="outline" onClick={onRecordPayment}>
            <CreditCard className="mr-2 h-4 w-4" />
            Record Payment
          </Button>
        )}

        {canVoid(status) && onVoid && (
          <Button
            variant="outline"
            onClick={onVoid}
            className="text-red-600 hover:text-red-700"
          >
            <Ban className="mr-2 h-4 w-4" />
            Void
          </Button>
        )}

        <Button variant="outline" onClick={handlePrint}>
          <Printer className="mr-2 h-4 w-4" />
          Print
        </Button>

        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          disabled={!onDownloadPDF || isDownloading}
        >
          {isDownloading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Downloading...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
