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
