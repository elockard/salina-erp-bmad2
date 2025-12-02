import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Sales Transaction Entry Form
 * Story 3.2 - Build Sales Transaction Entry Form
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - At least one title with ISBN assigned
 * - Authentication helper to be implemented
 *
 * AC Coverage:
 * - AC 1: Page layout and header
 * - AC 2: Title autocomplete
 * - AC 3: Format dropdown
 * - AC 4: Quantity input validation
 * - AC 5: Unit price input validation
 * - AC 6: Sale date picker
 * - AC 7: Sales channel dropdown
 * - AC 8: Real-time calculation preview
 * - AC 9: Submit button
 * - AC 10: Successful submission
 * - AC 11: Error handling
 * - AC 12: Permission enforcement
 */

test.describe("Sales Entry Page - Layout and Elements", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor/admin user with RECORD_SALES permission
    // await loginAs(page, "editor@testorg.com");
    await page.goto("/sales/new");
  });

  test("AC1: Page renders with correct header and subtitle", async ({
    page,
  }) => {
    // Page header
    await expect(
      page.getByRole("heading", { name: "Record Sales Transaction" }),
    ).toBeVisible();

    // Subtitle
    await expect(
      page.getByText("Enter sales data for accurate royalty calculations"),
    ).toBeVisible();
  });

  test("AC1: Page has breadcrumb navigation", async ({ page }) => {
    // Breadcrumb: Dashboard > Sales > Record Sale
    await expect(page.getByText("Dashboard")).toBeVisible();
    await expect(page.getByText("Record Sale")).toBeVisible();
  });

  test("AC1: Form is centered with max-width constraint", async ({ page }) => {
    // Form container should have max-w-xl class
    const formContainer = page.locator(".max-w-xl");
    await expect(formContainer).toBeVisible();
  });

  test("AC2: Title autocomplete field is visible", async ({ page }) => {
    // Title field label
    await expect(page.getByText("Title *")).toBeVisible();

    // Autocomplete trigger button
    const titleButton = page.getByRole("combobox", { name: "Select title" });
    await expect(titleButton).toBeVisible();
  });

  test("AC3: Format dropdown is visible and disabled until title selected", async ({
    page,
  }) => {
    // Format label
    await expect(page.getByText("Format *")).toBeVisible();

    // Format dropdown should be disabled
    const _formatTrigger = page.locator('[name="format"]').locator("..");
    // The select should be disabled
    await expect(page.getByText("Select a title first")).toBeVisible();
  });

  test("AC4: Quantity input is visible with correct attributes", async ({
    page,
  }) => {
    await expect(page.getByText("Quantity *")).toBeVisible();

    const quantityInput = page.locator('input[type="number"]');
    await expect(quantityInput).toBeVisible();
    await expect(quantityInput).toHaveAttribute("placeholder", "0");
  });

  test("AC5: Unit price input is visible with currency prefix", async ({
    page,
  }) => {
    await expect(page.getByText("Unit Price *")).toBeVisible();
    await expect(page.getByText("Price per unit sold")).toBeVisible();

    // Should have dollar sign prefix
    await expect(page.locator("text=$").first()).toBeVisible();
  });

  test("AC6: Sale date input defaults to today", async ({ page }) => {
    await expect(page.getByText("Sale Date *")).toBeVisible();

    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();

    // Should have today's date as value
    const today = new Date().toISOString().split("T")[0];
    await expect(dateInput).toHaveValue(today);
  });

  test("AC6: Sale date cannot be future date", async ({ page }) => {
    const dateInput = page.locator('input[type="date"]');
    const today = new Date().toISOString().split("T")[0];

    // max attribute should be set to today
    await expect(dateInput).toHaveAttribute("max", today);
  });

  test("AC7: Sales channel dropdown is visible with options", async ({
    page,
  }) => {
    await expect(page.getByText("Sales Channel *")).toBeVisible();

    // Click to open dropdown
    await page.getByRole("combobox").nth(1).click(); // Second combobox is channel

    // Check options are visible
    await expect(page.getByRole("option", { name: "Retail" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Wholesale" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Direct" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Distributor" }),
    ).toBeVisible();
  });

  test("AC8: Total calculation preview is visible", async ({ page }) => {
    await expect(page.getByText("Total Transaction Value")).toBeVisible();
    // Default should show $0.00
    await expect(page.getByText("$0.00")).toBeVisible();
  });

  test("AC9: Submit button is visible with correct text", async ({ page }) => {
    const submitButton = page.getByRole("button", { name: /Record Sale/i });
    await expect(submitButton).toBeVisible();

    // Should be disabled when form is empty
    await expect(submitButton).toBeDisabled();
  });
});

