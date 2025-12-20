"use client";

/**
 * BISAC Selector Component
 *
 * A searchable selector for BISAC subject codes with auto-suggestions.
 * Supports selecting up to 3 codes (1 primary + 2 secondary).
 *
 * Features:
 * - Auto-suggests BISAC codes based on title metadata
 * - Searchable dropdown for manual selection
 * - Confidence indicators for suggestions
 * - Badge display for selected codes with remove capability
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 */

import { Check, ChevronsUpDown, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  type BisacSuggestion,
  MAX_BISAC_CODES,
  searchBisacCodes,
  suggestBisacCodes,
} from "../bisac";

export interface BisacSelectorProps {
  /** Currently selected BISAC codes (first is primary) */
  value: string[];
  /** Callback when selection changes */
  onChange: (codes: string[]) => void;
  /** Title for generating suggestions */
  title?: string;
  /** Subtitle for generating suggestions */
  subtitle?: string;
  /** Genre for generating suggestions */
  genre?: string;
  /** Whether the selector is disabled */
  disabled?: boolean;
  /** Placeholder text when nothing is selected */
  placeholder?: string;
  /** Class name for the trigger button */
  className?: string;
}

/**
 * Get confidence color based on score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-green-600";
  if (confidence >= 40) return "text-yellow-600";
  return "text-orange-600";
}

/**
 * Get confidence label based on score
 */
function getConfidenceLabel(confidence: number): string {
  if (confidence >= 70) return "High";
  if (confidence >= 40) return "Medium";
  return "Low";
}

export function BisacSelector({
  value,
  onChange,
  title,
  subtitle,
  genre,
  disabled = false,
  placeholder = "Select BISAC codes...",
  className,
}: BisacSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Generate suggestions based on title metadata
  const suggestions = useMemo<BisacSuggestion[]>(() => {
    if (!title) return [];
    return suggestBisacCodes({ title, subtitle, genre });
  }, [title, subtitle, genre]);

  // Search results when user types in the search box
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchBisacCodes(searchQuery, 20);
  }, [searchQuery]);

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Handle selecting/deselecting a code
  const handleSelect = useCallback(
    (code: string) => {
      if (value.includes(code)) {
        // Remove if already selected
        onChange(value.filter((c) => c !== code));
      } else if (value.length < MAX_BISAC_CODES) {
        // Add if under limit
        onChange([...value, code]);
      }
    },
    [value, onChange],
  );

  // Handle removing a selected code
  const handleRemove = useCallback(
    (code: string) => {
      onChange(value.filter((c) => c !== code));
    },
    [value, onChange],
  );

  // Get description for a code
  const getDescription = useCallback(
    (code: string): string => {
      // First check suggestions
      const suggestion = suggestions.find((s) => s.code === code);
      if (suggestion) return suggestion.description;
      // Then check search results
      const result = searchResults.find((r) => r.code === code);
      if (result) return result.description;
      // Fallback to code itself
      return code;
    },
    [suggestions, searchResults],
  );

  // Determine what to show in the dropdown
  const showSuggestions = suggestions.length > 0 && !searchQuery.trim();
  const showSearchResults = searchQuery.trim() && searchResults.length > 0;

  return (
    <div className="space-y-2">
      {/* Selected codes display */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((code, index) => (
            <Badge
              key={code}
              variant={index === 0 ? "default" : "secondary"}
              className="flex items-center gap-1 pr-1"
            >
              <span className="text-xs font-mono">{code}</span>
              {index === 0 && (
                <span className="text-[10px] opacity-70">(primary)</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(code);
                }}
                disabled={disabled}
                className="ml-1 rounded-sm hover:bg-primary-foreground/20 focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Selector popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || value.length >= MAX_BISAC_CODES}
            className={cn(
              "w-full justify-between font-normal",
              !value.length && "text-muted-foreground",
              className,
            )}
          >
            {value.length >= MAX_BISAC_CODES
              ? `Maximum ${MAX_BISAC_CODES} codes selected`
              : value.length > 0
                ? `${value.length} of ${MAX_BISAC_CODES} codes selected`
                : placeholder}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search BISAC codes..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              <CommandEmpty>
                {searchQuery.trim()
                  ? "No BISAC codes found."
                  : "Type to search or see suggestions below."}
              </CommandEmpty>

              {/* Auto-suggestions section */}
              {showSuggestions && (
                <CommandGroup heading="Suggestions">
                  {suggestions.map((suggestion) => (
                    <CommandItem
                      key={suggestion.code}
                      value={suggestion.code}
                      onSelect={() => handleSelect(suggestion.code)}
                      disabled={
                        value.length >= MAX_BISAC_CODES &&
                        !value.includes(suggestion.code)
                      }
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value.includes(suggestion.code)
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs">
                            {suggestion.code}
                          </span>
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span
                            className={cn(
                              "text-xs",
                              getConfidenceColor(suggestion.confidence),
                            )}
                          >
                            {suggestion.confidence}%{" "}
                            {getConfidenceLabel(suggestion.confidence)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {suggestion.description}
                        </p>
                        {suggestion.matchedKeywords.length > 0 && (
                          <p className="text-[10px] text-muted-foreground/70">
                            Matched: {suggestion.matchedKeywords.join(", ")}
                          </p>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Search results section */}
              {showSearchResults && (
                <>
                  {showSuggestions && <CommandSeparator />}
                  <CommandGroup heading="Search Results">
                    {searchResults.map((result) => (
                      <CommandItem
                        key={result.code}
                        value={result.code}
                        onSelect={() => handleSelect(result.code)}
                        disabled={
                          value.length >= MAX_BISAC_CODES &&
                          !value.includes(result.code)
                        }
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            value.includes(result.code)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-mono text-xs">
                            {result.code}
                          </span>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.description}
                          </p>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}

              {/* Browse hint when no query */}
              {!searchQuery.trim() && suggestions.length === 0 && (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Enter title information for suggestions, or search by
                  code/description.
                </div>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Selected code descriptions */}
      {value.length > 0 && (
        <div className="text-xs text-muted-foreground space-y-0.5">
          {value.map((code, index) => (
            <div key={code} className="truncate">
              <span className="font-mono">{code}</span>: {getDescription(code)}
              {index === 0 && " (primary)"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
