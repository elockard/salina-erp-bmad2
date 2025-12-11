import type { RoyaltyPeriodType } from "@/db/schema/tenants";
import type { CreateTenantInput } from "./schema";

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
  // Payer information (Story 11.3)
  payer_ein_last_four: string | null;
  payer_name: string | null;
  payer_address_line1: string | null;
  payer_address_line2: string | null;
  payer_city: string | null;
  payer_state: string | null;
  payer_zip: string | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Payer information for 1099 generation
 * Story 11.3 - AC-11.3.3
 */
export interface PayerInfo {
  payer_ein_last_four: string | null;
  payer_name: string | null;
  payer_address_line1: string | null;
  payer_address_line2: string | null;
  payer_city: string | null;
  payer_state: string | null;
  payer_zip: string | null;
  has_payer_info: boolean;
}
