"use client";

/**
 * Returns Form Component
 *
 * Form for recording return requests that go through approval workflow.
 * Implements "Spacious Guided Flow" UX pattern.
 *
 * Story 3.5: Build Return Request Entry Form
 * AC 2-10: Complete form implementation per specifications
 * AC 14: Cancel button returns to /returns
 *
 * Form Fields:
 * - Title (autocomplete search, required)
 * - Format (dropdown, pre-filtered by title)
 * - Quantity Returned (number input, positive integer)
 * - Unit Price (currency input, positive decimal)
 * - Return Date (Calendar component, defaults to today, cannot be future)
 * - Reason (dropdown with conditional text field)
 * - Original Sale Reference (optional text)
 */

import { TZDate } from "@date-fns/tz";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { salesFormatValues } from "@/db/schema/sales";
import { cn } from "@/lib/utils";
import { recordReturn } from "../actions";
import { RETURN_REASON_LABELS, returnReasonValues } from "../schema";
import type { SelectedTitleForReturn } from "../types";
import { TitleSearchCombobox } from "./title-search-combobox";

type SalesFormat = (typeof salesFormatValues)[number];

/**
 * Format labels for dropdown display (AC 3)
 */
const FORMAT_LABELS: Record<SalesFormat, string> = {
  physical: "Physical Book",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

/**
 * Form validation schema (client-side)
 * Mirrors server-side createReturnSchema
 */
const returnsFormSchema = z
  .object({
    title_id: z.string().uuid("Please select a title"),
    format: z.enum(salesFormatValues, { error: "Please select a format" }),
    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .positive("Quantity must be greater than 0"),
    unit_price: z
      .string()
      .min(1, "Unit price is required")
      .refine(
        (val) => {
          const num = parseFloat(val);
          return !Number.isNaN(num) && num > 0;
        },
        { message: "Unit price must be greater than 0" },
      )
      .refine(
        (val) => {
          const parts = val.split(".");
          return parts.length === 1 || (parts[1]?.length ?? 0) <= 2;
        },
        { message: "Unit price cannot have more than 2 decimal places" },
      ),
    return_date: z.date({ message: "Return date is required" }),
    reason: z.enum(returnReasonValues, {
      error: "Please select a reason",
    }),
    reason_other: z.string().max(500).optional(),
    original_sale_reference: z.string().max(100).optional(),
  })
  .refine(
    (data) => {
      if (data.reason === "other") {
        return data.reason_other && data.reason_other.trim().length > 0;
      }
      return true;
    },
    {
      message: "Please describe the reason for return",
      path: ["reason_other"],
    },
  );

type ReturnsFormValues = z.infer<typeof returnsFormSchema>;

interface ReturnsFormProps {
  /** Tenant timezone for date display (AC 6) */
  timezone?: string;
  /** Whether to autofocus title field on mount */
  autoFocus?: boolean;
}

export function ReturnsForm({
  timezone = "America/New_York",
  autoFocus = true,
}: ReturnsFormProps) {
  const router = useRouter();
  const [selectedTitle, setSelectedTitle] =
    React.useState<SelectedTitleForReturn | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const titleRef = React.useRef<HTMLButtonElement>(null);

  // Focus title field on page load
  React.useEffect(() => {
    if (autoFocus) {
      const timer = setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Get today's date in tenant timezone (AC 6)
  const getTodayInTimezone = (): Date => {
    try {
      return new TZDate(new Date(), timezone);
    } catch {
      return new Date();
    }
  };

  const today = getTodayInTimezone();

  // Format date for display in tenant timezone (AC 6)
  const formatDateInTimezone = (date: Date): string => {
    try {
      const tzDate = new TZDate(date, timezone);
      return format(tzDate, "MMMM d, yyyy");
    } catch {
      return format(date, "MMMM d, yyyy");
    }
  };

  // Convert date to YYYY-MM-DD string for server
  const dateToString = (date: Date): string => {
    return format(date, "yyyy-MM-dd");
  };

  const form = useForm<ReturnsFormValues>({
    resolver: zodResolver(returnsFormSchema),
    defaultValues: {
      title_id: "",
      format: undefined,
      quantity: undefined as unknown as number,
      unit_price: "",
      return_date: today,
      reason: undefined,
      reason_other: "",
      original_sale_reference: "",
    },
  });

  // Watch values for live calculation and conditional fields
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const unitPrice = useWatch({ control: form.control, name: "unit_price" });
  const watchedFormat = useWatch({ control: form.control, name: "format" });
  const watchedReason = useWatch({ control: form.control, name: "reason" });

  // Calculate return amount using Decimal.js (AC 9)
  // CRITICAL: Never use JavaScript arithmetic for currency
  const calculateReturnAmount = (): string => {
    if (!quantity || !unitPrice) return "-$0.00";
    try {
      const total = new Decimal(unitPrice).times(quantity);
      const formatted = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(total.toNumber());
      // Display as negative to indicate deduction (AC 9)
      return `-${formatted}`;
    } catch {
      return "-$0.00";
    }
  };

  const returnAmount = calculateReturnAmount();

  // Get available formats based on selected title (AC 3)
  const getAvailableFormats = (): {
    value: SalesFormat;
    label: string;
    disabled: boolean;
  }[] => {
    return salesFormatValues.map((fmt) => {
      let disabled = true;
      if (selectedTitle) {
        if (fmt === "physical" && selectedTitle.has_isbn) disabled = false;
        if (fmt === "ebook" && selectedTitle.has_eisbn) disabled = false;
        // Audiobook always disabled for now
      }
      return {
        value: fmt,
        label: FORMAT_LABELS[fmt],
        disabled,
      };
    });
  };

  // Handle title selection (AC 2, AC 3)
  const handleTitleSelect = (title: SelectedTitleForReturn | null) => {
    setSelectedTitle(title);
    if (title) {
      form.setValue("title_id", title.id);
      // Auto-select first available format (AC 3)
      if (title.has_isbn) {
        form.setValue("format", "physical");
      } else if (title.has_eisbn) {
        form.setValue("format", "ebook");
      }
    } else {
      form.setValue("title_id", "");
      form.setValue("format", undefined as unknown as SalesFormat);
    }
  };

  // Handle form submission (AC 10, AC 11)
  const onSubmit = async (data: ReturnsFormValues) => {
    setIsSubmitting(true);

    // Compute total for server submission
    const total = new Decimal(data.unit_price).times(data.quantity).toFixed(2);

    const result = await recordReturn({
      ...data,
      return_date: dateToString(data.return_date),
      total_amount: total,
    });

    setIsSubmitting(false);

    if (result.success) {
      // AC 11: Success toast
      toast.success("Return request submitted for approval");

      // AC 11: Redirect to /returns
      router.push("/returns");
    } else {
      // AC 13: Error handling
      if (result.fields) {
        // Set field-specific errors
        Object.entries(result.fields).forEach(([field, message]) => {
          form.setError(field as keyof ReturnsFormValues, { message });
        });
      }
      toast.error(result.error || "Failed to record return. Please try again.");
    }
  };

  // Handle cancel (AC 14)
  const handleCancel = () => {
    router.push("/returns");
  };

  // Check if form is valid for submit button
  const isFormValid =
    selectedTitle &&
    watchedFormat &&
    quantity > 0 &&
    unitPrice &&
    parseFloat(unitPrice) > 0 &&
    watchedReason;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Title Autocomplete - AC 2 */}
        <FormField
          control={form.control}
          name="title_id"
          render={() => (
            <FormItem>
              <FormLabel>Title *</FormLabel>
              <FormControl>
                <TitleSearchCombobox
                  value={selectedTitle}
                  onSelect={handleTitleSelect}
                  disabled={isSubmitting}
                  placeholder="Search for a title..."
                  triggerRef={titleRef}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Format Dropdown - AC 3 */}
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Format *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={!selectedTitle || isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {getAvailableFormats().map((fmt) => (
                    <SelectItem
                      key={fmt.value}
                      value={fmt.value}
                      disabled={fmt.disabled}
                    >
                      {fmt.label}
                      {fmt.disabled && " (not available)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!selectedTitle && (
                <FormDescription>Select a title first</FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Quantity Returned - AC 4 */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity Returned *</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  min={1}
                  step={1}
                  disabled={isSubmitting}
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    field.onChange(val ? parseInt(val, 10) : undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Unit Price - AC 5 */}
        <FormField
          control={form.control}
          name="unit_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Unit Price *</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="pl-7"
                    disabled={isSubmitting}
                    {...field}
                    onChange={(e) => {
                      // Allow only valid decimal input
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      field.onChange(val);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>Price per unit returned</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Return Date - AC 6 */}
        <FormField
          control={form.control}
          name="return_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Return Date *</FormLabel>
              <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      disabled={isSubmitting}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value ? (
                        formatDateInTimezone(field.value)
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      field.onChange(date);
                      setDatePickerOpen(false);
                    }}
                    disabled={(date) => date > today}
                    defaultMonth={field.value}
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                Displayed in {timezone} timezone
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reason - AC 7 */}
        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reason *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {returnReasonValues.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {RETURN_REASON_LABELS[reason]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Reason Other - AC 7: Conditional text field when "Other" selected */}
        {watchedReason === "other" && (
          <FormField
            control={form.control}
            name="reason_other"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Please describe the reason *</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Please describe the reason for return"
                    disabled={isSubmitting}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Original Sale Reference - AC 8 */}
        <FormField
          control={form.control}
          name="original_sale_reference"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Original Sale Reference</FormLabel>
              <FormControl>
                <Input
                  type="text"
                  placeholder="e.g., Invoice #12345"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Optional reference for verification
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Return Amount Preview - AC 9 */}
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm text-muted-foreground">Return Amount</div>
          <div className="text-2xl font-semibold text-destructive">
            {returnAmount}
          </div>
        </div>

        {/* Action Buttons - AC 10, AC 14 */}
        <div className="flex gap-4">
          {/* Cancel Button - AC 14 */}
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>

          {/* Submit Button - AC 10 */}
          <Button
            type="submit"
            className="flex-1"
            size="lg"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Return Request"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
