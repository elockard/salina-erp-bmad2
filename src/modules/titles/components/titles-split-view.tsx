"use client";

import { ChevronDown, FileUp, Info, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  CsvImportModal,
  CsvUpdateModal,
  ExportDialog,
} from "@/modules/import-export/components";
import { ONIXImportModal } from "@/modules/onix/components";
import { fetchTitles } from "../actions";
import type { PublicationStatus, TitleWithAuthor } from "../types";
import { hasMinimumAccessibilityMetadata } from "../utils";
import { TitleDetail } from "./title-detail";
import { TitleForm } from "./title-form";
import { type AccessibilityFilter, TitleList } from "./title-list";

interface TitlesSplitViewProps {
  initialTitles: TitleWithAuthor[];
}

/**
 * Split View layout for Title Management
 *
 * AC 1: Route /dashboard/titles renders Split View layout with left panel (320px) and right panel (fluid)
 * AC 1: Mobile responsive: single column layout below 768px
 */
export function TitlesSplitView({ initialTitles }: TitlesSplitViewProps) {
  const searchParams = useSearchParams();
  const [titles, setTitles] = useState<TitleWithAuthor[]>(initialTitles);
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "all">(
    "all",
  );
  const [accessibilityFilter, setAccessibilityFilter] =
    useState<AccessibilityFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [onixImportDialogOpen, setOnixImportDialogOpen] = useState(false);
  const [csvImportDialogOpen, setCsvImportDialogOpen] = useState(false);
  const [csvUpdateDialogOpen, setCsvUpdateDialogOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Story 17.4: ASIN resolution flow
  const resolveAsin = searchParams.get("resolve_asin");
  const [showResolveAlert, setShowResolveAlert] = useState(!!resolveAsin);

  const canCreateTitles = useHasPermission(CREATE_AUTHORS_TITLES);

  const selectedTitle = titles.find((t) => t.id === selectedTitleId) || null;

  // Reload titles after mutations or filter changes
  const reloadTitles = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchTitles({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      setTitles(result);
    } catch (error) {
      console.error("Failed to reload titles:", error);
      toast.error("Failed to load titles");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  // Reload when filter changes
  useEffect(() => {
    reloadTitles();
  }, [reloadTitles]);

  // Handle title selection
  const handleSelectTitle = (titleId: string) => {
    setSelectedTitleId(titleId);
    setMobileDetailOpen(true);
  };

  // Handle title created
  const handleTitleCreated = (title: TitleWithAuthor) => {
    setTitles((prev) => [title, ...prev]);
    setSelectedTitleId(title.id);
    setCreateDialogOpen(false);
    setMobileDetailOpen(true);
    toast.success("Title created successfully");
  };

  // Handle title updated
  const handleTitleUpdated = (title: TitleWithAuthor) => {
    setTitles((prev) => prev.map((t) => (t.id === title.id ? title : t)));
    toast.success("Title updated");
  };

  // Filter titles by search query and accessibility (client-side for instant feedback)
  // Story 7.6: Removed eisbn - ISBNs are unified without type distinction
  // Story 14.3 - AC6: Accessibility filter for EAA compliance
  const filteredTitles = titles.filter((title) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        title.title.toLowerCase().includes(query) ||
        title.author.name.toLowerCase().includes(query) ||
        title.isbn?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    // Accessibility filter (Story 14.3)
    if (accessibilityFilter !== "all") {
      const hasA11y = hasMinimumAccessibilityMetadata({
        epub_accessibility_conformance:
          title.epub_accessibility_conformance ?? null,
        accessibility_features: title.accessibility_features ?? null,
        accessibility_hazards: title.accessibility_hazards ?? null,
        accessibility_summary: title.accessibility_summary ?? null,
      });

      if (accessibilityFilter === "needs_setup" && hasA11y) return false;
      if (accessibilityFilter === "has_metadata" && !hasA11y) return false;
    }

    return true;
  });

  return (
    <div className="flex h-full">
      {/* Left Panel - Title List */}
      <div
        className={cn(
          "flex flex-col border-r bg-background",
          "w-[320px] lg:w-[320px] md:w-[280px]",
          "max-md:w-full max-md:border-r-0",
          mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Header with Create and Import Buttons */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Titles</h2>
          {canCreateTitles && (
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <FileUp className="h-4 w-4 mr-1" />
                    Import
                    <ChevronDown className="h-3 w-3 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => setCsvImportDialogOpen(true)}
                  >
                    Import CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setCsvUpdateDialogOpen(true)}
                  >
                    Update via CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setOnixImportDialogOpen(true)}
                  >
                    Import ONIX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <ExportDialog />
              <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                + Create Title
              </Button>
            </div>
          )}
        </div>

        {/* Story 17.4: ASIN Resolution Alert */}
        {showResolveAlert && resolveAsin && (
          <Alert className="m-2 bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-sm">
                Link ASIN{" "}
                <code className="font-mono bg-blue-100 px-1 rounded">
                  {resolveAsin}
                </code>{" "}
                to a title below. Select the title and click &quot;Add
                ASIN&quot;.
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 ml-2"
                onClick={() => setShowResolveAlert(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Title List */}
        <TitleList
          titles={filteredTitles}
          selectedTitleId={selectedTitleId}
          onSelectTitle={handleSelectTitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          accessibilityFilter={accessibilityFilter}
          onAccessibilityFilterChange={setAccessibilityFilter}
          loading={loading}
        />
      </div>

      {/* Right Panel - Title Detail */}
      <div
        className={cn(
          "flex-1 overflow-auto bg-muted/30",
          "max-md:fixed max-md:inset-0 max-md:z-50 max-md:bg-background",
          !mobileDetailOpen && "max-md:hidden",
        )}
      >
        {/* Mobile Back Button */}
        {mobileDetailOpen && (
          <div className="md:hidden p-4 border-b flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileDetailOpen(false)}
            >
              ← Back to list
            </Button>
          </div>
        )}

        {selectedTitle ? (
          <TitleDetail
            title={selectedTitle}
            onTitleUpdated={handleTitleUpdated}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select a title to view details</p>
          </div>
        )}
      </div>

      {/* Create Title Dialog */}
      {canCreateTitles && (
        <TitleForm
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleTitleCreated}
        />
      )}

      {/* CSV Import Dialog - Story 19.1 */}
      {canCreateTitles && (
        <CsvImportModal
          open={csvImportDialogOpen}
          onOpenChange={setCsvImportDialogOpen}
          onImportComplete={() => {
            reloadTitles();
          }}
        />
      )}

      {/* CSV Update Dialog - Story 19.4 */}
      {canCreateTitles && (
        <CsvUpdateModal
          open={csvUpdateDialogOpen}
          onOpenChange={setCsvUpdateDialogOpen}
          onUpdateComplete={() => {
            reloadTitles();
          }}
        />
      )}

      {/* ONIX Import Dialog */}
      {canCreateTitles && (
        <ONIXImportModal
          open={onixImportDialogOpen}
          onOpenChange={setOnixImportDialogOpen}
          onImportComplete={() => {
            reloadTitles();
          }}
        />
      )}
    </div>
  );
}
