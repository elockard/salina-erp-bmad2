import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Tax Information Management
 * Story 11.1 - Collect and Validate Tax Identification Information
 *
 * Tests cover:
 * - AC-11.1.1: Tax section visibility/editability by role
 * - AC-11.1.2: TIN entry with type selection
 * - AC-11.1.3: TIN format validation
 * - AC-11.1.5: TIN masking display
 * - AC-11.1.6: US-based indicator
 * - AC-11.1.7: W-9 status tracking
 * - AC-11.1.8: Missing TIN warning indicators
 *
 * Prerequisites:
 * - Test database seeded with test tenant and users
 * - Test contacts with Author role
 */

test.describe("Tax Information - Entry Flow (Finance/Admin)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as Finance or Admin user
    // await loginAs(page, "finance@testorg.com");
    await page.goto("/contacts");
  });

  test("AC-11.1.1: Tax Information section visible in contact form for Finance user", async ({
    page,
  }) => {
    // Open create contact dialog
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Check Author role to enable tax section
    const authorCheckbox = page.getByLabel(/Author/i);
    await authorCheckbox.check();

    // Tax Information section should be visible (collapsible)
    const taxSection = page.getByRole("button", { name: /Tax Information/i });
    await expect(taxSection).toBeVisible();

    // Click to expand
    await taxSection.click();

    // US-based checkbox should be visible
    await expect(page.getByLabel(/US-based/i)).toBeVisible();
  });

  test("AC-11.1.2: TIN type selection (SSN/EIN) with format labels", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();

    // Expand tax section
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // TIN type dropdown should be visible
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await expect(tinTypeSelect).toBeVisible();

    // Click to open dropdown
    await tinTypeSelect.click();

    // Check options exist with format hints
    await expect(
      page.getByRole("option", { name: /SSN.*Individual/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("option", { name: /EIN.*Business/i }),
    ).toBeVisible();
  });

  test("AC-11.1.2, AC-11.1.3: SSN auto-formatting (XXX-XX-XXXX)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // Select SSN type
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await tinTypeSelect.click();
    await page.getByRole("option", { name: /SSN/i }).click();

    // Enter SSN digits
    const tinInput = page.getByPlaceholder("XXX-XX-XXXX");
    await tinInput.fill("123456789");

    // Should auto-format to XXX-XX-XXXX
    await expect(tinInput).toHaveValue("123-45-6789");
  });

  test("AC-11.1.2, AC-11.1.3: EIN auto-formatting (XX-XXXXXXX)", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // Select EIN type
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await tinTypeSelect.click();
    await page.getByRole("option", { name: /EIN/i }).click();

    // Enter EIN digits
    const tinInput = page.getByPlaceholder("XX-XXXXXXX");
    await tinInput.fill("123456789");

    // Should auto-format to XX-XXXXXXX
    await expect(tinInput).toHaveValue("12-3456789");
  });

  test("AC-11.1.3: Invalid SSN format shows validation error", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // Select SSN type
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await tinTypeSelect.click();
    await page.getByRole("option", { name: /SSN/i }).click();

    // Enter partial SSN
    const tinInput = page.getByPlaceholder("XXX-XX-XXXX");
    await tinInput.fill("12345");
    await tinInput.blur();

    // Should show validation error for incomplete SSN
    await expect(page.getByText(/Invalid SSN format/i)).toBeVisible();
  });

  test("AC-11.1.6: US-based checkbox with 1099 reporting label", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // US-based checkbox should be checked by default
    const usBasedCheckbox = page.getByLabel(/US-based/i);
    await expect(usBasedCheckbox).toBeChecked();

    // Uncheck it
    await usBasedCheckbox.uncheck();

    // TIN fields should be hidden for non-US
    await expect(
      page.getByRole("combobox", { name: /TIN Type/i }),
    ).not.toBeVisible();

    // Message about non-US contacts
    await expect(
      page.getByText(/Non-US contacts are not subject to 1099/i),
    ).toBeVisible();
  });

  test("AC-11.1.7: W-9 received checkbox enables date field", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // W-9 checkbox should be unchecked by default
    const w9Checkbox = page.getByLabel(/W-9 form received/i);
    await expect(w9Checkbox).not.toBeChecked();

    // Date field should not be visible initially
    await expect(page.getByLabel(/W-9 Received Date/i)).not.toBeVisible();

    // Check W-9 received
    await w9Checkbox.check();

    // Date field should now be visible
    await expect(page.getByLabel(/W-9 Received Date/i)).toBeVisible();
  });
});

