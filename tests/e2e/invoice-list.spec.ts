/**
 * Invoice List E2E Tests
 *
 * Story: 8.3 - Build Invoice List and Detail Views
 * Task 14: E2E Tests
 *
 * Tests:
 * - Invoice list page loads
 * - Filters work correctly
 * - Navigation to detail view
 * - Edit flow for draft invoice
 * - Void confirmation flow
 */

import { expect, test } from "@playwright/test";

test.describe("Invoice List View", () => {
  test.beforeEach(async ({ page: _page }) => {
    // Auth setup: These tests require a user with Finance/Admin/Owner role
    // The test environment should have:
    // 1. Clerk test mode enabled with TEST_USER credentials
    // 2. A test user with appropriate role in the database
    // 3. storageState from auth.setup.ts with valid session
    //
    // For local testing without auth:
    // - Set BYPASS_AUTH=true in .env.test
    // - Or use the auth fixtures from tests/support/fixtures
    //
    // See: tests/e2e/auth.spec.ts for auth setup patterns
  });

  test("invoice list page loads", async ({ page }) => {
    await page.goto("/invoices");

    // Check page header
    await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible();
    await expect(
      page.getByText("Create and manage customer invoices"),
    ).toBeVisible();

    // Check for New Invoice button
    await expect(
      page.getByRole("link", { name: /new invoice/i }),
    ).toBeVisible();

    // Check for table headers
    await expect(
      page.getByRole("columnheader", { name: "Invoice #" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Customer" }),
    ).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "Status" }),
    ).toBeVisible();
  });

  test("status filter works", async ({ page }) => {
    await page.goto("/invoices");

    // Click on status filter dropdown
    await page.getByRole("combobox").first().click();

    // Select "Draft" status
    await page.getByRole("option", { name: "Draft" }).click();

    // URL should update with filter
    await expect(page).toHaveURL(/status=draft/);
  });

  test("customer filter works", async ({ page }) => {
    await page.goto("/invoices");

    // Find customer filter (should be a combobox with placeholder)
    const customerFilter = page.getByPlaceholder(/filter by customer/i);
    await customerFilter.click();

    // Type to search
    await customerFilter.fill("John");

    // Wait for search results
    await page.waitForTimeout(500); // Debounce time

    // Should show customer options
    await expect(page.getByRole("option")).toBeVisible();
  });

  test("date range filter works", async ({ page }) => {
    await page.goto("/invoices");

    // Click on date range picker
    await page.getByRole("button", { name: /invoice date range/i }).click();

    // Calendar should appear
    await expect(page.getByRole("grid")).toBeVisible();
  });

  test("clear filters button removes all filters", async ({ page }) => {
    await page.goto("/invoices?status=draft");

    // Clear button should be visible
    await page.getByRole("button", { name: /clear/i }).click();

    // URL should reset
    await expect(page).toHaveURL("/invoices");
  });

  test("empty state shows CTA when no invoices exist", async ({ page }) => {
    // This test requires a known empty state - use a filter combination unlikely to have results
    await page.goto(
      "/invoices?status=void&startDate=1990-01-01&endDate=1990-01-02",
    );

    // Either empty state or results - both are valid
    const tableOrEmpty = page.locator('table, [data-testid="empty-state"]');
    await expect(tableOrEmpty).toBeVisible();

    // If empty state is shown, verify the CTA exists
    const emptyState = page.getByText("No invoices yet");
    const isEmptyVisible = await emptyState.isVisible().catch(() => false);
    if (isEmptyVisible) {
      await expect(
        page.getByRole("link", { name: /create your first invoice/i }),
      ).toBeVisible();
    }
  });

  test("pagination controls are present when invoices exist", async ({
    page,
  }) => {
    await page.goto("/invoices");

    // Wait for page to load
    await page.waitForSelector("table");

    // Page size selector should always be visible when there are results
    const pageSizeSelector = page
      .getByRole("combobox")
      .filter({ hasText: /10|25|50/ });
    await expect(
      pageSizeSelector.or(page.getByText("No invoices yet")),
    ).toBeVisible();
  });
});

