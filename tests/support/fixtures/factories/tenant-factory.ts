/**
 * Tenant Factory
 *
 * Creates isolated test tenants with subdomain-based multi-tenancy
 * Auto-cleanup ensures no cross-tenant data pollution
 */

import { faker } from "@faker-js/faker";

export interface Tenant {
  id: string;
  subdomain: string;
  name: string;
  timezone: string;
  default_currency: string;
  statement_frequency: "monthly" | "quarterly" | "annual";
  // Royalty period settings (Story 7.5)
  royalty_period_type: "calendar_year" | "fiscal_year" | "custom";
  royalty_period_start_month: number | null;
  royalty_period_start_day: number | null;
}

export class TenantFactory {
  private createdTenants: string[] = [];

  /**
   * Create test tenant with unique subdomain
   *
   * @param overrides - Override default tenant properties
   * @returns Created tenant object
   */
  async createTenant(overrides: Partial<Tenant> = {}): Promise<Tenant> {
    const subdomain =
      overrides.subdomain ||
      `test${faker.string.alphanumeric(8).toLowerCase()}`;

    const tenant: Omit<Tenant, "id"> = {
      subdomain,
      name: overrides.name || `${faker.company.name()} Publishing`,
      timezone: overrides.timezone || "America/New_York",
      default_currency: overrides.default_currency || "USD",
      statement_frequency: overrides.statement_frequency || "quarterly",
      // Royalty period settings (Story 7.5)
      royalty_period_type: overrides.royalty_period_type || "fiscal_year",
      royalty_period_start_month: overrides.royalty_period_start_month ?? null,
      royalty_period_start_day: overrides.royalty_period_start_day ?? null,
    };

    // API call to create tenant
    const response = await fetch(`${process.env.API_URL}/tenants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tenant),
    });

    if (!response.ok) {
      throw new Error(`Failed to create tenant: ${response.statusText}`);
    }

    const created: Tenant = await response.json();
    this.createdTenants.push(created.id);

    return created;
  }

  /**
   * Get tenant URL for browser navigation
   *
   * @param subdomain - Tenant subdomain
   * @returns Full URL with subdomain (e.g., http://acmepublishing.localhost:3000)
   */
  getTenantURL(subdomain: string): string {
    const baseURL = process.env.BASE_URL || "http://localhost:3000";
    const url = new URL(baseURL);

    // Multi-tenant subdomain routing
    url.hostname = `${subdomain}.${url.hostname}`;

    return url.toString();
  }

  /**
   * Cleanup: Delete all created tenants
   * Called automatically after test completion
   */
  async cleanup() {
    for (const tenantId of this.createdTenants) {
      try {
        await fetch(`${process.env.API_URL}/tenants/${tenantId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error(`Failed to cleanup tenant ${tenantId}:`, error);
      }
    }
    this.createdTenants = [];
  }
}