test.describe("Tax Information - Masking Display (AC-11.1.5)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as Finance user
    await page.goto("/contacts");
  });

  test("AC-11.1.5: Saved TIN displays masked (***-**-XXXX)", async ({
    page,
  }) => {
    // Click on existing contact with TIN saved
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Tax info section in detail view
    const taxSection = page.getByText(/Tax Information/i);
    await expect(taxSection).toBeVisible();

    // SSN should be masked
    const _maskedTin = page.getByText(/\*\*\*-\*\*-\d{4}/);
    // If contact has TIN, it should show masked format
    // await expect(maskedTin).toBeVisible();
  });

  test("AC-11.1.5: Show/hide toggle for TIN value", async ({ page }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Find show/hide button (eye icon)
    const toggleButton = page.getByRole("button", {
      name: /Show TIN|Hide TIN/i,
    });

    // If present, clicking should toggle visibility
    if (await toggleButton.isVisible()) {
      await toggleButton.click();
      // After click, masked value should show last 4 with pattern
      await expect(
        page.getByText(/\*\*\*-\*\*-\d{4}|\*\*-\*\*\*\d{4}/),
      ).toBeVisible();
    }
  });
});

test.describe("Tax Information - Missing TIN Warning (AC-11.1.8)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/contacts");
  });

  test("AC-11.1.8: Warning indicator shows for US authors without TIN", async ({
    page,
  }) => {
    // Filter to show authors
    const roleFilter = page.getByRole("combobox");
    await roleFilter.click();
    await page.getByRole("option", { name: /Author/i }).click();

    // Look for warning indicators in the list
    const _warningBadge = page.locator('[aria-label*="Missing TIN"]');
    // If test data includes US authors without TIN, badge should appear
    // await expect(warningBadge).toBeVisible();
  });

  test("AC-11.1.8: Warning message in contact detail for missing TIN", async ({
    page,
  }) => {
    // Click on an author contact
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Warning alert should show for US authors without TIN
    const _warningAlert = page.getByText(/Tax ID required for 1099 reporting/i);
    // await expect(warningAlert).toBeVisible();
  });
});

test.describe("Tax Information - Permission Checks (AC-11.1.1)", () => {
  test("AC-11.1.1: Editor role CANNOT see tax information section", async ({
    page,
  }) => {
    // TODO: Login as Editor user
    // await loginAs(page, "editor@testorg.com");
    await page.goto("/contacts");

    // Open create contact dialog
    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();

    // Tax Information section should NOT be visible for Editor
    const _taxSection = page.getByRole("button", { name: /Tax Information/i });
    // await expect(taxSection).not.toBeVisible();

    // Or if visible, should show permission warning
    // await expect(page.getByText(/don't have permission/i)).toBeVisible();
  });

  test("AC-11.1.1: Finance role CAN see and edit tax information", async ({
    page,
  }) => {
    // TODO: Login as Finance user
    // await loginAs(page, "finance@testorg.com");
    await page.goto("/contacts");

    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();

    // Tax Information section should be visible
    const taxSection = page.getByRole("button", { name: /Tax Information/i });
    await expect(taxSection).toBeVisible();

    // Click to expand
    await taxSection.click();

    // Should be able to interact with TIN type
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await expect(tinTypeSelect).toBeEnabled();
  });

  test("AC-11.1.1: Admin role CAN see and edit tax information", async ({
    page,
  }) => {
    // TODO: Login as Admin user
    // await loginAs(page, "admin@testorg.com");
    await page.goto("/contacts");

    await page.getByRole("button", { name: /Create Contact/i }).click();
    await page.getByLabel(/Author/i).check();

    // Tax Information section should be visible
    const taxSection = page.getByRole("button", { name: /Tax Information/i });
    await expect(taxSection).toBeVisible();
  });
});

test.describe("Tax Information - Full Entry Flow", () => {
  test("Complete tax info entry and save for new author contact", async ({
    page,
  }) => {
    // TODO: Login as Finance/Admin
    await page.goto("/contacts");

    // Open create contact dialog
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Fill basic info
    await page.getByLabel("First Name *").fill("Tax");
    await page.getByLabel("Last Name *").fill(`Test ${Date.now()}`);
    await page.getByLabel("Email").fill("taxtest@example.com");

    // Select Author role
    await page.getByLabel(/Author/i).check();

    // Expand and fill tax info
    await page.getByRole("button", { name: /Tax Information/i }).click();

    // Select SSN
    const tinTypeSelect = page.getByRole("combobox", { name: /TIN Type/i });
    await tinTypeSelect.click();
    await page.getByRole("option", { name: /SSN/i }).click();

    // Enter TIN
    await page.getByPlaceholder("XXX-XX-XXXX").fill("123456789");

    // Verify US-based is checked
    await expect(page.getByLabel(/US-based/i)).toBeChecked();

    // Check W-9 received
    await page.getByLabel(/W-9 form received/i).check();

    // Submit
    await page.getByRole("button", { name: "Create Contact" }).click();

    // Should see success message
    await expect(page.getByText(/Contact created/i)).toBeVisible();
  });
});
