"use client";

/**
 * Returns History View Component
 *
 * Main component for returns history page.
 * Story 3.7: AC 1 (page layout), AC 2 (table), AC 11 (empty state), AC 14 (loading states)
 *
 * Orchestrates:
 * - ReturnsFilters (status, date range, search, format filters)
 * - ReturnsTable (data grid with sorting, pagination)
 * - Loading states and error handling
 *
 * Data fetching via Server Actions with URL-synced filter state.
 */

import { useRouter, useSearchParams } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";
import { getReturnsHistoryAction } from "../actions";
import type { PaginatedReturns, ReturnsHistoryFilters } from "../types";
import { ReturnsFilters } from "./returns-filters";
import { ReturnsTable } from "./returns-table";

export function ReturnsHistoryView() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [data, setData] = React.useState<PaginatedReturns | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentFilters, setCurrentFilters] =
    React.useState<ReturnsHistoryFilters>({});

  // Initialize pagination from URL params (AC 8)
  const [page, setPage] = React.useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? parseInt(pageParam, 10) : 1;
  });

  const [pageSize, setPageSize] = React.useState(() => {
    const sizeParam = searchParams.get("size");
    return sizeParam ? parseInt(sizeParam, 10) : 20;
  });

  // Initialize sort from URL params (AC 7)
  const [sort, setSort] = React.useState<string>(() => {
    return searchParams.get("sort") || "date";
  });

  const [order, setOrder] = React.useState<"asc" | "desc">(() => {
    return (searchParams.get("order") as "asc" | "desc") || "desc";
  });

  // Fetch data when filters, pagination, or sort changes
  const fetchData = React.useCallback(
    async (filters: ReturnsHistoryFilters) => {
      setIsLoading(true);
      try {
        const result = await getReturnsHistoryAction({
          ...filters,
          page,
          pageSize,
          sort: sort as ReturnsHistoryFilters["sort"],
          order,
        });

        if (result.success) {
          setData(result.data);
        } else {
          toast.error(result.error || "Failed to fetch returns");
        }
      } catch (error) {
        console.error("Error fetching returns:", error);
        toast.error("Failed to fetch returns");
      } finally {
        setIsLoading(false);
      }
    },
    [page, pageSize, sort, order],
  );

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (filters: ReturnsHistoryFilters) => {
      setCurrentFilters(filters);
      // Reset to page 1 when filters change
      if (page !== 1) {
        setPage(1);
      }
      fetchData(filters);
    },
    [page, fetchData],
  );

  // Handle page change (AC 8)
  const handlePageChange = React.useCallback(
    (newPage: number) => {
      setPage(newPage);
      // Update URL with page param
      const params = new URLSearchParams(searchParams.toString());
      params.set("page", newPage.toString());
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Handle page size change (AC 8)
  const handlePageSizeChange = React.useCallback(
    (newPageSize: number) => {
      setPageSize(newPageSize);
      setPage(1); // Reset to page 1 when changing page size
      // Update URL with size param
      const params = new URLSearchParams(searchParams.toString());
      params.set("size", newPageSize.toString());
      params.set("page", "1");
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Handle sort change (AC 7)
  const handleSortChange = React.useCallback(
    (newSort: string, newOrder: "asc" | "desc") => {
      setSort(newSort);
      setOrder(newOrder);
      // Update URL with sort params
      const params = new URLSearchParams(searchParams.toString());
      params.set("sort", newSort);
      params.set("order", newOrder);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  // Refetch when pagination or sort changes
  React.useEffect(() => {
    fetchData(currentFilters);
  }, [fetchData, currentFilters]);

  return (
    <div className="space-y-6">
      {/* Filters (AC 3-6) */}
      <ReturnsFilters onFiltersChange={handleFiltersChange} />

      {/* Table (AC 2, 7, 8, 9) */}
      <ReturnsTable
        data={data}
        isLoading={isLoading}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onSortChange={handleSortChange}
      />
    </div>
  );
}
