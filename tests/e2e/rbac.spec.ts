import { expect, test } from "@playwright/test";

/**
 * End-to-End tests for RBAC system
 * Tests role-based UI access and data isolation across all roles
 * Prerequisites: Test database seeded with users of different roles
 */

test.describe("RBAC System - Role-Based Access Control", () => {
  test.describe("Owner Role", () => {
    test.beforeEach(async ({ page }) => {
      // Login as owner user
      // Note: Replace with actual Clerk authentication in real implementation
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "owner@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');

      // Wait for redirect to dashboard
      await page.waitForURL("**/dashboard");
    });

    test("Owner can access user management page", async ({ page }) => {
      // Navigate to user management (only owner/admin should see this)
      await page.goto("/settings/users");

      // Should NOT see 403 error or redirect
      await expect(page).not.toHaveURL("**/unauthorized");
      await expect(page.locator("text=Permission denied")).not.toBeVisible();

      // Should see user management UI
      await expect(
        page.locator("h1:has-text('User Management')"),
      ).toBeVisible();
    });

    test("Owner can access tenant settings page", async ({ page }) => {
      await page.goto("/settings");

      // Should see settings page
      await expect(page.locator("h1:has-text('Settings')")).toBeVisible();

      // Should see owner-specific options (like billing)
      await expect(page.locator("text=Billing")).toBeVisible();
      await expect(page.locator("text=Delete Tenant")).toBeVisible();
    });
  });

  test.describe("Admin Role", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "admin@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard");
    });

    test("Admin can access user management page", async ({ page }) => {
      await page.goto("/settings/users");

      // Should see user management page
      await expect(
        page.locator("h1:has-text('User Management')"),
      ).toBeVisible();
    });

    test("Admin cannot see owner-only features (billing, delete tenant)", async ({
      page,
    }) => {
      await page.goto("/settings");

      // Should see settings page
      await expect(page.locator("h1:has-text('Settings')")).toBeVisible();

      // Should NOT see billing or delete tenant (owner-only)
      await expect(page.locator("text=Billing")).not.toBeVisible();
      await expect(page.locator("text=Delete Tenant")).not.toBeVisible();
    });
  });

  test.describe("Editor Role", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "editor@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard");
    });

    test("Editor cannot access user management page", async ({ page }) => {
      await page.goto("/settings/users");

      // Should see 403 error or be redirected
      await expect(
        page.locator("text=You don't have permission"),
      ).toBeVisible();
    });

    test("Editor can access contact management page (authors)", async ({ page }) => {
      await page.goto("/contacts?role=author");

      // Should see contacts page (Story 0.5: Authors consolidated into Contacts)
      await expect(page.locator("h1:has-text('Contacts')")).toBeVisible();

      // Should see create button
      await expect(
        page.locator("button:has-text('Create Contact')"),
      ).toBeVisible();
    });

    test("Editor cannot access return approval page", async ({ page }) => {
      await page.goto("/returns/approval");

      // Should see 403 error (only finance/admin/owner)
      await expect(
        page.locator("text=You don't have permission"),
      ).toBeVisible();
    });
  });

  test.describe("Finance Role", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "finance@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard");
    });

    test("Finance can access return approval page", async ({ page }) => {
      await page.goto("/returns/approval");

      // Should see return approval queue
      await expect(
        page.locator("h1:has-text('Return Approval')"),
      ).toBeVisible();
    });

    test("Finance can access royalty calculation page", async ({ page }) => {
      await page.goto("/royalties/calculate");

      // Should see royalty calculation page
      await expect(
        page.locator("h1:has-text('Calculate Royalties')"),
      ).toBeVisible();
    });

    test("Finance cannot create contacts or titles", async ({ page }) => {
      await page.goto("/contacts?role=author");

      // Should see contacts list but NOT create button (editor/admin/owner only)
      // Story 0.5: Authors consolidated into Contacts
      await expect(page.locator("h1:has-text('Contacts')")).toBeVisible();
      await expect(
        page.locator("button:has-text('Create Contact')"),
      ).not.toBeVisible();
    });
  });

  test.describe("Author Role (Portal Access)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "author@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');

      // Authors should be redirected to portal, not dashboard
      await page.waitForURL("**/portal");
    });

    test("Author can only see own statements", async ({ page }) => {
      await page.goto("/portal/statements");

      // Should see statements page
      await expect(page.locator("h1:has-text('Statements')")).toBeVisible();

      // Should only see statements for current author
      // (Data isolation test - requires seeded database)
      const statements = page.locator('[data-testid="statement-row"]');
      const count = await statements.count();

      // Verify statements are only for this author
      for (let i = 0; i < count; i++) {
        const authorName = await statements
          .nth(i)
          .locator('[data-testid="author-name"]')
          .textContent();
        expect(authorName).toContain("Test Author"); // Current logged-in author
      }
    });

    test("Author cannot access staff dashboard", async ({ page }) => {
      await page.goto("/dashboard");

      // Should be redirected or see 403
      await expect(page).toHaveURL("**/portal");
    });

    test("Author cannot access contact management page", async ({ page }) => {
      // Story 0.5: /authors redirects to /contacts?role=author
      await page.goto("/contacts");

      // Should see 403 or redirect to portal
      await expect(
        page.locator("text=You don't have permission"),
      ).toBeVisible();
    });

    test("Author cannot access sales or returns pages", async ({ page }) => {
      await page.goto("/sales");

      await expect(
        page.locator("text=You don't have permission"),
      ).toBeVisible();

      await page.goto("/returns");

      await expect(
        page.locator("text=You don't have permission"),
      ).toBeVisible();
    });
  });

  test.describe("Data Isolation", () => {
    test("Author can only view own statements, not other authors", async ({
      page,
    }) => {
      // Login as Author 1
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "author1@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/portal");

      await page.goto("/portal/statements");

      // Get statements visible to Author 1
      const _statementsAuthor1 = await page
        .locator('[data-testid="statement-row"]')
        .count();

      // Logout
      await page.goto("/sign-out");

      // Login as Author 2
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "author2@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/portal");

      await page.goto("/portal/statements");

      // Get statements visible to Author 2
      const _statementsAuthor2 = await page
        .locator('[data-testid="statement-row"]')
        .count();

      // Authors should have different statement counts (data isolation)
      // Unless both have same number of statements, which is unlikely in test data
      // More importantly, verify statements are DIFFERENT
      const author1Ids = await page
        .locator('[data-testid="statement-id"]')
        .allTextContents();
      const author2Ids = await page
        .locator('[data-testid="statement-id"]')
        .allTextContents();

      // No overlap in statement IDs (complete isolation)
      const intersection = author1Ids.filter((id) => author2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });

  test.describe("Permission Denied Error Messages", () => {
    test("Shows user-friendly error message on permission denial", async ({
      page,
    }) => {
      // Login as Editor (limited permissions)
      await page.goto("/sign-in");
      await page.fill('input[name="identifier"]', "editor@testcompany.com");
      await page.fill('input[name="password"]', "testpassword123");
      await page.click('button[type="submit"]');
      await page.waitForURL("**/dashboard");

      // Try to access user management (editor not allowed)
      await page.goto("/settings/users");

      // Should see user-friendly error message
      await expect(
        page.locator("text=You don't have permission to perform this action"),
      ).toBeVisible();

      // Should NOT see technical error details
      await expect(page.locator("text=UNAUTHORIZED")).not.toBeVisible();
      await expect(page.locator("text=403")).not.toBeVisible();
      await expect(page.locator("text=Forbidden")).not.toBeVisible();
    });
  });
});
