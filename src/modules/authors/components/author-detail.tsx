"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, Key, Pencil, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import {
  CREATE_AUTHORS_TITLES,
  MANAGE_USERS,
  VIEW_TAX_ID,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  deactivateAuthor,
  getMaskedTaxIdAction,
  grantPortalAccess,
  reactivateAuthor,
  revokePortalAccess,
  updateAuthor,
} from "../actions";
import { type UpdateAuthorInput, updateAuthorSchema } from "../schema";
import type { Author, AuthorWithPortalStatus, PaymentMethod } from "../types";

interface AuthorDetailProps {
  author: Author;
  /** Portal user info (loaded separately for portal status) */
  portalUser?: {
    id: string;
    is_active: boolean;
    clerk_user_id: string | null;
  } | null;
  onAuthorUpdated: (author: Author) => void;
  onAuthorDeactivated: (author: Author) => void;
  onAuthorReactivated: (author: Author) => void;
  /** Called when portal access status changes */
  onPortalAccessChanged?: () => void;
}

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  direct_deposit: "Direct Deposit",
  check: "Check",
  wire_transfer: "Wire Transfer",
};

/**
 * Author Detail component for the right panel
 *
 * AC 7: Right panel displays selected author details: Name, email, phone, address, payment method
 * AC 8: Tax ID displayed masked (***-**-1234) and only visible to Owner/Admin/Finance roles
 * AC 9: Right panel shows "Titles by this author" section with linked table
 * AC 10: Right panel shows "Contracts" summary section (placeholder for Epic 4)
 * AC 11: Edit button opens inline editing mode for all fields in right panel
 * AC 12: Deactivate button sets author is_active=false with confirmation dialog
 */
