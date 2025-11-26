"use client";

/**
 * Title Autocomplete Component
 *
 * Searchable dropdown for selecting titles in sales entry form.
 * Shows only titles with at least one ISBN assigned.
 *
 * Story 3.2: Build Sales Transaction Entry Form
 * AC 2: Title autocomplete search field
 *   - Type to search, dropdown shows: "[Title] ([Author]) - Physical, Ebook"
 *   - Shows only titles with at least one format available
 *   - Debounced search (300ms) using Server Action
 */

import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import * as React from "react";
import { useTransition } from "react";
import { Badge } from "@/components/ui/badge";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { searchTitlesAction } from "../actions";
import type { SelectedTitle, TitleForSalesSelect } from "../types";

interface TitleAutocompleteProps {
  /** Currently selected title */
  value: SelectedTitle | null;
  /** Callback when title is selected */
  onSelect: (title: SelectedTitle | null) => void;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Reference to trigger element for focus management */
  triggerRef?: React.RefObject<HTMLButtonElement | null>;
}

export function TitleAutocomplete({
  value,
  onSelect,
  disabled = false,
  placeholder = "Search titles...",
  triggerRef,
}: TitleAutocompleteProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [titles, setTitles] = React.useState<TitleForSalesSelect[]>([]);
  const [isPending, startTransition] = useTransition();
  const debounceRef = React.useRef<NodeJS.Timeout | null>(null);

  // Debounced search effect
  React.useEffect(() => {
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Don't search if query is too short
    if (searchQuery.length < 2) {
      setTitles([]);
      return;
    }

    // Debounce 300ms per AC 2
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const result = await searchTitlesAction(searchQuery);
        if (result.success) {
          setTitles(result.data);
        } else {
          setTitles([]);
        }
      });
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Handle title selection
  const handleSelect = (title: TitleForSalesSelect) => {
    onSelect({
      id: title.id,
      title: title.title,
      author_name: title.author_name,
      has_isbn: title.has_isbn,
      has_eisbn: title.has_eisbn,
    });
    setOpen(false);
    setSearchQuery("");
  };

  // Clear selection
  const handleClear = () => {
    onSelect(null);
    setSearchQuery("");
  };

  // Format badges showing available formats
  const formatBadges = (title: TitleForSalesSelect) => {
    const badges: string[] = [];
    if (title.has_isbn) badges.push("Physical");
    if (title.has_eisbn) badges.push("Ebook");
    return badges;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef as React.RefObject<HTMLButtonElement>}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select title"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
          )}
        >
          {value ? (
            <span className="truncate">
              {value.title} ({value.author_name})
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search titles..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {/* Loading state */}
            {isPending && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Searching...
                </span>
              </div>
            )}

            {/* Empty state */}
            {!isPending && searchQuery.length >= 2 && titles.length === 0 && (
              <CommandEmpty>No titles found.</CommandEmpty>
            )}

            {/* Prompt to type more */}
            {!isPending && searchQuery.length < 2 && searchQuery.length > 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            )}

            {/* Initial state */}
            {!isPending && searchQuery.length === 0 && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                Start typing to search titles
              </div>
            )}

            {/* Results */}
            {!isPending && titles.length > 0 && (
              <CommandGroup>
                {titles.map((title) => (
                  <CommandItem
                    key={title.id}
                    value={title.id}
                    onSelect={() => handleSelect(title)}
                    className="flex flex-col items-start gap-1 py-3"
                  >
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check
                          className={cn(
                            "h-4 w-4",
                            value?.id === title.id
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                        <span className="font-medium">{title.title}</span>
                      </div>
                      <div className="flex gap-1">
                        {formatBadges(title).map((badge) => (
                          <Badge
                            key={badge}
                            variant="secondary"
                            className="text-xs"
                          >
                            {badge}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <span className="ml-6 text-sm text-muted-foreground">
                      {title.author_name}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
