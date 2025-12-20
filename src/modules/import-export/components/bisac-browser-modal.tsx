"use client";

/**
 * BISAC Browser Modal
 *
 * A full-screen modal for browsing the complete BISAC code hierarchy.
 * Provides searchable, filterable tree view of all BISAC categories.
 *
 * Features:
 * - Searchable by code or description
 * - Collapsible category tree
 * - Category filtering
 * - Select up to 3 codes (1 primary + 2 secondary)
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 * Task 4.4: Create bisac-browser-modal.tsx
 */

import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  type BisacCode,
  getAllBisacCodes,
  getBisacCategories,
  MAX_BISAC_CODES,
} from "../bisac";

export interface BisacBrowserModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when modal should close */
  onOpenChange: (open: boolean) => void;
  /** Currently selected codes */
  selectedCodes: string[];
  /** Callback when selection is confirmed */
  onSelect: (codes: string[]) => void;
  /** Maximum codes that can be selected */
  maxCodes?: number;
}

/**
 * Group BISAC codes by category for tree display
 */
function groupByCategory(codes: BisacCode[]): Map<string, BisacCode[]> {
  const grouped = new Map<string, BisacCode[]>();

  for (const code of codes) {
    const existing = grouped.get(code.category) || [];
    existing.push(code);
    grouped.set(code.category, existing);
  }

  return grouped;
}

export function BisacBrowserModal({
  open,
  onOpenChange,
  selectedCodes,
  onSelect,
  maxCodes = MAX_BISAC_CODES,
}: BisacBrowserModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(),
  );
  const [localSelection, setLocalSelection] = useState<string[]>(selectedCodes);

  // Get all codes and categories
  const allCodes = useMemo(() => getAllBisacCodes(), []);
  const categories = useMemo(() => getBisacCategories(), []);

  // Filter codes by search query
  const filteredCodes = useMemo(() => {
    if (!searchQuery.trim()) return allCodes;

    const query = searchQuery.toLowerCase().trim();
    return allCodes.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        code.description.toLowerCase().includes(query) ||
        code.keywords.some((k) => k.toLowerCase().includes(query)),
    );
  }, [allCodes, searchQuery]);

  // Group filtered codes by category
  const groupedCodes = useMemo(
    () => groupByCategory(filteredCodes),
    [filteredCodes],
  );

  // Toggle category expansion
  const toggleCategory = useCallback((category: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  }, []);

  // Toggle code selection
  const toggleCode = useCallback(
    (code: string) => {
      setLocalSelection((prev) => {
        if (prev.includes(code)) {
          return prev.filter((c) => c !== code);
        }
        if (prev.length >= maxCodes) {
          return prev;
        }
        return [...prev, code];
      });
    },
    [maxCodes],
  );

  // Remove code from selection
  const removeCode = useCallback((code: string) => {
    setLocalSelection((prev) => prev.filter((c) => c !== code));
  }, []);

  // Get description for a code
  const _getDescription = useCallback(
    (code: string): string => {
      const found = allCodes.find((c) => c.code === code);
      return found?.description || code;
    },
    [allCodes],
  );

  // Handle confirm
  const handleConfirm = useCallback(() => {
    onSelect(localSelection);
    onOpenChange(false);
  }, [localSelection, onSelect, onOpenChange]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setLocalSelection(selectedCodes);
    onOpenChange(false);
  }, [selectedCodes, onOpenChange]);

  // Expand all categories when searching
  useMemo(() => {
    if (searchQuery.trim()) {
      setExpandedCategories(new Set(Array.from(groupedCodes.keys())));
    }
  }, [searchQuery, groupedCodes]);

  // Sync local selection when modal opens
  useMemo(() => {
    if (open) {
      setLocalSelection(selectedCodes);
      setSearchQuery("");
    }
  }, [open, selectedCodes]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Browse BISAC Subject Codes</DialogTitle>
          <DialogDescription>
            Search or browse the BISAC subject code hierarchy. Select up to{" "}
            {maxCodes} codes.
          </DialogDescription>
        </DialogHeader>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by code or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Selected codes display */}
        {localSelection.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-muted rounded-md">
            {localSelection.map((code, index) => (
              <Badge
                key={code}
                variant={index === 0 ? "default" : "secondary"}
                className="flex items-center gap-1 pr-1"
              >
                <span className="text-xs font-mono">{code}</span>
                {index === 0 && (
                  <span className="text-[10px] opacity-70">(primary)</span>
                )}
                <button
                  type="button"
                  onClick={() => removeCode(code)}
                  className="ml-1 rounded-sm hover:bg-primary-foreground/20"
                  aria-label={`Remove ${code}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

        {/* Code browser */}
        <div className="flex-1 border rounded-md overflow-y-auto max-h-[400px]">
          <div className="p-2 space-y-1">
            {Array.from(groupedCodes.entries()).map(([category, codes]) => {
              const categoryInfo = categories.find(
                (c) => c.prefix === category,
              );
              const isExpanded = expandedCategories.has(category);

              return (
                <div key={category} className="border-b last:border-b-0 pb-1">
                  {/* Category header */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category)}
                    className="flex items-center gap-2 w-full p-2 hover:bg-muted rounded-md text-left"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{category}</span>
                    <span className="text-sm text-muted-foreground">
                      {categoryInfo?.name || category}
                    </span>
                    <Badge variant="outline" className="ml-auto">
                      {codes.length}
                    </Badge>
                  </button>

                  {/* Category codes */}
                  {isExpanded && (
                    <div className="ml-6 space-y-0.5">
                      {codes.map((code) => {
                        const isSelected = localSelection.includes(code.code);
                        const canSelect =
                          localSelection.length < maxCodes || isSelected;

                        return (
                          <button
                            key={code.code}
                            type="button"
                            onClick={() => toggleCode(code.code)}
                            disabled={!canSelect}
                            className={cn(
                              "flex items-start gap-2 w-full p-2 rounded-md text-left text-sm",
                              isSelected
                                ? "bg-primary/10 border border-primary/20"
                                : "hover:bg-muted",
                              !canSelect && "opacity-50 cursor-not-allowed",
                            )}
                          >
                            <span
                              className={cn(
                                "font-mono text-xs shrink-0 mt-0.5",
                                isSelected && "text-primary font-semibold",
                              )}
                            >
                              {code.code}
                            </span>
                            <span className="text-muted-foreground">
                              {code.description}
                            </span>
                            {isSelected && (
                              <Badge
                                variant="default"
                                className="ml-auto shrink-0"
                              >
                                {localSelection.indexOf(code.code) === 0
                                  ? "Primary"
                                  : `#${localSelection.indexOf(code.code) + 1}`}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {filteredCodes.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No BISAC codes found matching "{searchQuery}"
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleConfirm}>
            Select{" "}
            {localSelection.length > 0 ? `(${localSelection.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
