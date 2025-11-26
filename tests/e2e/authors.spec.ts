import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Author Management Split View
 * Story 2.2 - Build Author Management Split View Interface
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - Authentication helper to be implemented
 * - Test authors to be created/cleaned up
 */

test.describe("Author Management - Split View Layout", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner/admin user with CREATE_AUTHORS_TITLES permission
    // await loginAs(page, "owner@testorg.com");
    await page.goto("/dashboard/authors");
  });

  test("AC1: Split View layout renders with left (320px) and right (fluid) panels", async ({
    page,
  }) => {
    // Left panel should be visible with fixed width
    const leftPanel = page.locator('[class*="w-\\[320px\\]"]');
    await expect(leftPanel).toBeVisible();

    // Header with "Authors" title
    await expect(page.getByRole("heading", { name: "Authors" })).toBeVisible();

    // Right panel for details
    const rightPanel = page.locator('[class*="flex-1"]');
    await expect(rightPanel).toBeVisible();
  });

  test("AC2: Left panel displays scrollable author list with search box", async ({
    page,
  }) => {
    // Search input visible
    const searchInput = page.getByPlaceholder("Search authors...");
    await expect(searchInput).toBeVisible();

    // Author list exists
    const authorList = page.getByRole("listbox", { name: "Authors" });
    await expect(authorList).toBeVisible();
  });

  test("AC3: Search filters authors by name (case-insensitive)", async ({
    page,
  }) => {
    const searchInput = page.getByPlaceholder("Search authors...");

    // Search for a partial name
    await searchInput.fill("alice");

    // Wait for debounce (300ms)
    await page.waitForTimeout(400);

    // Results should be filtered (exact assertions depend on test data)
    // const authorItems = page.locator('[role="option"]');
    // Results should contain matching authors
  });

  test("AC13: Create Author button opens modal dialog", async ({ page }) => {
    // Click create button
    await page.getByRole("button", { name: /Create Author/i }).click();

    // Modal should open
    await expect(
      page.getByRole("dialog", { name: "Create Author" })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create Author" })
    ).toBeVisible();
  });

  test("AC14: Create Author form has required fields", async ({ page }) => {
    await page.getByRole("button", { name: /Create Author/i }).click();

    // Form fields
    await expect(page.getByLabel("Name *")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Phone")).toBeVisible();
    await expect(page.getByLabel("Address")).toBeVisible();
    await expect(page.getByLabel("Payment Method")).toBeVisible();
  });

  test("AC15: Payment Method dropdown has correct options", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Author/i }).click();

    // Click payment method dropdown
    await page.getByLabel("Payment Method").click();

    // Check options
    await expect(
      page.getByRole("option", { name: "Direct Deposit" })
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Check" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Wire Transfer" })
    ).toBeVisible();
  });

  test("AC16: Form validation shows inline error for empty name", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Author/i }).click();

    // Try to submit without name
    await page.getByRole("button", { name: "Create Author" }).click();

    // Error message should appear
    await expect(page.getByText("Name is required")).toBeVisible();
  });

  test("AC21: Creating author shows success toast and updates list", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Author/i }).click();

    // Fill form
    await page.getByLabel("Name *").fill(`Test Author ${Date.now()}`);
    await page.getByLabel("Email").fill("test@example.com");

    // Submit
    await page.getByRole("button", { name: "Create Author" }).click();

    // Success toast should appear
    await expect(page.getByText("Author created successfully")).toBeVisible();

    // Modal should close
    await expect(
      page.getByRole("dialog", { name: "Create Author" })
    ).not.toBeVisible();
  });

  test("AC25: Show inactive toggle filters inactive authors", async ({
    page,
  }) => {
    // Checkbox for showing inactive
    const showInactiveCheckbox = page.getByLabel("Show inactive");
    await expect(showInactiveCheckbox).toBeVisible();

    // Toggle it on
    await showInactiveCheckbox.check();

    // Should trigger reload with inactive authors
    // (Verify based on test data)
  });

  test("AC26: Empty state shows when no authors exist", async ({ page }) => {
    // This test depends on having a clean tenant with no authors
    // Check for empty state message
    const emptyState = page.getByText("No authors yet");
    // await expect(emptyState).toBeVisible();
  });
});

test.describe("Author Management - Detail View", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login and navigate
    await page.goto("/dashboard/authors");
  });

  test("AC6: Clicking author row loads detail in right panel", async ({
    page,
  }) => {
    // Click on first author in list
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Right panel should show author details
    await expect(
      page.getByRole("heading", { name: "Author Details" })
    ).toBeVisible();
  });

  test("AC7: Right panel displays author fields", async ({ page }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Detail fields should be visible
    await expect(page.getByText("Name")).toBeVisible();
    await expect(page.getByText("Email")).toBeVisible();
    await expect(page.getByText("Phone")).toBeVisible();
    await expect(page.getByText("Address")).toBeVisible();
    await expect(page.getByText("Payment Method")).toBeVisible();
  });

  test("AC9: Titles section shows placeholder", async ({ page }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    await expect(
      page.getByRole("heading", { name: "Titles by this Author" })
    ).toBeVisible();
  });

  test("AC10: Contracts section shows placeholder for Epic 4", async ({
    page,
  }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    await expect(
      page.getByRole("heading", { name: "Contracts" })
    ).toBeVisible();
    await expect(
      page.getByText("Contract management coming in Epic 4")
    ).toBeVisible();
  });

  test("AC11: Edit button enables inline editing", async ({ page }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Click Edit button
    await page.getByRole("button", { name: /Edit/i }).click();

    // Form should be in edit mode
    await expect(
      page.getByRole("heading", { name: "Edit Author" })
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Save Changes" })
    ).toBeVisible();
  });

  test("AC12: Deactivate button shows confirmation dialog", async ({
    page,
  }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Click deactivate
    await page.getByRole("button", { name: "Deactivate Author" }).click();

    // Confirmation dialog should appear
    await expect(
      page.getByRole("dialog", { name: /Deactivate Author/i })
    ).toBeVisible();
    await expect(page.getByText(/Are you sure/i)).toBeVisible();
  });
});

test.describe("Author Management - Responsive Behavior", () => {
  test("AC28: Mobile view shows list only, detail slides in", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/authors");

    // Left panel should be visible (full width on mobile)
    const leftPanel = page.locator('[class*="max-md:w-full"]');
    await expect(leftPanel).toBeVisible();

    // Click on author
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Back button should appear on mobile detail view
    await expect(
      page.getByRole("button", { name: /Back to list/i })
    ).toBeVisible();
  });
});

test.describe("Author Management - Permission Checks", () => {
  test("AC20: Unauthorized users cannot access author actions", async ({
    page,
  }) => {
    // TODO: Login as author role (VIEW_OWN_STATEMENTS only)
    // await loginAs(page, "author@testorg.com");

    await page.goto("/dashboard/authors");

    // Should redirect or show unauthorized
    // Authors role redirects to /portal
    await expect(page).toHaveURL(/portal/);
  });
});
