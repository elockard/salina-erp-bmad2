"use client";

/**
 * ONIX Import Preview Table Component
 *
 * Story: 14.5 - Implement ONIX Import Parser
 * Task 9: Build import preview UI
 *
 * Displays a table of parsed ONIX products with validation status,
 * conflict indicators, and selection checkboxes.
 */

import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ConflictResolution, PreviewProduct } from "../parser/types";

interface ImportPreviewTableProps {
  products: PreviewProduct[];
  selectedIndices: Set<number>;
  onSelectionChange: (indices: Set<number>) => void;
  conflictResolutions: Map<number, ConflictResolution>;
  onConflictResolutionChange: (
    index: number,
    resolution: ConflictResolution,
  ) => void;
}

/**
 * Import Preview Table
 *
 * Shows parsed products with:
 * - Selection checkboxes for bulk import
 * - Validation status indicators
 * - Conflict resolution dropdowns
 * - Expandable validation error details
 */
export function ImportPreviewTable({
  products,
  selectedIndices,
  onSelectionChange,
  conflictResolutions,
  onConflictResolutionChange,
}: ImportPreviewTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const validProducts = products.filter((p) => p.validationErrors.length === 0);
  const allSelected =
    validProducts.length > 0 &&
    validProducts.every((p) => selectedIndices.has(p.index));
  const someSelected = validProducts.some((p) => selectedIndices.has(p.index));

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(validProducts.map((p) => p.index)));
    }
  };

  const handleSelectRow = (index: number) => {
    const newSelection = new Set(selectedIndices);
    if (newSelection.has(index)) {
      newSelection.delete(index);
    } else {
      newSelection.add(index);
    }
    onSelectionChange(newSelection);
  };

  const toggleRowExpanded = (index: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedRows(newExpanded);
  };

  const formatContributors = (
    contributors: { name: string; role: string }[],
  ): string => {
    if (contributors.length === 0) return "-";
    if (contributors.length === 1) return contributors[0].name;
    return `${contributors[0].name} +${contributors.length - 1} more`;
  };

  const getStatusBadge = (product: PreviewProduct) => {
    if (product.validationErrors.length > 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          {product.validationErrors.length} error
          {product.validationErrors.length > 1 ? "s" : ""}
        </Badge>
      );
    }
    if (product.hasConflict) {
      return (
        <Badge
          variant="outline"
          className="gap-1 text-amber-600 border-amber-600"
        >
          <AlertTriangle className="h-3 w-3" />
          Conflict
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="gap-1 text-green-600 border-green-600"
      >
        <CheckCircle2 className="h-3 w-3" />
        Valid
      </Badge>
    );
  };

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all valid products"
                  className={someSelected && !allSelected ? "opacity-50" : ""}
                />
              </TableHead>
              <TableHead className="w-8" />
              <TableHead className="w-32">ISBN-13</TableHead>
              <TableHead>Title</TableHead>
              <TableHead className="w-40">Contributors</TableHead>
              <TableHead className="w-28">Pub Date</TableHead>
              <TableHead className="w-28">Status</TableHead>
              <TableHead className="w-36">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => {
              const hasErrors = product.validationErrors.length > 0;
              const hasDetails =
                product.validationErrors.length > 0 ||
                product.unmappedFields.length > 0;
              const isExpanded = expandedRows.has(product.index);

              return (
                <Collapsible key={product.index} asChild open={isExpanded}>
                  <TableRow
                    className={
                      hasErrors
                        ? "bg-destructive/5"
                        : product.hasConflict
                          ? "bg-amber-50 dark:bg-amber-950/20"
                          : ""
                    }
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIndices.has(product.index)}
                        onCheckedChange={() => handleSelectRow(product.index)}
                        disabled={hasErrors}
                        aria-label={`Select ${product.title}`}
                      />
                    </TableCell>
                    <TableCell>
                      {hasDetails && (
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            onClick={() => toggleRowExpanded(product.index)}
                            className="p-1 hover:bg-muted rounded"
                            aria-label={
                              isExpanded ? "Collapse details" : "Expand details"
                            }
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
                    <TableCell className="font-mono text-sm">
                      {product.isbn || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="font-medium truncate max-w-[300px]">
                              {product.title || "(No title)"}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>{product.title}</p>
                            {product.subtitle && (
                              <p className="text-muted-foreground">
                                {product.subtitle}
                              </p>
                            )}
                          </TooltipContent>
                        </Tooltip>
                        {product.subtitle && (
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {product.subtitle}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm truncate block max-w-[140px]">
                            {formatContributors(product.contributors)}
                          </span>
                        </TooltipTrigger>
                        {product.contributors.length > 1 && (
                          <TooltipContent>
                            <ul className="text-sm">
                              {product.contributors.map((c, i) => (
                                // biome-ignore lint/suspicious/noArrayIndexKey: Static display list without unique IDs
                                <li key={i}>
                                  {c.name} ({c.role})
                                </li>
                              ))}
                            </ul>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TableCell>
                    <TableCell className="text-sm">
                      {product.publicationDate || "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(product)}</TableCell>
                    <TableCell>
                      {product.hasConflict ? (
                        <Select
                          value={
                            conflictResolutions.get(product.index) || "skip"
                          }
                          onValueChange={(value) =>
                            onConflictResolutionChange(
                              product.index,
                              value as ConflictResolution,
                            )
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Skip</SelectItem>
                            <SelectItem value="update">
                              Update existing
                            </SelectItem>
                            <SelectItem value="create-new">
                              Create new
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : hasErrors ? (
                        <span className="text-xs text-muted-foreground">
                          Fix errors
                        </span>
                      ) : (
                        <span className="text-xs text-green-600">
                          Ready to import
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={8} className="py-3">
                        <div className="space-y-3 pl-10">
                          {/* Validation Errors */}
                          {product.validationErrors.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-destructive mb-1">
                                Validation Errors:
                              </p>
                              <ul className="text-sm text-destructive list-disc pl-4 space-y-0.5">
                                {product.validationErrors.map((err, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: Static error list without unique IDs
                                  <li key={i}>
                                    <span className="font-mono">
                                      {err.field}
                                    </span>
                                    : {err.message}
                                    {err.value && (
                                      <span className="text-muted-foreground">
                                        {" "}
                                        (value: {err.value})
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Conflict Details */}
                          {product.hasConflict && product.conflictTitleName && (
                            <div>
                              <p className="text-sm font-medium text-amber-600 mb-1">
                                ISBN Conflict:
                              </p>
                              <p className="text-sm text-muted-foreground">
                                This ISBN already exists on title: &quot;
                                {product.conflictTitleName}&quot;
                              </p>
                            </div>
                          )}

                          {/* Unmapped Fields */}
                          {product.unmappedFields.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-1">
                                Fields Not Imported:
                              </p>
                              <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-0.5">
                                {product.unmappedFields.map((field, i) => (
                                  // biome-ignore lint/suspicious/noArrayIndexKey: Static field list without unique IDs
                                  <li key={i}>
                                    <span className="font-mono">
                                      {field.name}
                                    </span>
                                    : {field.value}
                                    <span className="text-xs ml-1">
                                      ({field.reason})
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Additional Display Fields */}
                          {(product.productForm ||
                            product.price ||
                            product.subject) && (
                            <div className="flex gap-4 text-sm text-muted-foreground">
                              {product.productForm && (
                                <span>
                                  Format:{" "}
                                  <span className="font-mono">
                                    {product.productForm}
                                  </span>
                                </span>
                              )}
                              {product.price && (
                                <span>Price: {product.price}</span>
                              )}
                              {product.subject && (
                                <span>Subject: {product.subject}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  </CollapsibleContent>
                </Collapsible>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
}
