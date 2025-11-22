/**
 * Authentication & Authorization Tests
 *
 * Tests multi-tenant authentication and role-based access control
 * Uses Clerk for authentication, tests subdomain isolation
 */

import { test, expect } from '../support/fixtures';

test.describe('Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page, tenantFactory }) => {
    const tenant = await tenantFactory.createTenant();
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Attempt to access protected route
    await page.goto(`${tenantURL}/dashboard`);

    // Should redirect to login
    await expect(page).toHaveURL(/sign-in/);
  });

  test('should allow authenticated user to access dashboard', async ({
    page,
    tenantFactory,
    userFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const editor = await userFactory.createStaffUser('editor', tenant);
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login (using Clerk test credentials)
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', editor.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(`${tenantURL}/dashboard`);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});

test.describe('Role-Based Access Control (RBAC)', () => {
  test('Editor should access Authors but not Finance features', async ({
    page,
    tenantFactory,
    userFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const editor = await userFactory.createStaffUser('editor', tenant);
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login as Editor
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', editor.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    // Editor CAN access Authors
    await page.goto(`${tenantURL}/authors`);
    await expect(page.locator('h1')).toContainText(/authors/i);

    // Editor CANNOT access Returns approval (Finance only)
    await page.goto(`${tenantURL}/returns`);
    await expect(page.locator('[data-testid="unauthorized-message"]')).toBeVisible();
  });

  test('Finance should approve returns', async ({
    page,
    tenantFactory,
    userFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const finance = await userFactory.createStaffUser('finance', tenant);
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login as Finance
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', finance.email);
    await page.fill('[name="password"]', process.env.TEST_FINANCE_PASSWORD!);
    await page.click('button[type="submit"]');

    // Finance CAN access Returns approval queue
    await page.goto(`${tenantURL}/returns`);
    await expect(page.locator('h1')).toContainText(/returns/i);
    await expect(page.locator('[data-testid="approve-return-button"]')).toBeVisible();
  });
});

test.describe('Multi-Tenant Isolation', () => {
  test('should isolate data between tenants', async ({
    page,
    tenantFactory,
    userFactory,
    authorFactory,
  }) => {
    // Create two separate tenants
    const tenant1 = await tenantFactory.createTenant({ subdomain: 'acmepub' });
    const tenant2 = await tenantFactory.createTenant({ subdomain: 'zenithpub' });

    // Create author in Tenant 1
    const author1 = await authorFactory.createAuthor(tenant1, { name: 'Jane Doe' });

    // Login to Tenant 2
    const editor2 = await userFactory.createStaffUser('editor', tenant2);
    const tenant2URL = tenantFactory.getTenantURL(tenant2.subdomain);

    await page.goto(`${tenant2URL}/sign-in`);
    await page.fill('[name="identifier"]', editor2.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    // Navigate to authors in Tenant 2
    await page.goto(`${tenant2URL}/authors`);

    // Should NOT see Tenant 1's author
    await expect(page.locator('text=Jane Doe')).not.toBeVisible();
  });
});
