"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useHasPermission } from "@/lib/hooks/useHasPermission";
import { VIEW_TAX_ID, ASSIGN_CUSTOMER_ROLE } from "@/lib/permissions";
import { createContact } from "../actions";
import { createContactFormSchema, type CreateContactFormInput, type CreateContactInput } from "../schema";
import type { ContactWithRoles, ContactRoleType } from "../types";

/**
 * Role configuration for the form
 */
const ROLE_OPTIONS: Array<{
  value: ContactRoleType;
  icon: string;
  label: string;
  requiresPermission?: string[];
}> = [
  { value: "author", icon: "🖊️", label: "Author" },
  { value: "customer", icon: "🛒", label: "Customer", requiresPermission: ["owner", "admin", "finance"] },
  { value: "vendor", icon: "🏭", label: "Vendor" },
  { value: "distributor", icon: "📦", label: "Distributor" },
];

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (contact: ContactWithRoles) => void;
}

/**
 * Contact Form modal for creating new contacts
 *
 * AC-7.2.3: Create Contact Form (Dialog)
 * - "Create Contact" button opens modal
 * - Basic info fields: First name (required), Last name (required), Email, Phone
 * - Address fields (collapsible section)
 * - Tax ID (masked input) - only visible to users with VIEW_TAX_ID permission
 * - Role assignment (checkbox list with role icons)
 * - Payment info section (collapsible)
 * - Form validation with Zod schema (inline error messages)
 * - Save button creates contact + assigns selected roles
 * - Success: toast notification, contact appears in list, detail loads
 * - Cancel resets form and closes dialog
 */
// Role-specific data state type
interface RoleSpecificState {
  author: { pen_name: string; bio: string; website: string };
  customer: { credit_limit: string; payment_terms: string };
  vendor: { vendor_code: string; lead_time: string; min_order: string };
  distributor: { territory: string; commission: string; terms: string };
}

const initialRoleData: RoleSpecificState = {
  author: { pen_name: "", bio: "", website: "" },
  customer: { credit_limit: "", payment_terms: "" },
  vendor: { vendor_code: "", lead_time: "", min_order: "" },
  distributor: { territory: "", commission: "", terms: "" },
};

