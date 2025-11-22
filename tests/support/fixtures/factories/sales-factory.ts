/**
 * Sales Factory
 *
 * Creates sales transactions and returns for royalty testing
 */

import { faker } from '@faker-js/faker';
import { TenantFactory, type Tenant } from './tenant-factory';
import { TitleFactory, type Title } from './title-factory';

export interface Sale {
  id: string;
  tenant_id: string;
  title_id: string;
  format: 'physical' | 'ebook' | 'audiobook';
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
  channel: 'retail' | 'wholesale' | 'direct' | 'distributor';
}

export class SalesFactory {
  private createdSales: string[] = [];

  constructor(
    private tenantFactory: TenantFactory,
    private titleFactory: TitleFactory
  ) {}

  /**
   * Create sales transaction
   *
   * @param title - Title object (auto-created if not provided)
   * @param tenant - Tenant object (auto-created if not provided)
   * @param overrides - Override default sale properties
   * @returns Created sale object
   */
  async createSale(
    title?: Title,
    tenant?: Tenant,
    overrides: Partial<Sale> = {}
  ): Promise<Sale> {
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    if (!title) {
      title = await this.titleFactory.createTitle(tenant);
    }

    const quantity = overrides.quantity || faker.number.int({ min: 1, max: 500 });
    const unit_price = overrides.unit_price || parseFloat(faker.commerce.price({ min: 10, max: 50 }));
    const total_amount = overrides.total_amount || quantity * unit_price;

    const sale: Omit<Sale, 'id'> = {
      tenant_id: tenant.id,
      title_id: title.id,
      format: overrides.format || faker.helpers.arrayElement(['physical', 'ebook', 'audiobook']),
      quantity,
      unit_price,
      total_amount,
      sale_date: overrides.sale_date || faker.date.recent({ days: 30 }).toISOString().split('T')[0],
      channel: overrides.channel || faker.helpers.arrayElement(['retail', 'wholesale', 'direct', 'distributor']),
    };

    const response = await fetch(`${process.env.API_URL}/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale),
    });

    if (!response.ok) {
      throw new Error(`Failed to create sale: ${response.statusText}`);
    }

    const created: Sale = await response.json();
    this.createdSales.push(created.id);

    return created;
  }

  /**
   * Create bulk sales for royalty calculation testing
   *
   * @param count - Number of sales to create
   * @param title - Title object
   * @param tenant - Tenant object
   * @returns Array of created sales
   */
  async createBulkSales(count: number, title?: Title, tenant?: Tenant): Promise<Sale[]> {
    const sales: Sale[] = [];

    for (let i = 0; i < count; i++) {
      const sale = await this.createSale(title, tenant);
      sales.push(sale);
    }

    return sales;
  }

  /**
   * Create tiered sales for testing tiered royalty calculations
   * Creates sales across multiple quantity tiers
   *
   * @param title - Title object
   * @param tenant - Tenant object
   * @returns Sales distributed across tiers
   */
  async createTieredSales(title?: Title, tenant?: Tenant): Promise<{
    tier1: Sale; // 0-5K units
    tier2: Sale; // 5K-10K units
    tier3: Sale; // 10K+ units
  }> {
    return {
      tier1: await this.createSale(title, tenant, { quantity: 2500 }), // Mid-tier 1
      tier2: await this.createSale(title, tenant, { quantity: 3000 }), // Triggers tier 2
      tier3: await this.createSale(title, tenant, { quantity: 5000 }), // Triggers tier 3
    };
  }

  /**
   * Cleanup: Delete all created sales
   */
  async cleanup() {
    for (const saleId of this.createdSales) {
      try {
        await fetch(`${process.env.API_URL}/sales/${saleId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error(`Failed to cleanup sale ${saleId}:`, error);
      }
    }
    this.createdSales = [];
  }
}
