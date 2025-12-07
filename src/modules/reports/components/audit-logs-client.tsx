"use client";

/**
 * Audit Logs Client Component
 *
 * Interactive audit log viewer with filtering, pagination, and CSV export.
 *
 * Story: 6.5 - Implement Audit Logging for Compliance
 * AC-6.5.6: Support filtering by action_type, resource_type, user, date range
 * AC-6.5.7: Results table shows: Timestamp, User, Action Type, Resource Type, Resource ID, Summary
 * AC-6.5.8: Expandable row reveals full before/after data
 * AC-6.5.9: Export CSV functionality
 */

import { format } from "date-fns";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  type AuditLogFilterInput,
  exportAuditLogsCSV,
  fetchAuditLogs,
} from "../actions";
import type { AuditLogEntry, PaginatedAuditLogs } from "../types";

interface AuditLogsClientProps {
  users: Array<{ id: string; email: string }>;
}

// Action type options
const ACTION_TYPES = [
  { value: "all", label: "All Actions" },
  { value: "CREATE", label: "Create" },
  { value: "UPDATE", label: "Update" },
  { value: "DELETE", label: "Delete" },
  { value: "APPROVE", label: "Approve" },
  { value: "REJECT", label: "Reject" },
];

// Resource type options
const RESOURCE_TYPES = [
  { value: "all", label: "All Resources" },
  { value: "author", label: "Author" },
  { value: "title", label: "Title" },
  { value: "sale", label: "Sale" },
  { value: "return", label: "Return" },
  { value: "statement", label: "Statement" },
  { value: "contract", label: "Contract" },
  { value: "user", label: "User" },
];

export function AuditLogsClient({ users }: AuditLogsClientProps) {
  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<PaginatedAuditLogs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Filter state
  const [actionType, setActionType] = useState("all");
  const [resourceType, setResourceType] = useState("all");
  const [userId, setUserId] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Build filters object
  const buildFilters = useCallback((): AuditLogFilterInput => {
    return {
      actionType: actionType !== "all" ? actionType : undefined,
      resourceType: resourceType !== "all" ? resourceType : undefined,
      userId: userId !== "all" ? userId : undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      pageSize,
    };
  }, [actionType, resourceType, userId, startDate, endDate, page]);

  // Fetch data
  const loadData = useCallback(() => {
    startTransition(async () => {
      const result = await fetchAuditLogs(buildFilters());
      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error);
        setData(null);
      }
    });
  }, [buildFilters]);

  // Load data on mount and filter changes
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle filter changes - reset to page 1
  const handleFilterChange = () => {
    setPage(1);
  };

  // Handle CSV export
  const handleExport = async () => {
    const filters = buildFilters();
    const result = await exportAuditLogsCSV({
      actionType: filters.actionType,
      resourceType: filters.resourceType,
      userId: filters.userId,
      startDate: filters.startDate,
      endDate: filters.endDate,
    });

    if (result.success) {
      // Create download
      const blob = new Blob([result.data], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Toggle row expansion
  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Generate summary from changes
  const generateSummary = (entry: AuditLogEntry): string => {
    if (!entry.changes) return "";

    if (entry.actionType === "CREATE" && entry.changes.after) {
      const keys = Object.keys(entry.changes.after).slice(0, 3);
      return `Created with: ${keys.join(", ")}`;
    }
    if (
      entry.actionType === "UPDATE" &&
      entry.changes.before &&
      entry.changes.after
    ) {
      const changedKeys = Object.keys(entry.changes.after).filter(
        (k) =>
          JSON.stringify(
            (entry.changes?.before as Record<string, unknown>)?.[k],
          ) !==
          JSON.stringify(
            (entry.changes?.after as Record<string, unknown>)?.[k],
          ),
      );
      return `Changed: ${changedKeys.slice(0, 3).join(", ")}`;
    }
    if (entry.actionType === "DELETE") return "Record deleted";
    if (entry.actionType === "APPROVE") return "Approved";
    if (entry.actionType === "REJECT") return "Rejected";
    return "";
  };

  // Format action type badge
  const getActionBadgeClass = (action: string) => {
    switch (action) {
      case "CREATE":
        return "bg-green-100 text-green-800";
      case "UPDATE":
        return "bg-blue-100 text-blue-800";
      case "DELETE":
        return "bg-red-100 text-red-800";
      case "APPROVE":
        return "bg-emerald-100 text-emerald-800";
      case "REJECT":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Action Type */}
            <div>
              <span className="text-sm font-medium mb-1.5 block">
                Action Type
              </span>
              <Select
                value={actionType}
                onValueChange={(v) => {
                  setActionType(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTION_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Resource Type */}
            <div>
              <span className="text-sm font-medium mb-1.5 block">
                Resource Type
              </span>
              <Select
                value={resourceType}
                onValueChange={(v) => {
                  setResourceType(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESOURCE_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User */}
            <div>
              <span className="text-sm font-medium mb-1.5 block">User</span>
              <Select
                value={userId}
                onValueChange={(v) => {
                  setUserId(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Date */}
            <div>
              <label
                htmlFor="audit-start-date"
                className="text-sm font-medium mb-1.5 block"
              >
                Start Date
              </label>
              <Input
                id="audit-start-date"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>

            {/* End Date */}
            <div>
              <label
                htmlFor="audit-end-date"
                className="text-sm font-medium mb-1.5 block"
              >
                End Date
              </label>
              <Input
                id="audit-end-date"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  handleFilterChange();
                }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={handleExport} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Audit Log Entries
            {data && (
              <span className="font-normal text-muted-foreground ml-2">
                ({data.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

          {isPending && !data && (
            <div className="text-muted-foreground text-center py-8">
              Loading...
            </div>
          )}

          {data && data.items.length === 0 && (
            <div className="text-muted-foreground text-center py-8">
              No audit log entries found matching the current filters.
            </div>
          )}

          {data && data.items.length > 0 && (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Resource ID</TableHead>
                    <TableHead>Summary</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => (
                    <Fragment key={entry.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(entry.id)}
                      >
                        <TableCell>
                          {expandedRows.has(entry.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {format(
                            new Date(entry.createdAt),
                            "MMM d, yyyy HH:mm",
                          )}
                        </TableCell>
                        <TableCell>{entry.userName ?? "System"}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 text-xs font-medium rounded ${getActionBadgeClass(entry.actionType)}`}
                          >
                            {entry.actionType}
                          </span>
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.resourceType}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.resourceId?.slice(0, 8) ?? "-"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {generateSummary(entry)}
                        </TableCell>
                      </TableRow>
                      {expandedRows.has(entry.id) && (
                        <TableRow>
                          <TableCell colSpan={7} className="bg-muted/30 p-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {entry.changes?.before && (
                                <div>
                                  <div className="font-medium mb-2">
                                    Before:
                                  </div>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(
                                      entry.changes.before,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              )}
                              {entry.changes?.after && (
                                <div>
                                  <div className="font-medium mb-2">After:</div>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(
                                      entry.changes.after,
                                      null,
                                      2,
                                    )}
                                  </pre>
                                </div>
                              )}
                              {entry.metadata && (
                                <div className="col-span-2">
                                  <div className="font-medium mb-2">
                                    Metadata:
                                  </div>
                                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                                    {JSON.stringify(entry.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {data.totalPages > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Page {data.page} of {data.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage((p) => Math.min(data.totalPages, p + 1))
                      }
                      disabled={page === data.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