export function AuthorDetail({
  author,
  portalUser,
  onAuthorUpdated,
  onAuthorDeactivated,
  onAuthorReactivated,
  onPortalAccessChanged,
}: AuthorDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showTaxId, setShowTaxId] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [maskedTaxId, setMaskedTaxId] = useState<string>("");

  // Story 2.3: Portal access dialog states
  const [showGrantPortalDialog, setShowGrantPortalDialog] = useState(false);
  const [showRevokePortalDialog, setShowRevokePortalDialog] = useState(false);
  const [isPortalActionLoading, setIsPortalActionLoading] = useState(false);

  const canManageAuthors = useHasPermission(CREATE_AUTHORS_TITLES);
  const canViewTaxId = useHasPermission(VIEW_TAX_ID);
  const canManageUsers = useHasPermission(MANAGE_USERS);

  // Derive portal access status
  // AC 19: Active = has portal_user_id AND portalUser.is_active is true AND clerk_user_id is set
  const hasPortalUser = !!author.portal_user_id;
  const isPortalActive =
    hasPortalUser &&
    portalUser?.is_active === true &&
    !!portalUser?.clerk_user_id;
  const isPendingActivation = hasPortalUser && !portalUser?.clerk_user_id; // Invitation sent but not accepted

  // Fetch masked tax ID when author changes
  useEffect(() => {
    if (author.tax_id && canViewTaxId) {
      getMaskedTaxIdAction(author.tax_id).then(setMaskedTaxId);
    } else {
      setMaskedTaxId("");
    }
  }, [author.tax_id, canViewTaxId]);

  const form = useForm<UpdateAuthorInput>({
    resolver: zodResolver(updateAuthorSchema),
    defaultValues: {
      name: author.name,
      email: author.email || "",
      phone: author.phone || "",
      address: author.address || "",
      payment_method: (author.payment_method as PaymentMethod) || undefined,
      // Tax ID not pre-filled for security - user must re-enter to update
    },
  });

  // Reset form when author changes
  const handleEditStart = () => {
    form.reset({
      name: author.name,
      email: author.email || "",
      phone: author.phone || "",
      address: author.address || "",
      payment_method: (author.payment_method as PaymentMethod) || undefined,
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleUpdate = async (data: UpdateAuthorInput) => {
    setIsLoading(true);
    const result = await updateAuthor(author.id, data);
    setIsLoading(false);

    if (result.success) {
      onAuthorUpdated(result.data);
      setIsEditing(false);
    } else {
      form.setError("root", { message: result.error });
    }
  };

  const handleDeactivate = async () => {
    setIsLoading(true);
    const result = await deactivateAuthor(author.id);
    setIsLoading(false);

    if (result.success) {
      onAuthorDeactivated(result.data);
      setShowDeactivateDialog(false);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    const result = await reactivateAuthor(author.id);
    setIsLoading(false);

    if (result.success) {
      onAuthorReactivated(result.data);
    }
  };

  // Story 2.3: Grant portal access handler
  // AC: 4, 5 - Opens confirmation dialog with specific text
  // AC: 11 - Shows success toast with email
  // AC: 12 - Shows error toast on failure
  const handleGrantPortalAccess = async () => {
    setIsPortalActionLoading(true);
    const result = await grantPortalAccess(author.id);
    setIsPortalActionLoading(false);

    if (result.success) {
      // AC 11: Success toast with email
      toast.success(`Portal invitation sent to ${result.data.email}`);
      setShowGrantPortalDialog(false);
      onPortalAccessChanged?.();
    } else {
      // AC 12: Error toast
      toast.error(result.error);
    }
  };

  // Story 2.3: Revoke portal access handler
  // AC: 17, 18 - Revokes access and shows toast
  const handleRevokePortalAccess = async () => {
    setIsPortalActionLoading(true);
    const result = await revokePortalAccess(author.id);
    setIsPortalActionLoading(false);

    if (result.success) {
      // AC 18: Success toast with author name
      toast.success(`Portal access revoked for ${author.name}`);
      setShowRevokePortalDialog(false);
      onPortalAccessChanged?.();
    } else {
      toast.error(result.error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Author Info Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">
            {isEditing ? "Edit Author" : "Author Details"}
          </CardTitle>
          <div className="flex items-center gap-2">
            {!author.is_active && (
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-500 border-gray-200"
              >
                Inactive
              </Badge>
            )}
            {canManageAuthors && !isEditing && (
              <Button variant="outline" size="sm" onClick={handleEditStart}>
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {isEditing && (
              <Button variant="ghost" size="sm" onClick={handleEditCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleUpdate)}
                className="space-y-4"
              >
                {form.formState.errors.root && (
                  <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                    {form.formState.errors.root.message}
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Author name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder="author@example.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="(555) 123-4567" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="123 Main St, City, ST 12345"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canViewTaxId && (
                  <FormField
                    control={form.control}
                    name="tax_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="Enter new Tax ID (leave empty to keep current)"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="payment_method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="direct_deposit">
                            Direct Deposit
                          </SelectItem>
                          <SelectItem value="check">Check</SelectItem>
                          <SelectItem value="wire_transfer">
                            Wire Transfer
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleEditCancel}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <div className="space-y-4">
              <DetailRow label="Name" value={author.name} />
              <DetailRow label="Email" value={author.email} />
              <DetailRow label="Phone" value={author.phone} />
              <DetailRow label="Address" value={author.address} />
              <DetailRow
                label="Payment Method"
                value={
                  author.payment_method
                    ? PAYMENT_METHOD_LABELS[
                        author.payment_method as PaymentMethod
                      ]
                    : null
                }
              />

              {/* Tax ID - Only visible to authorized roles */}
              {canViewTaxId && author.tax_id && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground w-32">
                    Tax ID
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono">
                      {showTaxId ? "***-**-****" : maskedTaxId}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => setShowTaxId(!showTaxId)}
                      aria-label={showTaxId ? "Hide Tax ID" : "Show Tax ID"}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Story 2.3: Portal Access Section */}
      {/* AC 1: Grant Portal Access button visible in Author Detail panel */}
      {/* AC 19: Portal status badge: Active (green), Pending (yellow), or None (gray) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Key className="h-5 w-5" />
            Portal Access
          </CardTitle>
          {/* AC 19: Status badge */}
          {isPortalActive && (
            <Badge className="bg-green-50 text-green-700 border-green-200">
              Active
            </Badge>
          )}
          {isPendingActivation && (
            <Badge className="bg-yellow-50 text-yellow-700 border-yellow-200">
              Pending Activation
            </Badge>
          )}
          {!hasPortalUser && (
            <Badge
              variant="outline"
              className="bg-gray-50 text-gray-500 border-gray-200"
            >
              None
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Status description */}
            <p className="text-sm text-muted-foreground">
              {isPortalActive &&
                "Author has active portal access and can view their royalty statements."}
              {isPendingActivation &&
                "Invitation sent. Waiting for author to complete signup."}
              {!hasPortalUser && "Author does not have portal access."}
            </p>

            {/* AC 1, 2, 3: Grant Portal Access button */}
            {canManageUsers && !hasPortalUser && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        onClick={() => setShowGrantPortalDialog(true)}
                        disabled={!author.email}
                        className="w-full sm:w-auto"
                      >
                        <Key className="h-4 w-4 mr-2" />
                        Grant Portal Access
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {/* AC 3: Tooltip when email is missing */}
                  {!author.email && (
                    <TooltipContent>
                      <p>Email required to send portal invitation</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )}

            {/* AC 15: Revoke Portal Access button when author has active portal access */}
            {canManageUsers && hasPortalUser && (
              <Button
                variant="outline"
                onClick={() => setShowRevokePortalDialog(true)}
                className="w-full sm:w-auto"
              >
                Revoke Portal Access
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Titles Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Titles by this Author</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Placeholder - will be populated when titles table exists (Story 2.4+) */}
          <div className="text-sm text-muted-foreground text-center py-8">
            No titles yet. Titles will appear here once added.
          </div>
        </CardContent>
      </Card>

      {/* Contracts Section - Placeholder for Epic 4 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Contracts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-8">
            Contract management coming in Epic 4.
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canManageAuthors && (
        <div className="flex justify-end gap-2">
          {author.is_active ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeactivateDialog(true)}
            >
              Deactivate Author
            </Button>
          ) : (
            <Button onClick={handleReactivate} disabled={isLoading}>
              {isLoading ? "Reactivating..." : "Reactivate Author"}
            </Button>
          )}
        </div>
      )}

      {/* Deactivate Confirmation Dialog */}
      <Dialog
        open={showDeactivateDialog}
        onOpenChange={setShowDeactivateDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deactivate Author?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {author.name}? This author
              will be hidden from the default list but can be reactivated later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeactivateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeactivate}
              disabled={isLoading}
            >
              {isLoading ? "Deactivating..." : "Deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Story 2.3: Grant Portal Access Confirmation Dialog */}
      {/* AC 4, 5: Confirmation dialog with specific text */}
      <AlertDialog
        open={showGrantPortalDialog}
        onOpenChange={setShowGrantPortalDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Grant Portal Access</AlertDialogTitle>
            <AlertDialogDescription>
              Send portal invitation to {author.email}? The author will receive
              an email to create their account and access their royalty
              statements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPortalActionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleGrantPortalAccess}
              disabled={isPortalActionLoading}
            >
              {isPortalActionLoading ? "Sending..." : "Send Invitation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Story 2.3: Revoke Portal Access Confirmation Dialog */}
      {/* AC 16: Clicking Revoke Portal Access opens confirmation dialog */}
      <AlertDialog
        open={showRevokePortalDialog}
        onOpenChange={setShowRevokePortalDialog}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Portal Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke portal access for {author.name}?
              They will no longer be able to log in to view their royalty
              statements.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPortalActionLoading}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokePortalAccess}
              disabled={isPortalActionLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPortalActionLoading ? "Revoking..." : "Revoke Access"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-sm text-muted-foreground w-32 shrink-0">{label}</div>
      <div className={cn("text-sm", !value && "text-muted-foreground italic")}>
        {value || "Not provided"}
      </div>
    </div>
  );
}
