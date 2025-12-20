"use client";

/**
 * Webhook List Component
 *
 * Story 15.4 - Webhook subscription management UI
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  History,
  Key,
  MoreVertical,
  Plus,
  RefreshCw,
  TestTube,
  Trash2,
} from "lucide-react";
import { useState } from "react";
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
} from "@/components/ui/alert-dialog";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MobileCardSkeleton } from "@/components/ui/responsive-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import {
  deleteWebhook,
  listWebhooks,
  regenerateWebhookSecret,
  testWebhook,
  type WebhookSubscription,
} from "../actions";
import { WebhookCreateDialog } from "./webhook-create-dialog";
import { WebhookDeliveryHistoryDialog } from "./webhook-delivery-history";
import { WebhookEditDialog } from "./webhook-edit-dialog";
import { WebhookSecretDialog } from "./webhook-secret-dialog";

/**
 * Mobile card component for webhook display
 * Story 20.4: Mobile-Responsive Layout (AC 20.4.3)
 */
function WebhookMobileCard({
  webhook,
  onEdit,
  onTest,
  onRegenerate,
  onDelete,
  onViewHistory,
  isTestPending,
  isRegeneratePending,
}: {
  webhook: WebhookSubscription;
  onEdit: () => void;
  onTest: () => void;
  onRegenerate: () => void;
  onDelete: () => void;
  onViewHistory: () => void;
  isTestPending: boolean;
  isRegeneratePending: boolean;
}) {
  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{webhook.name}</div>
          <div className="text-sm text-muted-foreground font-mono truncate max-w-[200px]">
            {webhook.url_domain}
          </div>
        </div>
        <Badge variant={webhook.is_active ? "default" : "secondary"}>
          {webhook.is_active ? "Active" : "Disabled"}
        </Badge>
      </div>
      <div className="flex flex-wrap gap-1">
        {webhook.events.slice(0, 3).map((event: string) => (
          <Badge key={event} variant="secondary" className="text-xs">
            {event}
          </Badge>
        ))}
        {webhook.events.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{webhook.events.length - 3}
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-2 pt-2 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewHistory}
          className="flex-1 h-11 min-w-[80px]"
        >
          <History className="h-4 w-4 mr-1" />
          History
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={isTestPending}
          className="flex-1 h-11 min-w-[80px]"
        >
          <TestTube className="h-4 w-4 mr-1" />
          Test
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          className="flex-1 h-11 min-w-[80px]"
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onRegenerate}
          disabled={isRegeneratePending}
          className="flex-1 h-11 min-w-[80px]"
        >
          <Key className="h-4 w-4 mr-1" />
          Key
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          className="flex-1 h-11 min-w-[80px] text-destructive hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function WebhookList() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] =
    useState<WebhookSubscription | null>(null);
  const [newSecret, setNewSecret] = useState<{
    id: string;
    secret: string;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] =
    useState<WebhookSubscription | null>(null);
  const [historyWebhook, setHistoryWebhook] =
    useState<WebhookSubscription | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["webhooks"],
    queryFn: () => listWebhooks(),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteWebhook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhooks"] });
      toast.success("Webhook deleted");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const testMutation = useMutation({
    mutationFn: testWebhook,
    onSuccess: (result) => {
      if (result.success) {
        toast.success(
          `Test delivered successfully (HTTP ${result.status_code})`,
        );
      } else {
        toast.error(`Test failed: ${result.error}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateWebhookSecret,
    onSuccess: (result, webhookId) => {
      setNewSecret({ id: webhookId, secret: result.secret });
      toast.success("Secret regenerated - copy it now!");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const webhooks = data?.webhooks ?? [];

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Webhook Subscriptions</CardTitle>
            <CardDescription>
              Endpoints that receive event notifications from Salina
            </CardDescription>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Webhook
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            isMobile ? (
              <MobileCardSkeleton count={3} />
            ) : (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )
          ) : error ? (
            <div className="text-center py-8 text-destructive">
              Failed to load webhooks
            </div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No webhook subscriptions configured.
              <br />
              <Button variant="link" onClick={() => setCreateOpen(true)}>
                Create your first webhook
              </Button>
            </div>
          ) : isMobile ? (
            /* Mobile: Card layout (Story 20.4) */
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <WebhookMobileCard
                  key={webhook.id}
                  webhook={webhook}
                  onEdit={() => setEditingWebhook(webhook)}
                  onTest={() => testMutation.mutate(webhook.id)}
                  onRegenerate={() => regenerateMutation.mutate(webhook.id)}
                  onDelete={() => setDeleteConfirm(webhook)}
                  onViewHistory={() => setHistoryWebhook(webhook)}
                  isTestPending={testMutation.isPending}
                  isRegeneratePending={regenerateMutation.isPending}
                />
              ))}
            </div>
          ) : (
            /* Desktop: Table layout */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Endpoint</TableHead>
                  <TableHead>Events</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {webhooks.map((webhook) => (
                  <TableRow key={webhook.id}>
                    <TableCell className="font-medium">
                      {webhook.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {webhook.url_domain}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.slice(0, 2).map((event: string) => (
                          <Badge
                            key={event}
                            variant="secondary"
                            className="text-xs"
                          >
                            {event}
                          </Badge>
                        ))}
                        {webhook.events.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{webhook.events.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={webhook.is_active ? "default" : "secondary"}
                      >
                        {webhook.is_active ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setHistoryWebhook(webhook)}
                          >
                            <History className="mr-2 h-4 w-4" />
                            View History
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => testMutation.mutate(webhook.id)}
                            disabled={testMutation.isPending}
                          >
                            <TestTube className="mr-2 h-4 w-4" />
                            Test Delivery
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setEditingWebhook(webhook)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              regenerateMutation.mutate(webhook.id)
                            }
                            disabled={regenerateMutation.isPending}
                          >
                            <Key className="mr-2 h-4 w-4" />
                            Regenerate Secret
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteConfirm(webhook)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <WebhookCreateDialog open={createOpen} onOpenChange={setCreateOpen} />

      {editingWebhook && (
        <WebhookEditDialog
          webhook={editingWebhook}
          open={!!editingWebhook}
          onOpenChange={(open) => !open && setEditingWebhook(null)}
        />
      )}

      {newSecret && (
        <WebhookSecretDialog
          secret={newSecret.secret}
          open={!!newSecret}
          onOpenChange={(open) => !open && setNewSecret(null)}
        />
      )}

      {historyWebhook && (
        <WebhookDeliveryHistoryDialog
          subscriptionId={historyWebhook.id}
          subscriptionName={historyWebhook.name}
          open={!!historyWebhook}
          onOpenChange={(open) => !open && setHistoryWebhook(null)}
        />
      )}

      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteConfirm?.name}&quot;?
              This action cannot be undone and will stop all event deliveries to
              this endpoint.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm) {
                  deleteMutation.mutate(deleteConfirm.id);
                  setDeleteConfirm(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
