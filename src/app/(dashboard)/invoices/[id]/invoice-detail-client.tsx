"use client";

/**
 * Invoice Detail Client Component
 *
 * Client-side wrapper for invoice detail with action handling.
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.5, AC-8.3.6: Detail view with actions
 *
 * Story 8.4: Implement Payment Recording
 * AC-8.4.1: Record payment modal integration
 */

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { voidInvoice } from "@/modules/invoices/actions";
import {
  InvoiceDetail,
  RecordPaymentModal,
  VoidInvoiceDialog,
} from "@/modules/invoices/components";
import type { InvoiceWithDetails } from "@/modules/invoices/types";

interface InvoiceDetailClientProps {
  invoice: InvoiceWithDetails;
  customerName: string;
}

export function InvoiceDetailClient({
  invoice,
  customerName,
}: InvoiceDetailClientProps) {
  const router = useRouter();
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const handleEdit = useCallback(() => {
    router.push(`/invoices/${invoice.id}/edit`);
  }, [router, invoice.id]);

  const handleSend = useCallback(() => {
    toast.info("Send Invoice will be available in Story 8.6");
  }, []);

  // Open payment modal - AC-8.4.1
  const handleRecordPayment = useCallback(() => {
    setPaymentModalOpen(true);
  }, []);

  // Handle successful payment - refresh data
  const handlePaymentSuccess = useCallback(() => {
    router.refresh();
  }, [router]);

  const handleVoid = useCallback(() => {
    setVoidDialogOpen(true);
  }, []);

  const handleVoidConfirm = useCallback(
    async (reason: string) => {
      const result = await voidInvoice(invoice.id, reason);

      if (result.success) {
        toast.success(`Invoice ${invoice.invoice_number} has been voided`);
        router.refresh();
      } else {
        toast.error(result.error || "Failed to void invoice");
      }
    },
    [invoice.id, invoice.invoice_number, router],
  );

  return (
    <>
      <InvoiceDetail
        invoice={invoice}
        customerName={customerName}
        onEdit={handleEdit}
        onSend={handleSend}
        onRecordPayment={handleRecordPayment}
        onVoid={handleVoid}
      />

      {/* Void Invoice Dialog */}
      <VoidInvoiceDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        invoiceNumber={invoice.invoice_number}
        invoiceAmount={invoice.total}
        onConfirm={handleVoidConfirm}
      />

      {/* Record Payment Modal - AC-8.4.1 */}
      <RecordPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        invoiceId={invoice.id}
        invoiceNumber={invoice.invoice_number}
        customerName={customerName}
        balanceDue={invoice.balance_due}
        onSuccess={handlePaymentSuccess}
      />
    </>
  );
}
