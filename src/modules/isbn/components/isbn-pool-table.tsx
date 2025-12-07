"use client";

import { format } from "date-fns";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ISBNListItem } from "../types";
import { ISBNDetailModal } from "./isbn-detail-modal";

interface ISBNPoolTableProps {
  data: ISBNListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Story 7.6: Removed getTypeBadgeVariant - ISBNs are unified without type distinction

/**
 * Get badge variant and class for ISBN status
 * Available: green, Assigned: default/blue, Registered: secondary, Retired: destructive
 */
function getStatusBadgeProps(status: string): {
  variant: "default" | "secondary" | "destructive" | "outline";
  className?: string;
} {
  switch (status) {
    case "available":
      return {
        variant: "outline",
        className: "border-green-500 bg-green-50 text-green-700",
      };
    case "assigned":
      return { variant: "default" };
    case "registered":
      return { variant: "secondary" };
    case "retired":
      return { variant: "destructive" };
    default:
      return { variant: "outline" };
  }
}

/**
 * ISBN Pool data table component
 *
 * Story 2.8 - AC 4: ISBN table displays all pool entries with required columns
 * - ISBN-13 (monospace font for readability)
 * - Type badge (Physical/Ebook with color coding)
 * - Status badge (Available/Assigned/Registered/Retired with color coding)
 * - Assigned To (title link if assigned, empty if available)
 * - Assigned Date (formatted date, empty if available)
 * - Actions column (View Details button)
 *
 * Story 7.4 - AC 7.4.7: Show "Legacy" badge for ISBNs without prefix_id
 * - Prefix column shows formatted prefix or "Legacy" badge
 *
 * AC 6: Table pagination (20 items per page)
 * - Display total count of matching ISBNs
 * - Previous/Next navigation buttons
 * - Page number indicators
 * - Pagination state persists with filters
 */
export function ISBNPoolTable({
  data,
  total,
  page,
  pageSize,
  totalPages,
}: ISBNPoolTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [selectedIsbnId, setSelectedIsbnId] = useState<string | null>(null);

  // Calculate display range
  const startIndex = (page - 1) * pageSize + 1;
  const endIndex = Math.min(page * pageSize, total);

  // Handle page navigation
  const goToPage = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (newPage > 1) {
      params.set("page", newPage.toString());
    } else {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`/isbn-pool?${params.toString()}`);
    });
  };

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          {/* Story 7.6: Removed Type column - ISBNs are unified */}
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">ISBN-13</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[140px]">Prefix</TableHead>
              <TableHead>Assigned To</TableHead>
              <TableHead className="w-[140px]">Assigned Date</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                {/* Story 7.6: Updated colSpan from 7 to 6 after removing Type column */}
                <TableCell colSpan={6} className="h-24 text-center">
                  No ISBNs found.
                </TableCell>
              </TableRow>
            ) : (
              data.map((isbn) => (
                <TableRow key={isbn.id}>
                  <TableCell className="font-mono text-sm">
                    {isbn.isbn_13}
                  </TableCell>
                  {/* Story 7.6: Removed Type badge cell - ISBNs are unified */}
                  <TableCell>
                    <Badge {...getStatusBadgeProps(isbn.status)}>
                      {isbn.status.charAt(0).toUpperCase() +
                        isbn.status.slice(1)}
                    </Badge>
                  </TableCell>
                  {/* Prefix column - Story 7.4 AC-7.4.7 */}
                  <TableCell>
                    {isbn.prefixId ? (
                      <span className="font-mono text-sm">
                        {isbn.prefixName}
                      </span>
                    ) : (
                      <Badge
                        variant="outline"
                        className="border-amber-500 bg-amber-50 text-amber-700"
                      >
                        Legacy
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {isbn.assignedTitleName ? (
                      <Link
                        href={`/titles`}
                        className="text-primary hover:underline"
                      >
                        {isbn.assignedTitleName}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isbn.assignedAt ? (
                      format(new Date(isbn.assignedAt), "MMM d, yyyy")
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedIsbnId(isbn.id)}
                    >
                      <Eye className="mr-1 h-4 w-4" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {total > 0 ? startIndex : 0}-{endIndex} of {total} results
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page - 1)}
            disabled={page <= 1 || isPending}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <div className="flex items-center gap-1 text-sm">
            <span className="text-muted-foreground">Page</span>
            <span className="font-medium">{page}</span>
            <span className="text-muted-foreground">of</span>
            <span className="font-medium">{totalPages || 1}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(page + 1)}
            disabled={page >= totalPages || isPending}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Detail Modal */}
      <ISBNDetailModal
        isbnId={selectedIsbnId}
        open={!!selectedIsbnId}
        onOpenChange={(open) => {
          if (!open) setSelectedIsbnId(null);
        }}
      />
    </div>
  );
}
