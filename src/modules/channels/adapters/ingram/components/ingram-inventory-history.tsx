"use client";

/**
 * Ingram Inventory History Component
 *
 * Story 16.4 - AC5: Inventory Sync History
 * Story 16.4 - AC6: Status Mismatch Alerts
 *
 * Displays bidirectional inventory sync history:
 * - Push: Inventory syncs sent to Ingram
 * - Pull: Inventory imports from Ingram with mismatch display
 */

import { formatDistanceToNow } from "date-fns";
import { ChevronDown, ChevronRight, Download, RefreshCw } from "lucide-react";
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

interface IngramInventoryHistoryProps {
  syncs: ChannelFeed[];
  imports: ChannelFeed[];
  onTriggerSync: () => Promise<{ success: boolean; message: string }>;
  onTriggerImport: () => Promise<{ success: boolean; message: string }>;
}

const statusVariant: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  pending: "secondary",
  generating: "secondary",
  uploading: "secondary",
  failed: "destructive",
  skipped: "outline",
};

interface InventoryImportMetadata {
  matched?: number;
  mismatched?: number;
  ingramOnly?: number;
  localOnly?: number;
  mismatchDetails?: { isbn: string; localStatus: string; ingramCode: string }[];
  parseErrors?: { file: string; line: number; message: string }[];
  reason?: string;
}

export function IngramInventoryHistory({
  syncs,
  imports,
  onTriggerSync,
  onTriggerImport,
}: IngramInventoryHistoryProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [expandedImport, setExpandedImport] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await onTriggerSync();
      setSyncMessage(result.message);
    } catch (error) {
      setSyncMessage(error instanceof Error ? error.message : "Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    setImportMessage(null);
    try {
      const result = await onTriggerImport();
      setImportMessage(result.message);
    } catch (error) {
      setImportMessage(
        error instanceof Error ? error.message : "Import failed",
      );
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Inventory Sync (Push to Ingram) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">
              Inventory Sync (Push to Ingram)
            </CardTitle>
            <CardDescription>
              Send current title availability status to Ingram
            </CardDescription>
          </div>
          <Button
            onClick={handleSync}
            disabled={isSyncing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
            />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        </CardHeader>
        <CardContent>
          {syncMessage && (
            <div className="mb-4 p-2 bg-muted rounded text-sm">
              {syncMessage}
            </div>
          )}
          {syncs.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No inventory syncs yet.
            </p>
          ) : (
            <div className="space-y-2">
              {syncs.slice(0, 10).map((sync) => (
                <div
                  key={sync.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={statusVariant[sync.status] || "secondary"}>
                      {sync.status}
                    </Badge>
                    <div className="text-sm">
                      <span className="text-muted-foreground">
                        {sync.triggeredBy === "schedule"
                          ? "Scheduled"
                          : "Manual"}
                      </span>
                      {sync.createdAt && (
                        <span className="text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(sync.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {sync.status === "success" && (
                      <span>{sync.productCount ?? 0} titles synced</span>
                    )}
                    {sync.status === "failed" && sync.errorMessage && (
                      <span className="text-destructive">
                        {sync.errorMessage}
                      </span>
                    )}
                    {sync.status === "skipped" && (
                      <span className="text-muted-foreground">Skipped</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inventory Import (Pull from Ingram) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">
              Inventory Import (Pull from Ingram)
            </CardTitle>
            <CardDescription>
              Compare Ingram inventory status with your catalog
            </CardDescription>
          </div>
          <Button
            onClick={handleImport}
            disabled={isImporting}
            variant="outline"
            size="sm"
          >
            <Download
              className={`mr-2 h-4 w-4 ${isImporting ? "animate-pulse" : ""}`}
            />
            {isImporting ? "Importing..." : "Import Now"}
          </Button>
        </CardHeader>
        <CardContent>
          {importMessage && (
            <div className="mb-4 p-2 bg-muted rounded text-sm">
              {importMessage}
            </div>
          )}
          {imports.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No inventory imports yet.
            </p>
          ) : (
            <div className="space-y-2">
              {imports.slice(0, 10).map((imp) => {
                const meta = imp.metadata as InventoryImportMetadata | null;
                const hasMismatches = (meta?.mismatched ?? 0) > 0;
                const isExpanded = expandedImport === imp.id;

                return (
                  <Collapsible
                    key={imp.id}
                    open={isExpanded}
                    onOpenChange={() =>
                      setExpandedImport(isExpanded ? null : imp.id)
                    }
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            {hasMismatches ? (
                              isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )
                            ) : (
                              <div className="w-4" />
                            )}
                            <Badge
                              variant={statusVariant[imp.status] || "secondary"}
                            >
                              {imp.status}
                            </Badge>
                            <div className="text-sm text-left">
                              <span className="text-muted-foreground">
                                {imp.triggeredBy === "schedule"
                                  ? "Scheduled"
                                  : "Manual"}
                              </span>
                              {imp.createdAt && (
                                <span className="text-muted-foreground ml-2">
                                  {formatDistanceToNow(
                                    new Date(imp.createdAt),
                                    {
                                      addSuffix: true,
                                    },
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right text-sm space-x-3">
                            {imp.status === "success" && meta && (
                              <>
                                <span className="text-green-600">
                                  {meta.matched ?? 0} matched
                                </span>
                                {hasMismatches && (
                                  <span className="text-amber-600">
                                    {meta.mismatched} mismatched
                                  </span>
                                )}
                              </>
                            )}
                            {imp.status === "failed" && imp.errorMessage && (
                              <span className="text-destructive">
                                {imp.errorMessage}
                              </span>
                            )}
                            {imp.status === "skipped" && (
                              <span className="text-muted-foreground">
                                {meta?.reason || "Skipped"}
                              </span>
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      {hasMismatches && (
                        <CollapsibleContent>
                          <div className="border-t p-3 bg-muted/30">
                            <h4 className="text-sm font-medium mb-2">
                              Status Mismatches
                            </h4>
                            <p className="text-xs text-muted-foreground mb-2">
                              These titles have different availability in Ingram
                              vs your catalog. Review and update as needed.
                            </p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {meta?.mismatchDetails?.map((mismatch) => (
                                <div
                                  key={mismatch.isbn}
                                  className="flex items-center justify-between text-xs p-2 bg-background rounded"
                                >
                                  <span className="font-mono">
                                    {mismatch.isbn}
                                  </span>
                                  <div className="flex gap-2">
                                    <span>
                                      Local:{" "}
                                      <Badge variant="outline" className="ml-1">
                                        {mismatch.localStatus}
                                      </Badge>
                                    </span>
                                    <span>
                                      Ingram:{" "}
                                      <Badge variant="outline" className="ml-1">
                                        Code {mismatch.ingramCode}
                                      </Badge>
                                    </span>
                                  </div>
                                </div>
                              ))}
                              {(meta?.mismatched ?? 0) > 100 && (
                                <p className="text-xs text-muted-foreground pt-2">
                                  Showing first 100 mismatches. Total:{" "}
                                  {meta?.mismatched}
                                </p>
                              )}
                            </div>
                          </div>
                        </CollapsibleContent>
                      )}
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
