/**
 * Contact Module Zod Schemas
 *
 * Validation schemas for the unified contact system with multi-role support.
 * Provides runtime validation for contact creation, updates, and role management.
 *
 * Story: 7.1 - Create Unified Contact Database Schema
 * Related FRs: FR82-FR87 (Contact Management)
 */

import { z } from "zod";

// =============================================================================
// Enum Schemas
// =============================================================================

/** Contact status enum for Zod validation */
export const contactStatusEnum = z.enum(["active", "inactive"]);

/** Contact role type enum for Zod validation */
export const contactRoleEnum = z.enum([
  "author",
  "customer",
  "vendor",
  "distributor",
]);

/** Payment method enum for Zod validation */
export const paymentMethodEnum = z.enum([
  "direct_deposit",
  "check",
  "wire_transfer",
]);

/** Account type enum for direct deposit */
export const accountTypeEnum = z.enum(["checking", "savings"]);

// =============================================================================
// Address Schema
// =============================================================================

/** Address schema for nested address fields */
export const addressSchema = z.object({
  line1: z.string().max(255).optional(),
  line2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  postal_code: z.string().max(20).optional(),
  country: z.string().max(100).optional(),
});

// =============================================================================
// Payment Info Schemas (Discriminated Union)
// =============================================================================

/** Direct deposit payment info schema */
export const directDepositPaymentSchema = z.object({
  method: z.literal("direct_deposit"),
  bank_name: z.string().min(1, "Bank name is required").max(255),
  account_type: accountTypeEnum,
  routing_number: z
    .string()
    .min(9, "Routing number must be 9 digits")
    .max(9, "Routing number must be 9 digits")
    .regex(/^\d{9}$/, "Routing number must be 9 digits"),
  account_number_last4: z
    .string()
    .min(4, "Account number last 4 digits required")
    .max(4, "Account number last 4 digits only")
    .regex(/^\d{4}$/, "Must be 4 digits"),
});

/** Check payment info schema */
export const checkPaymentSchema = z.object({
  method: z.literal("check"),
  payee_name: z.string().max(255).optional(),
});

/** Wire transfer payment info schema */
export const wireTransferPaymentSchema = z.object({
  method: z.literal("wire_transfer"),
  bank_name: z.string().min(1, "Bank name is required").max(255),
  swift_code: z
    .string()
    .min(8, "SWIFT code must be 8-11 characters")
    .max(11, "SWIFT code must be 8-11 characters")
    .regex(/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/, "Invalid SWIFT code format"),
  iban: z.string().max(34).optional(),
});

/** Payment info discriminated union schema */
export const paymentInfoSchema = z.discriminatedUnion("method", [
  directDepositPaymentSchema,
  checkPaymentSchema,
  wireTransferPaymentSchema,
]);

// =============================================================================
// Role-Specific Data Schemas
// =============================================================================

/** Social links schema for authors */
export const socialLinksSchema = z.object({
  twitter: z.string().url().optional().or(z.literal("")),
  instagram: z.string().url().optional().or(z.literal("")),
  linkedin: z.string().url().optional().or(z.literal("")),
});

/** Author role-specific data schema */
export const authorRoleDataSchema = z.object({
  pen_name: z.string().max(255).optional(),
  bio: z.string().max(5000).optional(),
  website: z.string().url().optional().or(z.literal("")),
  social_links: socialLinksSchema.optional(),
});

/** Customer role-specific data schema */
export const customerRoleDataSchema = z.object({
  billing_address: addressSchema.optional(),
  shipping_address: addressSchema.optional(),
  credit_limit: z.number().min(0).optional(),
  payment_terms: z.string().max(100).optional(),
});

/** Vendor role-specific data schema */
export const vendorRoleDataSchema = z.object({
  vendor_code: z.string().max(50).optional(),
  lead_time_days: z.number().int().min(0).optional(),
  min_order_amount: z.number().min(0).optional(),
});

