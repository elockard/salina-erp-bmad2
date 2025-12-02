"use client";

/**
 * Sales Report Filters Component
 *
 * Provides multi-dimensional filtering for sales reports including:
 * - Date range picker (required)
 * - Title multi-select (searchable)
 * - Author multi-select (searchable)
 * - Format dropdown
 * - Channel dropdown
 * - Grouping radio/select
 *
 * Story: 6.2 - Build Sales Reports with Multi-Dimensional Filtering
 * AC: 2 (Date range picker)
 * AC: 3 (Multi-select filters for Title, Author, Format, Channel)
 * AC: 4 (Grouping options: by Title, Format, Channel, Date)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, X } from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import {
  salesReportFilterSchema,
  type SalesReportFilterInput,
} from "../schema";

interface FilterOption {
  id: string;
  label: string;
}

interface SalesReportFiltersProps {
  /** Available titles for filter dropdown */
  titles: FilterOption[];
  /** Available authors for filter dropdown */
  authors: FilterOption[];
  /** Callback when filters are submitted */
  onSubmit: (filters: SalesReportFilterInput) => void;
  /** Whether the form is in loading state */
  isLoading?: boolean;
  /** Initial filter values */
  defaultValues?: Partial<SalesReportFilterInput>;
}

const FORMAT_OPTIONS = [
  { value: "all", label: "All Formats" },
  { value: "physical", label: "Physical" },
  { value: "ebook", label: "Ebook" },
  { value: "audiobook", label: "Audiobook" },
] as const;

const CHANNEL_OPTIONS = [
  { value: "all", label: "All Channels" },
  { value: "retail", label: "Retail" },
  { value: "wholesale", label: "Wholesale" },
  { value: "direct", label: "Direct" },
  { value: "distributor", label: "Distributor" },
] as const;

const GROUPING_OPTIONS = [
  { value: "title", label: "By Title" },
  { value: "format", label: "By Format" },
  { value: "channel", label: "By Channel" },
  { value: "date", label: "By Date" },
] as const;

// Compute default dates (30 days ago to today)
function getDefaultDates() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { start, end };
}

