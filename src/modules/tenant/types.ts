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
