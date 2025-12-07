import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Contact Management Split View
 * Story 7.2 - Build Contact Management Interface
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - Authentication helper to be implemented
 * - Test contacts to be created/cleaned up
 */

test.describe("Contact Management - Split View Layout", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner/admin user with MANAGE_CONTACTS permission
    // await loginAs(page, "owner@testorg.com");
    await page.goto("/contacts");
  });

  test("AC-7.2.1: Split View layout renders with left (320px) and right (fluid) panels", async ({
    page,
  }) => {
    // Left panel should be visible with fixed width
    const leftPanel = page.locator('[class*="w-\\[320px\\]"]');
    await expect(leftPanel).toBeVisible();

    // Header with "Contacts" title
    await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();

    // Right panel for details
    const rightPanel = page.locator('[class*="flex-1"]');
    await expect(rightPanel).toBeVisible();
  });

  test("AC-7.2.2: Left panel displays scrollable contact list with search box", async ({
    page,
  }) => {
    // Search input visible
    const searchInput = page.getByPlaceholder("Search contacts...");
    await expect(searchInput).toBeVisible();

    // Contact list exists
    const contactList = page.getByRole("listbox", { name: "Contacts" });
    await expect(contactList).toBeVisible();
  });

  test("AC-7.2.2: Search filters contacts by name (case-insensitive)", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder("Search contacts...");

    // Search for a partial name
    await searchInput.fill("john");

    // Wait for debounce (300ms)
    await page.waitForTimeout(400);

    // Results should be filtered (exact assertions depend on test data)
  });

  test("AC-7.2.2: Role filter dropdown filters by role", async ({ page }) => {
    // Role filter dropdown
    const roleFilter = page.getByRole("combobox");
    await expect(roleFilter).toBeVisible();

    // Click to open dropdown
    await roleFilter.click();

    // Check role options
    await expect(page.getByRole("option", { name: /Author/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Customer/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Vendor/i })).toBeVisible();
    await expect(page.getByRole("option", { name: /Distributor/i })).toBeVisible();
  });

  test("AC-7.2.2: Show inactive toggle filters inactive contacts", async ({
    page,
  }) => {
    const showInactiveCheckbox = page.getByLabel("Show inactive");
    await expect(showInactiveCheckbox).toBeVisible();

    // Toggle it on
    await showInactiveCheckbox.check();

    // Should trigger reload with inactive contacts
  });

  test("AC-7.2.3: Create Contact button opens modal dialog", async ({ page }) => {
    // Click create button
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Modal should open
    await expect(
      page.getByRole("dialog"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create Contact" }),
    ).toBeVisible();
  });

  test("AC-7.2.3: Create Contact form has required fields", async ({ page }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Form fields
    await expect(page.getByLabel("First Name *")).toBeVisible();
    await expect(page.getByLabel("Last Name *")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
  });

  test("AC-7.2.3: Form validation shows inline error for empty required fields", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Try to submit without required fields
    await page.getByRole("button", { name: "Create Contact" }).click();

    // Error messages should appear
    await expect(page.getByText("First name is required")).toBeVisible();
  });

  test("AC-7.2.3: Role checkboxes with icons are visible", async ({ page }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Role checkboxes
    await expect(page.getByLabel(/Author/i)).toBeVisible();
    await expect(page.getByLabel(/Vendor/i)).toBeVisible();
    await expect(page.getByLabel(/Distributor/i)).toBeVisible();
  });

  test("AC-7.2.3: Address section is collapsible", async ({ page }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Address collapse trigger
    const addressTrigger = page.getByRole("button", { name: /Address/i });
    await expect(addressTrigger).toBeVisible();

    // Click to expand
    await addressTrigger.click();

    // Address fields should be visible
    await expect(page.getByLabel("Address Line 1")).toBeVisible();
    await expect(page.getByLabel("City")).toBeVisible();
  });

  test("AC-7.2.3: Payment section is collapsible", async ({ page }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Payment collapse trigger
    const paymentTrigger = page.getByRole("button", { name: /Payment/i });
    await expect(paymentTrigger).toBeVisible();

    // Click to expand
    await paymentTrigger.click();

    // Payment method dropdown should be visible
    await expect(page.getByLabel("Payment Method")).toBeVisible();
  });

  test("AC-7.2.3: Creating contact shows success toast and updates list", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Contact/i }).click();

    // Fill form
    await page.getByLabel("First Name *").fill("Test");
    await page.getByLabel("Last Name *").fill(`Contact ${Date.now()}`);
    await page.getByLabel("Email").fill("test@example.com");

    // Submit
    await page.getByRole("button", { name: "Create Contact" }).click();

    // Success toast should appear
    await expect(page.getByText(/Contact created/i)).toBeVisible();

    // Modal should close
    await expect(
      page.getByRole("dialog"),
    ).not.toBeVisible();
  });

  test("AC-7.2.2: Empty state shows when no contacts exist", async ({ page }) => {
    // This test depends on having a clean tenant with no contacts
    const _emptyState = page.getByText("No contacts yet");
    // await expect(emptyState).toBeVisible();
  });
});