export function SalesReportFilters({
  titles,
  authors,
  onSubmit,
  isLoading = false,
  defaultValues,
}: SalesReportFiltersProps) {
  // Track mount state to avoid hydration mismatch from Date() calls
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Compute dates once on client only (after mount)
  const defaultDates = React.useMemo(() => getDefaultDates(), []);

  // Multi-select state for titles and authors
  const [selectedTitles, setSelectedTitles] = React.useState<string[]>(
    defaultValues?.titleIds ?? [],
  );
  const [selectedAuthors, setSelectedAuthors] = React.useState<string[]>(
    defaultValues?.authorIds ?? [],
  );
  const [titleSearch, setTitleSearch] = React.useState("");
  const [authorSearch, setAuthorSearch] = React.useState("");
  const [titleDropdownOpen, setTitleDropdownOpen] = React.useState(false);
  const [authorDropdownOpen, setAuthorDropdownOpen] = React.useState(false);

  const form = useForm<SalesReportFilterInput>({
    resolver: zodResolver(salesReportFilterSchema),
    defaultValues: {
      startDate: defaultValues?.startDate ?? defaultDates.start,
      endDate: defaultValues?.endDate ?? defaultDates.end,
      format: defaultValues?.format ?? "all",
      channel: defaultValues?.channel ?? "all",
      groupBy: defaultValues?.groupBy ?? "title",
      titleIds: defaultValues?.titleIds ?? [],
      authorIds: defaultValues?.authorIds ?? [],
    },
  });

  // Sync multi-select state with form
  React.useEffect(() => {
    form.setValue("titleIds", selectedTitles);
  }, [selectedTitles, form]);

  React.useEffect(() => {
    form.setValue("authorIds", selectedAuthors);
  }, [selectedAuthors, form]);

  // Filter options based on search
  const filteredTitles = React.useMemo(() => {
    if (!titleSearch) return titles.slice(0, 50); // Show first 50 by default
    const search = titleSearch.toLowerCase();
    return titles
      .filter((t) => t.label.toLowerCase().includes(search))
      .slice(0, 50);
  }, [titles, titleSearch]);

  const filteredAuthors = React.useMemo(() => {
    if (!authorSearch) return authors.slice(0, 50);
    const search = authorSearch.toLowerCase();
    return authors
      .filter((a) => a.label.toLowerCase().includes(search))
      .slice(0, 50);
  }, [authors, authorSearch]);

  const handleSubmit = (data: SalesReportFilterInput) => {
    onSubmit(data);
  };

  const toggleTitle = (id: string) => {
    setSelectedTitles((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  };

  const toggleAuthor = (id: string) => {
    setSelectedAuthors((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const removeTitle = (id: string) => {
    setSelectedTitles((prev) => prev.filter((t) => t !== id));
  };

  const removeAuthor = (id: string) => {
    setSelectedAuthors((prev) => prev.filter((a) => a !== id));
  };

  // Get labels for selected items
  const getSelectedTitleLabels = () =>
    selectedTitles
      .map((id) => titles.find((t) => t.id === id)?.label)
      .filter(Boolean);
  const getSelectedAuthorLabels = () =>
    selectedAuthors
      .map((id) => authors.find((a) => a.id === id)?.label)
      .filter(Boolean);

  // Render loading skeleton until mounted to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="space-y-6 rounded-lg border p-6 animate-pulse">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2 h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
          <div className="h-10 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleSubmit)}
        className="space-y-6 rounded-lg border p-6"
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Date Range Picker (AC-2) */}
          <FormField
            control={form.control}
            name="startDate"
            render={({ field: startField }) => (
              <FormItem className="lg:col-span-2">
                <FormLabel>Date Range *</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !form.watch("startDate") && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {form.watch("startDate") && form.watch("endDate") ? (
                          <>
                            {format(form.watch("startDate"), "MMM d, yyyy")} -{" "}
                            {format(form.watch("endDate"), "MMM d, yyyy")}
                          </>
                        ) : (
                          "Select date range"
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="range"
                      defaultMonth={startField.value}
                      selected={{
                        from: form.watch("startDate"),
                        to: form.watch("endDate"),
                      }}
                      onSelect={(range: DateRange | undefined) => {
                        if (range?.from) {
                          form.setValue("startDate", range.from);
                        }
                        if (range?.to) {
                          form.setValue("endDate", range.to);
                        }
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Grouping (AC-4) */}
          <FormField
            control={form.control}
            name="groupBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group By *</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select grouping" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {GROUPING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Title Multi-Select (AC-3) */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Titles
            </label>
            <Popover open={titleDropdownOpen} onOpenChange={setTitleDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  {selectedTitles.length > 0 ? (
                    <span className="truncate">
                      {selectedTitles.length} selected
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All titles</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search titles..."
                    value={titleSearch}
                    onChange={(e) => setTitleSearch(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-2">
                  {filteredTitles.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      No titles found
                    </p>
                  ) : (
                    filteredTitles.map((title) => (
                      <div
                        key={title.id}
                        className={cn(
                          "flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                          selectedTitles.includes(title.id) && "bg-accent",
                        )}
                        onClick={() => toggleTitle(title.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            toggleTitle(title.id);
                          }
                        }}
                        role="option"
                        aria-selected={selectedTitles.includes(title.id)}
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "mr-2 h-4 w-4 rounded border",
                            selectedTitles.includes(title.id)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground",
                          )}
                        >
                          {selectedTitles.includes(title.id) && (
                            <svg
                              className="h-4 w-4 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{title.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedTitles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {getSelectedTitleLabels()
                  .slice(0, 3)
                  .map((label, idx) => (
                    <Badge
                      key={selectedTitles[idx]}
                      variant="secondary"
                      className="text-xs"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeTitle(selectedTitles[idx])}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                {selectedTitles.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedTitles.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Author Multi-Select (AC-3) */}
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Authors
            </label>
            <Popover
              open={authorDropdownOpen}
              onOpenChange={setAuthorDropdownOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full justify-between font-normal"
                >
                  {selectedAuthors.length > 0 ? (
                    <span className="truncate">
                      {selectedAuthors.length} selected
                    </span>
                  ) : (
                    <span className="text-muted-foreground">All authors</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[300px] p-0" align="start">
                <div className="p-2">
                  <input
                    type="text"
                    placeholder="Search authors..."
                    value={authorSearch}
                    onChange={(e) => setAuthorSearch(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                  />
                </div>
                <div className="max-h-[200px] overflow-y-auto p-2">
                  {filteredAuthors.length === 0 ? (
                    <p className="py-2 text-center text-sm text-muted-foreground">
                      No authors found
                    </p>
                  ) : (
                    filteredAuthors.map((author) => (
                      <div
                        key={author.id}
                        className={cn(
                          "flex cursor-pointer items-center rounded-md px-2 py-1.5 text-sm hover:bg-accent",
                          selectedAuthors.includes(author.id) && "bg-accent",
                        )}
                        onClick={() => toggleAuthor(author.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            toggleAuthor(author.id);
                          }
                        }}
                        role="option"
                        aria-selected={selectedAuthors.includes(author.id)}
                        tabIndex={0}
                      >
                        <div
                          className={cn(
                            "mr-2 h-4 w-4 rounded border",
                            selectedAuthors.includes(author.id)
                              ? "border-primary bg-primary"
                              : "border-muted-foreground",
                          )}
                        >
                          {selectedAuthors.includes(author.id) && (
                            <svg
                              className="h-4 w-4 text-primary-foreground"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              aria-hidden="true"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{author.label}</span>
                      </div>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
            {selectedAuthors.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {getSelectedAuthorLabels()
                  .slice(0, 3)
                  .map((label, idx) => (
                    <Badge
                      key={selectedAuthors[idx]}
                      variant="secondary"
                      className="text-xs"
                    >
                      {label}
                      <button
                        type="button"
                        onClick={() => removeAuthor(selectedAuthors[idx])}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                {selectedAuthors.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{selectedAuthors.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Format Dropdown (AC-3) */}
          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All formats" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FORMAT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Channel Dropdown (AC-3) */}
          <FormField
            control={form.control}
            name="channel"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Channel</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="All channels" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {CHANNEL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Generate Report Button (Subtask 2.9) */}
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              "Generate Report"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
