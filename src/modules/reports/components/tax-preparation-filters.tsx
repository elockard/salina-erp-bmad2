"use client";

/**
 * Tax Preparation Filter Controls Component
 *
 * Filter controls for the 1099 tax preparation report.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.5: Filtering Capabilities
 * - Year selector dropdown (current year default, last 5 years available)
 * - 1099 Required filter: All / Required / Not Required
 * - TIN Status filter: All / Provided / Missing
 * - W-9 Status filter: All / Received / Missing
 * - Filters combinable (AND logic)
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TaxPreparationFilterInput } from "../schema";

interface TaxPreparationFiltersProps {
  filters: TaxPreparationFilterInput;
  onFiltersChange: (filters: TaxPreparationFilterInput) => void;
}

export function TaxPreparationFilters({
  filters,
  onFiltersChange,
}: TaxPreparationFiltersProps) {
  const currentYear = new Date().getFullYear();

  // Generate year options: current year and last 4 years
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const handleYearChange = (value: string) => {
    onFiltersChange({ ...filters, year: parseInt(value, 10) });
  };

  const handleRequires1099Change = (
    value: "all" | "required" | "not-required",
  ) => {
    onFiltersChange({ ...filters, requires1099: value });
  };

  const handleTinStatusChange = (value: "all" | "provided" | "missing") => {
    onFiltersChange({ ...filters, tinStatus: value });
  };

  const handleW9StatusChange = (value: "all" | "received" | "missing") => {
    onFiltersChange({ ...filters, w9Status: value });
  };

  return (
    <div
      className="flex flex-wrap gap-4 items-end"
      data-testid="tax-preparation-filters"
    >
      {/* Year Filter (AC-11.2.5) */}
      <div className="flex flex-col gap-1.5">
        <span
          id="year-filter-label"
          className="text-sm font-medium text-muted-foreground"
        >
          Year
        </span>
        <Select
          value={filters.year.toString()}
          onValueChange={handleYearChange}
        >
          <SelectTrigger
            className="w-[120px]"
            data-testid="year-filter"
            aria-labelledby="year-filter-label"
          >
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {yearOptions.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 1099 Required Filter (AC-11.2.5) */}
      <div className="flex flex-col gap-1.5">
        <span
          id="requires1099-filter-label"
          className="text-sm font-medium text-muted-foreground"
        >
          1099 Required
        </span>
        <Select
          value={filters.requires1099}
          onValueChange={handleRequires1099Change}
        >
          <SelectTrigger
            className="w-[140px]"
            aria-labelledby="requires1099-filter-label"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="required">Required</SelectItem>
            <SelectItem value="not-required">Not Required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* TIN Status Filter (AC-11.2.5) */}
      <div className="flex flex-col gap-1.5">
        <span
          id="tin-status-filter-label"
          className="text-sm font-medium text-muted-foreground"
        >
          TIN Status
        </span>
        <Select value={filters.tinStatus} onValueChange={handleTinStatusChange}>
          <SelectTrigger
            className="w-[140px]"
            aria-labelledby="tin-status-filter-label"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="provided">Provided</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* W-9 Status Filter (AC-11.2.5) */}
      <div className="flex flex-col gap-1.5">
        <span
          id="w9-status-filter-label"
          className="text-sm font-medium text-muted-foreground"
        >
          W-9 Status
        </span>
        <Select value={filters.w9Status} onValueChange={handleW9StatusChange}>
          <SelectTrigger
            className="w-[140px]"
            aria-labelledby="w9-status-filter-label"
          >
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="received">Received</SelectItem>
            <SelectItem value="missing">Missing</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
