import { z } from "zod";

// Subdomain validation: 3-30 chars, lowercase a-z 0-9 hyphens, no leading/trailing hyphens
const subdomainRegex = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

export const createTenantSchema = z.object({
  companyName: z
    .string()
    .min(2, "Company name must be at least 2 characters")
    .max(100, "Company name must not exceed 100 characters"),
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(30, "Subdomain must not exceed 30 characters")
    .regex(
      subdomainRegex,
      "Subdomain must be lowercase letters, numbers, and hyphens only (no leading/trailing hyphens)",
    ),
  ownerEmail: z.string().email("Invalid email address"),
  ownerName: z
    .string()
    .min(1, "Owner name is required")
    .max(100, "Owner name must not exceed 100 characters"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters (Clerk requirement)"),
});

export const checkSubdomainAvailabilitySchema = z.object({
  subdomain: z
    .string()
    .min(3, "Subdomain must be at least 3 characters")
    .max(30, "Subdomain must not exceed 30 characters")
    .regex(
      subdomainRegex,
      "Subdomain must be lowercase letters, numbers, and hyphens only",
    ),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type CheckSubdomainAvailabilityInput = z.infer<
  typeof checkSubdomainAvailabilitySchema
>;

// ============================================
// Tenant Settings Schemas (Story 1.7)
// ============================================

/**
 * Helper to validate IANA timezone identifiers
 * Uses Intl API to check if timezone is valid
 */
const isValidTimezone = (tz: string): boolean => {
  try {
    // Check against Intl supported timezones
    const validTimezones = Intl.supportedValuesOf("timeZone");
    return validTimezones.includes(tz);
  } catch {
    // Fallback for environments without supportedValuesOf
    return true;
  }
};

/**
 * Form schema for tenant settings (client-side validation)
 * Uses string for fiscal_year_start to work with HTML date inputs
 */
export const updateTenantSettingsFormSchema = z.object({
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(
      isValidTimezone,
      "Invalid timezone. Please select a valid timezone.",
    ),
  fiscal_year_start: z.string().nullable().optional(),
  default_currency: z.enum(["USD", "EUR", "GBP", "CAD"], {
    error: "Please select a valid currency",
  }),
  statement_frequency: z.enum(["quarterly", "annual"], {
    error: "Please select Quarterly or Annual",
  }),
});

/**
 * Server-side schema that transforms string date to Date object
 */
export const updateTenantSettingsSchema = z.object({
  timezone: z
    .string()
    .min(1, "Timezone is required")
    .refine(isValidTimezone, "Invalid timezone"),
  fiscal_year_start: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val ? new Date(val) : null)),
  default_currency: z.enum(["USD", "EUR", "GBP", "CAD"]),
  statement_frequency: z.enum(["quarterly", "annual"]),
});

/** Form input type (string dates for HTML inputs) */
export type UpdateTenantSettingsFormInput = z.infer<
  typeof updateTenantSettingsFormSchema
>;

/** Server action input type (transformed dates) */
export type UpdateTenantSettingsInput = z.infer<
  typeof updateTenantSettingsSchema
>;
