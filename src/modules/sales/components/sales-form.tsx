"use client";

/**
 * Sales Form Component
 *
 * Form for recording individual sales transactions.
 * Implements "Spacious Guided Flow" UX pattern.
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * AC 1-9: Complete form implementation per specifications
 *
 * Form Fields:
 * - Title (autocomplete search, required, focus on page load)
 * - Format (dropdown, pre-filtered by title)
 * - Quantity (number input, positive integer)
 * - Unit Price (currency input, positive decimal)
 * - Sale Date (Calendar component from shadcn/ui, defaults to today)
 * - Sales Channel (dropdown, remembers last used)
 */

import { TZDate } from "@date-fns/tz";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import Decimal from "decimal.js";
import { CalendarIcon, Loader2 } from "lucide-react";
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
import { salesChannelValues, salesFormatValues } from "@/db/schema/sales";
import { cn } from "@/lib/utils";
import { recordSale } from "../actions";
import type { SalesChannel, SalesFormat, SelectedTitle } from "../types";
import { TitleAutocomplete } from "./title-autocomplete";

/**
 * Local storage key for last-used channel
 * AC 7: Remembers last-used as default
 */
const LAST_CHANNEL_KEY = "salina-last-sales-channel";

/**
 * Format labels for dropdown display
 */
const FORMAT_LABELS: Record<SalesFormat, string> = {
  physical: "Physical Book",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

/**
 * Channel labels for dropdown display
 */
const CHANNEL_LABELS: Record<SalesChannel, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  direct: "Direct",
  distributor: "Distributor",
};

/**
 * Form validation schema
 * Client-side validation with Zod
 */
const salesFormSchema = z.object({
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
  sale_date: z.date({ message: "Sale date is required" }),
  channel: z.enum(salesChannelValues, { error: "Please select a channel" }),
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

interface SalesFormProps {
  /** Tenant timezone for date display (AC 6) */
  timezone?: string;
  /** Whether to autofocus title field on mount (AC 2) */
  autoFocus?: boolean;
}

export function SalesForm({
  timezone = "America/New_York",
  autoFocus = true,
}: SalesFormProps) {
  const [selectedTitle, setSelectedTitle] =
    React.useState<SelectedTitle | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [datePickerOpen, setDatePickerOpen] = React.useState(false);
  const titleRef = React.useRef<HTMLButtonElement>(null);

  // AC 2: Focus title field on page load
  React.useEffect(() => {
    if (autoFocus) {
      // Small delay to ensure component is mounted
      const timer = setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [autoFocus]);

  // Get today's date in tenant timezone
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

  // Get last-used channel from localStorage
  const getLastChannel = (): SalesChannel => {
    if (typeof window === "undefined") return "retail";
    const stored = localStorage.getItem(LAST_CHANNEL_KEY);
    if (stored && salesChannelValues.includes(stored as SalesChannel)) {
      return stored as SalesChannel;
    }
    return "retail";
  };

  const form = useForm<SalesFormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      title_id: "",
      format: undefined,
      quantity: undefined as unknown as number,
      unit_price: "",
      sale_date: today,
      channel: getLastChannel(),
    },
  });

  // Watch values for live calculation
  const quantity = useWatch({ control: form.control, name: "quantity" });
  const unitPrice = useWatch({ control: form.control, name: "unit_price" });
  const watchedFormat = useWatch({ control: form.control, name: "format" });

  // Calculate total using Decimal.js
  const calculateTotal = (): string => {
    if (!quantity || !unitPrice) return "$0.00";
    try {
      const total = new Decimal(unitPrice).times(quantity);
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(total.toNumber());
    } catch {
      return "$0.00";
    }
  };

  const totalAmount = calculateTotal();

  // Get available formats based on selected title
  // Story 7.6: Simplified - all formats enabled if title has ISBN (no type distinction)
  const getAvailableFormats = (): {
    value: SalesFormat;
    label: string;
    disabled: boolean;
  }[] => {
    return salesFormatValues.map((fmt) => {
      let disabled = true;
      if (selectedTitle?.has_isbn) {
        // Physical and ebook enabled if title has ISBN
        if (fmt === "physical" || fmt === "ebook") disabled = false;
        // Audiobook always disabled for now
      }
      return {
        value: fmt,
        label: FORMAT_LABELS[fmt],
        disabled,
      };
    });
  };

  // Handle title selection
  // Story 7.6: Simplified - auto-select physical format if ISBN assigned
  const handleTitleSelect = (title: SelectedTitle | null) => {
    setSelectedTitle(title);
    if (title) {
      form.setValue("title_id", title.id);
      // Auto-select physical format if title has ISBN
      if (title.has_isbn) {
        form.setValue("format", "physical");
      }
    } else {
      form.setValue("title_id", "");
      form.setValue("format", undefined as unknown as SalesFormat);
    }
  };

  // Handle form submission
  const onSubmit = async (data: SalesFormValues) => {
    setIsSubmitting(true);

    // Compute total for server submission
    const total = new Decimal(data.unit_price).times(data.quantity).toFixed(2);

    const result = await recordSale({
      ...data,
      sale_date: dateToString(data.sale_date),
      total_amount: total,
    });

    setIsSubmitting(false);

    if (result.success) {
      // AC 10: Success toast with sale details
      toast.success(
        `✓ Sale recorded: ${result.data.quantity} units of ${
          result.data.title_name
        } - ${new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
        }).format(parseFloat(result.data.total_amount))}`,
      );

      // AC 7: Remember channel for next entry
      localStorage.setItem(LAST_CHANNEL_KEY, data.channel);

      // AC 10: Clear form except channel
      const currentChannel = data.channel;
      form.reset({
        title_id: "",
        format: undefined,
        quantity: undefined as unknown as number,
        unit_price: "",
        sale_date: getTodayInTimezone(),
        channel: currentChannel,
      });
      setSelectedTitle(null);

      // AC 10: Return focus to title field
      setTimeout(() => {
        titleRef.current?.focus();
      }, 100);
    } else {
      // AC 11: Error handling
      if (result.fields) {
        // Set field-specific errors
        Object.entries(result.fields).forEach(([field, message]) => {
          form.setError(field as keyof SalesFormValues, { message });
        });
      }
      toast.error(result.error || "Failed to record sale. Please try again.");
    }
  };

  // Check if form is valid for submit button
  const isFormValid =
    selectedTitle &&
    watchedFormat &&
    quantity > 0 &&
    unitPrice &&
    parseFloat(unitPrice) > 0;

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
                <TitleAutocomplete
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

        {/* Quantity - AC 4 */}
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity *</FormLabel>
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
              <FormDescription>Price per unit sold</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Sale Date - AC 6: Calendar component from shadcn/ui */}
        <FormField
          control={form.control}
          name="sale_date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Sale Date *</FormLabel>
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

        {/* Sales Channel - AC 7 */}
        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sales Channel *</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {salesChannelValues.map((channel) => (
                    <SelectItem key={channel} value={channel}>
                      {CHANNEL_LABELS[channel]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Total Preview - AC 8 */}
        <div className="rounded-lg bg-muted p-4">
          <div className="text-sm text-muted-foreground">
            Total Transaction Value
          </div>
          <div className="text-2xl font-semibold">{totalAmount}</div>
        </div>

        {/* Submit Button - AC 9 */}
        <Button
          type="submit"
          className="w-full"
          size="lg"
          disabled={!isFormValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recording...
            </>
          ) : (
            `Record Sale (${totalAmount})`
          )}
        </Button>
      </form>
    </Form>
  );
}
