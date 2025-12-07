"use client";

import { Search, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PrefixFilterOption } from "@/modules/isbn-prefixes/queries";

/**
 * Story 7.6: Removed currentType prop - ISBNs are unified without type distinction
 */
interface ISBNPoolFiltersProps {
  currentStatus?: string;
  currentSearch?: string;
  currentPrefix?: string;
  prefixOptions?: PrefixFilterOption[];
}

/**
 * ISBN Pool filter controls component
 *
 * Story 2.8 - AC 5: Table supports filtering
 * - Type filter dropdown: All / Physical / Ebook
 * - Status filter dropdown: All / Available / Assigned / Registered / Retired
 * - Search input: partial match on ISBN-13 value
 * - Filters apply immediately on change
 * - Clear filters button to reset all filters
 * - Filters update URL query params for shareable links
 *
 * Story 7.4 - AC 7.4.7: Filter ISBN pool table by prefix
 * - Prefix filter dropdown: All / [registered prefixes] / Legacy
 */
// Story 7.6: Removed currentType - ISBNs are unified without type distinction
export function ISBNPoolFilters({
  currentStatus,
  currentSearch,
  currentPrefix,
  prefixOptions = [],
}: ISBNPoolFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(currentSearch || "");

  // Update URL with new params
  const updateParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      // Reset to page 1 when filters change
      params.delete("page");

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      startTransition(() => {
        router.push(`/isbn-pool?${params.toString()}`);
      });
    },
    [router, searchParams],
  );

  // Story 7.6: Removed handleTypeChange - ISBNs are unified without type distinction

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    updateParams({ status: value === "all" ? undefined : value });
  };

  // Handle prefix filter change (Story 7.4 AC-7.4.7)
  const handlePrefixChange = (value: string) => {
    updateParams({ prefix: value === "all" ? undefined : value });
  };

  // Handle search with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);

    // Debounce search
    const timeoutId = setTimeout(() => {
      updateParams({ search: value || undefined });
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  // Handle search form submit
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ search: searchValue || undefined });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setSearchValue("");
    startTransition(() => {
      router.push("/isbn-pool");
    });
  };

  // Story 7.6: Removed currentType from hasFilters - ISBNs are unified
  const hasFilters = currentStatus || currentSearch || currentPrefix;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
        {/* Story 7.6: Removed Type Filter - ISBNs are unified without type distinction */}

        {/* Status Filter */}
        <Select
          value={currentStatus || "all"}
          onValueChange={handleStatusChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="assigned">Assigned</SelectItem>
            <SelectItem value="registered">Registered</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>

        {/* Prefix Filter - Story 7.4 AC-7.4.7 */}
        <Select
          value={currentPrefix || "all"}
          onValueChange={handlePrefixChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Prefix" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prefixes</SelectItem>
            <SelectItem value="legacy">Legacy (No Prefix)</SelectItem>
            {prefixOptions.map((prefix) => (
              <SelectItem key={prefix.id} value={prefix.id}>
                {prefix.formattedPrefix}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search ISBN-13..."
              value={searchValue}
              onChange={handleSearchChange}
              className="pl-9"
              disabled={isPending}
            />
          </div>
        </form>
      </div>

      {/* Clear Filters */}
      {hasFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          disabled={isPending}
          className="shrink-0"
        >
          <X className="mr-2 h-4 w-4" />
          Clear Filters
        </Button>
      )}
    </div>
  );
}
