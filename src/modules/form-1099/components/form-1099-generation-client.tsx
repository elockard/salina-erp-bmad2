/**
 * Form 1099 Generation Client Component
 *
 * Client component for managing 1099 generation workflow.
 * Includes author selection, filtering, and batch generation.
 *
 * Story 11.3: Generate 1099-MISC Forms
 * AC-11.3.1: Display authors meeting $10 royalty threshold
 * AC-11.3.2: Show tax info and US-based status
 * AC-11.3.3: Batch generation capability
 * AC-11.3.4: Download generated forms
 */

"use client";

import {
  AlertCircle,
  Archive,
  Check,
  CheckCircle,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  downloadAll1099sZipAction,
  generate1099Action,
  get1099DownloadUrlAction,
  getAuthors1099InfoAction,
} from "../actions";
import type { Author1099Info } from "../types";
import { Form1099BatchDialog } from "./form-1099-batch-dialog";
import { Form1099GenerateAnywayDialog } from "./form-1099-generate-anyway-dialog";
import { Form1099RegenerateDialog } from "./form-1099-regenerate-dialog";

interface Form1099GenerationClientProps {
  initialData: Author1099Info[];
  initialYear: number;
}

type FilterOption = "all" | "eligible" | "ready" | "generated" | "missing_info";

