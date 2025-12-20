"use client";

/**
 * Webhook Delivery History Dialog
 *
 * Story 15.5 - AC8: View delivery history per subscription
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  getDeliveryById,
  getDeliveryHistory,
  retryDelivery,
  type WebhookDelivery,
} from "../actions";

interface DeliveryHistoryDialogProps {
  subscriptionId: string;
  subscriptionName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "delivered":
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case "failed":
      return <XCircle className="h-4 w-4 text-red-500" />;
    case "pending":
      return <Clock className="h-4 w-4 text-yellow-500" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, "default" | "secondary" | "destructive"> = {
    delivered: "default",
    failed: "destructive",
    pending: "secondary",
  };

  return (
    <Badge variant={variants[status] || "secondary"} className="capitalize">
      {status}
    </Badge>
  );
}

export function WebhookDeliveryHistoryDialog({
  subscriptionId,
  subscriptionName,
  open,
  onOpenChange,
}: DeliveryHistoryDialogProps) {
  const queryClient = useQueryClient();
  const [selectedDelivery, setSelectedDelivery] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["webhook-deliveries", subscriptionId, statusFilter],
    queryFn: () =>
      getDeliveryHistory(subscriptionId, {
        status:
          statusFilter === "all"
            ? undefined
            : (statusFilter as "pending" | "delivered" | "failed"),
      }),
    enabled: open,
  });

  const { data: deliveryDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["webhook-delivery-detail", selectedDelivery],
    queryFn: () =>
      selectedDelivery ? getDeliveryById(selectedDelivery) : null,
    enabled: !!selectedDelivery,
  });

  const retryMutation = useMutation({
    mutationFn: retryDelivery,
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Retry queued", {
          description: "Webhook will be delivered shortly",
        });
        queryClient.invalidateQueries({
          queryKey: ["webhook-deliveries", subscriptionId],
        });
      } else {
        toast.error("Retry failed", { description: result.error });
      }
    },
    onError: () => {
      toast.error("Retry failed", {
        description: "An unexpected error occurred",
      });
    },
  });

  const deliveries = data?.deliveries ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Delivery History - {subscriptionName}</DialogTitle>
          <DialogDescription>
            Recent webhook delivery attempts and their status
          </DialogDescription>
        </DialogHeader>

        {selectedDelivery && deliveryDetail?.delivery ? (
          <DeliveryDetailView
            delivery={deliveryDetail.delivery}
            onBack={() => setSelectedDelivery(null)}
            isLoading={detailLoading}
            onRetry={
              deliveryDetail.delivery.status === "failed"
                ? () => retryMutation.mutate(selectedDelivery)
                : undefined
            }
            isRetrying={retryMutation.isPending}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : error ? (
              <div className="text-center py-8 text-destructive">
                Failed to load delivery history
              </div>
            ) : deliveries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deliveries yet. Events will appear here when they are sent.
              </div>
            ) : (
              <div className="max-h-[400px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]">Status</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Response</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {deliveries.map((delivery) => (
                      <DeliveryRow
                        key={delivery.id}
                        delivery={delivery}
                        onViewDetails={() => setSelectedDelivery(delivery.id)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeliveryRow({
  delivery,
  onViewDetails,
}: {
  delivery: WebhookDelivery;
  onViewDetails: () => void;
}) {
  return (
    <TableRow>
      <TableCell>
        <StatusIcon status={delivery.status} />
      </TableCell>
      <TableCell>
        <div className="font-mono text-sm">{delivery.eventType}</div>
        <div className="text-xs text-muted-foreground">
          {delivery.eventId.slice(0, 8)}...
        </div>
      </TableCell>
      <TableCell>
        {delivery.responseStatusCode ? (
          <Badge
            variant={
              delivery.responseStatusCode < 400 ? "default" : "secondary"
            }
          >
            HTTP {delivery.responseStatusCode}
          </Badge>
        ) : delivery.errorMessage ? (
          <span className="text-xs text-destructive truncate max-w-[150px] block">
            {delivery.errorMessage}
          </span>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        {delivery.attemptCount}/{delivery.maxAttempts}
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(delivery.createdAt), {
            addSuffix: true,
          })}
        </span>
      </TableCell>
      <TableCell>
        <Button variant="ghost" size="sm" onClick={onViewDetails}>
          View
        </Button>
      </TableCell>
    </TableRow>
  );
}

function DeliveryDetailView({
  delivery,
  onBack,
  isLoading,
  onRetry,
  isRetrying,
}: {
  delivery: WebhookDelivery & { payload: string; responseBody: string | null };
  onBack: () => void;
  isLoading: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          &larr; Back to list
        </Button>
        <div className="flex items-center gap-2">
          {onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRetry}
              disabled={isRetrying}
            >
              <RotateCcw
                className={`mr-2 h-4 w-4 ${isRetrying ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          )}
          <StatusBadge status={delivery.status} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-muted-foreground">Event Type:</span>
          <span className="ml-2 font-mono">{delivery.eventType}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Event ID:</span>
          <span className="ml-2 font-mono text-xs">{delivery.eventId}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Attempts:</span>
          <span className="ml-2">
            {delivery.attemptCount}/{delivery.maxAttempts}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">Duration:</span>
          <span className="ml-2">
            {delivery.durationMs ? `${delivery.durationMs}ms` : "-"}
          </span>
        </div>
        {delivery.responseStatusCode && (
          <div>
            <span className="text-muted-foreground">Status Code:</span>
            <span className="ml-2">HTTP {delivery.responseStatusCode}</span>
          </div>
        )}
        {delivery.errorMessage && (
          <div className="col-span-2">
            <span className="text-muted-foreground">Error:</span>
            <span className="ml-2 text-destructive">
              {delivery.errorMessage}
            </span>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Request Payload</h4>
        <div className="max-h-[150px] overflow-auto rounded border bg-muted/50 p-2">
          <pre className="text-xs font-mono whitespace-pre-wrap">
            {JSON.stringify(JSON.parse(delivery.payload), null, 2)}
          </pre>
        </div>
      </div>

      {delivery.responseBody && (
        <div className="space-y-2">
          <h4 className="font-medium">Response Body</h4>
          <div className="max-h-[100px] overflow-auto rounded border bg-muted/50 p-2">
            <pre className="text-xs font-mono whitespace-pre-wrap">
              {delivery.responseBody}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
