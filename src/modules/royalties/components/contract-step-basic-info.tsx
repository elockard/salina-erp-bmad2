"use client";

/**
 * Contract Step 1: Basic Information
 *
 * Form fields for author, title, status, and advance amounts.
 * Uses searchable dropdowns for author and title selection.
 *
 * Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration
 * AC 2: Author (searchable), Title (searchable), Status, Advance Amount, Advance Paid
 */

import { Check, ChevronsUpDown, HelpCircle, Loader2 } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { searchAuthorsAction, searchTitlesAction } from "../actions";
import type { AuthorOption, TitleOption } from "../types";

/**
 * Debounce hook for search inputs
 */
function useDebounce<T extends (...args: Parameters<T>) => void>(
  callback: T,
  delay: number,
): T {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      const id = setTimeout(() => callback(...args), delay);
      setTimeoutId(id);
    }) as T,
    [],
  );
}

export function ContractStepBasicInfo() {
  const { control, setValue, watch } = useFormContext();

  // Author search state
  const [authorOpen, setAuthorOpen] = useState(false);
  const [authorSearch, setAuthorSearch] = useState("");
  const [authors, setAuthors] = useState<AuthorOption[]>([]);
  const [authorPending, startAuthorTransition] = useTransition();

  // Title search state
  const [titleOpen, setTitleOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState("");
  const [titles, setTitles] = useState<TitleOption[]>([]);
  const [titlePending, startTitleTransition] = useTransition();

  const selectedAuthorId = watch("author_id");
  const selectedAuthorName = watch("author_name");
  const selectedTitleId = watch("title_id");
  const selectedTitleName = watch("title_name");

  // Search authors with debounce
  const searchAuthors = useDebounce((term: string) => {
    startAuthorTransition(async () => {
      const result = await searchAuthorsAction(term);
      if (result.success) {
        setAuthors(result.data);
      }
    });
  }, 300);

  // Search titles with debounce
  const searchTitles = useDebounce((term: string) => {
    startTitleTransition(async () => {
      const result = await searchTitlesAction(term);
      if (result.success) {
        setTitles(result.data);
      }
    });
  }, 300);

  // Handle author search input
  const handleAuthorSearchChange = (value: string) => {
    setAuthorSearch(value);
    searchAuthors(value);
  };

  // Handle title search input
  const handleTitleSearchChange = (value: string) => {
    setTitleSearch(value);
    searchTitles(value);
  };

  // Select author
  const handleAuthorSelect = (author: AuthorOption) => {
    setValue("author_id", author.id);
    setValue("author_name", author.name);
    setAuthorOpen(false);
  };

  // Select title
  const handleTitleSelect = (title: TitleOption) => {
    setValue("title_id", title.id);
    setValue("title_name", title.title);
    setTitleOpen(false);
  };

  // Load initial authors when dropdown opens
  const handleAuthorOpenChange = (open: boolean) => {
    setAuthorOpen(open);
    if (open && authors.length === 0) {
      searchAuthors("");
    }
  };

  // Load initial titles when dropdown opens
  const handleTitleOpenChange = (open: boolean) => {
    setTitleOpen(open);
    if (open && titles.length === 0) {
      searchTitles("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Author Selection (AC 2) */}
      <FormField
        control={control}
        name="author_id"
        render={() => (
          <FormItem className="flex flex-col">
            <FormLabel>Author *</FormLabel>
            <Popover open={authorOpen} onOpenChange={handleAuthorOpenChange}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={authorOpen}
                    className={cn(
                      "w-full justify-between",
                      !selectedAuthorId && "text-muted-foreground",
                    )}
                  >
                    {selectedAuthorName || "Select author..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search authors..."
                    value={authorSearch}
                    onValueChange={handleAuthorSearchChange}
                  />
                  <CommandList>
                    {authorPending ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : authors.length === 0 ? (
                      <CommandEmpty>No authors found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {authors.map((author) => (
                          <CommandItem
                            key={author.id}
                            value={author.id}
                            onSelect={() => handleAuthorSelect(author)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedAuthorId === author.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div>
                              <p className="font-medium">{author.name}</p>
                              {author.email && (
                                <p className="text-sm text-muted-foreground">
                                  {author.email}
                                </p>
                              )}
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              The author who will receive royalties under this contract
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Title Selection (AC 2) */}
      <FormField
        control={control}
        name="title_id"
        render={() => (
          <FormItem className="flex flex-col">
            <FormLabel>Title *</FormLabel>
            <Popover open={titleOpen} onOpenChange={handleTitleOpenChange}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={titleOpen}
                    className={cn(
                      "w-full justify-between",
                      !selectedTitleId && "text-muted-foreground",
                    )}
                  >
                    {selectedTitleName || "Select title..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search titles..."
                    value={titleSearch}
                    onValueChange={handleTitleSearchChange}
                  />
                  <CommandList>
                    {titlePending ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : titles.length === 0 ? (
                      <CommandEmpty>No titles found.</CommandEmpty>
                    ) : (
                      <CommandGroup>
                        {titles.map((title) => (
                          <CommandItem
                            key={title.id}
                            value={title.id}
                            onSelect={() => handleTitleSelect(title)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedTitleId === title.id
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            <div>
                              <p className="font-medium">{title.title}</p>
                              <p className="text-sm text-muted-foreground">
                                by {title.author_name}
                              </p>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            <FormDescription>
              The title covered by this royalty contract
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Status Dropdown (AC 2) */}
      <FormField
        control={control}
        name="status"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Contract Status</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select status..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <FormDescription>
              Active contracts are used for royalty calculations
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Tier Calculation Mode (Story 10.4: Escalating Lifetime Royalty Rates) */}
      <FormField
        control={control}
        name="tier_calculation_mode"
        render={({ field }) => (
          <FormItem className="space-y-3">
            <div className="flex items-center gap-2">
              <FormLabel>Tier Calculation Mode</FormLabel>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-xs">
                    <p className="font-semibold">Period Mode (Default)</p>
                    <p className="text-sm mb-2">
                      Tiers reset each royalty period. Author starts at lowest
                      tier every period.
                    </p>
                    <p className="font-semibold">Lifetime Mode</p>
                    <p className="text-sm">
                      Tiers based on cumulative sales. As lifetime sales grow,
                      author earns higher rates on new sales.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <FormControl>
              <RadioGroup
                onValueChange={field.onChange}
                defaultValue={field.value}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value="period" id="period" />
                  <Label
                    htmlFor="period"
                    className="font-normal cursor-pointer"
                  >
                    <span className="font-medium">Period</span>
                    <span className="text-muted-foreground ml-2">
                      — Tiers reset each royalty period
                    </span>
                  </Label>
                </div>
                <div className="flex items-center space-x-3 space-y-0">
                  <RadioGroupItem value="lifetime" id="lifetime" />
                  <Label
                    htmlFor="lifetime"
                    className="font-normal cursor-pointer"
                  >
                    <span className="font-medium">Lifetime</span>
                    <span className="text-muted-foreground ml-2">
                      — Tiers based on cumulative sales
                    </span>
                  </Label>
                </div>
              </RadioGroup>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Advance Amount (AC 2) */}
      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="advance_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advance Amount</FormLabel>
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
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      field.onChange(val);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>
                Total advance agreed in contract
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Advance Paid (AC 2) */}
        <FormField
          control={control}
          name="advance_paid"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Advance Paid</FormLabel>
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
                    {...field}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9.]/g, "");
                      field.onChange(val);
                    }}
                  />
                </div>
              </FormControl>
              <FormDescription>Amount already paid to author</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
