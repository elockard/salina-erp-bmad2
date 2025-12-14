"use client";

import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Download,
  Loader2,
  XCircle,
} from "lucide-react";
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
import { triggerIngramOrderImport } from "../actions";

/**
 * Import metadata structure from ingram-orders.ts
 */
interface ImportMetadata {
  filesProcessed?: number;
  ordersCreated?: number;
  unmatchedIsbns?: { isbn: string; orderId: string; quantity: number }[];
  duplicatesSkipped?: number;
  parseErrors?: { file: string; line: number; message: string }[];
  reason?: string;
}

interface IngramImportHistoryProps {
  imports: ChannelFeed[];
}

/**
 * Ingram Order Import History Component
 *
 * Story 16.3 - AC5: Flag Unmatched ISBNs for Review
 * Displays import history with unmatched ISBNs visible for review.
 */
export function IngramImportHistory({ imports }: IngramImportHistoryProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleTriggerImport = async () => {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const result = await triggerIngramOrderImport();
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
    generating: { icon: Loader2, color: "text-blue-600", label: "Downloading" },
    failed: { icon: XCircle, color: "text-red-600", label: "Failed" },
    skipped: { icon: AlertCircle, color: "text-gray-500", label: "Skipped" },
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-lg">Order Imports</CardTitle>
          <CardDescription>
            Ingram order files imported from FTP
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
              Import Now
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
            No order imports yet. Click &quot;Import Now&quot; to download
            orders from Ingram.
          </p>
        ) : (
          <div className="space-y-3">
            {imports.map((imp) => {
              const meta = imp.metadata as ImportMetadata | null;
              const StatusIcon = statusConfig[imp.status]?.icon || AlertCircle;
              const statusColor =
                statusConfig[imp.status]?.color || "text-gray-500";
              const statusLabel = statusConfig[imp.status]?.label || imp.status;
              const hasUnmatched = (meta?.unmatchedIsbns?.length ?? 0) > 0;

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
                                {meta?.unmatchedIsbns?.length} unmatched
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
                          {meta?.ordersCreated ?? imp.productCount ?? 0} orders
                        </p>
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

                    {/* Expandable details for unmatched ISBNs */}
                    {hasUnmatched && (
                      <>
                        <CollapsibleTrigger className="mt-2 text-sm text-blue-600 hover:underline">
                          View {meta?.unmatchedIsbns?.length} unmatched ISBNs
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="bg-muted rounded p-2 text-xs space-y-1 max-h-40 overflow-y-auto">
                            <div className="grid grid-cols-3 gap-2 font-medium border-b pb-1 mb-1">
                              <span>ISBN</span>
                              <span>Order ID</span>
                              <span>Qty</span>
                            </div>
                            {meta?.unmatchedIsbns?.map((item) => (
                              <div
                                key={`${item.isbn}-${item.orderId}`}
                                className="grid grid-cols-3 gap-2 font-mono"
                              >
                                <span>{item.isbn}</span>
                                <span className="truncate">{item.orderId}</span>
                                <span>{item.quantity}</span>
                              </div>
                            ))}
                          </div>
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