/** Distributor role-specific data schema */
export const distributorRoleDataSchema = z.object({
  territory: z.string().max(255).optional(),
  commission_rate: z.number().min(0).max(1).optional(), // 0-100% as decimal
  contract_terms: z.string().max(5000).optional(),
});

// =============================================================================
// Contact Schemas
// =============================================================================

/**
 * Zod schema for creating a contact
 * - first_name and last_name are required
 * - email is optional but must be valid email format if provided
 * - other fields are optional
 */
export const createContactSchema = z.object({
  first_name: z
    .string()
    .min(1, "First name is required")
    .max(255, "First name is too long"),
  last_name: z
    .string()
    .min(1, "Last name is required")
    .max(255, "Last name is too long"),
  email: z
    .string()
    .email("Invalid email format")
    .max(255)
    .optional()
    .or(z.literal("")),
  phone: z.string().max(50, "Phone number is too long").optional().or(z.literal("")),
  address_line1: z.string().max(255).optional().or(z.literal("")),
  address_line2: z.string().max(255).optional().or(z.literal("")),
  city: z.string().max(100).optional().or(z.literal("")),
  state: z.string().max(100).optional().or(z.literal("")),
  postal_code: z.string().max(20).optional().or(z.literal("")),
  country: z.string().max(100).optional().or(z.literal("")),
  tax_id: z.string().max(50, "Tax ID is too long").optional().or(z.literal("")),
  payment_info: paymentInfoSchema.optional().nullable(),
  notes: z.string().max(5000).optional().or(z.literal("")),
  status: contactStatusEnum.optional(),
});

/**
 * Zod schema for create contact form (input)
 * Same as createContactSchema but with default values pre-applied
 */
export const createContactFormSchema = createContactSchema.extend({
  status: contactStatusEnum.default("active"),
});

/**
 * Zod schema for updating a contact
 * All fields are optional for partial updates
 */
export const updateContactSchema = createContactSchema.partial();

// =============================================================================
// Contact Role Schemas
// =============================================================================

/**
 * Zod schema for assigning a role to a contact
 * Validates role type and role-specific data based on role
 */
export const assignContactRoleSchema = z.discriminatedUnion("role", [
  z.object({
    role: z.literal("author"),
    role_specific_data: authorRoleDataSchema.optional(),
  }),
  z.object({
    role: z.literal("customer"),
    role_specific_data: customerRoleDataSchema.optional(),
  }),
  z.object({
    role: z.literal("vendor"),
    role_specific_data: vendorRoleDataSchema.optional(),
  }),
  z.object({
    role: z.literal("distributor"),
    role_specific_data: distributorRoleDataSchema.optional(),
  }),
]);

/**
 * Generic contact role schema for simpler validation
 */
export const contactRoleSchema = z.object({
  contact_id: z.string().uuid("Invalid contact ID"),
  role: contactRoleEnum,
  role_specific_data: z
    .union([
      authorRoleDataSchema,
      customerRoleDataSchema,
      vendorRoleDataSchema,
      distributorRoleDataSchema,
    ])
    .optional()
    .nullable(),
});

// =============================================================================
// Inferred Types
// =============================================================================

/** Input type inferred from createContactSchema */
export type CreateContactInput = z.infer<typeof createContactSchema>;

/** Form input type for create contact form (with status default) */
export type CreateContactFormInput = z.input<typeof createContactFormSchema>;

/** Input type inferred from updateContactSchema */
export type UpdateContactInput = z.infer<typeof updateContactSchema>;

/** Input type inferred from assignContactRoleSchema */
export type AssignContactRoleInput = z.infer<typeof assignContactRoleSchema>;

/** Input type inferred from contactRoleSchema */
export type ContactRoleInput = z.infer<typeof contactRoleSchema>;

/** Input type inferred from paymentInfoSchema */
export type PaymentInfoInput = z.infer<typeof paymentInfoSchema>;

/** Input type inferred from addressSchema */
export type AddressInput = z.infer<typeof addressSchema>;
