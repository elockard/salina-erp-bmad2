"use client";

/**
 * CSV Export Dialog Component
 *
 * Story: 19.3 - Export Catalog to CSV
 * Task 6: Build export UI components
 *
 * FR173: Publisher can export catalog data to CSV for external analysis
 *
 * Features:
 * - Data type selector (titles, contacts, sales)
 * - Date range filter
 * - Type-specific filters (status for titles, role for contacts, etc.)
 * - Preview count before export
 * - Progress indicator for async exports
 * - Toast notification when export completes
 */

import { format } from "date-fns";
import { CalendarIcon, Download, FileSpreadsheet, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { cn } from "@/lib/utils";

import {
  getExportPreviewCountAction,
  getExportStatusAction,
  requestExportAction,
} from "../actions";
import type { ExportDataType, ExportFilters, ExportResult } from "../types";

/**
 * Export dialog for CSV data export
 *
 * AC 1: Select data type (titles, contacts, sales)
 * AC 2: Filter by date range
 * AC 3: Export generates CSV file
 * AC 4: Large exports processed in background
 * AC 5: Notified when export is ready
 */
export function ExportDialog() {
  const [open, setOpen] = useState(false);
  const [exportType, setExportType] = useState<ExportDataType>("titles");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [formatFilter, setFormatFilter] = useState<string | undefined>();
  const [channelFilter, setChannelFilter] = useState<string | undefined>();

  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [asyncExportId, setAsyncExportId] = useState<string | null>(null);
  const [asyncStatus, setAsyncStatus] = useState<ExportResult | null>(null);

  // Build filters object
  const getFilters = useCallback((): ExportFilters | undefined => {
    const filters: ExportFilters = {};

    if (dateFrom && dateTo) {
      filters.dateRange = { from: dateFrom, to: dateTo };
    }

    if (exportType === "titles" && statusFilter) {
      filters.publicationStatus =
        statusFilter as ExportFilters["publicationStatus"];
    }

    if (exportType === "contacts" && roleFilter) {
      filters.role = roleFilter as ExportFilters["role"];
    }

    if (exportType === "sales") {
      if (formatFilter) {
        filters.format = formatFilter as ExportFilters["format"];
      }
      if (channelFilter) {
        filters.channel = channelFilter as ExportFilters["channel"];
      }
    }

    return Object.keys(filters).length > 0 ? filters : undefined;
  }, [
    dateFrom,
    dateTo,
    exportType,
    statusFilter,
    roleFilter,
    formatFilter,
    channelFilter,
  ]);

  // Load preview count when filters change
  useEffect(() => {
    if (!open) return;

    const loadCount = async () => {
      setIsLoadingCount(true);
      try {
        const { count } = await getExportPreviewCountAction(
          exportType,
          getFilters(),
        );
        setPreviewCount(count);
      } catch (error) {
        console.error("Failed to load preview count:", error);
        setPreviewCount(null);
      } finally {
        setIsLoadingCount(false);
      }
    };

    const debounce = setTimeout(loadCount, 300);
    return () => clearTimeout(debounce);
  }, [open, exportType, getFilters]);

  // Poll for async export status
  useEffect(() => {
    if (!asyncExportId) return;

    const pollStatus = async () => {
      try {
        const status = await getExportStatusAction(asyncExportId);
        setAsyncStatus(status);

        if (status?.status === "completed") {
          toast.success("Export ready! Downloading...");
          if (status.fileUrl) {
            window.open(status.fileUrl, "_blank");
          }
          setAsyncExportId(null);
          setIsExporting(false);
          setOpen(false);
        } else if (status?.status === "failed") {
          toast.error(
            `Export failed: ${status.errorMessage || "Unknown error"}`,
          );
          setAsyncExportId(null);
          setIsExporting(false);
        }
      } catch (error) {
        console.error("Failed to poll export status:", error);
      }
    };

    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, [asyncExportId]);

  // Handle export
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await requestExportAction(exportType, getFilters());

      if (result.mode === "sync") {
        // Direct download for small exports
        const blob = new Blob([result.csv], {
          type: "text/csv;charset=utf-8;",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(`Exported ${result.rowCount} rows successfully`);
        setIsExporting(false);
        setOpen(false);
      } else {
        // Async export - start polling
        setAsyncExportId(result.exportId);
        toast.info(
          `Large export (${result.estimatedRows} rows) started. You'll be notified when ready.`,
        );
      }
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to start export. Please try again.");
      setIsExporting(false);
    }
  };

  // Reset filters when type changes
  useEffect(() => {
    setStatusFilter(undefined);
    setRoleFilter(undefined);
    setFormatFilter(undefined);
    setChannelFilter(undefined);
  }, []);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPreviewCount(null);
      setAsyncExportId(null);
      setAsyncStatus(null);
      setIsExporting(false);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="export-button">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Export Data to CSV</DialogTitle>
          <DialogDescription>
            Select the data type and filters to export your catalog data.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Data Type Selector */}
          <div className="space-y-3">
            <Label>Data Type</Label>
            <RadioGroup
              value={exportType}
              onValueChange={(value) => setExportType(value as ExportDataType)}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="titles" id="titles" />
                <Label htmlFor="titles" className="font-normal cursor-pointer">
                  Titles
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="contacts" id="contacts" />
                <Label
                  htmlFor="contacts"
                  className="font-normal cursor-pointer"
                >
                  Contacts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="sales" id="sales" />
                <Label htmlFor="sales" className="font-normal cursor-pointer">
                  Sales
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Date Range Filter */}
          <div className="space-y-3">
            <Label>Date Range (optional)</Label>
            <div className="flex gap-4">
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM d, yyyy") : "To"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>

          {/* Type-specific filters */}
          {exportType === "titles" && (
            <div className="space-y-3">
              <Label>Publication Status (optional)</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="out_of_print">Out of Print</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {exportType === "contacts" && (
            <div className="space-y-3">
              <Label>Contact Role (optional)</Label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="author">Author</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="vendor">Vendor</SelectItem>
                  <SelectItem value="distributor">Distributor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {exportType === "sales" && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <Label>Format (optional)</Label>
                <Select value={formatFilter} onValueChange={setFormatFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All formats" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">Physical</SelectItem>
                    <SelectItem value="ebook">Ebook</SelectItem>
                    <SelectItem value="audiobook">Audiobook</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label>Channel (optional)</Label>
                <Select value={channelFilter} onValueChange={setChannelFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All channels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">Retail</SelectItem>
                    <SelectItem value="wholesale">Wholesale</SelectItem>
                    <SelectItem value="direct">Direct</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="amazon">Amazon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Preview Count */}
          <div className="rounded-lg border bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">
              {isLoadingCount ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Counting records...
                </span>
              ) : previewCount !== null ? (
                <span>
                  <strong className="text-foreground">
                    {previewCount.toLocaleString()}
                  </strong>{" "}
                  {previewCount === 1 ? "record" : "records"} will be exported
                  {previewCount > 1000 && (
                    <span className="block text-xs mt-1">
                      Large export will be processed in background
                    </span>
                  )}
                </span>
              ) : (
                "Unable to load record count"
              )}
            </div>
          </div>

          {/* Async export progress */}
          {asyncExportId && asyncStatus && (
            <div className="rounded-lg border bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>
                  {asyncStatus.status === "pending"
                    ? "Export queued..."
                    : asyncStatus.status === "processing"
                      ? "Generating export..."
                      : "Processing..."}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={
              isExporting ||
              isLoadingCount ||
              previewCount === null ||
              previewCount === 0
            }
            data-testid="start-export-button"
          >
            {isExporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {previewCount?.toLocaleString() || 0} Records
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
