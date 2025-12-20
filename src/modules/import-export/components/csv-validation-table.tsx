"use client";

/**
 * CSV Validation Table Component
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 3.4: Validation preview with error highlighting
 *
 * Story 19.5: BISAC Code Suggestions (FR175)
 * - Added BISAC suggestion column
 * - Accept/Override suggestions per row
 *
 * FRs: FR171 (row-level error details), FR175 (BISAC suggestions)
 *
 * Pattern from: src/modules/onix/components/import-preview-table.tsx
 */

import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
} from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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

import type { ValidatedTitleRow } from "../types";

interface CsvValidationTableProps {
  rows: ValidatedTitleRow[];
  maxRows?: number;
  /** Callback when BISAC code is accepted for a row */
  onBisacSelect?: (rowNumber: number, bisacCode: string) => void;
  /** Callback to clear BISAC for a row */
  onBisacClear?: (rowNumber: number) => void;
  /** Whether to show BISAC column */
  showBisac?: boolean;
}

/**
 * Get confidence color based on score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 70) return "text-green-600";
  if (confidence >= 40) return "text-yellow-600";
  return "text-orange-600";
}

/**
 * BISAC Suggestion Cell Component
 * Shows the top suggestion with accept/view more options
 */
function BisacSuggestionCell({
  row,
  onSelect,
  onClear,
}: {
  row: ValidatedTitleRow;
  onSelect?: (code: string) => void;
  onClear?: () => void;
}) {
  const [showAll, setShowAll] = useState(false);

  // If already has BISAC code from CSV
  if (row.data.bisac_code) {
    return (
      <div className="flex items-center gap-1">
        <Badge variant="secondary" className="font-mono text-xs">
          {row.data.bisac_code}
        </Badge>
        {onClear && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  const suggestions = row.bisacSuggestions || [];
  if (suggestions.length === 0) {
    return (
      <span className="text-muted-foreground text-xs">No suggestions</span>
    );
  }

  const topSuggestion = suggestions[0];

  return (
    <Popover open={showAll} onOpenChange={setShowAll}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto py-1 px-2 gap-1.5 text-left"
          onClick={(e) => e.stopPropagation()}
        >
          <Sparkles className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="font-mono text-xs">{topSuggestion.code}</span>
          <span
            className={`text-xs ${getConfidenceColor(topSuggestion.confidence)}`}
          >
            {topSuggestion.confidence}%
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-2"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            BISAC Suggestions
          </p>
          {suggestions.slice(0, 5).map((suggestion) => (
            <button
              key={suggestion.code}
              type="button"
              className="flex items-start gap-2 w-full p-2 rounded-md hover:bg-muted text-left"
              onClick={() => {
                onSelect?.(suggestion.code);
                setShowAll(false);
              }}
            >
              <Check className="h-4 w-4 mt-0.5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs">{suggestion.code}</span>
                  <span
                    className={`text-xs ${getConfidenceColor(suggestion.confidence)}`}
                  >
                    {suggestion.confidence}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {suggestion.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * CSV Validation Table
 *
 * Displays validated rows with:
 * - Status badges (Valid/Errors)
 * - Expandable error details
 * - Row preview data
 * - BISAC suggestions (Story 19.5)
 */
export function CsvValidationTable({
  rows,
  maxRows = 100,
  onBisacSelect,
  onBisacClear,
  showBisac = true,
}: CsvValidationTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const toggleRow = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  // Check if any rows have BISAC suggestions
  const hasBisacSuggestions = rows.some(
    (row) => (row.bisacSuggestions?.length ?? 0) > 0 || row.data.bisac_code,
  );

  const displayRows = rows.slice(0, maxRows);
  const hasMore = rows.length > maxRows;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="max-h-[400px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <TableHead className="w-16">Row</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>ISBN</TableHead>
              {showBisac && hasBisacSuggestions && <TableHead>BISAC</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row) => {
              const isExpanded = expandedRows.has(row.row);
              const hasErrors = row.errors.length > 0;

              return (
                <Collapsible key={row.row} asChild open={isExpanded}>
                  <TableRow
                    className={`${hasErrors ? "bg-destructive/5" : ""} ${
                      hasErrors ? "cursor-pointer" : ""
                    }`}
                    onClick={() => hasErrors && toggleRow(row.row)}
                  >
                    {/* Expand trigger */}
                    <TableCell className="p-2">
                      {hasErrors && (
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

                    {/* Row number */}
                    <TableCell className="text-muted-foreground">
                      {row.row}
                    </TableCell>

                    {/* Status badge */}
                    <TableCell>
                      {row.valid ? (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Valid
                        </Badge>
                      ) : (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge variant="destructive">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                {row.errors.length} Error
                                {row.errors.length > 1 ? "s" : ""}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Click row to see error details</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </TableCell>

                    {/* Title */}
                    <TableCell className="max-w-[200px]">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="truncate block">
                              {row.data.title || (
                                <span className="text-muted-foreground italic">
                                  Missing
                                </span>
                              )}
                            </span>
                          </TooltipTrigger>
                          {row.data.title && row.data.title.length > 30 && (
                            <TooltipContent>
                              <p className="max-w-xs">{row.data.title}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </TableCell>

                    {/* Author */}
                    <TableCell className="max-w-[150px]">
                      <span className="truncate block">
                        {row.authorName || (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </TableCell>

                    {/* ISBN */}
                    <TableCell className="font-mono text-sm">
                      {row.data.isbn || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    {/* BISAC (Story 19.5) */}
                    {showBisac && hasBisacSuggestions && (
                      <TableCell>
                        <BisacSuggestionCell
                          row={row}
                          onSelect={
                            onBisacSelect
                              ? (code) => onBisacSelect(row.row, code)
                              : undefined
                          }
                          onClear={
                            onBisacClear
                              ? () => onBisacClear(row.row)
                              : undefined
                          }
                        />
                      </TableCell>
                    )}
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-destructive/10">
                      <TableCell
                        colSpan={showBisac && hasBisacSuggestions ? 7 : 6}
                        className="p-4"
                      >
                        {hasErrors && (
                          <div className="space-y-2">
                            <p className="text-sm font-medium text-destructive">
                              Validation Errors:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                              {row.errors.map((error) => (
                                <li
                                  key={`${error.field}-${error.message}`}
                                  className="text-sm text-destructive"
                                >
                                  <span className="font-medium">
                                    {error.field}:
                                  </span>{" "}
                                  {error.message}
                                  {error.value && (
                                    <span className="text-muted-foreground ml-1">
                                      (value: &quot;{error.value}&quot;)
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* More rows indicator */}
      {hasMore && (
        <div className="p-2 text-center text-sm text-muted-foreground border-t">
          Showing {maxRows} of {rows.length} rows
        </div>
      )}
    </div>
  );
}
