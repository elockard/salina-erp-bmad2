"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fetchAuthors, getAuthorWithPortalStatus } from "../actions";
import type { Author } from "../types";
import { AuthorDetail } from "./author-detail";
import { AuthorForm } from "./author-form";
import { AuthorList } from "./author-list";

interface AuthorsSplitViewProps {
  initialAuthors: Author[];
}

/**
 * Split View layout for Author Management
 *
 * AC 1: Route /dashboard/authors renders Split View layout with left panel (320px) and right panel (fluid)
 * AC 28: Responsive: Desktop 320px left, Tablet 280px left, Mobile list-only with slide-in detail
 * AC 33: Server Components for initial fetch; Client Components for interactivity
 */
export function AuthorsSplitView({ initialAuthors }: AuthorsSplitViewProps) {
  const [authors, setAuthors] = useState<Author[]>(initialAuthors);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  // Story 2.3: Portal user info for selected author
  const [portalUser, setPortalUser] = useState<{
    id: string;
    is_active: boolean;
    clerk_user_id: string | null;
  } | null>(null);

  const selectedAuthor = authors.find((a) => a.id === selectedAuthorId) || null;

  // Reload authors after mutations
  const reloadAuthors = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchAuthors({ includeInactive: showInactive });
      setAuthors(result);
    } catch (error) {
      console.error("Failed to reload authors:", error);
      toast.error("Failed to load authors");
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  // Reload when showInactive changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally run only on mount to sync initial URL params
  useEffect(() => {
    reloadAuthors();
  }, [showInactive, reloadAuthors]);

  // Story 2.3: Load portal user info when selected author changes
  const loadPortalUserInfo = useCallback(async (authorId: string | null) => {
    if (!authorId) {
      setPortalUser(null);
      return;
    }

    try {
      const authorWithPortal = await getAuthorWithPortalStatus(authorId);
      setPortalUser(authorWithPortal?.portalUser || null);
    } catch (error) {
      console.error("Failed to load portal user info:", error);
      setPortalUser(null);
    }
  }, []);

  useEffect(() => {
    loadPortalUserInfo(selectedAuthorId);
  }, [selectedAuthorId, loadPortalUserInfo]);

  // Handle author selection
  const handleSelectAuthor = (authorId: string) => {
    setSelectedAuthorId(authorId);
    setMobileDetailOpen(true);
  };

  // Handle author created
  const handleAuthorCreated = (author: Author) => {
    setAuthors((prev) =>
      [...prev, author].sort((a, b) => a.name.localeCompare(b.name)),
    );
    setSelectedAuthorId(author.id);
    setCreateDialogOpen(false);
    setMobileDetailOpen(true);
    toast.success("Author created successfully");
  };

  // Handle author updated
  const handleAuthorUpdated = (author: Author) => {
    setAuthors((prev) =>
      prev
        .map((a) => (a.id === author.id ? author : a))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
    toast.success("Author updated");
  };

  // Handle author deactivated
  const handleAuthorDeactivated = (author: Author) => {
    if (!showInactive) {
      setAuthors((prev) => prev.filter((a) => a.id !== author.id));
      if (selectedAuthorId === author.id) {
        setSelectedAuthorId(null);
        setMobileDetailOpen(false);
      }
    } else {
      setAuthors((prev) => prev.map((a) => (a.id === author.id ? author : a)));
    }
    toast.success("Author deactivated");
  };

  // Handle author reactivated
  const handleAuthorReactivated = (author: Author) => {
    setAuthors((prev) => prev.map((a) => (a.id === author.id ? author : a)));
    toast.success("Author reactivated");
  };

  // Story 2.3: Handle portal access changes
  const handlePortalAccessChanged = () => {
    // Reload authors to update portal_user_id in list
    reloadAuthors();
    // Reload portal user info for selected author
    if (selectedAuthorId) {
      loadPortalUserInfo(selectedAuthorId);
    }
  };

  // Filter authors by search query (client-side)
  const filteredAuthors = authors.filter((author) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      author.name.toLowerCase().includes(query) ||
      author.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex h-full">
      {/* Left Panel - Author List */}
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
          <h2 className="text-lg font-semibold">Authors</h2>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
            + Create Author
          </Button>
        </div>

        {/* Author List */}
        <AuthorList
          authors={filteredAuthors}
          selectedAuthorId={selectedAuthorId}
          onSelectAuthor={handleSelectAuthor}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          showInactive={showInactive}
          onShowInactiveChange={setShowInactive}
          loading={loading}
        />
      </div>

      {/* Right Panel - Author Detail */}
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

        {selectedAuthor ? (
          <AuthorDetail
            author={selectedAuthor}
            portalUser={portalUser}
            onAuthorUpdated={handleAuthorUpdated}
            onAuthorDeactivated={handleAuthorDeactivated}
            onAuthorReactivated={handleAuthorReactivated}
            onPortalAccessChanged={handlePortalAccessChanged}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Select an author to view details</p>
          </div>
        )}
      </div>

      {/* Create Author Dialog */}
      <AuthorForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleAuthorCreated}
      />
    </div>
  );
}
