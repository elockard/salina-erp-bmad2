"use client";

/**
 * ISBN Prefix Management Table
 *
 * Story 7.4: Implement Publisher ISBN Prefix System
 * AC-7.4.4: Prefix Management Table with expandable rows
 */

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
// Story 7.6: Removed Badge import - type badges no longer needed
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteIsbnPrefix } from "../actions";
import type { PrefixListItem } from "../queries";
import { IsbnPrefixStatusBadge } from "./isbn-prefix-status-badge";

interface IsbnPrefixTableProps {
  prefixes: PrefixListItem[];
}

export function IsbnPrefixTable({ prefixes }: IsbnPrefixTableProps) {
  const router = useRouter();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const result = await deleteIsbnPrefix(id);
      if (result.success) {
        toast.success("Prefix deleted successfully");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error("Failed to delete prefix");
    } finally {
      setDeletingId(null);
    }
  };

  if (prefixes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="text-muted-foreground">
          No ISBN prefixes registered yet. Click "Add Prefix" to get started.
        </p>
      </div>
    );
  }

  return (
    <Table>
      {/* Story 7.6: Removed Type column - ISBNs are unified */}
      <TableHeader>
        <TableRow>
          <TableHead className="w-[40px]" />
          <TableHead>Prefix</TableHead>
          <TableHead>Block Size</TableHead>
          <TableHead>Utilization</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {prefixes.map((prefix) => (
          <Fragment key={prefix.id}>
            <TableRow>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => toggleRow(prefix.id)}
                  aria-label={
                    expandedRows.has(prefix.id) ? "Collapse row" : "Expand row"
                  }
                >
                  {expandedRows.has(prefix.id) ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </TableCell>
              <TableCell className="font-mono">
                {prefix.formattedPrefix}
                {prefix.description && (
                  <span className="ml-2 text-muted-foreground text-sm">
                    ({prefix.description})
                  </span>
                )}
              </TableCell>
              <TableCell>{prefix.formattedBlockSize}</TableCell>
              {/* Story 7.6: Removed Type badge cell - ISBNs are unified */}
              <TableCell>
                <div className="flex items-center gap-2">
                  <Progress
                    value={100 - prefix.availablePercentage}
                    className="w-[80px]"
                  />
                  <span className="text-sm text-muted-foreground">
                    {prefix.assignedCount}/{prefix.totalIsbns}
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <IsbnPrefixStatusBadge
                  status={prefix.generationStatus}
                  error={prefix.generationError}
                />
              </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive"
                      disabled={
                        prefix.assignedCount > 0 ||
                        prefix.generationStatus === "generating" ||
                        deletingId === prefix.id
                      }
                      title={
                        prefix.assignedCount > 0
                          ? "Cannot delete: ISBNs are assigned"
                          : prefix.generationStatus === "generating"
                            ? "Cannot delete: Generation in progress"
                            : "Delete prefix"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete ISBN Prefix?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the prefix{" "}
                        <span className="font-mono font-semibold">
                          {prefix.formattedPrefix}
                        </span>{" "}
                        and all {prefix.totalIsbns.toLocaleString()} associated
                        ISBNs. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(prefix.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
            {expandedRows.has(prefix.id) && (
              <TableRow key={`${prefix.id}-detail`}>
                {/* Story 7.6: Updated colSpan from 7 to 6 after removing Type column */}
                <TableCell colSpan={6} className="bg-muted/50 p-4">
                  <IsbnPrefixDetail prefix={prefix} />
                </TableCell>
              </TableRow>
            )}
          </Fragment>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Expanded row detail component
 */
function IsbnPrefixDetail({ prefix }: { prefix: PrefixListItem }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
        <div>
          <span className="text-muted-foreground">Total ISBNs</span>
          <p className="font-semibold">{prefix.totalIsbns.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Available</span>
          <p className="font-semibold text-green-600">
            {prefix.availableCount.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Assigned</span>
          <p className="font-semibold text-blue-600">
            {prefix.assignedCount.toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Created</span>
          <p className="font-semibold">
            {new Date(prefix.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {prefix.generationError && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          <strong>Error:</strong> {prefix.generationError}
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Utilization</span>
          <span className="text-sm font-semibold">
            {100 - prefix.availablePercentage}%
          </span>
        </div>
        <Progress value={100 - prefix.availablePercentage} />
      </div>
    </div>
  );
}
