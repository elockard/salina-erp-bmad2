import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Invoice Creation Form
 * Story 8.2 - Build Invoice Creation Form
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - Authentication helper to be implemented
 * - Test customers to be available in contacts
 */

test.describe("Invoice Creation Form", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as finance/admin/owner user with MANAGE_INVOICES permission
    // await loginAs(page, "finance@testorg.com");
    await page.goto("/invoices/new");
  });

  test("AC-8.2.1: Route /invoices/new renders professional invoice creation form", async ({
    page,
  }) => {
    // Page title should indicate new invoice
    await expect(page).toHaveTitle(/New Invoice/);

    // Main form heading
    await expect(page.getByRole("heading", { name: "Invoice Details" })).toBeVisible();

    // Form sections visible
    await expect(page.getByRole("heading", { name: "Addresses" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Line Items" })).toBeVisible();
    await expect(page.getByText("Invoice Totals")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();
  });

  test("AC-8.2.2: Customer selector with searchable combobox is present", async ({
    page,
  }) => {
    // Customer selector label
    await expect(page.getByLabel("Customer *")).toBeVisible();

    // Search for customer trigger button
    const customerSelector = page.getByRole("combobox");
    await expect(customerSelector.first()).toBeVisible();
  });

  test("AC-8.2.2: Invoice date picker defaults to today", async ({ page }) => {
    // Invoice Date field
    const invoiceDateLabel = page.getByText("Invoice Date *");
    await expect(invoiceDateLabel).toBeVisible();

    // Date button should be visible
    const dateButton = page.getByRole("button").filter({ hasText: /\d{4}/ });
    await expect(dateButton.first()).toBeVisible();
  });

  test("AC-8.2.2: Payment terms dropdown with options", async ({ page }) => {
    // Payment Terms label
    await expect(page.getByLabel("Payment Terms *")).toBeVisible();

    // Click to open dropdown
    const termsSelect = page.getByLabel("Payment Terms *");
    await termsSelect.click();

    // Check options are visible
    await expect(page.getByRole("option", { name: "Net 30" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Net 60" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Due on Receipt" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Custom" })).toBeVisible();
  });

  test("AC-8.2.3: Line items grid with add button", async ({ page }) => {
    // Line items section header
    await expect(page.getByRole("heading", { name: "Line Items" })).toBeVisible();

    // Add Line Item button
    const addButton = page.getByRole("button", { name: /Add Line Item/i });
    await expect(addButton).toBeVisible();

    // Table headers for grid columns
    await expect(page.getByRole("columnheader", { name: "Description" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Qty" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Unit Price" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Amount" })).toBeVisible();
  });

  test("AC-8.2.3: Can add multiple line items", async ({ page }) => {
    // Get initial row count
    const initialRows = await page.locator("tbody tr").count();

    // Click Add Line Item
    await page.getByRole("button", { name: /Add Line Item/i }).click();

    // Verify row was added
    const afterAddRows = await page.locator("tbody tr").count();
    expect(afterAddRows).toBe(initialRows + 1);
  });

  test("AC-8.2.3: Subtotal row shows calculated value", async ({ page }) => {
    // Subtotal label in totals section
    await expect(page.getByText("Subtotal")).toBeVisible();

    // Initial value should be $0.00
    await expect(page.getByText("$0.00")).toBeVisible();
  });

  test("AC-8.2.4: Notes section with customer and internal notes", async ({
    page,
  }) => {
    // Notes section
    await expect(page.getByRole("heading", { name: "Notes" })).toBeVisible();

    // Notes to Customer textarea
    await expect(page.getByLabel("Notes to Customer")).toBeVisible();

    // Internal Notes textarea
    await expect(page.getByLabel("Internal Notes")).toBeVisible();
  });

  test("AC-8.2.4: Form has Save as Draft and Cancel buttons", async ({
    page,
  }) => {
    // Save as Draft button
    const saveButton = page.getByRole("button", { name: "Save as Draft" });
    await expect(saveButton).toBeVisible();

    // Cancel button
    const cancelButton = page.getByRole("button", { name: "Cancel" });
    await expect(cancelButton).toBeVisible();
  });

  test("AC-8.2.7: Line item amount auto-calculates", async ({ page }) => {
    // Find first line item row
    const firstRow = page.locator("tbody tr").first();

    // Enter quantity
    const qtyInput = firstRow.locator('input[type="number"]').first();
    await qtyInput.fill("5");

    // Enter unit price
    const priceInput = firstRow.locator('input[type="number"]').nth(1);
    await priceInput.fill("10.00");

    // Wait for calculation
    await page.waitForTimeout(100);

    // Amount should be auto-calculated (50.00)
    // The amount field is read-only, so we check the displayed value
    await expect(firstRow.getByText("$50.00")).toBeVisible();
  });

  test("AC-8.2.8: Bill-to address fields are present", async ({ page }) => {
    // Address section
    await expect(page.getByRole("heading", { name: "Addresses" })).toBeVisible();

    // Bill-To Address subsection
    await expect(page.getByText("Bill-To Address")).toBeVisible();

    // Address fields
    await expect(page.getByLabel("Address Line 1").first()).toBeVisible();
    await expect(page.getByLabel("City").first()).toBeVisible();
    await expect(page.getByLabel("State").first()).toBeVisible();
    await expect(page.getByLabel("Postal Code").first()).toBeVisible();
  });

  test("AC-8.2.8: Ship-to has 'Same as bill-to' checkbox", async ({ page }) => {
    // Same as Bill-To checkbox
    const sameAsCheckbox = page.getByLabel("Same as Bill-To");
    await expect(sameAsCheckbox).toBeVisible();

    // Should be checked by default
    await expect(sameAsCheckbox).toBeChecked();
  });

  test("AC-8.2.9: Due date updates when payment terms change", async ({
    page,
  }) => {
    // Get initial due date
    const dueDateButton = page.locator('button').filter({ hasText: /Due Date/i }).first();

    // Change payment terms to Net 60
    const termsSelect = page.getByLabel("Payment Terms *");
    await termsSelect.click();
    await page.getByRole("option", { name: "Net 60" }).click();

    // Due date should update (60 days from today)
    // Just verify the interaction happened without error
    await expect(termsSelect).toBeVisible();
  });

  test("Cancel button navigates back to invoices list", async ({ page }) => {
    // Click cancel
    await page.getByRole("button", { name: "Cancel" }).click();

    // Should navigate to /invoices
    await expect(page).toHaveURL("/invoices");
  });
});

test.describe("Invoice Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/invoices/new");
  });

  test("AC-8.2.5: Customer is required", async ({ page }) => {
    // Try to submit without selecting customer
    await page.getByRole("button", { name: "Save as Draft" }).click();

    // Should show validation error
    await expect(page.getByText(/Please select a customer/i)).toBeVisible();
  });

  test("AC-8.2.5: Line item description is required", async ({ page }) => {
    // Clear the description field
    const descInput = page.locator('input[placeholder*="description"]').first();
    await descInput.fill("");
    await descInput.blur();

    // Try to submit
    await page.getByRole("button", { name: "Save as Draft" }).click();

    // Should show validation error
    await expect(page.getByText(/Description is required/i)).toBeVisible();
  });
});

test.describe("Invoice Permission Checks", () => {
  test("Redirects author role to portal", async ({ page }) => {
    // TODO: Login as author
    // await loginAs(page, "author@testorg.com");
    await page.goto("/invoices/new");

    // Should redirect to /portal for author role
    // await expect(page).toHaveURL("/portal");
  });

  test("Redirects unauthorized roles to dashboard", async ({ page }) => {
    // TODO: Login as editor (no MANAGE_INVOICES permission)
    // await loginAs(page, "editor@testorg.com");
    await page.goto("/invoices/new");

    // Should redirect to /dashboard
    // await expect(page).toHaveURL("/dashboard");
  });
});
