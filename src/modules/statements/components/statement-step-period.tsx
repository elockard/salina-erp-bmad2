"use client";

/**
 * Statement Wizard Step 1: Period Selection
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * AC-5.3.2: Period selection supports Quarterly, Annual, Custom date range options
 *
 * Features:
 * - Radio buttons for period type selection
 * - Conditional inputs based on type (quarter/year, year only, or date pickers)
 * - Resolved date range display
 */

import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type {
  PeriodType,
  Quarter,
  WizardFormData,
} from "./statement-wizard-modal";

/**
 * Get quarter label (Q1, Q2, Q3, Q4)
 */
function getQuarterLabel(quarter: Quarter): string {
  return `Q${quarter}`;
}

/**
 * Get quarter date range description
 */
function getQuarterDateRange(quarter: Quarter, year: number): string {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return `${format(start, "MMMM d")} - ${format(end, "MMMM d, yyyy")}`;
}

/**
 * Generate year options (current year back to 2020, forward to next year)
 */
function getYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = currentYear + 1; y >= 2020; y--) {
    years.push(y);
  }
  return years;
}

export function StatementStepPeriod() {
  const { watch, setValue } = useFormContext<WizardFormData>();
  const periodType = watch("periodType");
  const quarter = watch("quarter");
  const year = watch("year");
  const customStartDate = watch("customStartDate");
  const customEndDate = watch("customEndDate");

  const yearOptions = getYearOptions();

  /**
   * Get resolved period description for display
   */
  const getResolvedPeriod = (): string => {
    if (periodType === "quarterly" && quarter && year) {
      return getQuarterDateRange(quarter as Quarter, year);
    }
    if (periodType === "annual" && year) {
      return `January 1 - December 31, ${year}`;
    }
    if (periodType === "custom" && customStartDate && customEndDate) {
      return `${format(customStartDate, "MMMM d, yyyy")} - ${format(customEndDate, "MMMM d, yyyy")}`;
    }
    return "Select a period";
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Statement Period</h3>
        <p className="text-sm text-muted-foreground">
          Choose the time period for royalty statements
        </p>
      </div>

      {/* Period Type Selection (AC-5.3.2) */}
      <div className="space-y-4">
        <Label>Period Type</Label>
        <RadioGroup
          value={periodType}
          onValueChange={(value) => setValue("periodType", value as PeriodType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="quarterly" id="quarterly" />
            <Label htmlFor="quarterly" className="cursor-pointer">
              Quarterly
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="annual" id="annual" />
            <Label htmlFor="annual" className="cursor-pointer">
              Annual
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="custom" id="custom" />
            <Label htmlFor="custom" className="cursor-pointer">
              Custom
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Quarterly Selection (AC-5.3.2) */}
      {periodType === "quarterly" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Quarter</Label>
            <Select
              value={quarter?.toString()}
              onValueChange={(v) =>
                setValue("quarter", parseInt(v, 10) as Quarter)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quarter" />
              </SelectTrigger>
              <SelectContent>
                {([1, 2, 3, 4] as Quarter[]).map((q) => (
                  <SelectItem key={q} value={q.toString()}>
                    {getQuarterLabel(q)} (
                    {q === 1
                      ? "Jan-Mar"
                      : q === 2
                        ? "Apr-Jun"
                        : q === 3
                          ? "Jul-Sep"
                          : "Oct-Dec"}
                    )
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Select
              value={year?.toString()}
              onValueChange={(v) => setValue("year", parseInt(v, 10))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Annual Selection (AC-5.3.2) */}
      {periodType === "annual" && (
        <div className="space-y-2">
          <Label>Year</Label>
          <Select
            value={year?.toString()}
            onValueChange={(v) => setValue("year", parseInt(v, 10))}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Custom Date Range (AC-5.3.2) */}
      {periodType === "custom" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Start Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customStartDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customStartDate
                    ? format(customStartDate, "PPP")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customStartDate}
                  onSelect={(date) => setValue("customStartDate", date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label>End Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !customEndDate && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {customEndDate ? format(customEndDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={customEndDate}
                  onSelect={(date) => setValue("customEndDate", date)}
                  initialFocus
                  disabled={(date) =>
                    customStartDate ? date <= customStartDate : false
                  }
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}

      {/* Resolved Period Display */}
      <div className="p-4 bg-muted rounded-lg">
        <p className="text-sm font-medium">Statement Period:</p>
        <p className="text-lg">{getResolvedPeriod()}</p>
      </div>
    </div>
  );
}
