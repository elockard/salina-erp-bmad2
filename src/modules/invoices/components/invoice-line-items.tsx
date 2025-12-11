"use client";

/**
 * Invoice Line Items Component
 *
 * Dynamic line items grid for invoice creation.
 * Uses useFieldArray for add/remove row functionality.
 *
 * Story 8.2: Build Invoice Creation Form
 * AC-8.2.3: Line items grid with add/remove functionality
 * AC-8.2.7: Real-time calculations using Decimal.js
 *
 * Grid columns: Line # | Item Code | Description | Qty | Unit Price | Tax Rate | Amount
 */

import Decimal from "decimal.js";
import { Plus, Trash2 } from "lucide-react";
import { useEffect } from "react";
import { useFieldArray, useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// =============================================================================
// Types
// =============================================================================

export interface LineItemData {
  line_number: number;
  item_code: string;
  description: string;
  quantity: string;
  unit_price: string;
  tax_rate: string;
  amount: string;
}

interface InvoiceLineItemsProps {
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Default tax rate for new line items (decimal, e.g., "0.0825" for 8.25%) */
  defaultTaxRate?: string;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Calculate line item amount using Decimal.js for precision
 * Amount = quantity * unit_price
 */
export function calculateLineAmount(
  quantity: string,
  unitPrice: string,
): string {
  try {
    const qty = new Decimal(quantity || "0");
    const price = new Decimal(unitPrice || "0");
    return qty.times(price).toFixed(2);
  } catch {
    return "0.00";
  }
}

/**
 * Create an empty line item with given line number
 */
export function createEmptyLineItem(
  lineNumber: number,
  defaultTaxRate: string = "0",
): LineItemData {
  return {
    line_number: lineNumber,
    item_code: "",
    description: "",
    quantity: "1",
    unit_price: "0.00",
    tax_rate: defaultTaxRate,
    amount: "0.00",
  };
}

// =============================================================================
// Component
// =============================================================================

export function InvoiceLineItems({
  disabled = false,
  defaultTaxRate = "0",
}: InvoiceLineItemsProps) {
  const { control, setValue } = useFormContext();

  const { fields, append, remove } = useFieldArray({
    control,
    name: "line_items",
  });

  // Watch all line items for recalculation
  const lineItems = useWatch({ control, name: "line_items" }) as
    | LineItemData[]
    | undefined;

  // Recalculate amounts when quantity or unit_price changes
  useEffect(() => {
    if (!lineItems) return;

    lineItems.forEach((item, index) => {
      const calculatedAmount = calculateLineAmount(
        item.quantity,
        item.unit_price,
      );
      if (item.amount !== calculatedAmount) {
        setValue(`line_items.${index}.amount`, calculatedAmount, {
          shouldValidate: false,
        });
      }
    });
  }, [lineItems, setValue]);

  // Add new line item with auto-increment line_number
  const handleAddLineItem = () => {
    const nextLineNumber = fields.length + 1;
    append(createEmptyLineItem(nextLineNumber, defaultTaxRate));
  };

  // Remove line item and resequence line_numbers
  const handleRemoveLineItem = (index: number) => {
    remove(index);
    // Resequence remaining line numbers
    setTimeout(() => {
      fields.forEach((_, i) => {
        if (i >= index) {
          setValue(`line_items.${i}.line_number`, i + 1);
        }
      });
    }, 0);
  };

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
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Line Items</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddLineItem}
          disabled={disabled}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Line Item
        </Button>
      </div>

      {fields.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          <p>No line items yet.</p>
          <Button
            type="button"
            variant="outline"
            className="mt-4"
            onClick={handleAddLineItem}
            disabled={disabled}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add First Line Item
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">Line #</TableHead>
                <TableHead className="w-[120px]">Item Code</TableHead>
                <TableHead className="min-w-[200px]">Description</TableHead>
                <TableHead className="w-[100px]">Qty</TableHead>
                <TableHead className="w-[120px]">Unit Price</TableHead>
                <TableHead className="w-[100px]">Tax Rate %</TableHead>
                <TableHead className="w-[120px] text-right">Amount</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => {
                const item = lineItems?.[index];
                const amount = item
                  ? calculateLineAmount(item.quantity, item.unit_price)
                  : "0.00";

                return (
                  <TableRow key={field.id}>
                    {/* Line Number */}
                    <TableCell className="font-medium">{index + 1}</TableCell>

                    {/* Item Code (optional) */}
                    <TableCell>
                      <FormField
                        control={control}
                        name={`line_items.${index}.item_code`}
                        render={({ field: inputField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                placeholder="SKU"
                                disabled={disabled}
                                className="h-9"
                                {...inputField}
                                value={inputField.value ?? ""}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Description (required) */}
                    <TableCell>
                      <FormField
                        control={control}
                        name={`line_items.${index}.description`}
                        render={({ field: inputField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                placeholder="Description *"
                                disabled={disabled}
                                className="h-9"
                                {...inputField}
                                value={inputField.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Quantity (required, positive) */}
                    <TableCell>
                      <FormField
                        control={control}
                        name={`line_items.${index}.quantity`}
                        render={({ field: inputField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                min="0.01"
                                placeholder="Qty"
                                disabled={disabled}
                                className="h-9"
                                {...inputField}
                                value={inputField.value ?? "1"}
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Unit Price (required, positive) */}
                    <TableCell>
                      <FormField
                        control={control}
                        name={`line_items.${index}.unit_price`}
                        render={({ field: inputField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  $
                                </span>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0.01"
                                  placeholder="0.00"
                                  disabled={disabled}
                                  className="h-9 pl-6"
                                  {...inputField}
                                  value={inputField.value ?? "0.00"}
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Tax Rate (optional, defaults to invoice-level) */}
                    <TableCell>
                      <FormField
                        control={control}
                        name={`line_items.${index}.tax_rate`}
                        render={({ field: inputField }) => (
                          <FormItem className="space-y-0">
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  placeholder="0"
                                  disabled={disabled}
                                  className="h-9 pr-6"
                                  {...inputField}
                                  value={inputField.value ?? "0"}
                                />
                                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground">
                                  %
                                </span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </TableCell>

                    {/* Amount (calculated, read-only) */}
                    <TableCell className="text-right font-medium">
                      {formatCurrency(amount)}
                    </TableCell>

                    {/* Delete button */}
                    <TableCell>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveLineItem(index)}
                        disabled={disabled}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                        <span className="sr-only">Remove line item</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary hint */}
      {fields.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {fields.length} line item{fields.length !== 1 ? "s" : ""}. Amount is
          auto-calculated from Qty × Unit Price.
        </p>
      )}
    </div>
  );
}
