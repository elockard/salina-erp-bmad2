"use client";

/**
 * Sales Filters Component
 *
 * Filter controls for sales history view.
 * Story 3.3: AC 4 (filter controls)
 *
 * Filters:
 * - Date range picker (defaults to current month)
 * - Title search autocomplete (300ms debounce)
 * - Format dropdown (All / Physical / Ebook / Audiobook)
 * - Channel dropdown (All / Retail / Wholesale / Direct / Distributor)
 * - Clear Filters button
 *
 * Filter state managed via URL search params for shareable URLs.
 */

import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import type { DateRange } from "react-day-picker";
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
import { salesChannelValues, salesFormatValues } from "@/db/schema/sales";
import { cn } from "@/lib/utils";
import type { SalesFilterInput } from "../schema";
import type { SelectedTitle } from "../types";
import { TitleAutocomplete } from "./title-autocomplete";

interface SalesFiltersProps {
  onFiltersChange: (filters: SalesFilterInput) => void;
}

const formatLabels: Record<string, string> = {
  physical: "Physical",
  ebook: "Ebook",
  audiobook: "Audiobook",
};

const channelLabels: Record<string, string> = {
  retail: "Retail",
  wholesale: "Wholesale",
  direct: "Direct",
  distributor: "Distributor",
};

export function SalesFilters({ onFiltersChange }: SalesFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize state from URL params
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => {
      const startDate = searchParams.get("start_date");
      const endDate = searchParams.get("end_date");
      if (startDate || endDate) {
        return {
          from: startDate ? new Date(startDate) : undefined,
          to: endDate ? new Date(endDate) : undefined,
        };
      }
      // Default to current month
      const now = new Date();
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
      };
    }
  );

  const [selectedTitle, setSelectedTitle] =
    React.useState<SelectedTitle | null>(null);
  const [selectedFormat, setSelectedFormat] = React.useState<string>(
    searchParams.get("format") || "all"
  );
  const [selectedChannel, setSelectedChannel] = React.useState<string>(
    searchParams.get("channel") || "all"
  );

  // Update URL and notify parent of filter changes
  const updateFilters = React.useCallback(
    (newFilters: {
      dateRange?: DateRange;
      titleId?: string | null;
      format?: string;
      channel?: string;
    }) => {
      const effectiveDateRange = newFilters.dateRange ?? dateRange;
      const effectiveTitleId =
        newFilters.titleId !== undefined
          ? newFilters.titleId
          : selectedTitle?.id;
      const effectiveFormat = newFilters.format ?? selectedFormat;
      const effectiveChannel = newFilters.channel ?? selectedChannel;

      // Build URL search params
      const params = new URLSearchParams();
      if (effectiveDateRange?.from) {
        params.set("start_date", format(effectiveDateRange.from, "yyyy-MM-dd"));
      }
      if (effectiveDateRange?.to) {
        params.set("end_date", format(effectiveDateRange.to, "yyyy-MM-dd"));
      }
      if (effectiveTitleId) {
        params.set("title_id", effectiveTitleId);
      }
      if (effectiveFormat && effectiveFormat !== "all") {
        params.set("format", effectiveFormat);
      }
      if (effectiveChannel && effectiveChannel !== "all") {
        params.set("channel", effectiveChannel);
      }

      // Update URL without navigation
      const newUrl = params.toString() ? `?${params.toString()}` : "";
      router.replace(`/sales${newUrl}`, { scroll: false });

      // Build filter object for parent
      const filters: SalesFilterInput = {};
      if (effectiveDateRange?.from) {
        filters.start_date = format(effectiveDateRange.from, "yyyy-MM-dd");
      }
      if (effectiveDateRange?.to) {
        filters.end_date = format(effectiveDateRange.to, "yyyy-MM-dd");
      }
      if (effectiveTitleId) {
        filters.title_id = effectiveTitleId;
      }
      if (effectiveFormat && effectiveFormat !== "all") {
        filters.format = effectiveFormat as (typeof salesFormatValues)[number];
      }
      if (effectiveChannel && effectiveChannel !== "all") {
        filters.channel =
          effectiveChannel as (typeof salesChannelValues)[number];
      }

      onFiltersChange(filters);
    },
    [
      dateRange,
      selectedTitle,
      selectedFormat,
      selectedChannel,
      router,
      onFiltersChange,
    ]
  );

  // Handle date range change
  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range);
    updateFilters({ dateRange: range });
  };

  // Handle title selection
  const handleTitleSelect = (title: SelectedTitle | null) => {
    setSelectedTitle(title);
    updateFilters({ titleId: title?.id || null });
  };

  // Handle format change
  const handleFormatChange = (value: string) => {
    setSelectedFormat(value);
    updateFilters({ format: value });
  };

  // Handle channel change
  const handleChannelChange = (value: string) => {
    setSelectedChannel(value);
    updateFilters({ channel: value });
  };

  // Clear all filters
  const handleClearFilters = () => {
    const now = new Date();
    const defaultRange = {
      from: new Date(now.getFullYear(), now.getMonth(), 1),
      to: new Date(now.getFullYear(), now.getMonth() + 1, 0),
    };
    setDateRange(defaultRange);
    setSelectedTitle(null);
    setSelectedFormat("all");
    setSelectedChannel("all");

    router.replace("/sales", { scroll: false });
    onFiltersChange({
      start_date: format(defaultRange.from, "yyyy-MM-dd"),
      end_date: format(defaultRange.to, "yyyy-MM-dd"),
    });
  };

  // Check if any filters are active (besides default date range)
  const hasActiveFilters =
    selectedTitle !== null ||
    selectedFormat !== "all" ||
    selectedChannel !== "all";

  // Initial filter notification on mount
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on mount to sync initial URL params
  React.useEffect(() => {
    const filters: SalesFilterInput = {};
    if (dateRange?.from) {
      filters.start_date = format(dateRange.from, "yyyy-MM-dd");
    }
    if (dateRange?.to) {
      filters.end_date = format(dateRange.to, "yyyy-MM-dd");
    }
    const titleId = searchParams.get("title_id");
    if (titleId) {
      filters.title_id = titleId;
    }
    if (selectedFormat !== "all") {
      filters.format = selectedFormat as (typeof salesFormatValues)[number];
    }
    if (selectedChannel !== "all") {
      filters.channel = selectedChannel as (typeof salesChannelValues)[number];
    }
    onFiltersChange(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:gap-4">
      {/* Date Range Picker */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Date Range</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal md:w-[260px]",
                !dateRange && "text-muted-foreground"
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

      {/* Title Search */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Title</span>
        <div className="w-full md:w-[250px]">
          <TitleAutocomplete
            value={selectedTitle}
            onSelect={handleTitleSelect}
            placeholder="Search titles..."
          />
        </div>
      </div>

      {/* Format Dropdown */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Format</span>
        <Select value={selectedFormat} onValueChange={handleFormatChange}>
          <SelectTrigger className="w-full md:w-[140px]">
            <SelectValue placeholder="All formats" />
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

      {/* Channel Dropdown */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Channel</span>
        <Select value={selectedChannel} onValueChange={handleChannelChange}>
          <SelectTrigger className="w-full md:w-[150px]">
            <SelectValue placeholder="All channels" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Channels</SelectItem>
            {salesChannelValues.map((channel) => (
              <SelectItem key={channel} value={channel}>
                {channelLabels[channel]}
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