export function ContactForm({ open, onOpenChange, onSuccess }: ContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [addressOpen, setAddressOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<ContactRoleType[]>([]);
  const [roleData, setRoleData] = useState<RoleSpecificState>(initialRoleData);

  const canViewTaxId = useHasPermission(VIEW_TAX_ID);
  const canAssignCustomerRole = useHasPermission(ASSIGN_CUSTOMER_ROLE);

  const form = useForm<CreateContactFormInput>({
    resolver: zodResolver(createContactFormSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
      tax_id: "",
      notes: "",
      payment_info: null,
      status: "active",
    },
  });

  const paymentMethod = form.watch("payment_info.method");

  const handleRoleToggle = (role: ContactRoleType) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSubmit = async (data: CreateContactFormInput) => {
    setIsLoading(true);

    // Prepare role assignments with role-specific data
    const roles = selectedRoles.map((role) => {
      let role_specific_data: Record<string, unknown> | undefined;

      if (role === "author" && (roleData.author.pen_name || roleData.author.bio || roleData.author.website)) {
        role_specific_data = {
          pen_name: roleData.author.pen_name || undefined,
          bio: roleData.author.bio || undefined,
          website: roleData.author.website || undefined,
        };
      } else if (role === "customer" && (roleData.customer.credit_limit || roleData.customer.payment_terms)) {
        role_specific_data = {
          credit_limit: roleData.customer.credit_limit ? Number(roleData.customer.credit_limit) : undefined,
          payment_terms: roleData.customer.payment_terms || undefined,
        };
      } else if (role === "vendor" && (roleData.vendor.vendor_code || roleData.vendor.lead_time || roleData.vendor.min_order)) {
        role_specific_data = {
          vendor_code: roleData.vendor.vendor_code || undefined,
          lead_time_days: roleData.vendor.lead_time ? Number(roleData.vendor.lead_time) : undefined,
          min_order_amount: roleData.vendor.min_order ? Number(roleData.vendor.min_order) : undefined,
        };
      } else if (role === "distributor" && (roleData.distributor.territory || roleData.distributor.commission || roleData.distributor.terms)) {
        role_specific_data = {
          territory: roleData.distributor.territory || undefined,
          commission_rate: roleData.distributor.commission ? Number(roleData.distributor.commission) / 100 : undefined,
          contract_terms: roleData.distributor.terms || undefined,
        };
      }

      return {
        role: role as "author" | "customer" | "vendor" | "distributor",
        role_specific_data,
      };
    });

    const result = await createContact(data as CreateContactInput, roles);
    setIsLoading(false);

    if (result.success) {
      form.reset();
      setSelectedRoles([]);
      setRoleData(initialRoleData);
      setAddressOpen(false);
      setPaymentOpen(false);
      onSuccess(result.data);
    } else {
      form.setError("root", { message: result.error });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
      setSelectedRoles([]);
      setRoleData(initialRoleData);
      setAddressOpen(false);
      setPaymentOpen(false);
    }
    onOpenChange(newOpen);
  };

  // Helper to update role-specific data
  const updateRoleData = <T extends keyof RoleSpecificState>(
    role: T,
    field: keyof RoleSpecificState[T],
    value: string
  ) => {
    setRoleData((prev) => ({
      ...prev,
      [role]: { ...prev[role], [field]: value },
    }));
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Contact</DialogTitle>
          <DialogDescription>
            Add a new contact to your database. First and last name are required.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-4"
          >
            {form.formState.errors.root && (
              <div className="text-sm text-red-500 bg-red-50 p-3 rounded">
                {form.formState.errors.root.message}
              </div>
            )}

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="First name" autoFocus />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
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
                      <Input {...field} value={field.value ?? ""} placeholder="(555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Role Assignment */}
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLE_OPTIONS.map((role) => {
                  // Check if user can assign this role
                  const canAssign =
                    role.value !== "customer" || canAssignCustomerRole;

                  if (!canAssign) return null;

                  return (
                    <div
                      key={role.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`role-${role.value}`}
                        checked={selectedRoles.includes(role.value)}
                        onCheckedChange={() => handleRoleToggle(role.value)}
                      />
                      <label
                        htmlFor={`role-${role.value}`}
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        {role.icon} {role.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Role-Specific Fields (AC-7.2.3) */}
            {selectedRoles.includes("author") && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="flex items-center gap-2 p-0 h-auto font-medium text-purple-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                    🖊️ Author Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4 pl-4 border-l-2 border-purple-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pen Name</label>
                    <Input
                      value={roleData.author.pen_name}
                      onChange={(e) => updateRoleData("author", "pen_name", e.target.value)}
                      placeholder="Pen name (if different)"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Bio</label>
                    <Textarea
                      value={roleData.author.bio}
                      onChange={(e) => updateRoleData("author", "bio", e.target.value)}
                      placeholder="Author biography"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Website</label>
                    <Input
                      type="url"
                      value={roleData.author.website}
                      onChange={(e) => updateRoleData("author", "website", e.target.value)}
                      placeholder="https://author-website.com"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {selectedRoles.includes("customer") && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="flex items-center gap-2 p-0 h-auto font-medium text-blue-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                    🛒 Customer Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4 pl-4 border-l-2 border-blue-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Credit Limit</label>
                    <Input
                      type="number"
                      value={roleData.customer.credit_limit}
                      onChange={(e) => updateRoleData("customer", "credit_limit", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Payment Terms</label>
                    <Input
                      value={roleData.customer.payment_terms}
                      onChange={(e) => updateRoleData("customer", "payment_terms", e.target.value)}
                      placeholder="Net 30, Net 60, etc."
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {selectedRoles.includes("vendor") && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="flex items-center gap-2 p-0 h-auto font-medium text-orange-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                    🏭 Vendor Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4 pl-4 border-l-2 border-orange-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Vendor Code</label>
                    <Input
                      value={roleData.vendor.vendor_code}
                      onChange={(e) => updateRoleData("vendor", "vendor_code", e.target.value)}
                      placeholder="VND-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Lead Time (Days)</label>
                    <Input
                      type="number"
                      value={roleData.vendor.lead_time}
                      onChange={(e) => updateRoleData("vendor", "lead_time", e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Min Order Amount</label>
                    <Input
                      type="number"
                      value={roleData.vendor.min_order}
                      onChange={(e) => updateRoleData("vendor", "min_order", e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {selectedRoles.includes("distributor") && (
              <Collapsible defaultOpen>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    type="button"
                    className="flex items-center gap-2 p-0 h-auto font-medium text-green-700"
                  >
                    <ChevronDown className="h-4 w-4" />
                    📦 Distributor Details
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4 pl-4 border-l-2 border-green-200">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Territory</label>
                    <Input
                      value={roleData.distributor.territory}
                      onChange={(e) => updateRoleData("distributor", "territory", e.target.value)}
                      placeholder="Region or territory"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Commission Rate (%)</label>
                    <Input
                      type="number"
                      value={roleData.distributor.commission}
                      onChange={(e) => updateRoleData("distributor", "commission", e.target.value)}
                      placeholder="0"
                      min="0"
                      max="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Contract Terms</label>
                    <Textarea
                      value={roleData.distributor.terms}
                      onChange={(e) => updateRoleData("distributor", "terms", e.target.value)}
                      placeholder="Distribution agreement terms"
                      rows={2}
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Address Section (Collapsible) */}
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
                        <Input {...field} value={field.value ?? ""} placeholder="123 Main St" />
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
                        <Input {...field} value={field.value ?? ""} placeholder="Apt, suite, etc." />
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
                          <Input {...field} value={field.value ?? ""} placeholder="City" />
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
                          <Input {...field} value={field.value ?? ""} placeholder="State" />
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
                          <Input {...field} value={field.value ?? ""} placeholder="12345" />
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
                          <Input {...field} value={field.value ?? ""} placeholder="USA" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Tax ID (only visible to authorized users) */}
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
                        value={field.value ?? ""}
                        placeholder="Tax ID (will be stored securely)"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Payment Info Section (Collapsible) */}
            <Collapsible open={paymentOpen} onOpenChange={setPaymentOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  variant="ghost"
                  type="button"
                  className="flex items-center gap-2 p-0 h-auto font-medium"
                >
                  {paymentOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Payment Information
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="payment_info.method"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ""}
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

                {/* Direct Deposit Fields */}
                {paymentMethod === "direct_deposit" && (
                  <>
                    <FormField
                      control={form.control}
                      name="payment_info.bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="Bank name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="payment_info.account_type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Account Type</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value || ""}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="checking">Checking</SelectItem>
                                <SelectItem value="savings">Savings</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="payment_info.routing_number"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Routing Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value ?? ""}
                                placeholder="9 digits"
                                maxLength={9}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="payment_info.account_number_last4"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number (Last 4)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              value={field.value ?? ""}
                              placeholder="Last 4 digits"
                              maxLength={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Check Fields */}
                {paymentMethod === "check" && (
                  <FormField
                    control={form.control}
                    name="payment_info.payee_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payee Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Name on check" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Wire Transfer Fields */}
                {paymentMethod === "wire_transfer" && (
                  <>
                    <FormField
                      control={form.control}
                      name="payment_info.bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value ?? ""} placeholder="Bank name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="payment_info.swift_code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SWIFT Code</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} placeholder="SWIFT/BIC" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="payment_info.iban"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>IBAN (Optional)</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value ?? ""} placeholder="IBAN" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Additional notes about this contact"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Contact"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
