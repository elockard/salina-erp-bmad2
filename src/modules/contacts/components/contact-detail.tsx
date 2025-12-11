"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import {
  ASSIGN_CUSTOMER_ROLE,
  MANAGE_CONTACTS,
  MANAGE_USERS,
  VIEW_TAX_ID,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import {
  assignContactRole,
  deactivateContact,
  reactivateContact,
  removeContactRole,
  updateContact,
  updateContactTaxInfoPartial,
} from "../actions";
import { type UpdateContactInput, updateContactSchema } from "../schema";
import type { ContactRole, ContactRoleType, ContactWithRoles } from "../types";
import { TaxInfoDisplay } from "./tax-info-display";
import { TaxInfoForm, type TaxInfoFormData } from "./tax-info-form";

/**
 * Role badge configuration per AC-7.2.2
 */
const ROLE_BADGES: Record<
  ContactRoleType,
  { icon: string; label: string; color: string }
> = {
  author: {
    icon: "🖊️",
    label: "Author",
    color: "bg-purple-100 text-purple-700 border-purple-200",
  },
  customer: {
    icon: "🛒",
    label: "Customer",
    color: "bg-blue-100 text-blue-700 border-blue-200",
  },
  vendor: {
    icon: "🏭",
    label: "Vendor",
    color: "bg-orange-100 text-orange-700 border-orange-200",
  },
  distributor: {
    icon: "📦",
    label: "Distributor",
    color: "bg-green-100 text-green-700 border-green-200",
  },
};

const ALL_ROLES: ContactRoleType[] = [
  "author",
  "customer",
  "vendor",
  "distributor",
];

interface ContactDetailProps {
  contact: ContactWithRoles;
  onContactUpdated: (contact: ContactWithRoles) => void;
  onContactDeactivated: (contact: ContactWithRoles) => void;
  onContactReactivated: (contact: ContactWithRoles) => void;
}

/**
 * Contact Detail component for the right panel
 *
 * AC-7.2.4: Contact Detail View (Right Panel)
 * - Shows when contact selected from list
 * - Tab sections: General Info | Roles | Payment Info
 * - Role badges with icons + expandable role-specific data
 * - Edit button opens inline editing mode
 * - Actions: Edit | Add/Remove Roles | Deactivate (Admin/Owner only)
 */
