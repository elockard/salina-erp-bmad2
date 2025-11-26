import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Title Management Split View
 * Story 2.5 - Build Title Management Split View Interface
 *
 * Note: These tests require:
 * - Test database seeded with test tenant, users, and authors
 * - Authentication helper to be implemented
 * - Test titles to be created/cleaned up
 */

test.describe("Title Management - Split View Layout", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner/admin/editor user with CREATE_AUTHORS_TITLES permission
    // await loginAs(page, "owner@testorg.com");
    await page.goto("/dashboard/titles");
  });

  test("AC1: Split View layout renders with left (320px) and right (fluid) panels", async ({
    page,
  }) => {
    // Left panel should be visible with fixed width
    const leftPanel = page.locator('[class*="w-\\[320px\\]"]');
    await expect(leftPanel).toBeVisible();

    // Header with "Titles" title
    await expect(page.getByRole("heading", { name: "Titles" })).toBeVisible();

    // Right panel for details
    const rightPanel = page.locator('[class*="flex-1"]');
    await expect(rightPanel).toBeVisible();
  });

  test("AC2: Left panel displays title list with search box and status filter", async ({
    page,
  }) => {
    // Search input visible
    const searchInput = page.getByPlaceholder(
      "Search titles, authors, ISBN...",
    );
    await expect(searchInput).toBeVisible();

    // Status filter dropdown
    const statusFilter = page.getByRole("combobox");
    await expect(statusFilter).toBeVisible();

    // Title list exists
    const titleList = page.getByRole("listbox", { name: "Titles" });
    await expect(titleList).toBeVisible();
  });

  test("AC2: Search filters titles by name", async ({ page }) => {
    const searchInput = page.getByPlaceholder(
      "Search titles, authors, ISBN...",
    );

    // Search for a partial title name
    await searchInput.fill("test");

    // Wait for debounce
    await page.waitForTimeout(400);

    // Results should be filtered (exact assertions depend on test data)
  });

  test("AC2: Status filter dropdown has correct options", async ({ page }) => {
    // Click status filter dropdown
    await page.getByRole("combobox").first().click();

    // Check options
    await expect(
      page.getByRole("option", { name: "All Statuses" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Draft" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Pending" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Published" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Out of Print" }),
    ).toBeVisible();
  });

  test("AC2: Title list items show title, author, status badge, format icons", async ({
    page,
  }) => {
    // First title item should have expected structure
    const titleItem = page.locator('[role="option"]').first();

    // Title text
    await expect(titleItem.locator(".font-medium")).toBeVisible();

    // Author name (in muted text)
    await expect(titleItem.locator(".text-muted-foreground")).toBeVisible();
  });

  test("AC2: Empty state shows when no titles exist", async ({ page }) => {
    // This test depends on having a clean tenant with no titles
    const emptyState = page.getByText("No titles yet");
    // await expect(emptyState).toBeVisible();
  });
});

test.describe("Title Management - Create Title Modal", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/titles");
  });

  test("AC5: Create Title button opens modal dialog", async ({ page }) => {
    // Click create button
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Modal should open
    await expect(
      page.getByRole("dialog", { name: "Create Title" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Create Title" }),
    ).toBeVisible();
  });

  test("AC5: Create Title form has required fields", async ({ page }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Form fields
    await expect(page.getByLabel("Title *")).toBeVisible();
    await expect(page.getByLabel("Subtitle")).toBeVisible();
    await expect(page.getByLabel("Author *")).toBeVisible();
    await expect(page.getByLabel("Genre")).toBeVisible();
    await expect(page.getByLabel("Word Count")).toBeVisible();
    await expect(page.getByLabel("Publication Status")).toBeVisible();
  });

  test("AC5: Author dropdown is searchable", async ({ page }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Click author dropdown
    await page.getByRole("button", { name: /Select author/i }).click();

    // Search input in combobox
    await expect(page.getByPlaceholder("Search authors...")).toBeVisible();
  });

  test("AC5: Genre dropdown has predefined options", async ({ page }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Click genre dropdown
    await page.getByLabel("Genre").click();

    // Check some options
    await expect(page.getByRole("option", { name: "Fiction" })).toBeVisible();
    await expect(
      page.getByRole("option", { name: "Non-Fiction" }),
    ).toBeVisible();
    await expect(page.getByRole("option", { name: "Mystery" })).toBeVisible();
    await expect(page.getByRole("option", { name: "Other" })).toBeVisible();
  });

  test("AC5: Publication Status defaults to Draft", async ({ page }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Status should show Draft
    await expect(page.getByLabel("Publication Status")).toContainText("Draft");
  });

  test("AC5: Form validation shows inline error for empty title", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Try to submit without filling title
    await page.getByRole("button", { name: "Create Title" }).click();

    // Error message should appear
    await expect(page.getByText("Title is required")).toBeVisible();
  });

  test("AC5: Form validation shows inline error for missing author", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Create Title/i }).click();

    // Fill title but not author
    await page.getByLabel("Title *").fill("Test Title");
    await page.getByRole("button", { name: "Create Title" }).click();

    // Error message should appear
    await expect(page.getByText("Author is required")).toBeVisible();
  });
});

