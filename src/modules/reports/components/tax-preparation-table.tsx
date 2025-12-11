"use client";

/**
 * Tax Preparation Author Earnings Table Component
 *
 * Displays author earnings data with sorting and badges.
 *
 * Story 11.2: Track Annual Earnings for 1099 Threshold
 * AC-11.2.3: Author Listing with Earnings
 * AC-11.2.4: $10 Royalty Threshold Flagging with badges
 */

import { AlertTriangle, ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AuthorEarnings } from "../queries/tax-preparation";

interface TaxPreparationTableProps {
  data: AuthorEarnings[];
}

type SortField = "name" | "annualEarnings";
type SortDirection = "asc" | "desc";

/**
 * Format currency value with dollar sign and 2 decimal places
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function TaxPreparationTable({ data }: TaxPreparationTableProps) {
  // Client-side sorting state (AC-11.2.3: sortable by earnings descending default and name)
  const [sortField, setSortField] = useState<SortField>("annualEarnings");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Sort data based on current sort state
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      let comparison = 0;

      if (sortField === "name") {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === "annualEarnings") {
        comparison = a.annualEarnings - b.annualEarnings;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortField, sortDirection]);

  // Handle column header click for sorting
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      // Set new field with default direction
      setSortField(field);
      setSortDirection(field === "annualEarnings" ? "desc" : "asc");
    }
  };

  // Render sort indicator
  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="ml-2 h-4 w-4" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-2 h-4 w-4" />
    ) : (
      <ArrowDown className="ml-2 h-4 w-4" />
    );
  };

  if (data.length === 0) {
    return (
      <div
        className="text-center py-10 text-muted-foreground"
        data-testid="empty-state"
      >
        No authors with earnings found for this year.
      </div>
    );
  }

  return (
    <div className="rounded-md border" data-testid="tax-preparation-table">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead
              className="cursor-pointer select-none"
              onClick={() => handleSort("name")}
            >
              <div className="flex items-center">
                Name
                {renderSortIcon("name")}
              </div>
            </TableHead>
            <TableHead>TIN Status</TableHead>
            <TableHead>TIN Type</TableHead>
            <TableHead
              className="cursor-pointer select-none text-right"
              onClick={() => handleSort("annualEarnings")}
            >
              <div className="flex items-center justify-end">
                Annual Earnings
                {renderSortIcon("annualEarnings")}
              </div>
            </TableHead>
            <TableHead>1099 Required</TableHead>
            <TableHead>W-9 Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((author) => (
            <TableRow key={author.contactId} data-testid="author-row">
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  {author.name}
                  {/* AC-11.2.4: Warning icon on rows where requires1099=true AND tinStatus="Missing" */}
                  {author.requires1099 && author.tinStatus === "missing" && (
                    <AlertTriangle
                      className="h-4 w-4 text-yellow-600"
                      data-testid="missing-tin-warning"
                    />
                  )}
                </div>
              </TableCell>
              <TableCell>
                {/* AC-11.2.3: TIN status: "Provided" or "Missing" */}
                <Badge
                  variant={
                    author.tinStatus === "provided" ? "default" : "secondary"
                  }
                  className={
                    author.tinStatus === "provided"
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }
                >
                  {author.tinStatus === "provided" ? "Provided" : "Missing"}
                </Badge>
              </TableCell>
              <TableCell>
                {/* AC-11.2.3: TIN type: "SSN" or "EIN", blank if TIN missing */}
                {author.tinType ? author.tinType.toUpperCase() : "—"}
              </TableCell>
              <TableCell className="text-right">
                {/* AC-11.2.3: Annual earnings formatted as currency */}
                {formatCurrency(author.annualEarnings)}
              </TableCell>
              <TableCell>
                {/* AC-11.2.4: Green badge for "Yes", Gray badge for "No" */}
                <Badge
                  variant={author.requires1099 ? "default" : "secondary"}
                  className={
                    author.requires1099
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }
                >
                  {author.requires1099 ? "Yes" : "No"}
                </Badge>
              </TableCell>
              <TableCell>
                {/* AC-11.2.3: W-9 status: "Received" or "Missing" */}
                <Badge
                  variant={author.w9Received ? "default" : "secondary"}
                  className={
                    author.w9Received
                      ? "bg-green-100 text-green-800 hover:bg-green-100"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                  }
                >
                  {author.w9Received ? "Received" : "Missing"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
