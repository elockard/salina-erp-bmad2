"use client";

/**
 * Invoice Filters Component
 *
 * Filter controls for invoice list:
 * - Status filter dropdown
 * - Customer search combobox
 * - Date range filter (from/to)
 * - Clear filters button
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 3: Create Invoice Filters Component (AC: 8.3.2)
 *
 * Related:
 * - src/modules/statements/components/statements-filters.tsx (pattern)
 * - src/modules/invoices/components/customer-selector.tsx (customer search)
 */

import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import type { InvoiceStatusType } from "../types";
import { CustomerSelector, type SelectedCustomer } from "./customer-selector";

/**
 * Invoice filter state
 */
export interface InvoiceFilterState {
  /** Filter by status */
  status?: InvoiceStatusType;
  /** Filter by customer ID */
  customerId?: string;
  /** Filter by invoice date start */
  startDate?: Date;
  /** Filter by invoice date end */
  endDate?: Date;
}

export interface InvoiceFiltersProps {
  /** Current filter values */
  filters: InvoiceFilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: InvoiceFilterState) => void;
  /** Loading state */
  loading?: boolean;
}

/**
 * Status options for dropdown
 *
 * AC-8.3.2: Status dropdown with all status options
 */
const STATUS_OPTIONS: Array<{
  value: InvoiceStatusType | "all";
  label: string;
}> = [
  { value: "all", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "partially_paid", label: "Partially Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "void", label: "Void" },
];

/**
 * Invoice filters component
 *
 * AC-8.3.2: Filters apply immediately
 * - Status dropdown
 * - Customer selector (searchable combobox)
 * - Date range picker
 */
export function InvoiceFilters({
  filters,
  onFiltersChange,
  loading = false,
}: InvoiceFiltersProps) {
  // Local state for customer selector
  const [selectedCustomer, setSelectedCustomer] =
    useState<SelectedCustomer | null>(null);

  // Local state for date range
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.startDate,
    to: filters.endDate,
  });

  // Handle status change
  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        status: value === "all" ? undefined : (value as InvoiceStatusType),
      });
    },
    [filters, onFiltersChange],
  );

  // Handle customer selection
  const handleCustomerChange = useCallback(
    (customer: SelectedCustomer | null) => {
      setSelectedCustomer(customer);
      onFiltersChange({
        ...filters,
        customerId: customer?.id || undefined,
      });
    },
    [filters, onFiltersChange],
  );

  // Handle date range change
  const handleDateRangeChange = useCallback(
    (range: { from: Date | undefined; to: Date | undefined }) => {
      setDateRange(range);
      onFiltersChange({
        ...filters,
        startDate: range.from,
        endDate: range.to,
      });
    },
    [filters, onFiltersChange],
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedCustomer(null);
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({});
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.status ||
    filters.customerId ||
    filters.startDate ||
    filters.endDate;

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Status Filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={handleStatusChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Customer Selector */}
      <div className="w-[280px]">
        <CustomerSelector
          value={selectedCustomer}
          onSelect={handleCustomerChange}
          disabled={loading}
          placeholder="Filter by customer..."
        />
      </div>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[260px] justify-start text-left font-normal",
              !dateRange.from && "text-muted-foreground",
            )}
            disabled={loading}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, yyyy")} -{" "}
                  {format(dateRange.to, "LLL dd, yyyy")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, yyyy")
              )
            ) : (
              "Invoice date range"
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange.from}
            selected={dateRange}
            onSelect={(range) =>
              handleDateRangeChange({
                from: range?.from,
                to: range?.to,
              })
            }
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-3"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