export function Form1099GenerationClient({
  initialData,
  initialYear,
}: Form1099GenerationClientProps) {
  const [data, setData] = useState<Author1099Info[]>(initialData);
  const [year, setYear] = useState(initialYear);
  const [filter, setFilter] = useState<FilterOption>("eligible");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [showGenerateAnywayDialog, setShowGenerateAnywayDialog] =
    useState(false);
  const [selectedAuthorForRegenerate, setSelectedAuthorForRegenerate] =
    useState<Author1099Info | null>(null);
  const [selectedAuthorForGenerateAnyway, setSelectedAuthorForGenerateAnyway] =
    useState<Author1099Info | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  // Generate year options (current year - 5 to current year)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => currentYear - i);
  }, []);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = data;

    // Apply filter
    switch (filter) {
      case "eligible":
        result = result.filter((a) => a.meets_threshold);
        break;
      case "ready":
        result = result.filter(
          (a) =>
            a.meets_threshold &&
            a.has_tax_info &&
            a.is_us_based &&
            !a.has_generated_1099,
        );
        break;
      case "generated":
        result = result.filter((a) => a.has_generated_1099);
        break;
      case "missing_info":
        result = result.filter(
          (a) => a.meets_threshold && (!a.has_tax_info || !a.is_us_based),
        );
        break;
    }

    // Apply search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(searchLower) ||
          a.email?.toLowerCase().includes(searchLower),
      );
    }

    return result;
  }, [data, filter, search]);

  // Get selectable authors (ready for generation)
  const selectableAuthors = useMemo(
    () =>
      filteredData.filter(
        (a) =>
          a.meets_threshold &&
          a.has_tax_info &&
          a.is_us_based &&
          !a.has_generated_1099,
      ),
    [filteredData],
  );

  // Handle year change
  const handleYearChange = useCallback((newYear: string) => {
    const yearNum = parseInt(newYear, 10);
    setYear(yearNum);
    setSelectedIds(new Set());

    startTransition(async () => {
      const result = await getAuthors1099InfoAction(yearNum);
      if (result.success && result.data) {
        setData(result.data);
      } else if (!result.success) {
        toast.error(result.error || "Failed to load data");
      }
    });
  }, []);

  // Handle select all
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === selectableAuthors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableAuthors.map((a) => a.id)));
    }
  }, [selectableAuthors, selectedIds.size]);

  // Handle individual selection
  const handleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(id);
      } else {
        newSet.delete(id);
      }
      return newSet;
    });
  }, []);

  // Handle single generation
  const handleGenerate = useCallback(
    async (contactId: string) => {
      startTransition(async () => {
        const result = await generate1099Action({
          contact_id: contactId,
          tax_year: year,
        });

        if (result.success) {
          toast.success("The 1099-MISC form has been generated successfully.");
          // Refresh data
          const refreshResult = await getAuthors1099InfoAction(year);
          if (refreshResult.success && refreshResult.data) {
            setData(refreshResult.data);
          }
        } else if (!result.success) {
          toast.error(result.error || "Failed to generate 1099");
        }
      });
    },
    [year],
  );

  // Handle download
  const handleDownload = useCallback(async (formId: string) => {
    const result = await get1099DownloadUrlAction(formId);

    if (result.success && result.data) {
      window.open(result.data.url, "_blank");
    } else if (!result.success) {
      toast.error(result.error || "Failed to get download URL");
    }
  }, []);

  // Handle batch generation complete
  const handleBatchComplete = useCallback(async () => {
    setShowBatchDialog(false);
    setSelectedIds(new Set());

    // Refresh data
    const result = await getAuthors1099InfoAction(year);
    if (result.success && result.data) {
      setData(result.data);
    }
  }, [year]);

  // Handle ZIP download of all generated forms
  const handleDownloadZip = useCallback(async () => {
    setIsDownloadingZip(true);
    try {
      const result = await downloadAll1099sZipAction(year);
      if (result.success && result.data) {
        window.open(result.data.url, "_blank");
        toast.success(`Downloaded ${result.data.count} 1099 forms as ZIP`);
      } else if (!result.success) {
        toast.error(result.error || "Failed to download ZIP");
      }
    } finally {
      setIsDownloadingZip(false);
    }
  }, [year]);

  // Handle regenerate click
  const handleRegenerateClick = useCallback((author: Author1099Info) => {
    setSelectedAuthorForRegenerate(author);
    setShowRegenerateDialog(true);
  }, []);

  // Handle regenerate complete
  const handleRegenerateComplete = useCallback(async () => {
    setShowRegenerateDialog(false);
    setSelectedAuthorForRegenerate(null);
    // Refresh data
    const result = await getAuthors1099InfoAction(year);
    if (result.success && result.data) {
      setData(result.data);
    }
  }, [year]);

  // Handle generate anyway click (for missing TIN)
  const handleGenerateAnywayClick = useCallback((author: Author1099Info) => {
    setSelectedAuthorForGenerateAnyway(author);
    setShowGenerateAnywayDialog(true);
  }, []);

  // Handle generate anyway complete
  const handleGenerateAnywayComplete = useCallback(async () => {
    setShowGenerateAnywayDialog(false);
    setSelectedAuthorForGenerateAnyway(null);
    // Refresh data
    const result = await getAuthors1099InfoAction(year);
    if (result.success && result.data) {
      setData(result.data);
    }
  }, [year]);

  // Count generated forms for ZIP button
  const generatedCount = useMemo(
    () => data.filter((a) => a.has_generated_1099).length,
    [data],
  );

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (date: Date | null) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Author Selection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Year Selector */}
            <div className="w-32">
              <Label htmlFor="year">Tax Year</Label>
              <Select value={String(year)} onValueChange={handleYearChange}>
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filter */}
            <div className="w-48">
              <Label htmlFor="filter">Filter</Label>
              <Select
                value={filter}
                onValueChange={(v) => setFilter(v as FilterOption)}
              >
                <SelectTrigger id="filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authors</SelectItem>
                  <SelectItem value="eligible">
                    Meet Threshold ($10+)
                  </SelectItem>
                  <SelectItem value="ready">Ready to Generate</SelectItem>
                  <SelectItem value="generated">Already Generated</SelectItem>
                  <SelectItem value="missing_info">Missing Info</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-48">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Batch Generate Button */}
            <div className="flex items-end gap-2">
              <Button
                onClick={() => setShowBatchDialog(true)}
                disabled={selectedIds.size === 0 || isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                Generate Selected ({selectedIds.size})
              </Button>

              {/* Download All as ZIP */}
              <Button
                variant="outline"
                onClick={handleDownloadZip}
                disabled={generatedCount === 0 || isDownloadingZip}
              >
                {isDownloadingZip ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Archive className="mr-2 h-4 w-4" />
                )}
                Download ZIP ({generatedCount})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      selectableAuthors.length > 0 &&
                      selectedIds.size === selectableAuthors.length
                    }
                    onCheckedChange={handleSelectAll}
                    disabled={selectableAuthors.length === 0}
                  />
                </TableHead>
                <TableHead>Author</TableHead>
                <TableHead>Earnings</TableHead>
                <TableHead>Tax Info</TableHead>
                <TableHead>US-Based</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    No authors match the current filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((author) => {
                  const isSelectable =
                    author.meets_threshold &&
                    author.has_tax_info &&
                    author.is_us_based &&
                    !author.has_generated_1099;

                  return (
                    <TableRow key={author.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(author.id)}
                          onCheckedChange={(checked) =>
                            handleSelect(author.id, checked as boolean)
                          }
                          disabled={!isSelectable}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{author.name}</div>
                          {author.email && (
                            <div className="text-sm text-muted-foreground">
                              {author.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              author.meets_threshold
                                ? "font-medium"
                                : "text-muted-foreground"
                            }
                          >
                            {formatCurrency(author.total_earnings)}
                          </span>
                          {author.meets_threshold ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {author.has_tax_info ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="mr-1 h-3 w-3" />
                            {author.tin_type?.toUpperCase()} ***
                            {author.tin_last_four}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600">
                            <X className="mr-1 h-3 w-3" />
                            Missing
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {author.is_us_based ? (
                          <Badge variant="outline" className="text-green-600">
                            <Check className="mr-1 h-3 w-3" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600">
                            <X className="mr-1 h-3 w-3" />
                            No
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {author.has_generated_1099 ? (
                          <div className="flex items-center gap-2">
                            <Badge className="bg-green-600">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Generated
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(author.generated_1099_at)}
                            </span>
                          </div>
                        ) : author.meets_threshold ? (
                          author.has_tax_info && author.is_us_based ? (
                            <Badge variant="secondary">Ready</Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Missing Info
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            Below Threshold
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {author.has_generated_1099 ? (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDownload(author.id)}
                              >
                                <Download className="mr-1 h-3 w-3" />
                                Download
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRegenerateClick(author)}
                                disabled={isPending}
                                title="Regenerate 1099"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </>
                          ) : isSelectable ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerate(author.id)}
                              disabled={isPending}
                            >
                              {isPending ? (
                                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              ) : (
                                <FileText className="mr-1 h-3 w-3" />
                              )}
                              Generate
                            </Button>
                          ) : author.meets_threshold &&
                            author.is_us_based &&
                            !author.has_tax_info ? (
                            /* Generate Anyway button for missing TIN - US-based authors meeting threshold */
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerateAnywayClick(author)}
                              disabled={isPending}
                              className="text-amber-600 border-amber-300 hover:bg-amber-50"
                            >
                              <AlertCircle className="mr-1 h-3 w-3" />
                              Generate Anyway
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Batch Generation Dialog */}
      <Form1099BatchDialog
        open={showBatchDialog}
        onOpenChange={setShowBatchDialog}
        selectedAuthors={data.filter((a) => selectedIds.has(a.id))}
        taxYear={year}
        onComplete={handleBatchComplete}
      />

      {/* Regenerate Dialog */}
      {selectedAuthorForRegenerate && (
        <Form1099RegenerateDialog
          open={showRegenerateDialog}
          onOpenChange={setShowRegenerateDialog}
          author={selectedAuthorForRegenerate}
          taxYear={year}
          onComplete={handleRegenerateComplete}
        />
      )}

      {/* Generate Anyway Dialog (for missing TIN) */}
      {selectedAuthorForGenerateAnyway && (
        <Form1099GenerateAnywayDialog
          open={showGenerateAnywayDialog}
          onOpenChange={setShowGenerateAnywayDialog}
          author={selectedAuthorForGenerateAnyway}
          taxYear={year}
          onComplete={handleGenerateAnywayComplete}
        />
      )}
    </div>
  );
}