export function ContactDetail({
  contact,
  onContactUpdated,
  onContactDeactivated,
  onContactReactivated,
}: ContactDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);
  const [showAddRoleDialog, setShowAddRoleDialog] = useState(false);
  const [showTaxInfoDialog, setShowTaxInfoDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTaxInfoLoading, setIsTaxInfoLoading] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [taxInfoFormData, setTaxInfoFormData] = useState<TaxInfoFormData>(
    () => ({
      tin_type: "",
      tin: "",
      is_us_based: contact.is_us_based ?? true,
      w9_received: contact.w9_received ?? false,
      w9_received_date: contact.w9_received_date
        ? new Date(contact.w9_received_date).toISOString().split("T")[0]
        : null,
    }),
  );

  const canManageContacts = useHasPermission(MANAGE_CONTACTS);
  const canManageUsers = useHasPermission(MANAGE_USERS);
  const canViewTaxId = useHasPermission(VIEW_TAX_ID);
  const canAssignCustomerRole = useHasPermission(ASSIGN_CUSTOMER_ROLE);

  const displayName = `${contact.first_name} ${contact.last_name}`.trim();
  const existingRoles = contact.roles.map((r) => r.role);
  const availableRoles = ALL_ROLES.filter(
    (r) =>
      !existingRoles.includes(r) && (r !== "customer" || canAssignCustomerRole),
  );

  const form = useForm<UpdateContactInput>({
    resolver: zodResolver(updateContactSchema),
    defaultValues: {
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || "",
      phone: contact.phone || "",
      address_line1: contact.address_line1 || "",
      address_line2: contact.address_line2 || "",
      city: contact.city || "",
      state: contact.state || "",
      postal_code: contact.postal_code || "",
      country: contact.country || "",
      notes: contact.notes || "",
      tax_id: "",
    },
  });

  const handleEditStart = () => {
    form.reset({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email || "",
      phone: contact.phone || "",
      address_line1: contact.address_line1 || "",
      address_line2: contact.address_line2 || "",
      city: contact.city || "",
      state: contact.state || "",
      postal_code: contact.postal_code || "",
      country: contact.country || "",
      notes: contact.notes || "",
      tax_id: "",
    });
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    form.reset();
    setIsEditing(false);
  };

  const handleUpdate = async (data: UpdateContactInput) => {
    setIsLoading(true);
    const result = await updateContact(contact.id, data);
    setIsLoading(false);

    if (result.success) {
      onContactUpdated(result.data);
      setIsEditing(false);
      toast.success("Contact updated");
    } else {
      form.setError("root", { message: result.error });
    }
  };

  const handleDeactivate = async () => {
    setIsLoading(true);
    const result = await deactivateContact(contact.id);
    setIsLoading(false);

    if (result.success) {
      onContactDeactivated(result.data);
      setShowDeactivateDialog(false);
      toast.success("Contact deactivated");
    } else {
      toast.error(result.error);
    }
  };

  const handleReactivate = async () => {
    setIsLoading(true);
    const result = await reactivateContact(contact.id);
    setIsLoading(false);

    if (result.success) {
      onContactReactivated(result.data);
      toast.success("Contact reactivated");
    } else {
      toast.error(result.error);
    }
  };

  const handleAddRole = async (role: ContactRoleType) => {
    setIsLoading(true);
    const result = await assignContactRole(contact.id, { role });
    setIsLoading(false);

    if (result.success) {
      onContactUpdated(result.data);
      setShowAddRoleDialog(false);
      toast.success(`${ROLE_BADGES[role].label} role assigned`);
    } else {
      toast.error(result.error);
    }
  };

  const handleRemoveRole = async (role: ContactRoleType) => {
    setIsLoading(true);
    const result = await removeContactRole(contact.id, role);
    setIsLoading(false);

    if (result.success) {
      onContactUpdated(result.data);
      toast.success(`${ROLE_BADGES[role].label} role removed`);
    } else {
      toast.error(result.error);
    }
  };

  const handleOpenTaxInfoDialog = () => {
    // Reset form data to current contact values when opening
    setTaxInfoFormData({
      tin_type: "",
      tin: "",
      is_us_based: contact.is_us_based ?? true,
      w9_received: contact.w9_received ?? false,
      w9_received_date: contact.w9_received_date
        ? new Date(contact.w9_received_date).toISOString().split("T")[0]
        : null,
    });
    setShowTaxInfoDialog(true);
  };

  const handleSaveTaxInfo = async () => {
    setIsTaxInfoLoading(true);

    const result = await updateContactTaxInfoPartial(contact.id, {
      tin_type: taxInfoFormData.tin_type || undefined,
      tin: taxInfoFormData.tin || undefined,
      is_us_based: taxInfoFormData.is_us_based,
      w9_received: taxInfoFormData.w9_received,
      w9_received_date: taxInfoFormData.w9_received_date
        ? new Date(taxInfoFormData.w9_received_date)
        : null,
    });

    setIsTaxInfoLoading(false);

    if (result.success) {
      onContactUpdated(result.data);
      setShowTaxInfoDialog(false);
      toast.success("Tax information updated successfully");
    } else {
      toast.error(result.error || "Failed to update tax information");
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-semibold">
            {isEditing ? "Edit Contact" : displayName}
          </CardTitle>
          <div className="flex items-center gap-2">
            {contact.status === "inactive" && (
              <Badge
                variant="outline"
                className="bg-gray-50 text-gray-500 border-gray-200"
              >
                Inactive
              </Badge>
            )}
            {canManageContacts && !isEditing && (
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
          {/* Role badges */}
          {!isEditing && contact.roles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {contact.roles.map((role) => {
                const badgeConfig = ROLE_BADGES[role.role as ContactRoleType];
                if (!badgeConfig) return null;
                return (
                  <Badge
                    key={role.id}
                    variant="outline"
                    className={cn("text-sm", badgeConfig.color)}
                  >
                    {badgeConfig.icon} {badgeConfig.label}
                  </Badge>
                );
              })}
            </div>
          )}

          {isEditing ? (
            <EditForm
              form={form}
              onSubmit={handleUpdate}
              onCancel={handleEditCancel}
              isLoading={isLoading}
              canViewTaxId={canViewTaxId}
              addressOpen={addressOpen}
              setAddressOpen={setAddressOpen}
            />
          ) : (
            <>
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="general">General</TabsTrigger>
                  <TabsTrigger value="roles">Roles</TabsTrigger>
                  <TabsTrigger value="payment">Payment</TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-4 pt-4">
                  <DetailRow label="Email" value={contact.email} />
                  <DetailRow label="Phone" value={contact.phone} />

                  {/* Tax Information (Story 11.1) */}
                  <div className="border rounded-lg p-4 bg-slate-50/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <TaxInfoDisplay
                          tinType={(contact.tin_type as "ssn" | "ein") ?? null}
                          tinLastFour={contact.tin_last_four ?? null}
                          isUSBased={contact.is_us_based ?? true}
                          w9Received={contact.w9_received ?? false}
                          w9ReceivedDate={contact.w9_received_date ?? null}
                          canViewTIN={canViewTaxId}
                        />
                      </div>
                      {canViewTaxId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleOpenTaxInfoDialog}
                          className="ml-4 shrink-0"
                        >
                          <Pencil className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Address */}
                  <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        type="button"
                        className="flex items-center gap-2 p-0 h-auto font-medium text-muted-foreground"
                      >
                        {addressOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Address
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 pt-2 pl-6">
                      <DetailRow label="Line 1" value={contact.address_line1} />
                      <DetailRow label="Line 2" value={contact.address_line2} />
                      <DetailRow label="City" value={contact.city} />
                      <DetailRow label="State" value={contact.state} />
                      <DetailRow
                        label="Postal Code"
                        value={contact.postal_code}
                      />
                      <DetailRow label="Country" value={contact.country} />
                    </CollapsibleContent>
                  </Collapsible>

                  <DetailRow label="Notes" value={contact.notes} />
                </TabsContent>

                {/* Roles Tab */}
                <TabsContent value="roles" className="space-y-4 pt-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Assigned Roles</h3>
                    {canManageContacts && availableRoles.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddRoleDialog(true)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Role
                      </Button>
                    )}
                  </div>

                  {contact.roles.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No roles assigned
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {contact.roles.map((role) => (
                        <RoleCard
                          key={role.id}
                          role={role}
                          canRemove={canManageContacts}
                          onRemove={() =>
                            handleRemoveRole(role.role as ContactRoleType)
                          }
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Payment Tab */}
                <TabsContent value="payment" className="space-y-4 pt-4">
                  {contact.payment_info ? (
                    <PaymentInfoDisplay
                      paymentInfo={
                        contact.payment_info as Record<string, unknown>
                      }
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No payment information
                    </p>
                  )}
                </TabsContent>
              </Tabs>

              {/* Activity History Section (AC-7.2.4 Placeholder) */}
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-sm font-medium mb-3">Activity History</h3>
                <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                  <p className="italic">Activity tracking coming soon</p>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>• Recent transactions</li>
                    <li>• Statements</li>
                    <li>• Invoices</li>
                  </ul>
                </div>
              </div>

              {/* Related Entities Section (AC-7.2.4) */}
              <div className="mt-4">
                <h3 className="text-sm font-medium mb-3">Related Entities</h3>
                <div className="space-y-2">
                  {contact.roles.some((r) => r.role === "author") && (
                    <div className="bg-purple-50 rounded-lg p-3 text-sm">
                      <div className="font-medium text-purple-700 flex items-center gap-2">
                        🖊️ Titles by this Author
                      </div>
                      <p className="text-xs text-purple-600 mt-1">
                        View titles filtered by this contact in the Titles
                        module
                      </p>
                    </div>
                  )}
                  {contact.roles.some((r) => r.role === "customer") && (
                    <div className="bg-blue-50 rounded-lg p-3 text-sm">
                      <div className="font-medium text-blue-700 flex items-center gap-2">
                        🛒 Invoices
                      </div>
                      <p className="text-xs text-blue-600 mt-1">
                        Invoice management coming in Epic 8
                      </p>
                    </div>
                  )}
                  {contact.roles.length === 0 && (
                    <p className="text-sm text-muted-foreground italic">
                      No related entities - assign a role to see related items
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {canManageUsers && !isEditing && (
        <div className="flex justify-end gap-2">
          {contact.status === "active" ? (
            <Button
              variant="destructive"
              onClick={() => setShowDeactivateDialog(true)}
            >
              Deactivate Contact
            </Button>
          ) : (
            <Button onClick={handleReactivate} disabled={isLoading}>
              {isLoading ? "Reactivating..." : "Reactivate Contact"}
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
            <DialogTitle>Deactivate Contact?</DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate {displayName}? This contact
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

      {/* Add Role Dialog */}
      <Dialog open={showAddRoleDialog} onOpenChange={setShowAddRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Role</DialogTitle>
            <DialogDescription>
              Select a role to assign to {displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-4">
            {availableRoles.map((role) => {
              const badgeConfig = ROLE_BADGES[role];
              return (
                <Button
                  key={role}
                  variant="outline"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => handleAddRole(role)}
                  disabled={isLoading}
                >
                  <span className="text-2xl">{badgeConfig.icon}</span>
                  <span>{badgeConfig.label}</span>
                </Button>
              );
            })}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddRoleDialog(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tax Info Edit Dialog */}
      <Dialog open={showTaxInfoDialog} onOpenChange={setShowTaxInfoDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Tax Information</DialogTitle>
            <DialogDescription>
              Update tax identification and W-9 information for {displayName}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TaxInfoForm
              value={taxInfoFormData}
              onChange={setTaxInfoFormData}
              canViewTIN={canViewTaxId}
              disabled={isTaxInfoLoading}
              existingTINLastFour={contact.tin_last_four}
              hasExistingTIN={!!contact.tin_last_four}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowTaxInfoDialog(false)}
              disabled={isTaxInfoLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTaxInfo} disabled={isTaxInfoLoading}>
              {isTaxInfoLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

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

function RoleCard({
  role,
  canRemove,
  onRemove,
  isLoading,
}: {
  role: ContactRole;
  canRemove: boolean;
  onRemove: () => void;
  isLoading: boolean;
}) {
  const badgeConfig = ROLE_BADGES[role.role as ContactRoleType];
  const [expanded, setExpanded] = useState(false);
  const roleData = role.role_specific_data as Record<string, unknown> | null;

  if (!badgeConfig) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 py-2 px-4">
        <div className="flex items-center gap-2">
          <span className="text-xl">{badgeConfig.icon}</span>
          <span className="font-medium">{badgeConfig.label}</span>
        </div>
        <div className="flex items-center gap-2">
          {roleData && Object.keys(roleData).length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRemove}
              disabled={isLoading}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      </CardHeader>
      {expanded && roleData && (
        <CardContent className="pt-0 pb-3 px-4">
          <div className="text-sm space-y-1 pl-8">
            {Object.entries(roleData).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-muted-foreground capitalize">
                  {key.replace(/_/g, " ")}:
                </span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function PaymentInfoDisplay({
  paymentInfo,
}: {
  paymentInfo: Record<string, unknown>;
}) {
  const method = paymentInfo.method as string;

  const methodLabels: Record<string, string> = {
    direct_deposit: "Direct Deposit",
    check: "Check",
    wire_transfer: "Wire Transfer",
  };

  return (
    <div className="space-y-2">
      <DetailRow label="Method" value={methodLabels[method] || method} />
      {method === "direct_deposit" && (
        <>
          <DetailRow label="Bank" value={paymentInfo.bank_name as string} />
          <DetailRow
            label="Account Type"
            value={paymentInfo.account_type as string}
          />
          <DetailRow
            label="Last 4"
            value={paymentInfo.account_number_last4 as string}
          />
        </>
      )}
      {method === "check" && (
        <DetailRow label="Payee" value={paymentInfo.payee_name as string} />
      )}
      {method === "wire_transfer" && (
        <>
          <DetailRow label="Bank" value={paymentInfo.bank_name as string} />
          <DetailRow label="SWIFT" value={paymentInfo.swift_code as string} />
          <DetailRow label="IBAN" value={paymentInfo.iban as string} />
        </>
      )}
    </div>
  );
}

interface EditFormProps {
  form: ReturnType<typeof useForm<UpdateContactInput>>;
  onSubmit: (data: UpdateContactInput) => void;
  onCancel: () => void;
  isLoading: boolean;
  canViewTaxId: boolean;
  addressOpen: boolean;
  setAddressOpen: (open: boolean) => void;
}

function EditForm({
  form,
  onSubmit,
  onCancel,
  isLoading,
  canViewTaxId,
  addressOpen,
  setAddressOpen,
}: EditFormProps) {
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {form.formState.errors.root && (
          <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
            {form.formState.errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="First name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Last name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  placeholder="contact@example.com"
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

        {/* Address Section */}
        <Collapsible open={addressOpen} onOpenChange={setAddressOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              type="button"
              className="flex items-center gap-2 p-0 h-auto font-medium"
            >
              {addressOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              Address
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-4">
            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123 Main St" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address_line2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 2</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Apt, suite, etc." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="City" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="State" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="postal_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Postal Code</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="12345" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="USA" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Notes" rows={3} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
