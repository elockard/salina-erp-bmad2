import { expect, test } from "@playwright/test";

/**
 * E2E tests for user management feature (Story 1.6)
 * Tests full user flows through the browser
 */

test.describe("User Management", () => {
  test.beforeEach(async ({ page: _page }) => {
    // Authenticate as owner/admin (adjust based on test setup)
    // For now, assume authentication is handled by test fixtures
  });

  test("displays user management page", async ({ page }) => {
    await page.goto("/settings/users");

    // Check page title
    await expect(
      page.getByRole("heading", { name: "User Management" }),
    ).toBeVisible();

    // Check invite button (permission-gated)
    const _inviteButton = page.getByRole("button", { name: "Invite User" });
    // May or may not be visible depending on role
  });

  test("displays user list with filters", async ({ page }) => {
    await page.goto("/settings/users");

    // Check search input
    await expect(page.getByPlaceholder("Search by email...")).toBeVisible();

    // Check role filter dropdown
    await expect(page.getByRole("combobox")).toBeVisible();
  });

  test("invites new user successfully", async ({ page }) => {
    await page.goto("/settings/users");

    // Open invite dialog
    await page.getByRole("button", { name: "Invite User" }).click();

    // Fill form
    await page.fill('input[name="email"]', "newuser@example.com");
    await page.selectOption('select[name="role"]', "editor");

    // Submit
    await page.getByRole("button", { name: "Send Invitation" }).click();

    // Check toast notification
    await expect(page.getByText(/Invitation sent/i)).toBeVisible();

    // Verify user appears in table
    await expect(page.getByText("newuser@example.com")).toBeVisible();
  });

  test("shows validation errors for invalid email", async ({ page }) => {
    await page.goto("/settings/users");

    await page.getByRole("button", { name: "Invite User" }).click();

    // Enter invalid email
    await page.fill('input[name="email"]', "invalid-email");
    await page.getByRole("button", { name: "Send Invitation" }).click();

    // Check validation error
    await expect(page.getByText(/Invalid email/i)).toBeVisible();
  });

  test("updates user role inline", async ({ page }) => {
    await page.goto("/settings/users");

    // Find first editor user in table
    const row = page
      .locator("tr")
      .filter({ hasText: /editor/i })
      .first();

    // Open role dropdown
    await row.getByRole("combobox").click();

    // Select new role
    await page.getByRole("option", { name: "Finance" }).click();

    // Check toast notification
    await expect(page.getByText(/Role updated/i)).toBeVisible();

    // Verify role badge updated
    await expect(row.getByText("finance")).toBeVisible();
  });

  test("deactivates user", async ({ page }) => {
    await page.goto("/settings/users");

    // Find active editor
    const row = page
      .locator("tr")
      .filter({ hasText: /Active/i })
      .first();

    // Click deactivate button
    await row.getByRole("button", { name: "Deactivate" }).click();

    // Check toast
    await expect(page.getByText(/User deactivated/i)).toBeVisible();

    // Verify status changed to Inactive
    await expect(row.getByText("Inactive")).toBeVisible();

    // Verify button changed to Reactivate
    await expect(row.getByRole("button", { name: "Reactivate" })).toBeVisible();
  });

  test("reactivates inactive user", async ({ page }) => {
    await page.goto("/settings/users");

    // Find inactive user
    const row = page
      .locator("tr")
      .filter({ hasText: /Inactive/i })
      .first();

    // Click reactivate button
    await row.getByRole("button", { name: "Reactivate" }).click();

    // Check toast
    await expect(page.getByText(/User reactivated/i)).toBeVisible();

    // Verify status changed to Active
    await expect(row.getByText("Active")).toBeVisible();
  });

  test("filters users by role", async ({ page }) => {
    await page.goto("/settings/users");

    // Select owner filter
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Owner" }).click();

    // Verify all rows show owner role
    const rows = page.locator("tbody tr");
    const count = await rows.count();

    for (let i = 0; i < count; i++) {
      await expect(rows.nth(i).getByText("owner")).toBeVisible();
    }
  });

  test("searches users by email", async ({ page }) => {
    await page.goto("/settings/users");

    // Enter search query
    await page.fill('input[placeholder="Search by email..."]', "admin");

    // Wait for debounce
    await page.waitForTimeout(500);

    // Verify filtered results
    const rows = page.locator("tbody tr");
    const count = await rows.count();

    if (count > 0) {
      for (let i = 0; i < count; i++) {
        const text = await rows.nth(i).textContent();
        expect(text?.toLowerCase()).toContain("admin");
      }
    }
  });

  test("shows empty state when no users match filter", async ({ page }) => {
    await page.goto("/settings/users");

    // Enter non-existent email
    await page.fill(
      'input[placeholder="Search by email..."]',
      "nonexistent@example.com",
    );

    // Wait for results
    await page.waitForTimeout(500);

    // Check empty state
    await expect(page.getByText("No users found")).toBeVisible();
  });

  test("prevents duplicate invitations", async ({ page }) => {
    await page.goto("/settings/users");

    // Get existing user email
    const firstEmail = await page
      .locator("tbody tr:first-child td:first-child")
      .textContent();

    if (firstEmail) {
      // Try to invite existing user
      await page.getByRole("button", { name: "Invite User" }).click();
      await page.fill('input[name="email"]', firstEmail);
      await page.selectOption('select[name="role"]', "editor");
      await page.getByRole("button", { name: "Send Invitation" }).click();

      // Check error message
      await expect(page.getByText(/already exists/i)).toBeVisible();
    }
  });

  test("shows loading state during actions", async ({ page }) => {
    await page.goto("/settings/users");

    // Click deactivate on first user
    const row = page.locator("tbody tr").first();
    await row.getByRole("button", { name: "Deactivate" }).click();

    // Check loading text appears briefly
    await expect(row.getByText(/Deactivating.../i)).toBeVisible({
      timeout: 1000,
    });
  });
});

test.describe("RBAC - Permission Checks", () => {
  test("hides invite button for non-admin users", async ({ page }) => {
    // TODO: Authenticate as editor or finance role
    await page.goto("/settings/users");

    // Invite button should not be visible
    const inviteButton = page.getByRole("button", { name: "Invite User" });
    await expect(inviteButton).not.toBeVisible();
  });

  test("hides role editor for non-admin users", async ({ page }) => {
    // TODO: Authenticate as editor role
    await page.goto("/settings/users");

    // Role should display as badge, not dropdown
    const rows = page.locator("tbody tr");
    const firstRow = rows.first();

    // Should show badge, not select
    await expect(firstRow.locator("select")).not.toBeVisible();
  });
});
