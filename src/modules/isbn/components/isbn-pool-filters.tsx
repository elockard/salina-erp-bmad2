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

interface ISBNPoolFiltersProps {
  currentType?: string;
  currentStatus?: string;
  currentSearch?: string;
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
 */
export function ISBNPoolFilters({
  currentType,
  currentStatus,
  currentSearch,
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

  // Handle type filter change
  const handleTypeChange = (value: string) => {
    updateParams({ type: value === "all" ? undefined : value });
  };

  // Handle status filter change
  const handleStatusChange = (value: string) => {
    updateParams({ status: value === "all" ? undefined : value });
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

  const hasFilters = currentType || currentStatus || currentSearch;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-col gap-4 sm:flex-row sm:items-center">
        {/* Type Filter */}
        <Select
          value={currentType || "all"}
          onValueChange={handleTypeChange}
          disabled={isPending}
        >
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
            <SelectItem value="ebook">Ebook</SelectItem>
          </SelectContent>
        </Select>

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
