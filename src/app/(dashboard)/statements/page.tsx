"use client";

/**
 * Statements Page
 *
 * Main page for viewing and generating royalty statements.
 * Features:
 * - Stats cards showing quarterly metrics
 * - Filterable statements table with pagination
 * - Detail modal with calculation breakdown
 * - PDF download and email resend actions
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * Story 5.5: Build Statements List and Detail View for Finance
 *
 * AC-5.5.1: Table displays period, author, generated on date, status badge, net payable, and actions
 * AC-5.5.2: Filters available: Period (dropdown), Author (search), Status (All/Sent/Draft/Failed), Date range
 * AC-5.5.3: Detail modal shows full calculation breakdown with expandable JSON
 * AC-5.5.4: Download PDF button generates presigned URL (15-minute expiry)
 * AC-5.5.5: Resend Email action available for sent statements
 *
 * Related:
 * - src/modules/statements/queries.ts (data fetching)
 * - src/modules/statements/actions.ts (PDF download, email resend)
 */

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  getStatementPDFUrl,
  resendStatementEmail,
} from "@/modules/statements/actions";
import {
  StatementDetailModal,
  StatementStatsCards,
  StatementsFilters,
  StatementsList,
  StatementsPagination,
  StatementWizardModal,
} from "@/modules/statements/components";
import type { StatementsFilter } from "@/modules/statements/queries";
import { getStatementsPageData } from "@/modules/statements/queries";
import type {
  PaginatedStatements,
  StatementWithRelations,
} from "@/modules/statements/types";

