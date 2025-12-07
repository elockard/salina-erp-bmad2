"use client";

/**
 * Invoice Form Component
 *
 * Main invoice creation form that integrates all sub-components.
 * Implements "Spacious Guided Flow" UX pattern.
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.2-8.2.5: Complete form implementation per specifications
 * AC-8.2.9: Due date auto-calculation based on payment terms
 * AC-8.2.10: Success feedback and redirect
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { addDays, format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isCustomerRoleData } from "@/modules/contacts/types";
import { createInvoice, type CreateInvoiceInput } from "@/modules/invoices/actions";
import { BillToAddressForm, createEmptyAddress, ShipToAddressForm } from "./address-form";
import { type SelectedCustomer, CustomerSelector } from "./customer-selector";
import { createEmptyLineItem, InvoiceLineItems } from "./invoice-line-items";
import { InvoiceTotals } from "./invoice-totals";

// =============================================================================
// Form Schema
// =============================================================================

/**
 * Form-specific schema (different from API schema)
 * Uses more relaxed types for form state management
 */
const invoiceFormSchema = z.object({
  // Customer
  customer_id: z.string().uuid("Please select a customer"),

  // Dates
  invoice_date: z.date({ message: "Invoice date is required" }),
  due_date: z.date({ message: "Due date is required" }),

  // Payment terms
  payment_terms: z.enum(["net_30", "net_60", "due_on_receipt", "custom"]),
  custom_terms_days: z.number().int().positive().nullable().optional(),

  // Addresses
  bill_to_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }),
  ship_to_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }),
  same_as_bill_to: z.boolean().default(true),

  // Additional header fields
  po_number: z.string().optional(),
  shipping_method: z.string().optional(),
  shipping_cost: z.string().default("0.00"),

  // Line items
  line_items: z.array(z.object({
    line_number: z.number(),
    item_code: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    quantity: z.string(),
    unit_price: z.string(),
    tax_rate: z.string(),
    amount: z.string(),
  })).min(1, "At least one line item is required"),

  // Notes
  notes: z.string().optional(),
  internal_notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

// =============================================================================
// Payment Terms
// =============================================================================

const PAYMENT_TERMS_OPTIONS = [
  { value: "net_30", label: "Net 30" },
  { value: "net_60", label: "Net 60" },
  { value: "due_on_receipt", label: "Due on Receipt" },
  { value: "custom", label: "Custom" },
] as const;

/**
 * Calculate due date based on payment terms (AC-8.2.9)
 */
function calculateDueDate(invoiceDate: Date, paymentTerms: string, customDays?: number | null): Date {
  switch (paymentTerms) {
    case "net_30":
      return addDays(invoiceDate, 30);
    case "net_60":
      return addDays(invoiceDate, 60);
    case "due_on_receipt":
      return invoiceDate;
    case "custom":
      return addDays(invoiceDate, customDays || 0);
    default:
      return addDays(invoiceDate, 30);
  }
}

// =============================================================================
// Component
// =============================================================================

interface InvoiceFormProps {
  /** Tenant timezone for date display */
  timezone?: string;
}