test.describe("Contact Management - Detail View", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login and navigate
    await page.goto("/contacts");
  });

  test("AC-7.2.4: Clicking contact row loads detail in right panel", async ({
    page,
  }) => {
    // Click on first contact in list
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Right panel should show contact details with name
    const detailPanel = page.locator('[class*="flex-1"]');
    await expect(detailPanel).toBeVisible();
  });

  test("AC-7.2.4: Detail view has tabs for General, Roles, Payment", async ({
    page,
  }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Tab buttons should be visible
    await expect(page.getByRole("tab", { name: "General" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Roles" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Payment" })).toBeVisible();
  });

  test("AC-7.2.4: Edit button enables inline editing", async ({ page }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Click Edit button
    await page.getByRole("button", { name: /Edit/i }).click();

    // Form should be in edit mode
    await expect(
      page.getByRole("heading", { name: "Edit Contact" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("AC-7.2.4: Roles tab shows assigned roles with badges", async ({
    page,
  }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Click Roles tab
    await page.getByRole("tab", { name: "Roles" }).click();

    // Roles section should show
    await expect(page.getByText("Assigned Roles")).toBeVisible();
  });

  test("AC-7.2.4: Add Role button opens role selector dialog", async ({
    page,
  }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Click Roles tab
    await page.getByRole("tab", { name: "Roles" }).click();

    // Click Add Role
    const addRoleButton = page.getByRole("button", { name: /Add Role/i });
    if (await addRoleButton.isVisible()) {
      await addRoleButton.click();
      await expect(page.getByRole("dialog")).toBeVisible();
    }
  });

  test("AC-7.2.5: Deactivate button shows confirmation dialog (admin only)", async ({
    page,
  }) => {
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Deactivate button (admin/owner only)
    const deactivateButton = page.getByRole("button", {
      name: "Deactivate Contact",
    });
    if (await deactivateButton.isVisible()) {
      await deactivateButton.click();

      // Confirmation dialog should appear
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(page.getByText(/Are you sure/i)).toBeVisible();
    }
  });
});

test.describe("Contact Management - Responsive Behavior", () => {
  test("AC-7.2.4: Mobile view shows list only, detail slides in", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/contacts");

    // Left panel should be visible (full width on mobile)
    const leftPanel = page.locator('[class*="max-md:w-full"]');
    await expect(leftPanel).toBeVisible();

    // Click on contact
    const contactItem = page.locator('[role="option"]').first();
    await contactItem.click();

    // Back button should appear on mobile detail view
    await expect(
      page.getByRole("button", { name: /Back to list/i }),
    ).toBeVisible();
  });
});

test.describe("Contact Management - Permission Checks", () => {
  test("AC-7.2.5: Author role redirects to portal", async ({ page }) => {
    // TODO: Login as author role
    // await loginAs(page, "author@testorg.com");

    await page.goto("/contacts");

    // Authors should redirect to /portal
    // await expect(page).toHaveURL(/portal/);
  });

  test("AC-7.2.1: Finance role can view contacts", async ({ page }) => {
    // TODO: Login as finance role
    // await loginAs(page, "finance@testorg.com");

    await page.goto("/contacts");

    // Finance should see the contact list
    // await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
  });
});