export default function StatementsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Modal states
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [selectedStatement, setSelectedStatement] =
    useState<StatementWithRelations | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [resendConfirmStatement, setResendConfirmStatement] =
    useState<StatementWithRelations | null>(null);

  // Data states
  const [statements, setStatements] = useState<PaginatedStatements>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 0,
  });
  const [stats, setStats] = useState({
    thisQuarterCount: 0,
    totalLiability: 0,
    pendingEmailCount: 0,
  });
  const [periods, setPeriods] = useState<
    Array<{ periodStart: Date; periodEnd: Date; label: string }>
  >([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Parse filters from URL
  const getFiltersFromUrl = useCallback((): StatementsFilter => {
    const filters: StatementsFilter = {};
    const periodStart = searchParams.get("periodStart");
    const periodEnd = searchParams.get("periodEnd");
    const authorSearch = searchParams.get("author");
    const status = searchParams.get("status");
    const generatedAfter = searchParams.get("after");
    const generatedBefore = searchParams.get("before");

    if (periodStart) filters.periodStart = new Date(periodStart);
    if (periodEnd) filters.periodEnd = new Date(periodEnd);
    if (authorSearch) filters.authorSearch = authorSearch;
    if (status && ["draft", "sent", "failed"].includes(status)) {
      filters.status = status as "draft" | "sent" | "failed";
    }
    if (generatedAfter) filters.generatedAfter = new Date(generatedAfter);
    if (generatedBefore) filters.generatedBefore = new Date(generatedBefore);

    return filters;
  }, [searchParams]);

  const [filters, setFilters] = useState<StatementsFilter>(() =>
    getFiltersFromUrl(),
  );
  const [page, setPage] = useState(() => {
    const pageParam = searchParams.get("page");
    return pageParam ? Number.parseInt(pageParam, 10) : 1;
  });

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (newFilters: StatementsFilter, newPage: number) => {
      const params = new URLSearchParams();
      if (newFilters.periodStart) {
        params.set("periodStart", newFilters.periodStart.toISOString());
      }
      if (newFilters.periodEnd) {
        params.set("periodEnd", newFilters.periodEnd.toISOString());
      }
      if (newFilters.authorSearch) {
        params.set("author", newFilters.authorSearch);
      }
      if (newFilters.status) {
        params.set("status", newFilters.status);
      }
      if (newFilters.generatedAfter) {
        params.set("after", newFilters.generatedAfter.toISOString());
      }
      if (newFilters.generatedBefore) {
        params.set("before", newFilters.generatedBefore.toISOString());
      }
      if (newPage > 1) {
        params.set("page", newPage.toString());
      }
      const queryString = params.toString();
      router.push(queryString ? `?${queryString}` : "/statements", {
        scroll: false,
      });
    },
    [router],
  );

  // Combined fetch - single server action call to avoid rate limiting
  const fetchPageData = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    try {
      const data = await getStatementsPageData({
        page,
        pageSize: 20,
        filters,
      });
      setStatements(data.statements);
      setStats(data.stats);
      setPeriods(data.periods);
    } catch (error) {
      console.error("Failed to fetch page data:", error);
      toast.error("Failed to load statements");
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [page, filters]);

  // Initial load and on filter/page change
  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Handle filter changes
  const handleFiltersChange = useCallback(
    (newFilters: StatementsFilter) => {
      setFilters(newFilters);
      setPage(1); // Reset to first page on filter change
      updateUrlParams(newFilters, 1);
    },
    [updateUrlParams],
  );

  // Handle page changes
  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      updateUrlParams(filters, newPage);
    },
    [filters, updateUrlParams],
  );

  // Handle wizard success - refresh data
  const handleWizardSuccess = useCallback(
    (jobId: string) => {
      console.log("Statement generation job started:", jobId);
      toast.success("Statement generation started!");
      // Refresh data after a short delay to allow background job to start
      setTimeout(() => {
        fetchPageData();
      }, 2000);
    },
    [fetchPageData],
  );

  // Handle view action
  const handleView = useCallback((statement: StatementWithRelations) => {
    setSelectedStatement(statement);
    setIsDetailOpen(true);
  }, []);

  // Handle PDF download
  const handleDownloadPDF = useCallback(
    async (statement: StatementWithRelations) => {
      setActionLoading(true);
      try {
        const result = await getStatementPDFUrl(statement.id);
        if (result.success && result.data) {
          // Open presigned URL in new tab
          window.open(result.data.url, "_blank");
          toast.success("PDF download started", {
            description: "URL expires in 15 minutes",
          });
        } else {
          const errorMessage = !result.success
            ? result.error
            : "Failed to generate download URL";
          toast.error(errorMessage);
        }
      } catch (error) {
        console.error("PDF download failed:", error);
        toast.error("Failed to download PDF");
      } finally {
        setActionLoading(false);
      }
    },
    [],
  );

  // Handle resend email
  const handleResendEmail = useCallback((statement: StatementWithRelations) => {
    setResendConfirmStatement(statement);
  }, []);

  // Confirm resend email
  const handleConfirmResend = useCallback(async () => {
    if (!resendConfirmStatement) return;

    setActionLoading(true);
    try {
      const result = await resendStatementEmail(resendConfirmStatement.id);
      if (result.success) {
        toast.success("Email sent successfully");
        // Refresh data to show updated status
        fetchPageData();
      } else {
        toast.error(result.error || "Failed to resend email");
      }
    } catch (error) {
      console.error("Email resend failed:", error);
      toast.error("Failed to resend email");
    } finally {
      setActionLoading(false);
      setResendConfirmStatement(null);
    }
  }, [resendConfirmStatement, fetchPageData]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Royalty Statements
          </h1>
          <p className="text-muted-foreground">
            Generate and manage author royalty statements
          </p>
        </div>
        <Button onClick={() => setIsWizardOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Generate Statements
        </Button>
      </div>

      {/* Stats Cards */}
      <StatementStatsCards
        thisQuarterCount={stats.thisQuarterCount}
        totalLiability={stats.totalLiability}
        pendingEmailCount={stats.pendingEmailCount}
        loading={statsLoading}
      />

      {/* Filters */}
      <StatementsFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        periods={periods}
        loading={loading}
      />

      {/* Statements Table */}
      <StatementsList
        statements={statements.items}
        loading={loading}
        onView={handleView}
        onDownloadPDF={handleDownloadPDF}
        onResendEmail={handleResendEmail}
      />

      {/* Pagination */}
      <StatementsPagination
        page={statements.page}
        totalPages={statements.totalPages}
        total={statements.total}
        pageSize={statements.pageSize}
        onPageChange={handlePageChange}
        loading={loading}
      />

      {/* Statement Generation Wizard Modal */}
      <StatementWizardModal
        open={isWizardOpen}
        onOpenChange={setIsWizardOpen}
        onSuccess={handleWizardSuccess}
      />

      {/* Statement Detail Modal */}
      <StatementDetailModal
        statement={selectedStatement}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onDownloadPDF={handleDownloadPDF}
        onResendEmail={handleResendEmail}
        actionLoading={actionLoading}
      />

      {/* Resend Email Confirmation Dialog */}
      <AlertDialog
        open={!!resendConfirmStatement}
        onOpenChange={(open) => {
          if (!open) setResendConfirmStatement(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resend Statement Email?</AlertDialogTitle>
            <AlertDialogDescription>
              This will send the royalty statement email to{" "}
              <strong>
                {resendConfirmStatement?.author?.name || "the author"}
              </strong>
              . Are you sure you want to resend this email?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmResend}
              disabled={actionLoading}
            >
              {actionLoading ? "Sending..." : "Resend Email"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
