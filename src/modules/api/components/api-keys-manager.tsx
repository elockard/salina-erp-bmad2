"use client";

/**
 * API Keys Manager Component
 *
 * Story 15.1 - AC1: API Key Generation UI
 * Story 15.1 - AC2: API Key Management (list, revoke)
 */

import { zodResolver } from "@hookform/resolvers/zod";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Copy, Key, Loader2, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_SCOPES } from "@/db/schema/api-keys";
import { createApiKey, listApiKeys, revokeApiKey } from "../actions";
import { type ApiKeyCreateInput, apiKeyCreateSchema } from "../schema";

interface ApiKeyRow {
  id: string;
  name: string;
  keyId: string;
  description: string | null;
  scopes: string[];
  isTest: boolean;
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
}

export function ApiKeysManager() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<{
    keyId: string;
    secret: string;
  } | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const form = useForm<ApiKeyCreateInput>({
    resolver: zodResolver(apiKeyCreateSchema),
    defaultValues: {
      name: "",
      description: "",
      scopes: ["read"],
      isTest: false,
    },
  });

  const loadKeys = useCallback(async () => {
    const result = await listApiKeys();
    if (result.success && result.keys) {
      setKeys(result.keys);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  async function onCreateSubmit(data: ApiKeyCreateInput) {
    setIsCreating(true);
    const result = await createApiKey(data);
    setIsCreating(false);

    if (result.success && result.keyId && result.plaintextSecret) {
      setCreatedKey({
        keyId: result.keyId,
        secret: result.plaintextSecret,
      });
      form.reset();
      loadKeys();
    } else {
      toast.error(result.error || "Failed to create API key");
    }
  }

  async function handleRevoke(keyId: string, name: string) {
    const result = await revokeApiKey(keyId);
    if (result.success) {
      toast.success(`"${name}" has been revoked`);
      loadKeys();
    } else {
      toast.error(result.error || "Failed to revoke API key");
    }
  }

  function copyToClipboard(text: string, label: string) {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  }

  const activeKeys = keys.filter((k) => !k.revokedAt);
  const revokedKeys = keys.filter((k) => k.revokedAt);

  return (
    <div className="space-y-6">
      {/* Create Key Dialog */}
      <Dialog
        open={createOpen || !!createdKey}
        onOpenChange={(open) => {
          if (!open) {
            setCreateOpen(false);
            setCreatedKey(null);
          }
        }}
      >
        <DialogTrigger asChild>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create API Key
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-lg">
          {createdKey ? (
            <>
              <DialogHeader>
                <DialogTitle>API Key Created</DialogTitle>
                <DialogDescription>
                  Copy your secret key now. You won&apos;t be able to see it
                  again.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    This is the only time your secret will be displayed. Store
                    it securely.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <label htmlFor="api-key-id" className="text-sm font-medium">
                    API Key ID
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key-id"
                      value={createdKey.keyId}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(createdKey.keyId, "Key ID")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="api-secret-key"
                    className="text-sm font-medium"
                  >
                    Secret Key
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="api-secret-key"
                      value={createdKey.secret}
                      readOnly
                      className="font-mono"
                      type="text"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        copyToClipboard(createdKey.secret, "Secret")
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => setCreatedKey(null)}>Done</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Generate a new API key for programmatic access.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onCreateSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Production Integration"
                          />
                        </FormControl>
                        <FormDescription>
                          A label to identify this key
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (optional)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Used for inventory sync"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="scopes"
                    render={() => (
                      <FormItem>
                        <FormLabel>Scopes</FormLabel>
                        <div className="space-y-2">
                          {Object.values(API_SCOPES).map((scope) => (
                            <FormField
                              key={scope}
                              control={form.control}
                              name="scopes"
                              render={({ field }) => (
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(scope)}
                                      onCheckedChange={(checked) => {
                                        const current = field.value || [];
                                        if (checked) {
                                          field.onChange([...current, scope]);
                                        } else {
                                          field.onChange(
                                            current.filter((s) => s !== scope),
                                          );
                                        }
                                      }}
                                    />
                                  </FormControl>
                                  <span className="text-sm capitalize">
                                    {scope}
                                  </span>
                                </FormItem>
                              )}
                            />
                          ))}
                        </div>
                        <FormDescription>
                          read: Read data | write: Create/update | admin: Full
                          access
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isTest"
                    render={({ field }) => (
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <span className="text-sm">
                          Test key (sk_test_ prefix)
                        </span>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button type="submit" disabled={isCreating}>
                      {isCreating && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Key
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Active Keys */}
      <Card>
        <CardHeader>
          <CardTitle>Active API Keys</CardTitle>
          <CardDescription>
            Keys currently enabled for API access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          ) : activeKeys.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No API keys created yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeKeys.map((key) => (
                  <TableRow key={key.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{key.name}</span>
                        {key.isTest && (
                          <Badge variant="outline" className="ml-2">
                            Test
                          </Badge>
                        )}
                      </div>
                      {key.description && (
                        <span className="text-sm text-muted-foreground">
                          {key.description}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {key.keyId}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {key.scopes.map((scope) => (
                          <Badge
                            key={scope}
                            variant="secondary"
                            className="capitalize"
                          >
                            {scope}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(key.createdAt), {
                        addSuffix: true,
                      })}
                    </TableCell>
                    <TableCell>
                      {key.lastUsedAt
                        ? formatDistanceToNow(new Date(key.lastUsedAt), {
                            addSuffix: true,
                          })
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will immediately invalidate all tokens for
                              &quot;{key.name}&quot;. This action cannot be
                              undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(key.keyId, key.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revoke
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Revoked Keys */}
      {revokedKeys.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Revoked Keys</CardTitle>
            <CardDescription>
              Previously active keys that have been revoked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key ID</TableHead>
                  <TableHead>Revoked</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revokedKeys.map((key) => (
                  <TableRow key={key.id} className="opacity-60">
                    <TableCell>{key.name}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {key.keyId}
                    </TableCell>
                    <TableCell>
                      {key.revokedAt &&
                        formatDistanceToNow(new Date(key.revokedAt), {
                          addSuffix: true,
                        })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
