"use client";

/**
 * Returns Filters Component
 *
 * Filter controls for returns history view.
 * Story 3.7: AC 3-6 (filter controls)
 *
 * Filters:
 * - Status dropdown (All / Pending / Approved / Rejected)
 * - Date range picker (defaults to last 30 days)
 * - Title search input (300ms debounce)
 * - Format dropdown (All / Physical / Ebook / Audiobook)
 * - Clear Filters button
 *
 * Filter state managed via URL search params for shareable URLs.
 */

import { format, subDays } from "date-fns";
import { CalendarIcon, Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import type { DateRange } from "react-day-picker";
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
import { returnStatusValues } from "@/db/schema/returns";
import { salesFormatValues } from "@/db/schema/sales";
import { cn } from "@/lib/utils";
import type { ReturnsHistoryFilters } from "../types";

interface ReturnsFiltersProps {
  onFiltersChange: (filters: ReturnsHistoryFilters) => void;
}

const statusLabels: Record<string, string> = {
  all: "All Status",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

const formatLabels: Record<string, string> = {
  all: "All Formats",
  physical: "Physical",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

export function ReturnsFilters({ onFiltersChange }: ReturnsFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    searchParams.get("status") || "all",
  );

  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => {
      const fromDate = searchParams.get("from");
      const toDate = searchParams.get("to");
      if (fromDate || toDate) {
        return {
          from: fromDate ? new Date(fromDate) : undefined,
          to: toDate ? new Date(toDate) : undefined,
        };
      }
      // Default to last 30 days (AC 4)
      return {
        from: subDays(new Date(), 30),
        to: new Date(),
      };
    },
  );

  const [searchTerm, setSearchTerm] = React.useState<string>(
    searchParams.get("search") || "",
  );

  const [selectedFormat, setSelectedFormat] = React.useState<string>(
    searchParams.get("format") || "all",
  );

  // Debounce ref for search input (AC 5: 300ms debounce)
  const searchDebounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Update URL and notify parent of filter changes
  const updateFilters = React.useCallback(
    (newFilters: {
      status?: string;
      dateRange?: DateRange;
      search?: string;
      format?: string;
    }) => {
      const effectiveStatus = newFilters.status ?? selectedStatus;
      const effectiveDateRange = newFilters.dateRange ?? dateRange;
      const effectiveSearch = newFilters.search ?? searchTerm;
      const effectiveFormat = newFilters.format ?? selectedFormat;

      // Build URL search params
      const params = new URLSearchParams();
      if (effectiveStatus && effectiveStatus !== "all") {
        params.set("status", effectiveStatus);
      }
      if (effectiveDateRange?.from) {
        params.set("from", format(effectiveDateRange.from, "yyyy-MM-dd"));
      }
      if (effectiveDateRange?.to) {
        params.set("to", format(effectiveDateRange.to, "yyyy-MM-dd"));
      }
      if (effectiveSearch?.trim()) {
        params.set("search", effectiveSearch.trim());
      }
      if (effectiveFormat && effectiveFormat !== "all") {
        params.set("format", effectiveFormat);
      }

      // Update URL without navigation
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/returns${newUrl}`, { scroll: false });

      // Build filter object for parent
      const filters: ReturnsHistoryFilters = {};
      if (effectiveStatus && effectiveStatus !== "all") {
        filters.status = effectiveStatus as ReturnsHistoryFilters["status"];
      }
      if (effectiveDateRange?.from) {
        filters.from_date = format(effectiveDateRange.from, "yyyy-MM-dd");
      }
      if (effectiveDateRange?.to) {
        filters.to_date = format(effectiveDateRange.to, "yyyy-MM-dd");
      }
      if (effectiveSearch?.trim()) {
        filters.search = effectiveSearch.trim();
      }
      if (effectiveFormat && effectiveFormat !== "all") {
        filters.format = effectiveFormat as ReturnsHistoryFilters["format"];
      }

      onFiltersChange(filters);
    },
    [
      selectedStatus,
      dateRange,
      searchTerm,
      selectedFormat,
      router,
      onFiltersChange,
    ],
  );

  // Handle status change
  const handleStatusChange = (value: string) => {
    setSelectedStatus(value);
    updateFilters({ status: value });
  };

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilters({ dateRange: range });
  };

  // Handle search input with debounce (AC 5: 300ms)
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Clear existing timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    // Debounce the filter update
    searchDebounceRef.current = setTimeout(() => {
      updateFilters({ search: value });
    }, 300);
  };

  // Handle format change
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
    updateFilters({ format: value });
  };

  // Clear all filters
  const handleClearFilters = () => {
    const defaultRange = {
      from: subDays(new Date(), 30),
      to: new Date(),
    };
    setSelectedStatus("all");
    setDateRange(defaultRange);
    setSearchTerm("");
    setSelectedFormat("all");

    router.replace("/returns", { scroll: false });
    onFiltersChange({
      from_date: format(defaultRange.from, "yyyy-MM-dd"),
      to_date: format(defaultRange.to, "yyyy-MM-dd"),
    });
  };

  // Check if any filters are active (besides default date range)
  const hasActiveFilters =
    selectedStatus !== "all" ||
    searchTerm.trim() !== "" ||
    selectedFormat !== "all";

  // Initial filter notification on mount
  React.useEffect(() => {
    const filters: ReturnsHistoryFilters = {};
    if (selectedStatus && selectedStatus !== "all") {
      filters.status = selectedStatus as ReturnsHistoryFilters["status"];
    }
    if (dateRange?.from) {
      filters.from_date = format(dateRange.from, "yyyy-MM-dd");
    }
    if (dateRange?.to) {
      filters.to_date = format(dateRange.to, "yyyy-MM-dd");
    }
    if (searchTerm?.trim()) {
      filters.search = searchTerm.trim();
    }
    if (selectedFormat && selectedFormat !== "all") {
      filters.format = selectedFormat as ReturnsHistoryFilters["format"];
    }
    onFiltersChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dateRange?.from,
    dateRange?.to,
    onFiltersChange,
    searchTerm,
    selectedFormat,
    selectedStatus,
  ]);

  // Cleanup debounce on unmount
  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:flex-wrap md:items-end md:gap-4">
      {/* Status Filter (AC 3) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Status</span>
        <Select value={selectedStatus} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            {returnStatusValues.map((status) => (
              <SelectItem key={status} value={status}>
                {statusLabels[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Date Range Picker (AC 4) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Date Range</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal md:w-[260px]",
                !dateRange && "text-muted-foreground",
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "LLL dd, y")} -{" "}
                    {format(dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              initialFocus
              mode="range"
              defaultMonth={dateRange?.from}
              selected={dateRange}
              onSelect={handleDateRangeChange}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Title Search (AC 5) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Title Search</span>
        <div className="relative w-full md:w-[200px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search titles..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="pl-8"
          />
        </div>
      </div>

      {/* Format Filter (AC 6) */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Format</span>
        <Select value={selectedFormat} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder="All Formats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Formats</SelectItem>
            {salesFormatValues.map((format) => (
              <SelectItem key={format} value={format}>
                {formatLabels[format]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="h-9 px-2 md:self-end"
        >
          <X className="mr-1 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
