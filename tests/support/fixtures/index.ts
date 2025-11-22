/**
 * Salina ERP Test Fixtures
 *
 * Fixture Pattern: Pure function → fixture → mergeTests composition
 * Auto-cleanup: All fixtures clean up resources after test completion
 *
 * Architecture follows TEA knowledge base: fixture-architecture.md
 */

import { test as base, expect } from '@playwright/test';
import { TenantFactory } from './factories/tenant-factory';
import { UserFactory } from './factories/user-factory';
import { AuthorFactory } from './factories/author-factory';
import { TitleFactory } from './factories/title-factory';
import { ISBNFactory } from './factories/isbn-factory';
import { SalesFactory } from './factories/sales-factory';

/**
 * Test Fixture Types
 *
 * Each factory provides:
 * - Data generation (faker-based)
 * - API seeding
 * - Auto-cleanup after test
 */
type TestFixtures = {
  tenantFactory: TenantFactory;
  userFactory: UserFactory;
  authorFactory: AuthorFactory;
  titleFactory: TitleFactory;
  isbnFactory: ISBNFactory;
  salesFactory: SalesFactory;
};

/**
 * Extended Test with Fixtures
 *
 * Usage:
 *   import { test, expect } from './support/fixtures';
 *
 *   test('should create author', async ({ authorFactory }) => {
 *     const author = await authorFactory.createAuthor();
 *     // Test logic
 *   }); // Auto-cleanup happens here
 */
export const test = base.extend<TestFixtures>({
  /**
   * Tenant Factory
   * Creates isolated test tenants with subdomain routing
   */
  tenantFactory: async ({}, use) => {
    const factory = new TenantFactory();
    await use(factory);
    await factory.cleanup();
  },

  /**
   * User Factory
   * Creates test users with role-based permissions
   * Roles: Owner, Admin, Editor, Finance, Author
   */
  userFactory: async ({ tenantFactory }, use) => {
    const factory = new UserFactory(tenantFactory);
    await use(factory);
    await factory.cleanup();
  },

  /**
   * Author Factory
   * Creates publishing authors with contracts
   */
  authorFactory: async ({ tenantFactory }, use) => {
    const factory = new AuthorFactory(tenantFactory);
    await use(factory);
    await factory.cleanup();
  },

  /**
   * Title Factory
   * Creates book titles with ISBN assignments
   */
  titleFactory: async ({ tenantFactory, authorFactory }, use) => {
    const factory = new TitleFactory(tenantFactory, authorFactory);
    await use(factory);
    await factory.cleanup();
  },

  /**
   * ISBN Factory
   * Manages ISBN pools (physical and ebook)
   */
  isbnFactory: async ({ tenantFactory }, use) => {
    const factory = new ISBNFactory(tenantFactory);
    await use(factory);
    await factory.cleanup();
  },

  /**
   * Sales Factory
   * Creates sales transactions and returns
   */
  salesFactory: async ({ tenantFactory, titleFactory }, use) => {
    const factory = new SalesFactory(tenantFactory, titleFactory);
    await use(factory);
    await factory.cleanup();
  },
});

/**
 * Re-export expect for convenience
 */
export { expect };
