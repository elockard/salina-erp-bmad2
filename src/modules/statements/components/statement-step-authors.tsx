"use client";

/**
 * Statement Wizard Step 2: Author Selection
 *
 * Story 5.3: Build Statement Generation Wizard for Finance
 * AC-5.3.3: Author selection allows "Select All" or individual checkboxes with search/filter
 *
 * Features:
 * - "Select All Authors" checkbox at top
 * - Scrollable author list with individual checkboxes
 * - Search/filter input to filter by name
 * - Author name and pending royalties estimate display
 * - Selection summary: "N authors selected - Total pending royalties: $X"
 */

import { DollarSign, Loader2, Search, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { AuthorWithPendingRoyalties } from "../types";
import type { WizardFormData } from "./statement-wizard-modal";

interface StatementStepAuthorsProps {
  authors: AuthorWithPendingRoyalties[];
  setAuthors: (authors: AuthorWithPendingRoyalties[]) => void;
  periodStart: Date;
  periodEnd: Date;
}

export function StatementStepAuthors({
  authors,
  setAuthors,
  periodStart,
  periodEnd,
}: StatementStepAuthorsProps) {
  const { watch, setValue } = useFormContext<WizardFormData>();
  const selectAll = watch("selectAll");
  const selectedAuthorIds = watch("selectedAuthorIds");

  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load authors with pending royalties on mount
  useEffect(() => {
    const loadAuthors = async () => {
      if (authors.length > 0) return; // Already loaded

      setIsLoading(true);
      setLoadError(null);

      try {
        const { getAuthorsWithPendingRoyalties } = await import("../actions");
        const result = await getAuthorsWithPendingRoyalties({
          periodStart,
          periodEnd,
        });

        if (result.success) {
          setAuthors(result.data);
          // If selectAll is true, pre-select all authors
          if (selectAll) {
            setValue(
              "selectedAuthorIds",
              result.data.map((a) => a.id),
            );
          }
        } else {
          setLoadError(result.error);
        }
      } catch (error) {
        setLoadError("Failed to load authors");
        console.error("Error loading authors:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthors();
  }, [authors.length, periodStart, periodEnd, setAuthors, selectAll, setValue]);

  // Filter authors by search query (AC-5.3.3)
  const filteredAuthors = authors.filter((author) =>
    author.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Handle "Select All" toggle (AC-5.3.3)
  const handleSelectAllChange = (checked: boolean) => {
    setValue("selectAll", checked);
    if (checked) {
      setValue(
        "selectedAuthorIds",
        authors.map((a) => a.id),
      );
    } else {
      setValue("selectedAuthorIds", []);
    }
  };

  // Handle individual author selection
  const handleAuthorToggle = (authorId: string, checked: boolean) => {
    const newSelection = checked
      ? [...selectedAuthorIds, authorId]
      : selectedAuthorIds.filter((id) => id !== authorId);

    setValue("selectedAuthorIds", newSelection);

    // Update selectAll state if all are now selected
    if (newSelection.length === authors.length) {
      setValue("selectAll", true);
    } else {
      setValue("selectAll", false);
    }
  };

  // Calculate totals for summary (AC-5.3.3)
  const selectedAuthors = selectAll
    ? authors
    : authors.filter((a) => selectedAuthorIds.includes(a.id));

  const totalPendingRoyalties = selectedAuthors.reduce(
    (sum, a) => sum + a.pendingRoyalties,
    0,
  );

  // Format currency
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground">Loading authors...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <p className="text-destructive">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Select Authors</h3>
        <p className="text-sm text-muted-foreground">
          Choose which authors to include in statement generation
        </p>
      </div>

      {/* Select All Checkbox (AC-5.3.3) */}
      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="select-all"
            checked={selectAll}
            onCheckedChange={handleSelectAllChange}
          />
          <Label htmlFor="select-all" className="cursor-pointer font-medium">
            Select All Authors ({authors.length})
          </Label>
        </div>
      </div>

      {/* Search Filter (AC-5.3.3) */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search authors by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Author List (AC-5.3.3) */}
      <div className="border rounded-lg max-h-[300px] overflow-y-auto">
        {filteredAuthors.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            {searchQuery
              ? "No authors match your search"
              : "No authors available"}
          </div>
        ) : (
          <div className="divide-y">
            {filteredAuthors.map((author) => {
              const isSelected =
                selectAll || selectedAuthorIds.includes(author.id);

              return (
                <div
                  key={author.id}
                  className={cn(
                    "flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
                    isSelected && "bg-muted/30",
                  )}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`author-${author.id}`}
                      checked={isSelected}
                      onCheckedChange={(checked) =>
                        handleAuthorToggle(author.id, checked as boolean)
                      }
                    />
                    <div>
                      <Label
                        htmlFor={`author-${author.id}`}
                        className="cursor-pointer font-medium"
                      >
                        {author.name}
                      </Label>
                      {author.email && (
                        <p className="text-xs text-muted-foreground">
                          {author.email}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(author.pendingRoyalties)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      pending royalties
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selection Summary (AC-5.3.3) */}
      <div className="p-4 bg-muted rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {selectedAuthors.length} author
            {selectedAuthors.length !== 1 ? "s" : ""} selected
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            Total pending: {formatCurrency(totalPendingRoyalties)}
          </span>
        </div>
      </div>
    </div>
  );
}