export function InvoiceForm({ timezone = "America/New_York" }: InvoiceFormProps) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<SelectedCustomer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with default values
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues: {
      customer_id: "",
      invoice_date: new Date(),
      due_date: addDays(new Date(), 30), // Default Net 30
      payment_terms: "net_30",
      custom_terms_days: null,
      bill_to_address: createEmptyAddress(),
      ship_to_address: createEmptyAddress(),
      same_as_bill_to: true,
      po_number: "",
      shipping_method: "",
      shipping_cost: "0.00",
      line_items: [createEmptyLineItem(1)],
      notes: "",
      internal_notes: "",
    },
  });

  // Watch payment terms and invoice date for due date calculation
  const invoiceDate = useWatch({ control: form.control, name: "invoice_date" });
  const paymentTerms = useWatch({ control: form.control, name: "payment_terms" });
  const customTermsDays = useWatch({ control: form.control, name: "custom_terms_days" });

  // Auto-calculate due date when payment terms or invoice date changes (AC-8.2.9)
  useEffect(() => {
    if (invoiceDate && paymentTerms) {
      const newDueDate = calculateDueDate(invoiceDate, paymentTerms, customTermsDays);
      form.setValue("due_date", newDueDate, { shouldValidate: true });
    }
  }, [invoiceDate, paymentTerms, customTermsDays, form]);

  // Handle customer selection (AC-8.2.8)
  const handleCustomerSelect = (customer: SelectedCustomer | null) => {
    setSelectedCustomer(customer);

    if (customer) {
      form.setValue("customer_id", customer.id, { shouldValidate: true });

      // Auto-populate bill-to address from customer's billing_address
      const customerRole = customer.contact.roles.find((r) => r.role === "customer");
      if (customerRole?.role_specific_data && isCustomerRoleData(customerRole.role_specific_data)) {
        const { billing_address } = customerRole.role_specific_data;
        if (billing_address) {
          form.setValue("bill_to_address", {
            line1: billing_address.line1 || "",
            line2: billing_address.line2 || "",
            city: billing_address.city || "",
            state: billing_address.state || "",
            postal_code: billing_address.postal_code || "",
            country: billing_address.country || "",
          });
        }
      }
    } else {
      form.setValue("customer_id", "");
      form.setValue("bill_to_address", createEmptyAddress());
    }
  };

  // Handle form submission
  const onSubmit = async (data: InvoiceFormValues) => {
    setIsSubmitting(true);

    try {
      // Prepare line items for submission
      const lineItems = data.line_items.map((item, index) => ({
        lineNumber: index + 1,
        itemCode: item.item_code,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        amount: item.amount,
      }));

      // Build invoice input
      // Note: Tax is calculated per line item, invoice-level tax rate is 0 by default
      // The server recalculates totals for security
      const invoiceInput: CreateInvoiceInput = {
        customerId: data.customer_id,
        invoiceDate: data.invoice_date,
        dueDate: data.due_date,
        paymentTerms: data.payment_terms,
        customTermsDays: data.payment_terms === "custom" ? data.custom_terms_days ?? undefined : undefined,
        billToAddress: data.bill_to_address,
        shipToAddress: data.same_as_bill_to ? data.bill_to_address : data.ship_to_address,
        poNumber: data.po_number,
        shippingMethod: data.shipping_method,
        shippingCost: data.shipping_cost,
        taxRate: "0.0000", // Tax is per-line-item, not invoice-level
        lineItems,
        notes: data.notes,
        internalNotes: data.internal_notes,
      };

      // Call createInvoice server action (AC-8.2.6)
      const result = await createInvoice(invoiceInput);

      if (result.success) {
        // Success feedback (AC-8.2.10)
        toast.success(`Invoice ${result.data.invoice.invoice_number} created successfully`);
        router.push("/invoices");
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      console.error("Invoice creation error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Header Section */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selector (AC-8.2.2) */}
            <FormField
              control={form.control}
              name="customer_id"
              render={() => (
                <FormItem>
                  <FormLabel>Customer *</FormLabel>
                  <FormControl>
                    <CustomerSelector
                      value={selectedCustomer}
                      onSelect={handleCustomerSelect}
                      disabled={isSubmitting}
                    />
                  </FormControl>
                  <FormDescription>
                    Search and select a customer for this invoice
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-6">
              {/* Invoice Date */}
              <FormField
                control={form.control}
                name="invoice_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? format(field.value, "PPP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isSubmitting}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Due Date (AC-8.2.9: auto-calculated) */}
              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground",
                            )}
                            disabled={isSubmitting}
                          >
                            {field.value ? format(field.value, "PPP") : "Select date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={isSubmitting}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      Auto-calculated from payment terms (editable)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Payment Terms */}
              <FormField
                control={form.control}
                name="payment_terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Terms *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select payment terms" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PAYMENT_TERMS_OPTIONS.map((option) => (
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

              {/* Custom Terms Days (shown only when payment_terms is 'custom') */}
              {paymentTerms === "custom" && (
                <FormField
                  control={form.control}
                  name="custom_terms_days"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Terms (Days) *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          placeholder="Enter days"
                          disabled={isSubmitting}
                          {...field}
                          value={field.value ?? ""}
                          onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value, 10) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* P.O. Number (optional) */}
              <FormField
                control={form.control}
                name="po_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>P.O. Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Purchase order number (optional)"
                        disabled={isSubmitting}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Shipping Method (optional) */}
              <FormField
                control={form.control}
                name="shipping_method"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping Method</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., UPS Ground (optional)"
                        disabled={isSubmitting}
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Address Section (AC-8.2.2, 8.2.8) */}
        <Card>
          <CardHeader>
            <CardTitle>Addresses</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            <BillToAddressForm
              prefix="bill_to_address"
              title="Bill-To Address"
              disabled={isSubmitting}
            />

            <Separator />

            <ShipToAddressForm
              title="Ship-To Address"
              disabled={isSubmitting}
              showSameAs={true}
            />
          </CardContent>
        </Card>

        {/* Line Items Section (AC-8.2.3, 8.2.7) */}
        <Card>
          <CardHeader>
            <CardTitle>Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceLineItems disabled={isSubmitting} />
          </CardContent>
        </Card>

        {/* Totals Section (AC-8.2.3, 8.2.7) */}
        <Card>
          <CardContent className="pt-6">
            <InvoiceTotals disabled={isSubmitting} />
          </CardContent>
        </Card>

        {/* Notes Section (AC-8.2.4) */}
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes to Customer</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes that will appear on the printed invoice..."
                      className="min-h-[100px]"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    These notes will be visible on the printed invoice
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="internal_notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Internal notes (not visible to customer)..."
                      className="min-h-[80px]"
                      disabled={isSubmitting}
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormDescription>
                    For internal use only - not visible on invoice
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Form Actions (AC-8.2.4) */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/invoices")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save as Draft
          </Button>
        </div>
      </form>
    </Form>
  );
}