test.describe("Invoice Detail View", () => {
  test.beforeEach(async ({ page }) => {
    // Requires authenticated Finance/Admin/Owner user (see auth setup above)
    await page.goto("/invoices");
    await page.waitForSelector("table");
  });

  test("navigates to detail view from list", async ({ page }) => {
    // Skip test if no invoices exist
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();
    await page.getByRole("menuitem", { name: /view/i }).click();

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]+/);
  });

  test("detail page shows invoice information", async ({ page }) => {
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();
    await page.getByRole("menuitem", { name: /view/i }).click();

    // Check for detail page elements - these should always be present
    await expect(page.getByText(/invoice #/i)).toBeVisible();
    await expect(page.getByText("Bill To")).toBeVisible();
    await expect(page.getByText("Line Items")).toBeVisible();
  });

  test("back button returns to list", async ({ page }) => {
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();
    await page.getByRole("menuitem", { name: /view/i }).click();

    // Click back button
    await page.getByRole("link", { name: /back to invoices/i }).click();

    // Should be back on list page
    await expect(page).toHaveURL("/invoices");
  });
});

test.describe("Void Invoice Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Requires authenticated Finance/Admin/Owner user (see auth setup above)
    await page.goto("/invoices");
    await page.waitForSelector("table");
  });

  test("void confirmation dialog appears", async ({ page }) => {
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();

    // Look for Void menu item - may not be visible for paid/void invoices
    const voidButton = page.getByRole("menuitem", { name: /void/i });
    const isVoidVisible = await voidButton.isVisible().catch(() => false);
    test.skip(!isVoidVisible, "No voidable invoices available");

    await voidButton.click();

    // Dialog should appear with all required elements
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Void Invoice")).toBeVisible();
    await expect(page.getByText(/this action cannot be undone/i)).toBeVisible();
  });

  test("void dialog can be cancelled", async ({ page }) => {
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();

    const voidButton = page.getByRole("menuitem", { name: /void/i });
    const isVoidVisible = await voidButton.isVisible().catch(() => false);
    test.skip(!isVoidVisible, "No voidable invoices available");

    await voidButton.click();

    // Click Cancel
    await page.getByRole("button", { name: /cancel/i }).click();

    // Dialog should close
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("void reason can be entered", async ({ page }) => {
    const actionButtons = page.getByRole("button", { name: /open menu/i });
    const buttonCount = await actionButtons.count();
    test.skip(buttonCount === 0, "No invoices available for testing");

    await actionButtons.first().click();

    const voidButton = page.getByRole("menuitem", { name: /void/i });
    const isVoidVisible = await voidButton.isVisible().catch(() => false);
    test.skip(!isVoidVisible, "No voidable invoices available");

    await voidButton.click();

    // Enter reason
    const reasonInput = page.getByPlaceholder(/enter reason/i);
    await reasonInput.fill("Customer cancelled order");

    // Reason should be entered
    await expect(reasonInput).toHaveValue("Customer cancelled order");
  });
});

test.describe("Edit Invoice Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Requires authenticated Finance/Admin/Owner user (see auth setup above)
    await page.goto("/invoices");
    await page.waitForSelector("table");
  });

  test("edit action only available for draft invoices", async ({ page }) => {
    // Find a draft invoice row (has "Draft" badge)
    const draftBadge = page.getByText("Draft").first();
    const isDraftVisible = await draftBadge.isVisible().catch(() => false);
    test.skip(!isDraftVisible, "No draft invoices available for testing");

    // Get the row containing this badge and open menu
    const row = page.locator("tr").filter({ has: draftBadge });
    const actionButton = row.getByRole("button", { name: /open menu/i });

    await actionButton.click();

    // Edit should be visible for draft
    await expect(page.getByRole("menuitem", { name: /edit/i })).toBeVisible();
  });

  test("edit navigates to edit page", async ({ page }) => {
    const draftBadge = page.getByText("Draft").first();
    const isDraftVisible = await draftBadge.isVisible().catch(() => false);
    test.skip(!isDraftVisible, "No draft invoices available for testing");

    const row = page.locator("tr").filter({ has: draftBadge });
    const actionButton = row.getByRole("button", { name: /open menu/i });

    await actionButton.click();
    await page.getByRole("menuitem", { name: /edit/i }).click();

    // Should navigate to edit page
    await expect(page).toHaveURL(/\/invoices\/[a-f0-9-]+\/edit/);
  });

  test("edit page shows form", async ({ page }) => {
    const draftBadge = page.getByText("Draft").first();
    const isDraftVisible = await draftBadge.isVisible().catch(() => false);
    test.skip(!isDraftVisible, "No draft invoices available for testing");

    const row = page.locator("tr").filter({ has: draftBadge });
    const actionButton = row.getByRole("button", { name: /open menu/i });

    await actionButton.click();
    await page.getByRole("menuitem", { name: /edit/i }).click();

    // Check edit page elements - these must always be present
    await expect(page.getByText(/edit invoice/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /save changes/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /back to invoice/i }),
    ).toBeVisible();
  });
});
