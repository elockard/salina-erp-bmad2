"use client";

/**
 * Accessibility Form Component
 *
 * Story 14.3 - AC1, AC2, AC3: Accessibility metadata configuration UI
 * Task 5: Build accessibility configuration UI
 *
 * Collapsible form for configuring EPUB accessibility metadata per Codelist 196.
 */

import { Accessibility, ChevronDown, ChevronRight, Info } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Accessibility metadata structure
 */
export interface AccessibilityData {
  epub_accessibility_conformance: string | null;
  accessibility_features: string[] | null;
  accessibility_hazards: string[] | null;
  accessibility_summary: string | null;
}

interface AccessibilityFormProps {
  data: AccessibilityData;
  onChange: (data: AccessibilityData) => void;
  onSave: () => Promise<void>;
  readonly?: boolean;
  saving?: boolean;
  hasChanges?: boolean;
}

/**
 * Conformance level options (Codelist 196, Type 09: 00-11)
 */
const CONFORMANCE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "00", label: "No accessibility information" },
  { value: "01", label: "LIA Compliance Scheme" },
  { value: "02", label: "EPUB Accessibility 1.0" },
  { value: "03", label: "EPUB 1.0 + WCAG 2.0 Level A" },
  { value: "04", label: "EPUB 1.0 + WCAG 2.0 Level AA" },
  { value: "05", label: "EPUB 1.0 + WCAG 2.0 Level AAA" },
  { value: "06", label: "EPUB 1.1 + WCAG 2.1 Level A" },
  { value: "07", label: "EPUB 1.1 + WCAG 2.1 Level AA" },
  { value: "08", label: "EPUB 1.1 + WCAG 2.1 Level AAA" },
  { value: "09", label: "EPUB 1.1 + WCAG 2.2 Level A" },
  { value: "10", label: "EPUB 1.1 + WCAG 2.2 Level AA" },
  { value: "11", label: "EPUB 1.1 + WCAG 2.2 Level AAA" },
] as const;

/**
 * Feature options grouped by category (Codelist 196, Type 09: 10-26)
 */
const FEATURE_GROUPS = {
  Text: [
    { code: "10", label: "All textual content can be modified" },
    { code: "11", label: "Language tagging provided" },
    { code: "12", label: "No accessibility options disabled" },
  ],
  Navigation: [
    { code: "13", label: "Table of contents navigation" },
    { code: "14", label: "Index navigation" },
    { code: "15", label: "Reading order provided" },
    { code: "22", label: "Print-equivalent page numbering" },
  ],
  Media: [
    { code: "16", label: "Short alternative descriptions" },
    { code: "17", label: "Full alternative descriptions" },
    { code: "18", label: "Visualized data also as text" },
    { code: "24", label: "Synchronised pre-recorded audio" },
    { code: "25", label: "Text-to-speech hinting" },
  ],
  Technical: [
    { code: "19", label: "ARIA roles provided" },
    { code: "20", label: "Accessible math (MathML)" },
    { code: "21", label: "Accessible chemistry (ChemML)" },
  ],
} as const;

/**
 * Hazard options (Codelist 196, Type 12: 00-07)
 */
const HAZARD_OPTIONS = [
  { code: "00", label: "Unknown", exclusive: true },
  { code: "01", label: "No hazards", conflicts: ["02", "03", "04"] },
  { code: "02", label: "Flashing hazard", conflicts: ["01", "05"] },
  { code: "03", label: "Motion simulation hazard", conflicts: ["01", "06"] },
  { code: "04", label: "Sound hazard", conflicts: ["01", "07"] },
  { code: "05", label: "No flashing hazard", conflicts: ["02"] },
  { code: "06", label: "No motion simulation hazard", conflicts: ["03"] },
  { code: "07", label: "No sound hazard", conflicts: ["04"] },
] as const;

/**
 * Check if a hazard selection would create a conflict
 */
function wouldConflict(
  currentSelection: string[],
  newCode: string,
): string | null {
  const option = HAZARD_OPTIONS.find((h) => h.code === newCode);
  if (!option) return null;

  if ("exclusive" in option && option.exclusive) {
    if (currentSelection.length > 0) {
      return "Cannot select 'Unknown' with other hazard options";
    }
  }

  if ("conflicts" in option) {
    for (const conflict of option.conflicts) {
      if (currentSelection.includes(conflict)) {
        const conflictLabel = HAZARD_OPTIONS.find(
          (h) => h.code === conflict,
        )?.label;
        return `Conflicts with '${conflictLabel}'`;
      }
    }
  }

  // Check if selecting this would conflict with existing "Unknown"
  if (currentSelection.includes("00") && newCode !== "00") {
    return "Cannot add hazards when 'Unknown' is selected";
  }

  return null;
}

/**
 * Accessibility Form Component
 */
