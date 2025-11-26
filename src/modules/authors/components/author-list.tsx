"use client";

import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Author } from "../types";

interface AuthorListProps {
  authors: Author[];
  selectedAuthorId: string | null;
  onSelectAuthor: (authorId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showInactive: boolean;
  onShowInactiveChange: (show: boolean) => void;
  loading: boolean;
}

/**
 * Author List component for the left panel
 *
 * AC 2: Left panel displays scrollable author list with search box at top
 * AC 3: Search box filters authors by name or email (case-insensitive, debounced 300ms)
 * AC 4: Author list shows: Name, email preview (truncated), active/inactive badge
 * AC 5: Authors sorted alphabetically by name (A-Z)
 * AC 6: Clicking author row loads detail; active item shows primary-light background + primary left border
 * AC 24: Inactive authors displayed with gray badge and reduced opacity
 * AC 25: Filter toggle "Show inactive" in left panel header
 * AC 26: Empty state: "No authors yet" + Create button
 * AC 27: Loading state: Skeleton loaders
 */
export function AuthorList({
  authors,
  selectedAuthorId,
  onSelectAuthor,
  searchQuery,
  onSearchChange,
  showInactive,
  onShowInactiveChange,
  loading,
}: AuthorListProps) {
  // Empty state
  if (!loading && authors.length === 0 && !searchQuery) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">📚</div>
        <h3 className="text-lg font-medium mb-2">No authors yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first author to get started
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Search and Filter Controls */}
      <div className="p-4 space-y-3 border-b">
        {/* Search Box */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search authors..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search authors by name or email"
          />
        </div>

        {/* Show Inactive Toggle */}
        <div className="flex items-center space-x-2">
          <Checkbox
            id="show-inactive"
            checked={showInactive}
            onCheckedChange={(checked) =>
              onShowInactiveChange(checked === true)
            }
          />
          <Label
            htmlFor="show-inactive"
            className="text-sm text-muted-foreground cursor-pointer"
          >
            Show inactive
          </Label>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-3 p-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-5 w-16" />
            </div>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!loading && authors.length === 0 && searchQuery && (
        <div className="flex-1 flex items-center justify-center p-8">
          <p className="text-sm text-muted-foreground">
            No authors found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      )}

      {/* Author List */}
      {!loading && authors.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <span role="listbox" aria-label="Authors">
            {authors.map((author) => (
              <li key={author.id}>
                <button
                  type="button"
                  onClick={() => onSelectAuthor(author.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b transition-colors",
                    "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                    "flex items-start justify-between gap-2",
                    // AC 6: Active item styling
                    selectedAuthorId === author.id &&
                      "bg-primary/10 border-l-2 border-l-primary",
                    // AC 24: Inactive authors with reduced opacity
                    !author.is_active && "opacity-60"
                  )}
                  role="option"
                  aria-selected={selectedAuthorId === author.id}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate flex items-center gap-1">
                      {author.name}
                      {/* AC 32: Portal icon for authors with active portal access */}
                      {author.portal_user_id && (
                        <span className="text-xs" title="Has portal access">
                          🔑
                          <span className="sr-only">Has portal access</span>
                        </span>
                      )}
                    </div>
                    {author.email && (
                      <div className="text-sm text-muted-foreground truncate">
                        {author.email}
                      </div>
                    )}
                  </div>

                  {/* AC 4: Active/inactive badge */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0",
                      author.is_active
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-gray-50 text-gray-500 border-gray-200"
                    )}
                  >
                    {author.is_active ? "Active" : "Inactive"}
                  </Badge>
                </button>
              </li>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
