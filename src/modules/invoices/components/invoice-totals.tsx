"use client";

/**
 * Invoice Totals Component
 *
 * Displays calculated invoice totals: subtotal, tax, shipping, and grand total.
 * Watches line items and shipping cost for real-time updates.
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.3: Line items section includes subtotal, tax, shipping, and grand total
 * AC-8.2.7: Real-time calculations using Decimal.js
 */

import Decimal from "decimal.js";
import { useFormContext, useWatch } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { LineItemData } from "./invoice-line-items";

// =============================================================================
// Types
// =============================================================================

export interface InvoiceTotals {
  subtotal: string;
  taxAmount: string;
  shippingCost: string;
  grandTotal: string;
}

interface InvoiceTotalsProps {
  /** Whether the component is disabled */
  disabled?: boolean;
}

// =============================================================================
// Calculation Functions
// =============================================================================

/**
 * Calculate invoice subtotal from line items
 * Subtotal = sum of all (quantity * unit_price)
 */
export function calculateSubtotal(
  lineItems: LineItemData[] | undefined,
): string {
  if (!lineItems || lineItems.length === 0) {
    return "0.00";
  }

  try {
    const subtotal = lineItems.reduce((sum, item) => {
      const qty = new Decimal(item.quantity || "0");
      const price = new Decimal(item.unit_price || "0");
      return sum.plus(qty.times(price));
    }, new Decimal(0));

    return subtotal.toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Calculate total tax from line items
 * Tax is calculated per line item based on line-level tax_rate
 * Tax = sum of all (quantity * unit_price * tax_rate / 100)
 */
export function calculateTax(lineItems: LineItemData[] | undefined): string {
  if (!lineItems || lineItems.length === 0) {
    return "0.00";
  }

  try {
    const totalTax = lineItems.reduce((sum, item) => {
      const qty = new Decimal(item.quantity || "0");
      const price = new Decimal(item.unit_price || "0");
      const taxRate = new Decimal(item.tax_rate || "0").div(100); // Convert % to decimal
      const lineAmount = qty.times(price);
      const lineTax = lineAmount.times(taxRate);
      return sum.plus(lineTax);
    }, new Decimal(0));

    return totalTax.toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Calculate grand total
 * Grand Total = subtotal + tax + shipping
 */
export function calculateGrandTotal(
  subtotal: string,
  taxAmount: string,
  shippingCost: string,
): string {
  try {
    const sub = new Decimal(subtotal || "0");
    const tax = new Decimal(taxAmount || "0");
    const shipping = new Decimal(shippingCost || "0");
    return sub.plus(tax).plus(shipping).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Calculate all invoice totals at once
 */
export function calculateInvoiceTotals(
  lineItems: LineItemData[] | undefined,
  shippingCost: string,
): InvoiceTotals {
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(lineItems);
  const grandTotal = calculateGrandTotal(subtotal, taxAmount, shippingCost);

  return {
    subtotal,
    taxAmount,
    shippingCost: shippingCost || "0.00",
    grandTotal,
  };
}

// =============================================================================
// Component
// =============================================================================

export function InvoiceTotals({ disabled = false }: InvoiceTotalsProps) {
  const { control } = useFormContext();

  // Watch line items and shipping cost for real-time updates
  const lineItems = useWatch({ control, name: "line_items" }) as
    | LineItemData[]
    | undefined;
  const shippingCost = useWatch({ control, name: "shipping_cost" }) as
    | string
    | undefined;

  // Calculate totals
  const subtotal = calculateSubtotal(lineItems);
  const taxAmount = calculateTax(lineItems);
  const grandTotal = calculateGrandTotal(
    subtotal,
    taxAmount,
    shippingCost || "0",
  );

  // Format currency for display
  const formatCurrency = (value: string): string => {
    try {
      const num = parseFloat(value);
      return Number.isNaN(num) ? "$0.00" : `$${num.toFixed(2)}`;
    } catch {
      return "$0.00";
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">Invoice Totals</h3>

      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="space-y-3">
          {/* Subtotal Row */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="font-medium">{formatCurrency(subtotal)}</span>
          </div>

          {/* Tax Row */}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatCurrency(taxAmount)}</span>
          </div>

          {/* Shipping Row (editable) */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted-foreground">Shipping</span>
            <FormField
              control={control}
              name="shipping_cost"
              render={({ field }) => (
                <FormItem className="flex-shrink-0 space-y-0">
                  <FormControl>
                    <div className="relative w-32">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        disabled={disabled}
                        className="h-8 pl-6 text-right"
                        {...field}
                        value={field.value ?? "0.00"}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>

          <Separator />

          {/* Grand Total Row */}
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Grand Total</span>
            <span className="text-lg font-bold">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* Summary breakdown */}
      {lineItems && lineItems.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Calculated from {lineItems.length} line item
          {lineItems.length !== 1 ? "s" : ""}. Tax is computed per line using
          individual tax rates.
        </p>
      )}
    </div>
  );
}