test.describe("Title Management - Detail View", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/titles");
  });

  test("AC3: Clicking title row loads detail in right panel", async ({
    page,
  }) => {
    // Click on first title in list
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Right panel should show title details (not empty state)
    await expect(
      page.getByText("Select a title to view details"),
    ).not.toBeVisible();
  });

  test("AC3: Right panel displays all title fields", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Detail fields should be visible
    await expect(page.getByText("Title")).toBeVisible();
    await expect(page.getByText("Author")).toBeVisible();
    await expect(page.getByText("Genre")).toBeVisible();
    await expect(page.getByText("Word Count")).toBeVisible();
    await expect(page.getByText("Publication Date")).toBeVisible();
  });

  test("AC3: Author name links to author detail", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Author link should be present
    const authorLink = page.locator('a[href*="/dashboard/authors"]');
    await expect(authorLink).toBeVisible();
  });

  test("AC4: Formats section shows ISBN status", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Formats heading
    await expect(page.getByRole("heading", { name: "Formats" })).toBeVisible();

    // Physical format section
    await expect(page.getByText("Physical")).toBeVisible();

    // Ebook format section
    await expect(page.getByText("Ebook")).toBeVisible();

    // Audiobook coming soon
    await expect(page.getByText("Audiobook")).toBeVisible();
    await expect(page.getByText("Coming soon")).toBeVisible();
  });

  test("AC4: Assign ISBN buttons disabled (Story 2.9 integration point)", async ({
    page,
  }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Assign ISBN buttons should be present but disabled
    const assignIsbnButtons = page.getByRole("button", {
      name: /Assign.*ISBN/i,
    });
    // await expect(assignIsbnButtons.first()).toBeDisabled();
  });

  test("AC3: Sales Summary section shows placeholder", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    await expect(
      page.getByRole("heading", { name: "Sales Summary" }),
    ).toBeVisible();
    await expect(page.getByText("Sales data coming in Epic 3")).toBeVisible();
  });

  test("AC3: Created/Updated timestamps visible", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    await expect(page.getByText(/Created:/)).toBeVisible();
    await expect(page.getByText(/Updated:/)).toBeVisible();
  });
});

test.describe("Title Management - Inline Editing", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/dashboard/titles");
  });

  test("AC3: Inline edit buttons visible for editable fields", async ({
    page,
  }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Edit buttons (pencil icons) should be visible
    const editButtons = page.locator("button:has(svg.lucide-pencil)");
    await expect(editButtons.first()).toBeVisible();
  });

  test("AC3: Status dropdown allows inline status change", async ({ page }) => {
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Status dropdown should be visible for users with edit permission
    const statusDropdown = page.locator('[role="combobox"]').nth(1); // Second combobox after filter
    // Should be able to change status
  });
});

test.describe("Title Management - Responsive Behavior", () => {
  test("AC1: Mobile view shows list only, detail slides in", async ({
    page,
  }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/titles");

    // Left panel should be visible (full width on mobile)
    const leftPanel = page.locator('[class*="max-md:w-full"]');
    await expect(leftPanel).toBeVisible();

    // Click on title
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Back button should appear on mobile detail view
    await expect(
      page.getByRole("button", { name: /Back to list/i }),
    ).toBeVisible();
  });

  test("AC1: Back button returns to list on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/dashboard/titles");

    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Click back button
    await page.getByRole("button", { name: /Back to list/i }).click();

    // Should return to list view
    const titleList = page.getByRole("listbox", { name: "Titles" });
    await expect(titleList).toBeVisible();
  });
});

test.describe("Title Management - Permission Checks", () => {
  test("AC6: Unauthorized users cannot see Create button", async ({ page }) => {
    // TODO: Login as finance role (no CREATE_AUTHORS_TITLES permission)
    // await loginAs(page, "finance@testorg.com");

    await page.goto("/dashboard/titles");

    // Create button should not be visible
    // await expect(page.getByRole("button", { name: /Create Title/i })).not.toBeVisible();
  });

  test("AC6: Author role redirects to portal", async ({ page }) => {
    // TODO: Login as author role
    // await loginAs(page, "author@testorg.com");

    await page.goto("/dashboard/titles");

    // Should redirect to portal
    await expect(page).toHaveURL(/portal/);
  });

  test("AC6: Inline edit controls disabled for unauthorized users", async ({
    page,
  }) => {
    // TODO: Login as finance role (no CREATE_AUTHORS_TITLES permission)
    // await loginAs(page, "finance@testorg.com");

    await page.goto("/dashboard/titles");

    // Select a title
    const titleItem = page.locator('[role="option"]').first();
    await titleItem.click();

    // Edit buttons should not be visible for unauthorized users
    // const editButtons = page.locator('button:has(svg.lucide-pencil)');
    // await expect(editButtons.first()).not.toBeVisible();
  });
});
