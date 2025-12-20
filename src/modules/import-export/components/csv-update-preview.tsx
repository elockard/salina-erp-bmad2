"use client";

/**
 * CSV Update Preview Component
 *
 * Story: 19.4 - Bulk Update via CSV
 * Task 3: Create diff preview table component
 *
 * Displays side-by-side diff of changes for bulk update preview.
 * Shows matched titles, changed fields, and unmatched ISBNs.
 *
 * FRs: FR174
 *
 * Pattern from: src/modules/import-export/components/csv-validation-table.tsx
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  MinusCircle,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { hasTitleFieldChange } from "../matchers/isbn-matcher";
import type { MatchResult, TitleMatch } from "../types";

interface CsvUpdatePreviewProps {
  /** Match result from ISBN matching */
  matchResult: MatchResult;
  /** Callback when selection changes */
  onSelectionChange: (matches: TitleMatch[]) => void;
  /** Maximum rows to display */
  maxRows?: number;
}

/**
 * CSV Update Preview
 *
 * Displays:
 * - Matched titles with diff preview
 * - Selection checkboxes for selective updates
 * - Unmatched ISBNs with option to create
 * - Rows without ISBN (errors)
 * - Summary statistics
 */
export function CsvUpdatePreview({
  matchResult,
  onSelectionChange,
  maxRows = 100,
}: CsvUpdatePreviewProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (isbn: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(isbn)) {
      newExpanded.delete(isbn);
    } else {
      newExpanded.add(isbn);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelection = (match: TitleMatch) => {
    const updatedMatches = matchResult.matched.map((m) =>
      m.isbn === match.isbn ? { ...m, selected: !m.selected } : m,
    );
    onSelectionChange(updatedMatches);
  };

  const toggleAll = (selected: boolean) => {
    const updatedMatches = matchResult.matched.map((m) => ({
      ...m,
      selected: m.hasChanges ? selected : false,
    }));
    onSelectionChange(updatedMatches);
  };

  // Statistics
  const withChanges = matchResult.matched.filter((m) => m.hasChanges);
  const withoutChanges = matchResult.matched.filter((m) => !m.hasChanges);
  const selectedCount = matchResult.matched.filter(
    (m) => m.hasChanges && m.selected,
  ).length;
  const totalFieldsChanged = withChanges.reduce(
    (sum, m) => sum + m.diff.changedFields.length,
    0,
  );

  const displayMatches = matchResult.matched.slice(0, maxRows);
  const hasMore = matchResult.matched.length > maxRows;

  const allSelected =
    withChanges.length > 0 && withChanges.every((m) => m.selected);
  const someSelected = withChanges.some((m) => m.selected) && !allSelected;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-green-600 border-green-600">
            {withChanges.length} with changes
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-muted-foreground">
            {withoutChanges.length} unchanged
          </Badge>
        </div>
        {matchResult.unmatched.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-amber-600 border-amber-600"
            >
              {matchResult.unmatched.length} not found
            </Badge>
          </div>
        )}
        {matchResult.noIsbn.length > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="destructive">
              {matchResult.noIsbn.length} missing ISBN
            </Badge>
          </div>
        )}
      </div>

      {/* Selection summary */}
      <div className="text-sm text-muted-foreground">
        {selectedCount} of {withChanges.length} titles selected for update (
        {totalFieldsChanged} total fields will change)
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                          ? "indeterminate"
                          : false
                    }
                    onCheckedChange={(checked) => toggleAll(!!checked)}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead className="w-24">Status</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="w-24">Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Matched rows */}
              {displayMatches.map((match) => {
                const isExpanded = expandedRows.has(match.isbn);
                const hasTitleChange = hasTitleFieldChange(match.diff);

                return (
                  <Collapsible
                    key={match.isbn}
                    open={isExpanded}
                    asChild={false}
                  >
                    <TableRow
                      className={`${
                        match.hasChanges ? "cursor-pointer" : ""
                      } ${!match.hasChanges ? "bg-muted/30" : ""}`}
                      onClick={() => match.hasChanges && toggleRow(match.isbn)}
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="p-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={match.selected}
                          disabled={!match.hasChanges}
                          onCheckedChange={() => toggleSelection(match)}
                          aria-label={`Select ${match.isbn}`}
                        />
                      </TableCell>

                      {/* Expand trigger */}
                      <TableCell className="p-2">
                        {match.hasChanges && (
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </CollapsibleTrigger>
                        )}
                      </TableCell>

                      {/* Status badge */}
                      <TableCell>
                        {match.hasChanges ? (
                          hasTitleChange ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Badge
                                    variant="outline"
                                    className="text-amber-600 border-amber-600"
                                  >
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Changes
                                  </Badge>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Title field change - verify intentional</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <Badge
                              variant="outline"
                              className="text-blue-600 border-blue-600"
                            >
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Changes
                            </Badge>
                          )
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground"
                          >
                            <MinusCircle className="h-3 w-3 mr-1" />
                            No change
                          </Badge>
                        )}
                      </TableCell>

                      {/* ISBN */}
                      <TableCell className="font-mono text-sm">
                        {match.isbn}
                      </TableCell>

                      {/* Title */}
                      <TableCell className="max-w-[200px]">
                        <span className="truncate block">
                          {match.existingTitle.title}
                        </span>
                      </TableCell>

                      {/* Change count */}
                      <TableCell>
                        {match.hasChanges ? (
                          <span className="text-sm text-blue-600">
                            {match.diff.changedFields.length} field
                            {match.diff.changedFields.length > 1 ? "s" : ""}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>

                    {/* Expanded diff details */}
                    <CollapsibleContent asChild>
                      <TableRow className="bg-blue-50/50 dark:bg-blue-950/20">
                        <TableCell colSpan={6} className="p-4">
                          <DiffTable diff={match.diff} />
                        </TableCell>
                      </TableRow>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}

              {/* Unmatched ISBNs */}
              {matchResult.unmatched.map((isbn) => (
                <TableRow
                  key={`unmatched-${isbn}`}
                  className="bg-amber-50/50 dark:bg-amber-950/20"
                >
                  <TableCell className="p-2">
                    <Checkbox disabled aria-label="Cannot select unmatched" />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="text-amber-600 border-amber-600"
                    >
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Not found
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{isbn}</TableCell>
                  <TableCell
                    colSpan={2}
                    className="text-sm text-muted-foreground"
                  >
                    Title not found in catalog
                  </TableCell>
                </TableRow>
              ))}

              {/* Rows without ISBN */}
              {matchResult.noIsbn.map((rowNum) => (
                <TableRow key={`noIsbn-${rowNum}`} className="bg-destructive/5">
                  <TableCell className="p-2">
                    <Checkbox disabled aria-label="Cannot select - no ISBN" />
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell>
                    <Badge variant="destructive">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Missing ISBN
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    Row {rowNum}
                  </TableCell>
                  <TableCell colSpan={2} className="text-sm text-destructive">
                    ISBN required for updates
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* More rows indicator */}
        {hasMore && (
          <div className="p-2 text-center text-sm text-muted-foreground border-t">
            Showing {maxRows} of {matchResult.matched.length} matched rows
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Diff Table Component
 * Shows field-level changes in a side-by-side format
 */
function DiffTable({ diff }: { diff: TitleMatch["diff"] }) {
  if (diff.changedFields.length === 0) {
    return <p className="text-sm text-muted-foreground">No changes to apply</p>;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Field Changes:</p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[150px]">Field</TableHead>
            <TableHead>Current Value</TableHead>
            <TableHead>New Value</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {diff.changedFields.map((change) => (
            <TableRow key={change.fieldKey}>
              <TableCell className="font-medium">
                {change.fieldKey === "title" && (
                  <AlertTriangle className="h-3 w-3 inline mr-1 text-amber-600" />
                )}
                {change.field}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {change.oldValue !== null && change.oldValue !== "" ? (
                  <span className="line-through">
                    {String(change.oldValue)}
                  </span>
                ) : (
                  <span className="italic">Empty</span>
                )}
              </TableCell>
              <TableCell className="text-green-600 font-medium">
                {change.newValue !== null && change.newValue !== "" ? (
                  String(change.newValue)
                ) : (
                  <span className="italic text-muted-foreground">Empty</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {diff.changedFields.some((c) => c.fieldKey === "title") && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Title field change - verify this is intentional
        </p>
      )}
    </div>
  );
}
