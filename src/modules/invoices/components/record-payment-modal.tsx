"use client";

/**
 * Record Payment Modal
 *
 * Modal dialog for recording payments against invoices with:
 * - Invoice reference and balance due display
 * - Payment date picker
 * - Amount input with overpayment warning
 * - Payment method dropdown
 * - Reference number and notes fields
 *
 * Story: 8.4 - Implement Payment Recording
 * AC-8.4.1: Record payment modal with all required fields
 * AC-8.4.2: Payment amount validation with overpayment warning
 * AC-8.4.10: Keyboard accessibility
 *
 * Related:
 * - src/modules/invoices/components/void-invoice-dialog.tsx (similar pattern)
 * - src/modules/invoices/actions.ts (recordPayment action)
 * - src/modules/invoices/schema.ts (recordPaymentSchema)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { recordPayment } from "../actions";
import { paymentMethodSchema } from "../schema";

// =============================================================================
// Form Schema (separate from API schema for proper type inference)
// =============================================================================

/**
 * Payment form schema
 * Uses z.date() instead of z.coerce.date() for proper form type inference
 */
const paymentFormSchema = z.object({
  invoice_id: z.string().uuid("Invalid invoice ID"),
  payment_date: z.date({ message: "Payment date is required" }),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((val) => Number.parseFloat(val) > 0, "Amount must be positive"),
  payment_method: paymentMethodSchema,
  reference_number: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

type PaymentFormData = z.infer<typeof paymentFormSchema>;

/**
 * Props for RecordPaymentModal
 */
export interface RecordPaymentModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** Invoice UUID */
  invoiceId: string;
  /** Invoice number for display */
  invoiceNumber: string;
  /** Customer name for display */
  customerName: string;
  /** Current balance due on the invoice */
  balanceDue: string;
  /** Callback when payment is recorded successfully */
  onSuccess?: () => void;
}

/**
 * Payment method options for dropdown
 * AC-8.4.9: Payment method display formatting
 */
const paymentMethodOptions = [
  { value: "check", label: "Check" },
  { value: "wire", label: "Wire Transfer" },
  { value: "credit_card", label: "Credit Card" },
  { value: "ach", label: "ACH Transfer" },
  { value: "other", label: "Other" },
] as const;

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
 * Record Payment Modal Component
 *
 * AC-8.4.1: Full form with all required fields
 * AC-8.4.2: Amount validation with overpayment warning
 * AC-8.4.10: Keyboard accessibility (Tab, Escape, Enter)
 */
export function RecordPaymentModal({
  open,
  onOpenChange,
  invoiceId,
  invoiceNumber,
  customerName,
  balanceDue,
  onSuccess,
}: RecordPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PaymentFormData>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      invoice_id: invoiceId,
      payment_date: new Date(),
      amount: balanceDue,
      payment_method: undefined,
      reference_number: "",
      notes: "",
    },
  });

  // Reset form when modal opens or invoice changes (prevents stale data)
  useEffect(() => {
    if (open) {
      form.reset({
        invoice_id: invoiceId,
        payment_date: new Date(),
        amount: balanceDue,
        payment_method: undefined,
        reference_number: "",
        notes: "",
      });
    }
  }, [invoiceId, balanceDue, open, form]);

  // Watch amount for overpayment warning - AC-8.4.2
  const watchedAmount = form.watch("amount");
  const isOverpayment =
    Number.parseFloat(watchedAmount || "0") > Number.parseFloat(balanceDue);

  async function onSubmit(data: PaymentFormData) {
    setIsSubmitting(true);
    try {
      const result = await recordPayment({
        invoice_id: data.invoice_id,
        payment_date: data.payment_date,
        amount: data.amount,
        payment_method: data.payment_method,
        reference_number: data.reference_number,
        notes: data.notes,
      });

      if (result.success) {
        toast.success(
          `Payment of ${formatCurrency(data.amount)} recorded successfully`,
        );
        onOpenChange(false);
        onSuccess?.();
      } else {
        toast.error(result.error || "Failed to record payment");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="record-payment-modal">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Invoice {invoiceNumber} for {customerName}
          </DialogDescription>
        </DialogHeader>

        {/* Balance Due Display - AC-8.4.1 */}
        <div className="rounded-lg bg-muted p-4 text-center" data-testid="balance-due-display">
          <p className="text-sm text-muted-foreground">Balance Due</p>
          <p className="text-2xl font-bold text-amber-600" data-testid="balance-due-amount">
            {formatCurrency(balanceDue)}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Payment Date - AC-8.4.1 */}
            <FormField
              control={form.control}
              name="payment_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Payment Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date > new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount - AC-8.4.1, AC-8.4.2 */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input {...field} className="pl-7" placeholder="0.00" />
                    </div>
                  </FormControl>
                  {isOverpayment && (
                    <FormDescription className="text-amber-600">
                      Payment exceeds balance due. Excess will be applied as
                      credit.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method - AC-8.4.1 */}
            <FormField
              control={form.control}
              name="payment_method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {paymentMethodOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference Number - AC-8.4.1 */}
            <FormField
              control={form.control}
              name="reference_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Number</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Check #, Transaction ID, etc."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes - AC-8.4.1 */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Optional notes about this payment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} data-testid="apply-payment-button">
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Apply Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
