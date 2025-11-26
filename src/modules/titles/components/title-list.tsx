"use client";

import { Book, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { PublicationStatus, TitleWithAuthor } from "../types";

interface TitleListProps {
  titles: TitleWithAuthor[];
  selectedTitleId: string | null;
  onSelectTitle: (titleId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: PublicationStatus | "all";
  onStatusFilterChange: (status: PublicationStatus | "all") => void;
  loading: boolean;
}

/**
 * Publication status badge styling
 * AC 2: Status badge with colors per status
 */
function getStatusBadge(status: PublicationStatus) {
  const styles: Record<PublicationStatus, string> = {
    draft: "bg-gray-100 text-gray-700 border-gray-200",
    pending: "bg-amber-50 text-amber-700 border-amber-200",
    published: "bg-green-50 text-green-700 border-green-200",
    out_of_print: "bg-red-50 text-red-600 border-red-200",
  };

  const labels: Record<PublicationStatus, string> = {
    draft: "Draft",
    pending: "Pending",
    published: "Published",
    out_of_print: "Out of Print",
  };

  return (
    <Badge variant="outline" className={cn("shrink-0 text-xs", styles[status])}>
      {labels[status]}
    </Badge>
  );
}

/**
 * Format icons for physical/ebook
 * AC 2: Format icons (P/E for Physical/Ebook)
 */
function FormatIcons({
  isbn,
  eisbn,
}: {
  isbn: string | null;
  eisbn: string | null;
}) {
  return (
    <div className="flex gap-1">
      <span
        className={cn(
          "text-[10px] font-medium px-1 rounded",
          isbn ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-400"
        )}
        title={isbn ? `ISBN: ${isbn}` : "No physical ISBN"}
      >
        P
      </span>
      <span
        className={cn(
          "text-[10px] font-medium px-1 rounded",
          eisbn ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400"
        )}
        title={eisbn ? `eISBN: ${eisbn}` : "No ebook ISBN"}
      >
        E
      </span>
    </div>
  );
}

/**
 * Title List component for the left panel
 *
 * AC 2: Left panel displays title list with search and filter
 * AC 2: Search box filters by title name, author name, ISBN/eISBN
 * AC 2: Publication status filter dropdown
 * AC 2: Each list item shows: title name, author name, status badge, format icons
 * AC 2: Sorted by most recently updated
 * AC 2: Skeleton loaders during data fetch
 * AC 2: Empty state message
 */
export function TitleList({
  titles,
  selectedTitleId,
  onSelectTitle,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  loading,
}: TitleListProps) {
  // Empty state (no titles at all)
  if (
    !loading &&
    titles.length === 0 &&
    !searchQuery &&
    statusFilter === "all"
  ) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <Book className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No titles yet</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create your first title to get started
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
            placeholder="Search titles, authors, ISBN..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
            aria-label="Search titles by name, author, or ISBN"
          />
        </div>

        {/* Status Filter Dropdown */}
        <Select
          value={statusFilter}
          onValueChange={(value) =>
            onStatusFilterChange(value as PublicationStatus | "all")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="out_of_print">Out of Print</SelectItem>
          </SelectContent>
        </Select>
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
      {!loading &&
        titles.length === 0 &&
        (searchQuery || statusFilter !== "all") && (
          <div className="flex-1 flex items-center justify-center p-8">
            <p className="text-sm text-muted-foreground text-center">
              No titles found
              {searchQuery && ` matching "${searchQuery}"`}
              {statusFilter !== "all" &&
                ` with status "${statusFilter.replace("_", " ")}"`}
            </p>
          </div>
        )}

      {/* Title List */}
      {!loading && titles.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <span role="listbox" aria-label="Titles">
            {titles.map((title) => (
              <li key={title.id}>
                <button
                  type="button"
                  onClick={() => onSelectTitle(title.id)}
                  className={cn(
                    "w-full text-left px-4 py-3 border-b transition-colors",
                    "hover:bg-muted/50 focus:outline-none focus:bg-muted/50",
                    "flex items-start justify-between gap-2",
                    // Active item styling
                    selectedTitleId === title.id &&
                      "bg-primary/10 border-l-2 border-l-primary"
                  )}
                  role="option"
                  aria-selected={selectedTitleId === title.id}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{title.title}</div>
                    <div className="text-sm text-muted-foreground truncate">
                      {title.author.name}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusBadge(title.publication_status)}
                      <FormatIcons isbn={title.isbn} eisbn={title.eisbn} />
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
