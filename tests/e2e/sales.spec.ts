/**
 * Sales Transaction Tests
 *
 * Tests sales recording workflow (FR24-29)
 * Validates form, calculations, and transaction history
 */

import { test, expect } from '../support/fixtures';

test.describe('Sales Transaction Recording', () => {
  test('should record sales transaction successfully', async ({
    page,
    tenantFactory,
    userFactory,
    titleFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const editor = await userFactory.createStaffUser('editor', tenant);
    const title = await titleFactory.createTitle(tenant);
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', editor.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    // Navigate to Sales
    await page.goto(`${tenantURL}/sales`);
    await page.click('[data-testid="new-sale-button"]');

    // Fill sales form
    await page.fill('[data-testid="title-search"]', title.title);
    await page.click(`text=${title.title}`); // Select from dropdown
    await page.selectOption('[data-testid="format-select"]', 'physical');
    await page.fill('[data-testid="quantity-input"]', '150');
    await page.fill('[data-testid="unit-price-input"]', '24.99');
    await page.selectOption('[data-testid="channel-select"]', 'retail');

    // Verify calculated total
    await expect(page.locator('[data-testid="total-amount"]')).toContainText('$3,748.50');

    // Submit
    await page.click('[data-testid="submit-sale-button"]');

    // Verify success
    await expect(page.locator('[data-testid="success-toast"]')).toContainText(/sale recorded/i);
    await expect(page).toHaveURL(/sales/);
  });

  test('should prevent negative quantities', async ({
    page,
    tenantFactory,
    userFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const editor = await userFactory.createStaffUser('editor', tenant);
    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login and navigate to sales form
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', editor.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    await page.goto(`${tenantURL}/sales/new`);

    // Attempt negative quantity
    await page.fill('[data-testid="quantity-input"]', '-10');
    await page.click('[data-testid="submit-sale-button"]');

    // Should show validation error
    await expect(page.locator('[data-testid="quantity-error"]')).toContainText(/must be positive/i);
  });
});

test.describe('Sales Transaction History', () => {
  test('should display transaction history with filters', async ({
    page,
    tenantFactory,
    userFactory,
    titleFactory,
    salesFactory,
  }) => {
    const tenant = await tenantFactory.createTenant();
    const editor = await userFactory.createStaffUser('editor', tenant);
    const title = await titleFactory.createTitle(tenant);

    // Create multiple sales
    await salesFactory.createBulkSales(5, title, tenant);

    const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);

    // Login
    await page.goto(`${tenantURL}/sign-in`);
    await page.fill('[name="identifier"]', editor.email);
    await page.fill('[name="password"]', process.env.TEST_EDITOR_PASSWORD!);
    await page.click('button[type="submit"]');

    // View transaction history
    await page.goto(`${tenantURL}/sales`);

    // Should see 5 transactions
    const rows = page.locator('[data-testid="transaction-row"]');
    await expect(rows).toHaveCount(5);

    // Filter by title
    await page.fill('[data-testid="title-filter"]', title.title);
    await expect(rows).toHaveCount(5); // All sales are for same title

    // Filter by date range
    const today = new Date().toISOString().split('T')[0];
    await page.fill('[data-testid="date-from"]', today);
    await page.fill('[data-testid="date-to"]', today);

    // Should still see recent sales
    await expect(rows.first()).toBeVisible();
  });
});
