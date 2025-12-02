"use client";

/**
 * Statements Filters Component
 *
 * Filter controls for statements list:
 * - Period filter dropdown
 * - Author search with autocomplete
 * - Status filter (All/Sent/Draft/Failed)
 * - Date range filter for generated_at
 *
 * Story: 5.5 - Build Statements List and Detail View for Finance
 * Task 5: Build filter components (AC: 2)
 *
 * Related:
 * - src/modules/statements/queries.ts (StatementsFilter)
 */

import { format } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";
import type { StatementsFilter } from "../queries";

export interface StatementsFiltersProps {
  /** Current filter values */
  filters: StatementsFilter;
  /** Callback when filters change */
  onFiltersChange: (filters: StatementsFilter) => void;
  /** Available periods for dropdown */
  periods: Array<{ periodStart: Date; periodEnd: Date; label: string }>;
  /** Loading state */
  loading?: boolean;
}

/**
 * Filters component for statements list
 *
 * AC-5.5.2: Filters available for Period, Author, Status, Date range
 */
export function StatementsFilters({
  filters,
  onFiltersChange,
  periods,
  loading = false,
}: StatementsFiltersProps) {
  const [authorSearch, setAuthorSearch] = useState(filters.authorSearch || "");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: filters.generatedAfter,
    to: filters.generatedBefore,
  });

  // Debounce author search
  useEffect(() => {
    const timer = setTimeout(() => {
      // Normalize empty string to undefined for comparison
      const normalizedSearch = authorSearch || undefined;
      if (normalizedSearch !== filters.authorSearch) {
        onFiltersChange({
          ...filters,
          authorSearch: normalizedSearch,
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [authorSearch, filters, onFiltersChange]);

  // Handle period selection
  const handlePeriodChange = useCallback(
    (value: string) => {
      if (value === "all") {
        onFiltersChange({
          ...filters,
          periodStart: undefined,
          periodEnd: undefined,
        });
      } else {
        const period = periods.find(
          (p) =>
            `${p.periodStart.toISOString()}-${p.periodEnd.toISOString()}` ===
            value,
        );
        if (period) {
          onFiltersChange({
            ...filters,
            periodStart: period.periodStart,
            periodEnd: period.periodEnd,
          });
        }
      }
    },
    [filters, onFiltersChange, periods],
  );

  // Handle status selection
  const handleStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({
        ...filters,
        status:
          value === "all" ? undefined : (value as "draft" | "sent" | "failed"),
      });
    },
    [filters, onFiltersChange],
  );

  // Handle date range selection
  const handleDateRangeChange = useCallback(
    (range: { from: Date | undefined; to: Date | undefined }) => {
      setDateRange(range);
      onFiltersChange({
        ...filters,
        generatedAfter: range.from,
        generatedBefore: range.to,
      });
    },
    [filters, onFiltersChange],
  );

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setAuthorSearch("");
    setDateRange({ from: undefined, to: undefined });
    onFiltersChange({});
  }, [onFiltersChange]);

  // Check if any filters are active
  const hasActiveFilters =
    filters.periodStart ||
    filters.authorSearch ||
    filters.status ||
    filters.generatedAfter ||
    filters.generatedBefore;

  // Format current period value for select
  const currentPeriodValue =
    filters.periodStart && filters.periodEnd
      ? `${filters.periodStart.toISOString()}-${filters.periodEnd.toISOString()}`
      : "all";

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Period Filter */}
      <Select
        value={currentPeriodValue}
        onValueChange={handlePeriodChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="All Periods" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Periods</SelectItem>
          {periods.map((period) => (
            <SelectItem
              key={`${period.periodStart.toISOString()}-${period.periodEnd.toISOString()}`}
              value={`${period.periodStart.toISOString()}-${period.periodEnd.toISOString()}`}
            >
              {period.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Author Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search author..."
          value={authorSearch}
          onChange={(e) => setAuthorSearch(e.target.value)}
          className="w-[200px] pl-9"
          disabled={loading}
        />
      </div>

      {/* Status Filter */}
      <Select
        value={filters.status || "all"}
        onValueChange={handleStatusChange}
        disabled={loading}
      >
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="All Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Status</SelectItem>
          <SelectItem value="sent">Sent</SelectItem>
          <SelectItem value="draft">Draft</SelectItem>
          <SelectItem value="failed">Failed</SelectItem>
        </SelectContent>
      </Select>

      {/* Date Range Filter */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[240px] justify-start text-left font-normal",
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
              "Generated date range"
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
