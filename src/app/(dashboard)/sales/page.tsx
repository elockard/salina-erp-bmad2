"use client";

/**
 * Sales History Page
 *
 * View and filter sales transaction history.
 * Story 3.3: Build Sales Transaction History View
 *
 * AC 1: Page at /sales with header, subtitle, Modular Dashboard Grid layout
 * AC 2: Stats cards - Total Sales, Transactions, Best Seller
 * AC 3-5: Table with columns, sorting, pagination
 * AC 4: Filter controls
 * AC 6: Transaction detail modal
 * AC 7: CSV export
 * AC 8: Loading, empty, error states
 * AC 9: Permission enforcement (via layout)
 * AC 10: Responsive design
 */

import { ChevronRight, Download, Home, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";
import { Suspense } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ExportDialog } from "@/modules/import-export/components";
import {
  getSalesHistoryAction,
  getSalesStatsAction,
} from "@/modules/sales/actions";
import { SalesFilters } from "@/modules/sales/components/sales-filters";
import { SalesStatsCards } from "@/modules/sales/components/sales-stats-cards";
import { SalesTable } from "@/modules/sales/components/sales-table";
import { TransactionDetailModal } from "@/modules/sales/components/transaction-detail-modal";
import type { SalesFilterInput } from "@/modules/sales/schema";
import type {
  PaginatedSales,
  SalesStats,
  SaleWithRelations,
} from "@/modules/sales/types";
import { downloadSalesCsv } from "@/modules/sales/utils/csv-export";

export default function SalesHistoryPage() {
  const _router = useRouter();

  // Filter state
  const [filters, setFilters] = React.useState<SalesFilterInput>({});

  // Data state
  const [salesData, setSalesData] = React.useState<PaginatedSales | null>(null);
  const [statsData, setStatsData] = React.useState<SalesStats | null>(null);
  const [_currentPage, setCurrentPage] = React.useState(1);

  // Loading states
  const [isLoadingSales, setIsLoadingSales] = React.useState(true);
  const [isLoadingStats, setIsLoadingStats] = React.useState(true);
  const [isExporting, setIsExporting] = React.useState(false);

  // Modal state
  const [selectedSale, setSelectedSale] =
    React.useState<SaleWithRelations | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Fetch sales data
  const fetchSales = React.useCallback(
    async (filterParams: SalesFilterInput, page: number) => {
      setIsLoadingSales(true);
      try {
        const result = await getSalesHistoryAction(filterParams, page, 20);
        if (result.success) {
          setSalesData(result.data);
        } else {
          toast.error(result.error || "Failed to load sales");
        }
      } catch (error) {
        toast.error("An error occurred while loading sales");
        console.error("fetchSales error:", error);
      } finally {
        setIsLoadingSales(false);
      }
    },
    [],
  );

  // Fetch stats data
  const fetchStats = React.useCallback(
    async (filterParams: SalesFilterInput) => {
      setIsLoadingStats(true);
      try {
        const result = await getSalesStatsAction(filterParams);
        if (result.success) {
          setStatsData(result.data);
        } else {
          toast.error(result.error || "Failed to load statistics");
        }
      } catch (error) {
        toast.error("An error occurred while loading statistics");
        console.error("fetchStats error:", error);
      } finally {
        setIsLoadingStats(false);
      }
    },
    [],
  );

  // Handle filter changes
  const handleFiltersChange = React.useCallback(
    (newFilters: SalesFilterInput) => {
      setFilters(newFilters);
      setCurrentPage(1);
      fetchSales(newFilters, 1);
      fetchStats(newFilters);
    },
    [fetchSales, fetchStats],
  );

  // Handle page change
  const handlePageChange = React.useCallback(
    (page: number) => {
      setCurrentPage(page);
      fetchSales(filters, page);
    },
    [filters, fetchSales],
  );

  // Handle row click for detail modal
  const handleRowClick = React.useCallback((sale: SaleWithRelations) => {
    setSelectedSale(sale);
    setIsModalOpen(true);
  }, []);

  // Handle CSV export
  const handleExport = React.useCallback(async () => {
    setIsExporting(true);
    try {
      await downloadSalesCsv(filters);
      toast.success("Export started");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  }, [filters]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center text-sm text-muted-foreground">
        <Link
          href="/dashboard"
          className="flex items-center hover:text-foreground transition-colors"
        >
          <Home className="h-4 w-4" />
          <span className="ml-1">Dashboard</span>
        </Link>
        <ChevronRight className="mx-2 h-4 w-4" />
        <span className="text-foreground font-medium">Sales Transactions</span>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">
            Sales Transactions
          </h1>
          <p className="text-muted-foreground">
            View and filter recorded sales
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDialog />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || !salesData || salesData.total === 0}
            title="Quick export with current filters"
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? "Exporting..." : "Quick Export"}
          </Button>
          <Button asChild>
            <Link href="/sales/new">
              <Plus className="mr-2 h-4 w-4" />
              Record Sale
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <SalesStatsCards stats={statsData} isLoading={isLoadingStats} />

      {/* Filters */}
      <Suspense fallback={null}>
        <SalesFilters onFiltersChange={handleFiltersChange} />
      </Suspense>

      {/* Sales Table */}
      <SalesTable
        data={salesData}
        isLoading={isLoadingSales}
        onRowClick={handleRowClick}
        onPageChange={handlePageChange}
      />

      {/* Transaction Detail Modal */}
      <TransactionDetailModal
        sale={selectedSale}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}