export function AccessibilityForm({
  data,
  onChange,
  onSave,
  readonly = false,
  saving = false,
  hasChanges = false,
}: AccessibilityFormProps) {
  const [isOpen, setIsOpen] = useState(false);

  const features = data.accessibility_features || [];
  const hazards = data.accessibility_hazards || [];

  const handleConformanceChange = (value: string) => {
    onChange({
      ...data,
      epub_accessibility_conformance: value || null,
    });
  };

  const handleFeatureToggle = (code: string) => {
    const newFeatures = features.includes(code)
      ? features.filter((f) => f !== code)
      : [...features, code];
    onChange({
      ...data,
      accessibility_features: newFeatures.length > 0 ? newFeatures : null,
    });
  };

  const handleHazardToggle = (code: string) => {
    if (hazards.includes(code)) {
      const newHazards = hazards.filter((h) => h !== code);
      onChange({
        ...data,
        accessibility_hazards: newHazards.length > 0 ? newHazards : null,
      });
    } else {
      const conflict = wouldConflict(hazards, code);
      if (conflict) return; // Don't toggle if would conflict

      // If selecting "Unknown", clear all other selections
      const option = HAZARD_OPTIONS.find((h) => h.code === code);
      if (option && "exclusive" in option && option.exclusive) {
        onChange({
          ...data,
          accessibility_hazards: [code],
        });
      } else {
        onChange({
          ...data,
          accessibility_hazards: [...hazards, code],
        });
      }
    }
  };

  const handleSummaryChange = (value: string) => {
    onChange({
      ...data,
      accessibility_summary: value || null,
    });
  };

  // Determine accessibility status
  const hasMinimumMetadata =
    data.epub_accessibility_conformance &&
    data.epub_accessibility_conformance !== "00";
  const statusColor = hasMinimumMetadata
    ? "text-green-600 bg-green-50 border-green-200"
    : "text-amber-600 bg-amber-50 border-amber-200";
  const statusText = hasMinimumMetadata ? "EAA Ready" : "Needs Configuration";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-0 hover:bg-transparent"
              >
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Accessibility className="h-4 w-4" />
                  Accessibility Metadata
                </CardTitle>
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={cn("text-xs", statusColor)}>
                {statusText}
              </Badge>
              {hasChanges && !readonly && (
                <>
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-300 bg-amber-50"
                  >
                    Unsaved
                  </Badge>
                  <Button size="sm" onClick={onSave} disabled={saving}>
                    {saving ? "Saving..." : "Save"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-6 pt-4">
            {/* EAA Compliance Warning */}
            {!hasMinimumMetadata && (
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-sm text-amber-800">
                <strong>European Accessibility Act:</strong> Set a conformance
                level (other than "No information") to indicate EAA compliance
                readiness.
              </div>
            )}

            {/* Conformance Level */}
            <div className="space-y-2">
              <Label htmlFor="conformance">Conformance Level</Label>
              <Select
                value={data.epub_accessibility_conformance || ""}
                onValueChange={handleConformanceChange}
                disabled={readonly}
              >
                <SelectTrigger id="conformance">
                  <SelectValue placeholder="Select conformance level" />
                </SelectTrigger>
                <SelectContent>
                  {CONFORMANCE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Accessibility Features */}
            <div className="space-y-3">
              <Label>Accessibility Features</Label>
              {Object.entries(FEATURE_GROUPS).map(([category, items]) => (
                <div key={category} className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {category}
                  </p>
                  <div className="grid grid-cols-1 gap-2 pl-2">
                    {items.map((item) => (
                      <div key={item.code} className="flex items-center gap-2">
                        <Checkbox
                          id={`feature-${item.code}`}
                          checked={features.includes(item.code)}
                          onCheckedChange={() => handleFeatureToggle(item.code)}
                          disabled={readonly}
                        />
                        <Label
                          htmlFor={`feature-${item.code}`}
                          className="text-sm font-normal cursor-pointer"
                        >
                          {item.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Accessibility Hazards */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Accessibility Hazards</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-3 w-3 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Some hazard options are mutually exclusive. For example,
                        you cannot select both "Flashing hazard" and "No
                        flashing hazard".
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="grid grid-cols-1 gap-2 pl-2">
                {HAZARD_OPTIONS.map((item) => {
                  const conflict = !hazards.includes(item.code)
                    ? wouldConflict(hazards, item.code)
                    : null;
                  const isDisabled = readonly || !!conflict;

                  return (
                    <div key={item.code} className="flex items-center gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`hazard-${item.code}`}
                                checked={hazards.includes(item.code)}
                                onCheckedChange={() =>
                                  handleHazardToggle(item.code)
                                }
                                disabled={isDisabled}
                              />
                              <Label
                                htmlFor={`hazard-${item.code}`}
                                className={cn(
                                  "text-sm font-normal cursor-pointer",
                                  conflict && "text-muted-foreground",
                                )}
                              >
                                {item.label}
                              </Label>
                            </div>
                          </TooltipTrigger>
                          {conflict && (
                            <TooltipContent>
                              <p>{conflict}</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Accessibility Summary */}
            <div className="space-y-2">
              <Label htmlFor="summary">Accessibility Summary</Label>
              <Textarea
                id="summary"
                placeholder="Optional free-form description of accessibility features..."
                value={data.accessibility_summary || ""}
                onChange={(e) => handleSummaryChange(e.target.value)}
                disabled={readonly}
                rows={3}
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">
                {data.accessibility_summary?.length || 0}/1000 characters
              </p>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
