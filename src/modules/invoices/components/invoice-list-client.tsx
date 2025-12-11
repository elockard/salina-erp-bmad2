"use client";

/**
 * Invoice List Client Component
 *
 * Client-side invoice list with filtering, pagination, and actions.
 * Manages filter state with URL search params for shareable links.
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 7: Create Invoice List Client Component (AC: ALL)
 *
 * Related:
 * - src/modules/statements/components/statements-client.tsx (pattern)
 */

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { voidInvoice } from "../actions";
import type { InvoiceWithCustomer } from "../types";
import { type InvoiceFilterState, InvoiceFilters } from "./invoice-filters";
import { InvoiceListTable } from "./invoice-list-table";
import { VoidInvoiceDialog } from "./void-invoice-dialog";

export interface InvoiceListClientProps {
  /** Initial invoices from server */
  initialInvoices: InvoiceWithCustomer[];
  /** Total count for pagination */
  totalCount: number;
  /** Page size */
  pageSize?: number;
}

/**
 * Invoice list client component
 *
 * Features:
 * - Filtering by status, customer, date range
 * - Pagination with page size selector
 * - Navigation to detail/edit views
 * - Void confirmation dialog
 */
export function InvoiceListClient({
  initialInvoices,
  totalCount,
  pageSize = 25,
}: InvoiceListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Parse initial filters from URL
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const initialFilters: InvoiceFilterState = {
    status:
      (searchParams.get("status") as InvoiceFilterState["status"]) || undefined,
    customerId: searchParams.get("customer") || undefined,
    startDate: startDateParam ? new Date(startDateParam) : undefined,
    endDate: endDateParam ? new Date(endDateParam) : undefined,
  };

  const [filters, setFilters] = useState<InvoiceFilterState>(initialFilters);
  // Note: invoices and total are passed from server component and refresh via router.refresh()
  // We track page and pageSize locally for UI state
  const [page, setPage] = useState(1);
  const [currentPageSize, setCurrentPageSize] = useState(pageSize);

  // Void dialog state
  const [voidDialogOpen, setVoidDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] =
    useState<InvoiceWithCustomer | null>(null);

  // Update URL with filter params
  const updateUrl = useCallback(
    (newFilters: InvoiceFilterState, newPage: number, newPageSize?: number) => {
      const params = new URLSearchParams();
      if (newFilters.status) params.set("status", newFilters.status);
      if (newFilters.customerId) params.set("customer", newFilters.customerId);
      if (newFilters.startDate)
        params.set("startDate", newFilters.startDate.toISOString());
      if (newFilters.endDate)
        params.set("endDate", newFilters.endDate.toISOString());
      if (newPage > 1) params.set("page", String(newPage));
      if (newPageSize && newPageSize !== 25)
        params.set("pageSize", String(newPageSize));

      const queryString = params.toString();
      router.push(queryString ? `/invoices?${queryString}` : "/invoices");
    },
    [router],
  );

  // Handle page size change
  const handlePageSizeChange = useCallback(
    (value: string) => {
      const newSize = parseInt(value, 10);
      setCurrentPageSize(newSize);
      setPage(1); // Reset to first page when changing page size
      startTransition(() => {
        updateUrl(filters, 1, newSize);
        router.refresh();
      });
    },
    [filters, updateUrl, router],
  );

  // Handle filter change
  const handleFiltersChange = useCallback(
    (newFilters: InvoiceFilterState) => {
      setFilters(newFilters);
      setPage(1); // Reset to first page on filter change
      startTransition(() => {
        updateUrl(newFilters, 1);
        // Router will trigger page refresh with new data
        router.refresh();
      });
    },
    [updateUrl, router],
  );

  // Handle view action
  const handleView = useCallback(
    (invoice: InvoiceWithCustomer) => {
      router.push(`/invoices/${invoice.id}`);
    },
    [router],
  );

  // Handle edit action (draft only)
  const handleEdit = useCallback(
    (invoice: InvoiceWithCustomer) => {
      router.push(`/invoices/${invoice.id}/edit`);
    },
    [router],
  );

  // Handle void action
  const handleVoidClick = useCallback((invoice: InvoiceWithCustomer) => {
    setSelectedInvoice(invoice);
    setVoidDialogOpen(true);
  }, []);

  // Handle void confirmation
  const handleVoidConfirm = useCallback(
    async (reason: string) => {
      if (!selectedInvoice) return;

      const result = await voidInvoice(selectedInvoice.id, reason);

      if (result.success) {
        toast.success(
          `Invoice ${selectedInvoice.invoice_number} has been voided`,
        );
        router.refresh();
      } else {
        toast.error(result.error || "Failed to void invoice");
      }
    },
    [selectedInvoice, router],
  );

  // Record Payment and Send are placeholders for future stories
  const handleRecordPayment = useCallback((_invoice: InvoiceWithCustomer) => {
    toast.info("Record Payment will be available in Story 8.4");
  }, []);

  const handleSend = useCallback((_invoice: InvoiceWithCustomer) => {
    toast.info("Send Invoice will be available in Story 8.6");
  }, []);

  // Calculate pagination info
  const totalPages = Math.ceil(totalCount / currentPageSize);
  const startItem = (page - 1) * currentPageSize + 1;
  const endItem = Math.min(page * currentPageSize, totalCount);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <InvoiceFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        loading={isPending}
      />

      {/* Results summary */}
      {totalCount > 0 && (
        <p className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {totalCount} invoices
        </p>
      )}

      {/* Invoice Table */}
      <InvoiceListTable
        invoices={initialInvoices}
        loading={isPending}
        onView={handleView}
        onEdit={handleEdit}
        onRecordPayment={handleRecordPayment}
        onSend={handleSend}
        onVoid={handleVoidClick}
      />

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <Select
                value={String(currentPageSize)}
                onValueChange={handlePageSizeChange}
                disabled={isPending}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = page - 1;
                setPage(newPage);
                updateUrl(filters, newPage, currentPageSize);
                router.refresh();
              }}
              disabled={page <= 1 || isPending}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const newPage = page + 1;
                setPage(newPage);
                updateUrl(filters, newPage, currentPageSize);
                router.refresh();
              }}
              disabled={page >= totalPages || isPending}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Void Confirmation Dialog */}
      <VoidInvoiceDialog
        open={voidDialogOpen}
        onOpenChange={setVoidDialogOpen}
        invoiceNumber={selectedInvoice?.invoice_number || ""}
        invoiceAmount={selectedInvoice?.total || "0"}
        onConfirm={handleVoidConfirm}
      />
    </div>
  );
}
