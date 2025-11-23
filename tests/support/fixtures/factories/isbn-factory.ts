/**
 * ISBN Factory
 *
 * Manages ISBN pools for testing (physical and ebook)
 */

import { faker } from "@faker-js/faker";
import type { Tenant, TenantFactory } from "./tenant-factory";

export interface ISBN {
  id: string;
  tenant_id: string;
  isbn_13: string;
  type: "physical" | "ebook";
  status: "available" | "assigned" | "registered" | "retired";
  assigned_to_title_id?: string;
}

export class ISBNFactory {
  private createdISBNs: string[] = [];

  constructor(private tenantFactory: TenantFactory) {}

  /**
   * Generate valid ISBN-13 number
   * Format: 978-X-XXXXX-XXX-X (13 digits total)
   */
  private generateISBN13(): string {
    // Prefix: 978 or 979
    const prefix = "978";

    // Random digits (9 digits)
    const group = faker.string.numeric(1);
    const publisher = faker.string.numeric(5);
    const title = faker.string.numeric(3);

    // Calculate check digit
    const partial = `${prefix}${group}${publisher}${title}`;
    const checkDigit = this.calculateISBN13CheckDigit(partial);

    return `${prefix}-${group}-${publisher}-${title}-${checkDigit}`;
  }

  /**
   * Calculate ISBN-13 check digit
   */
  private calculateISBN13CheckDigit(partial: string): string {
    const digits = partial.replace(/-/g, "").split("").map(Number);
    let sum = 0;

    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }

    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }

  /**
   * Create ISBN in test pool
   *
   * @param type - ISBN type (physical or ebook)
   * @param tenant - Tenant object (auto-created if not provided)
   * @param overrides - Override default ISBN properties
   * @returns Created ISBN object
   */
  async createISBN(
    type: "physical" | "ebook",
    tenant?: Tenant,
    overrides: Partial<ISBN> = {},
  ): Promise<ISBN> {
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    const isbn: Omit<ISBN, "id"> = {
      tenant_id: tenant.id,
      isbn_13: overrides.isbn_13 || this.generateISBN13(),
      type,
      status: overrides.status || "available",
      assigned_to_title_id: overrides.assigned_to_title_id,
    };

    const response = await fetch(`${process.env.API_URL}/isbns`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(isbn),
    });

    if (!response.ok) {
      throw new Error(`Failed to create ISBN: ${response.statusText}`);
    }

    const created: ISBN = await response.json();
    this.createdISBNs.push(created.id);

    return created;
  }

  /**
   * Create ISBN pool for testing
   * Useful for bulk operations and assignment tests
   *
   * @param count - Number of ISBNs to create
   * @param type - ISBN type (physical or ebook)
   * @param tenant - Tenant object
   * @returns Array of created ISBNs
   */
  async createISBNPool(
    count: number,
    type: "physical" | "ebook",
    tenant?: Tenant,
  ): Promise<ISBN[]> {
    const isbns: ISBN[] = [];

    for (let i = 0; i < count; i++) {
      const isbn = await this.createISBN(type, tenant);
      isbns.push(isbn);
    }

    return isbns;
  }

  /**
   * Cleanup: Delete all created ISBNs
   */
  async cleanup() {
    for (const isbnId of this.createdISBNs) {
      try {
        await fetch(`${process.env.API_URL}/isbns/${isbnId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.error(`Failed to cleanup ISBN ${isbnId}:`, error);
      }
    }
    this.createdISBNs = [];
  }
}