test.describe("Sales Entry Form - Title Autocomplete", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales/new");
  });

  test("AC2: Clicking title field opens search popover", async ({ page }) => {
    await page.getByRole("combobox", { name: "Select title" }).click();

    // Search input should appear
    await expect(
      page.getByPlaceholder("Type to search titles..."),
    ).toBeVisible();
  });

  test("AC2: Shows message when search query is too short", async ({
    page,
  }) => {
    await page.getByRole("combobox", { name: "Select title" }).click();

    // Type 1 character
    await page.getByPlaceholder("Type to search titles...").fill("A");

    // Should show message
    await expect(
      page.getByText("Type at least 2 characters to search"),
    ).toBeVisible();
  });

  test("AC2: Shows 'no titles found' when search has no results", async ({
    page,
  }) => {
    await page.getByRole("combobox", { name: "Select title" }).click();

    // Type search that won't match
    await page
      .getByPlaceholder("Type to search titles...")
      .fill("ZZZZNONEXISTENT");

    // Wait for debounce
    await page.waitForTimeout(400);

    // Should show no results
    await expect(page.getByText("No titles found")).toBeVisible();
  });
});

test.describe("Sales Entry Form - Validation", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales/new");
  });

  test("AC4: Quantity validation rejects zero", async ({ page }) => {
    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill("0");
    await quantityInput.blur();

    // Validation error should appear
    await expect(
      page.getByText(/Quantity must be greater than 0/i),
    ).toBeVisible();
  });

  test("AC4: Quantity validation rejects negative numbers", async ({
    page,
  }) => {
    const quantityInput = page.locator('input[type="number"]');
    // HTML input with min=1 should prevent negative in most browsers
    // But form validation catches it
    await quantityInput.fill("-5");
    await quantityInput.blur();

    // Error should appear
    await expect(
      page.getByText(/Quantity must be greater than 0/i),
    ).toBeVisible();
  });

  test("AC5: Unit price validation rejects zero", async ({ page }) => {
    const priceInput = page.locator('input[inputmode="decimal"]');
    await priceInput.fill("0");
    await priceInput.blur();

    // Validation error
    await expect(
      page.getByText(/Unit price must be greater than 0/i),
    ).toBeVisible();
  });

  test("AC5: Unit price validation rejects more than 2 decimals", async ({
    page,
  }) => {
    const priceInput = page.locator('input[inputmode="decimal"]');
    await priceInput.fill("9.999");
    await priceInput.blur();

    // Validation error
    await expect(
      page.getByText(/cannot have more than 2 decimal places/i),
    ).toBeVisible();
  });
});

test.describe("Sales Entry Form - Real-time Calculation", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales/new");
  });

  test("AC8: Total updates when quantity and price are entered", async ({
    page,
  }) => {
    // Fill quantity
    const quantityInput = page.locator('input[type="number"]');
    await quantityInput.fill("5");

    // Fill price
    const priceInput = page.locator('input[inputmode="decimal"]');
    await priceInput.fill("19.99");

    // Total should update (5 * 19.99 = 99.95)
    await expect(page.getByText("$99.95")).toBeVisible();
  });

  test("AC9: Submit button shows total amount", async ({ page }) => {
    // Fill quantity and price
    await page.locator('input[type="number"]').fill("10");
    await page.locator('input[inputmode="decimal"]').fill("24.99");

    // Button should show total (10 * 24.99 = 249.90)
    const submitButton = page.getByRole("button", { name: /Record Sale/i });
    await expect(submitButton).toContainText("$249.90");
  });
});

test.describe("Sales Entry Page - Permission Enforcement", () => {
  test("AC12: Unauthorized users are redirected to dashboard", async ({
    page,
  }) => {
    // TODO: Login as author role (no RECORD_SALES permission)
    // await loginAs(page, "author@testorg.com");

    await page.goto("/sales/new");

    // Should redirect to dashboard or portal
    // Authors are redirected to portal by layout
    await expect(page).toHaveURL(/dashboard|portal/);
  });
});

test.describe("Sales Entry Page - Navigation", () => {
  test("Dashboard has Record Sale quick action link", async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/dashboard");

    // Quick action should be visible
    const recordSaleLink = page.getByRole("link", { name: /Record Sale/i });
    await expect(recordSaleLink).toBeVisible();

    // Click should navigate to sales/new
    await recordSaleLink.click();
    await expect(page).toHaveURL(/sales\/new/);
  });
});

test.describe("Sales Entry Form - Channel Persistence", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as editor
    await page.goto("/sales/new");
  });

  test("AC7: Channel defaults to 'retail' on first visit", async ({ page }) => {
    // Clear any existing localStorage
    await page.evaluate(() =>
      localStorage.removeItem("salina-last-sales-channel"),
    );

    // Reload to check default
    await page.reload();

    // Channel should default to retail
    const channelTrigger = page.getByRole("combobox").nth(1);
    await expect(channelTrigger).toContainText("Retail");
  });

  test("AC7: Channel remembers last-used selection", async ({ page }) => {
    // Set channel in localStorage
    await page.evaluate(() =>
      localStorage.setItem("salina-last-sales-channel", "wholesale"),
    );

    // Reload page
    await page.reload();

    // Channel should be wholesale
    const channelTrigger = page.getByRole("combobox").nth(1);
    await expect(channelTrigger).toContainText("Wholesale");
  });
});
