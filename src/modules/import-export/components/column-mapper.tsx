"use client";

/**
 * Column Mapper Component
 *
 * Story: 19.1 - Import Catalog via CSV
 * Task 3.3: Column mapping interface with dropdowns
 *
 * FRs: FR170 (column mapping)
 */

import { AlertCircle } from "lucide-react";
import { useCallback } from "react";

import { Badge } from "@/components/ui/badge";
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

import type { ColumnMapping, ImportableTitleField } from "../types";
import { IMPORTABLE_TITLE_FIELDS, TITLE_FIELD_METADATA } from "../types";

interface ColumnMapperProps {
  mappings: ColumnMapping[];
  onMappingsChange: (mappings: ColumnMapping[]) => void;
}

/**
 * Column Mapper
 *
 * Displays CSV columns with dropdowns to map to Salina fields.
 * Shows sample data for each column to help with mapping.
 */
export function ColumnMapper({
  mappings,
  onMappingsChange,
}: ColumnMapperProps) {
  /**
   * Get fields that are already mapped (to disable in other dropdowns)
   */
  const getMappedFields = useCallback(
    (excludeIndex: number): Set<ImportableTitleField> => {
      const mapped = new Set<ImportableTitleField>();
      for (let i = 0; i < mappings.length; i++) {
        const targetField = mappings[i].targetField;
        if (i !== excludeIndex && targetField) {
          mapped.add(targetField);
        }
      }
      return mapped;
    },
    [mappings],
  );

  /**
   * Check if title field is mapped
   */
  const isTitleMapped = mappings.some((m) => m.targetField === "title");

  /**
   * Handle mapping change
   */
  const handleMappingChange = useCallback(
    (index: number, value: string) => {
      const newMappings = [...mappings];
      newMappings[index] = {
        ...newMappings[index],
        targetField:
          value === "unmapped" ? null : (value as ImportableTitleField),
      };
      onMappingsChange(newMappings);
    },
    [mappings, onMappingsChange],
  );

  return (
    <div className="space-y-4">
      {/* Title mapping warning */}
      {!isTitleMapped && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Title field must be mapped (required)</span>
        </div>
      )}

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/4">CSV Column</TableHead>
              <TableHead className="w-1/4">Map To</TableHead>
              <TableHead>Sample Values</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mappings.map((mapping, index) => {
              const mappedFields = getMappedFields(index);
              const fieldMeta = mapping.targetField
                ? TITLE_FIELD_METADATA.find(
                    (m) => m.field === mapping.targetField,
                  )
                : null;

              return (
                <TableRow key={mapping.csvColumnHeader}>
                  {/* CSV Column header */}
                  <TableCell className="font-medium">
                    {mapping.csvColumnHeader}
                  </TableCell>

                  {/* Field selector */}
                  <TableCell>
                    <Select
                      value={mapping.targetField || "unmapped"}
                      onValueChange={(value) =>
                        handleMappingChange(index, value)
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select field..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unmapped">
                          <span className="text-muted-foreground">
                            -- Not mapped --
                          </span>
                        </SelectItem>
                        {IMPORTABLE_TITLE_FIELDS.map((field) => {
                          const meta = TITLE_FIELD_METADATA.find(
                            (m) => m.field === field,
                          );
                          const isDisabled =
                            mappedFields.has(field) &&
                            mapping.targetField !== field;

                          return (
                            <SelectItem
                              key={field}
                              value={field}
                              disabled={isDisabled}
                            >
                              <div className="flex items-center gap-2">
                                <span>{meta?.label || field}</span>
                                {meta?.required && (
                                  <Badge
                                    variant="destructive"
                                    className="text-xs px-1"
                                  >
                                    Required
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>

                    {/* Field description tooltip */}
                    {fieldMeta && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <p className="text-xs text-muted-foreground mt-1 truncate cursor-help">
                              {fieldMeta.description}
                            </p>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="max-w-xs">
                              {fieldMeta.description}
                              <br />
                              <span className="text-muted-foreground">
                                Example: {fieldMeta.example}
                              </span>
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </TableCell>

                  {/* Sample values */}
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {mapping.sampleValues
                        .slice(0, 3)
                        .map((value, sampleIdx) => (
                          <Badge
                            key={`${mapping.csvColumnHeader}-sample-${sampleIdx}`}
                            variant="secondary"
                            className="max-w-[150px] truncate"
                          >
                            {value || (
                              <span className="text-muted-foreground">
                                (empty)
                              </span>
                            )}
                          </Badge>
                        ))}
                      {mapping.sampleValues.length > 3 && (
                        <Badge variant="outline">
                          +{mapping.sampleValues.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="text-xs text-muted-foreground">
        <p>
          <strong>Tip:</strong> Common column names are automatically mapped.
          You can change or clear any mapping.
        </p>
      </div>
    </div>
  );
}
