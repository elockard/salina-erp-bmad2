"use client";

/**
 * Invoice Edit Form Component
 *
 * Simplified edit form for draft invoices.
 * Based on InvoiceForm but calls updateInvoice action.
 *
 * Story 8.3: Build Invoice List and Detail Views
 * AC-8.3.7: Edit invoice (draft only)
 *
 * NOTE: This is a minimal edit form for the MVP.
 * Future enhancement: Refactor InvoiceForm to support both create and edit modes.
 */

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type CreateInvoiceInput,
  updateInvoice,
} from "@/modules/invoices/actions";
import type {
  InvoiceAddress,
  InvoiceWithLineItems,
} from "@/modules/invoices/types";

interface InvoiceEditFormProps {
  invoice: InvoiceWithLineItems;
}

export function InvoiceEditForm({ invoice }: InvoiceEditFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState(invoice.notes || "");
  const [internalNotes, setInternalNotes] = useState(
    invoice.internal_notes || "",
  );
  const [shippingCost, setShippingCost] = useState(invoice.shipping_cost);

  const handleSubmit = () => {
    startTransition(async () => {
      // Build input from existing invoice data
      const input: CreateInvoiceInput = {
        customerId: invoice.customer_id,
        invoiceDate: new Date(invoice.invoice_date),
        dueDate: new Date(invoice.due_date),
        paymentTerms:
          invoice.payment_terms as CreateInvoiceInput["paymentTerms"],
        customTermsDays: invoice.custom_terms_days || undefined,
        billToAddress: invoice.bill_to_address as InvoiceAddress,
        shipToAddress: invoice.ship_to_address as InvoiceAddress | null,
        poNumber: invoice.po_number || undefined,
        shippingMethod: invoice.shipping_method || undefined,
        shippingCost,
        taxRate: invoice.tax_rate,
        lineItems: invoice.lineItems.map((item) => ({
          lineNumber: item.line_number,
          itemCode: item.item_code || undefined,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxRate: item.tax_rate || undefined,
          amount: item.amount,
          titleId: item.title_id || undefined,
        })),
        notes,
        internalNotes,
      };

      const result = await updateInvoice(invoice.id, input);

      if (result.success) {
        toast.success("Invoice updated successfully");
        router.push(`/invoices/${invoice.id}`);
      } else {
        toast.error(result.error || "Failed to update invoice");
      }
    });
  };

  const handleCancel = () => {
    router.push(`/invoices/${invoice.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Summary Section (read-only) */}
      <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/50 p-4">
        <div>
          <p className="text-sm text-muted-foreground">Invoice Number</p>
          <p className="font-medium">{invoice.invoice_number}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{invoice.customer_id}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Subtotal</p>
          <p className="font-medium">${invoice.subtotal}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">
            Tax ({Number(invoice.tax_rate) * 100}%)
          </p>
          <p className="font-medium">${invoice.tax_amount}</p>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="shipping_cost">Shipping Cost</Label>
          <div className="relative w-32">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="shipping_cost"
              type="number"
              step="0.01"
              min="0"
              value={shippingCost}
              onChange={(e) => setShippingCost(e.target.value)}
              className="pl-6"
              disabled={isPending}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Customer Notes</Label>
          <Textarea
            id="notes"
            placeholder="Notes visible to customer..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="internal_notes">Internal Notes</Label>
          <Textarea
            id="internal_notes"
            placeholder="Notes for internal use only..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            rows={3}
            disabled={isPending}
          />
        </div>
      </div>

      {/* Line Items (read-only for MVP) */}
      <div className="rounded-lg border p-4">
        <h4 className="font-medium mb-2">Line Items</h4>
        <p className="text-sm text-muted-foreground mb-4">
          {invoice.lineItems.length} line item(s). To modify line items, void
          this invoice and create a new one.
        </p>
        <ul className="space-y-2">
          {invoice.lineItems.map((item) => (
            <li key={item.id} className="flex justify-between text-sm">
              <span>
                {item.quantity} x {item.description}
              </span>
              <span className="font-medium">${item.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
        <Button variant="outline" onClick={handleCancel} disabled={isPending}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
