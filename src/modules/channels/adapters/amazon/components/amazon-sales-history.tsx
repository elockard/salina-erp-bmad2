"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Link2,
  Loader2,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { ChannelFeed } from "@/db/schema/channel-feeds";
import { triggerAmazonSalesImport } from "../actions";

/**
 * Import metadata structure from amazon-sales-import.ts
 */
interface ImportMetadata {
  reportId?: string;
  rowsProcessed?: number;
  salesCreated?: number;
  unmatchedRecords?: {
    isbn: string;
    asin: string;
    orderId: string;
    quantity: number;
  }[];
  duplicatesSkipped?: number;
  parseErrors?: { line: number; message: string }[];
  reason?: string;
}

interface AmazonSalesHistoryProps {
  imports: ChannelFeed[];
}

/**
 * Amazon Sales Import History Component
 *
 * Story 17.3 - AC6: Flag Unmatched ISBNs for Review
 * Story 17.3 - AC9: Manual Import Trigger
 *
 * Displays sales import history with:
 * - Import status and counts
 * - Unmatched records (with ASIN for manual resolution)
 * - Manual import trigger button
 */
export function AmazonSalesHistory({ imports }: AmazonSalesHistoryProps) {
  const router = useRouter();
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Story 17.4: Navigate to titles with ASIN for manual linking
  const handleResolveAsin = (asin: string) => {
    // Navigate to titles page with search query to help find matching title
    // User can then manually add ASIN to the correct title
    router.push(`/dashboard/titles?resolve_asin=${encodeURIComponent(asin)}`);
  };

  const handleTriggerImport = async () => {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const result = await triggerAmazonSalesImport();
      setImportMessage(result.message);
    } catch {
      setImportMessage("Failed to trigger import");
    } finally {
      setIsImporting(false);
    }
  };

  const statusConfig: Record<
    string,
    { icon: typeof CheckCircle; color: string; label: string }
  > = {
    success: { icon: CheckCircle, color: "text-green-600", label: "Success" },
    pending: { icon: Clock, color: "text-yellow-600", label: "Pending" },
    generating: {
      icon: Loader2,
      color: "text-blue-600",
      label: "Generating Report",
    },
    failed: { icon: XCircle, color: "text-red-600", label: "Failed" },
    skipped: { icon: AlertCircle, color: "text-gray-500", label: "Skipped" },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Sales Imports</CardTitle>
          <CardDescription>
            Amazon sales data imported via Reports API
          </CardDescription>
        </div>
        <Button
          onClick={handleTriggerImport}
          disabled={isImporting}
          variant="outline"
          size="sm"
        >
          {isImporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Sales Now
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {importMessage && (
          <div className="mb-4 p-2 bg-muted rounded text-sm">
            {importMessage}
          </div>
        )}

        {imports.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No sales imports yet. Click &quot;Import Sales Now&quot; to download
            sales data from Amazon.
          </p>
        ) : (
          <div className="space-y-3">
            {imports.map((imp) => {
              const meta = imp.metadata as ImportMetadata | null;
              const StatusIcon = statusConfig[imp.status]?.icon || AlertCircle;
              const statusColor =
                statusConfig[imp.status]?.color || "text-gray-500";
              const statusLabel = statusConfig[imp.status]?.label || imp.status;
              const hasUnmatched = (meta?.unmatchedRecords?.length ?? 0) > 0;

              return (
                <Collapsible key={imp.id}>
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{statusLabel}</span>
                            <Badge variant="outline" className="text-xs">
                              {imp.triggeredBy === "schedule"
                                ? "Scheduled"
                                : "Manual"}
                            </Badge>
                            {hasUnmatched && (
                              <Badge variant="destructive" className="text-xs">
                                {meta?.unmatchedRecords?.length} unmatched
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {imp.createdAt
                              ? formatDistanceToNow(new Date(imp.createdAt), {
                                  addSuffix: true,
                                })
                              : "Unknown time"}
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <p className="font-medium">
                          {meta?.salesCreated ?? imp.productCount ?? 0} sales
                        </p>
                        {meta?.rowsProcessed !== undefined && (
                          <p className="text-muted-foreground text-xs">
                            {meta.rowsProcessed} rows processed
                          </p>
                        )}
                        {(meta?.duplicatesSkipped ?? 0) > 0 && (
                          <p className="text-muted-foreground text-xs">
                            {meta?.duplicatesSkipped} duplicates skipped
                          </p>
                        )}
                      </div>
                    </div>

                    {imp.errorMessage && (
                      <p className="mt-2 text-sm text-red-600">
                        {imp.errorMessage}
                      </p>
                    )}

                    {meta?.reason && imp.status === "skipped" && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {meta.reason}
                      </p>
                    )}

                    {/* Parse errors */}
                    {(meta?.parseErrors?.length ?? 0) > 0 && (
                      <p className="mt-2 text-sm text-yellow-600">
                        {meta?.parseErrors?.length} parse errors
                      </p>
                    )}

                    {/* Expandable details for unmatched records */}
                    {hasUnmatched && (
                      <>
                        <CollapsibleTrigger className="mt-2 text-sm text-blue-600 hover:underline">
                          View {meta?.unmatchedRecords?.length} unmatched
                          records
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="bg-muted rounded p-2 text-xs space-y-1 max-h-48 overflow-y-auto">
                            <div className="grid grid-cols-5 gap-2 font-medium border-b pb-1 mb-1">
                              <span>ASIN</span>
                              <span>ISBN</span>
                              <span>Order ID</span>
                              <span>Qty</span>
                              <span>Action</span>
                            </div>
                            {meta?.unmatchedRecords?.map((item, idx) => (
                              <div
                                key={`${item.asin}-${item.orderId}-${idx}`}
                                className="grid grid-cols-5 gap-2 font-mono items-center"
                              >
                                <span className="truncate" title={item.asin}>
                                  {item.asin || "-"}
                                </span>
                                <span className="truncate" title={item.isbn}>
                                  {item.isbn || "-"}
                                </span>
                                <span className="truncate" title={item.orderId}>
                                  {item.orderId}
                                </span>
                                <span>{item.quantity}</span>
                                <span>
                                  {item.asin && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-2 text-xs"
                                      onClick={() =>
                                        handleResolveAsin(item.asin)
                                      }
                                      title="Link this ASIN to a title"
                                    >
                                      <Link2 className="h-3 w-3 mr-1" />
                                      Resolve
                                    </Button>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            Story 17.4: Click &quot;Resolve&quot; to navigate to
                            Titles and link the ASIN to a title. Re-import sales
                            after linking to match these records.
                          </p>
                        </CollapsibleContent>
                      </>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
