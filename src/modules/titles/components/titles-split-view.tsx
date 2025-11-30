"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { CREATE_AUTHORS_TITLES } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { fetchTitles } from "../actions";
import type { PublicationStatus, TitleWithAuthor } from "../types";
import { TitleDetail } from "./title-detail";
import { TitleForm } from "./title-form";
import { TitleList } from "./title-list";

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
  const [titles, setTitles] = useState<TitleWithAuthor[]>(initialTitles);
  const [selectedTitleId, setSelectedTitleId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PublicationStatus | "all">(
    "all",
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

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

  // Filter titles by search query (client-side for instant feedback)
  const filteredTitles = titles.filter((title) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      title.title.toLowerCase().includes(query) ||
      title.author.name.toLowerCase().includes(query) ||
      title.isbn?.toLowerCase().includes(query) ||
      title.eisbn?.toLowerCase().includes(query)
    );
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
        {/* Header with Create Button */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Titles</h2>
          {canCreateTitles && (
            <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
              + Create Title
            </Button>
          )}
        </div>

        {/* Title List */}
        <TitleList
          titles={filteredTitles}
          selectedTitleId={selectedTitleId}
          onSelectTitle={handleSelectTitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
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
    </div>
  );
}
