"use client";

/**
 * Codelist Selector Component
 *
 * Story 14.4: Build Codelist Management System (AC: 5)
 * Task 6: Create codelist selector component
 *
 * Generic Select component that loads values from any EDItEUR codelist.
 * Displays "code - description" format in dropdown.
 */

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CodelistEntry,
  getCodelistEntries,
} from "@/modules/onix/codelists";

interface CodelistSelectorProps {
  listNumber: number;
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
  showSearch?: boolean;
  className?: string;
}

/**
 * CodelistSelector - A select component for EDItEUR codelist values
 *
 * @param listNumber - The EDItEUR codelist number (e.g., 5, 15, 17, 27, 150, 196)
 * @param value - Currently selected code value
 * @param onChange - Callback when selection changes
 * @param placeholder - Placeholder text when no value selected
 * @param disabled - Whether the selector is disabled
 * @param showSearch - Whether to show search filter for large lists
 * @param className - Additional CSS classes
 */
export function CodelistSelector({
  listNumber,
  value,
  onChange,
  placeholder = "Select...",
  disabled = false,
  showSearch = false,
  className,
}: CodelistSelectorProps) {
  const [entries, setEntries] = useState<CodelistEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEntries() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await getCodelistEntries(listNumber);
        if (mounted) {
          setEntries(data);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load codelist",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadEntries();

    return () => {
      mounted = false;
    };
  }, [listNumber]);

  // Filter entries by search term
  const filteredEntries = searchTerm
    ? entries.filter(
        (entry) =>
          entry.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          entry.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    : entries;

  // Find selected entry for display
  const selectedEntry = entries.find((e) => e.code === value);

  if (isLoading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (error) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder={`Error: ${error}`} />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select
      value={value ?? ""}
      onValueChange={(newValue) => onChange(newValue || null)}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedEntry
            ? `${selectedEntry.code} - ${selectedEntry.description}`
            : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {showSearch && entries.length > 10 && (
          <div className="p-2">
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8"
            />
          </div>
        )}
        {filteredEntries.length === 0 ? (
          <div className="p-2 text-center text-sm text-slate-500">
            {searchTerm ? "No matches found" : "No entries available"}
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <SelectItem
              key={entry.code}
              value={entry.code}
              className={entry.deprecated ? "text-slate-500" : ""}
            >
              <span className="font-mono text-xs">{entry.code}</span>
              <span className="ml-2">{entry.description}</span>
              {entry.deprecated && (
                <span className="ml-2 text-xs text-yellow-600">
                  (deprecated)
                </span>
              )}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}

/**
 * Convenience type for codelist numbers used in Salina
 */
export type SalinaCodelistNumber = 5 | 15 | 17 | 27 | 150 | 196;

/**
 * Pre-configured selectors for commonly used codelists
 */
export function ProductIdentifierTypeSelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector {...props} listNumber={5} placeholder="Select ID type" />
  );
}

export function TitleTypeSelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector
      {...props}
      listNumber={15}
      placeholder="Select title type"
    />
  );
}

export function ContributorRoleSelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector
      {...props}
      listNumber={17}
      placeholder="Select role"
      showSearch
    />
  );
}

export function SubjectSchemeSelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector
      {...props}
      listNumber={27}
      placeholder="Select subject scheme"
      showSearch
    />
  );
}

export function ProductFormSelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector
      {...props}
      listNumber={150}
      placeholder="Select product form"
      showSearch
    />
  );
}

export function AccessibilitySelector(
  props: Omit<CodelistSelectorProps, "listNumber">,
) {
  return (
    <CodelistSelector
      {...props}
      listNumber={196}
      placeholder="Select accessibility"
      showSearch
    />
  );
}
