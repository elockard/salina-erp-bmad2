/**
 * Author Factory
 *
 * Creates publishing authors with optional royalty contracts
 */

import { faker } from "@faker-js/faker";
import type { Tenant, TenantFactory } from "./tenant-factory";

export interface Author {
  id: string;
  tenant_id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  tax_id?: string;
  payment_method?: string;
  is_active: boolean;
}

export class AuthorFactory {
  private createdAuthors: string[] = [];

  constructor(private tenantFactory: TenantFactory) {}

  /**
   * Create test author
   *
   * @param tenant - Tenant object (auto-created if not provided)
   * @param overrides - Override default author properties
   * @returns Created author object
   */
  async createAuthor(
    tenant?: Tenant,
    overrides: Partial<Author> = {},
  ): Promise<Author> {
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    const author: Omit<Author, "id"> = {
      tenant_id: tenant.id,
      name: overrides.name || faker.person.fullName(),
      email: overrides.email || faker.internet.email(),
      phone: overrides.phone || faker.phone.number(),
      address: overrides.address || faker.location.streetAddress(true),
      tax_id: overrides.tax_id || faker.string.numeric(9), // SSN-like
      payment_method: overrides.payment_method || "direct_deposit",
      is_active: overrides.is_active ?? true,
    };

    const response = await fetch(`${process.env.API_URL}/authors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(author),
    });

    if (!response.ok) {
      throw new Error(`Failed to create author: ${response.statusText}`);
    }

    const created: Author = await response.json();
    this.createdAuthors.push(created.id);

    return created;
  }

  /**
   * Cleanup: Delete all created authors
   */
  async cleanup() {
    for (const authorId of this.createdAuthors) {
      try {
        await fetch(`${process.env.API_URL}/authors/${authorId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error(`Failed to cleanup author ${authorId}:`, error);
      }
    }
    this.createdAuthors = [];
  }
}
