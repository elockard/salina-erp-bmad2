import type { CreateTenantInput } from "./schema";

export type { CreateTenantInput };

export interface RegistrationResult {
  tenantId: string;
  userId: string;
  subdomain: string;
}

export interface SubdomainAvailabilityResult {
  available: boolean;
  message?: string;
}

/**
 * Tenant settings returned from database
 * Used by getTenantSettings and updateTenantSettings
 */
export interface TenantSettings {
  id: string;
  name: string;
  subdomain: string;
  timezone: string;
  fiscal_year_start: string | null;
  default_currency: string;
  statement_frequency: string;
  created_at: Date;
  updated_at: Date;
}
