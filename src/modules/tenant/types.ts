import type { CreateTenantInput } from "./schema";
import type { RoyaltyPeriodType } from "@/db/schema/tenants";

export type { CreateTenantInput };
export type { RoyaltyPeriodType };

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
  // Royalty period settings (Story 7.5)
  royalty_period_type: RoyaltyPeriodType;
  royalty_period_start_month: number | null;
  royalty_period_start_day: number | null;
  created_at: Date;
  updated_at: Date;
}
