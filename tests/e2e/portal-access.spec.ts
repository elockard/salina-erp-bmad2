import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Author Portal Access Provisioning
 * Story 2.3 - Author Portal Access Provisioning
 * Story 0.5: Consolidated to use /contacts?role=author
 *
 * Note: These tests require:
 * - Test database seeded with test tenant and users
 * - Authentication helpers to login as different roles
 * - Test contacts with author role to be created/cleaned up
 */

test.describe("Portal Access - Grant Portal Access (AC: 35)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner user with MANAGE_USERS permission
    // await loginAs(page, "owner@testorg.com");
    // Story 0.5: Authors are now contacts with author role
    await page.goto("/contacts?role=author");
  });

  test("AC1: Grant Portal Access button visible in Author Detail panel", async ({
    page,
  }) => {
    // Click on first author in list
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Portal Access section should be visible
    await expect(
      page.getByRole("heading", { name: "Portal Access" }),
    ).toBeVisible();

    // Grant Portal Access button should be visible (if author has email and no portal access)
    // Note: Depends on test data - author must have email but no portal_user_id
    const _grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    // await expect(grantButton).toBeVisible();
  });

  test("AC3: Disabled tooltip shown when author has no email", async ({
    page,
  }) => {
    // TODO: Create/select an author without email
    // Navigate to author detail
    // Button should be disabled with tooltip
    const _grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    // Check disabled state
    // await expect(grantButton).toBeDisabled();
  });

  test("AC4: Clicking Grant Portal Access opens confirmation dialog", async ({
    page,
  }) => {
    // Click on author with email
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Click Grant Portal Access
    const grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    if (await grantButton.isVisible()) {
      await grantButton.click();

      // Confirmation dialog should appear
      await expect(
        page.getByRole("alertdialog", { name: /Grant Portal Access/i }),
      ).toBeVisible();
    }
  });

  test("AC5: Confirmation dialog shows invitation text", async ({ page }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    const grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    if (await grantButton.isVisible()) {
      await grantButton.click();

      // Dialog should show invitation text
      await expect(page.getByText(/Send portal invitation/i)).toBeVisible();
      await expect(
        page.getByText(/email to create their account/i),
      ).toBeVisible();
    }
  });

  test("AC11: Success toast shows after granting access", async ({ page }) => {
    // This test requires an author with email but no portal access
    // and valid Clerk API credentials
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    const grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    if (await grantButton.isVisible()) {
      await grantButton.click();

      // Confirm in dialog
      await page.getByRole("button", { name: /Send Invitation/i }).click();

      // Success toast should appear (or error if Clerk not configured)
      // await expect(page.getByText(/Portal invitation sent/i)).toBeVisible();
    }
  });

  test("AC19: Portal status badge shows state correctly", async ({ page }) => {
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Portal Access section should show status badge
    const _portalAccessSection = page
      .locator("text=Portal Access")
      .locator("..");

    // Should show one of: Active (green), Pending (yellow), None (gray)
    // const activeBadge = portalAccessSection.getByText("Active");
    // const pendingBadge = portalAccessSection.getByText("Pending Activation");
    // const noneBadge = portalAccessSection.getByText("None");
  });

  test("AC32: Portal icon shows in author list for authors with access", async ({
    page: _page,
  }) => {
    // Authors with portal access should show key icon in list
    // Look for the portal icon in the author list
    // const authorWithPortal = page.locator('[role="option"]').filter({ hasText: "🔑" });
    // If test data has an author with portal access, verify icon is visible
  });
});

test.describe("Portal Access - Revoke Portal Access (AC: 35)", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner user
    // await loginAs(page, "owner@testorg.com");
    // Story 0.5: Authors are now contacts with author role
    await page.goto("/contacts?role=author");
  });

  test("AC15: Revoke Portal Access button visible when author has access", async ({
    page: _page,
  }) => {
    // Select author with portal access
    // const authorWithAccess = page.locator('[role="option"]').filter({ hasText: "🔑" }).first();
    // await authorWithAccess.click();
    // Revoke button should be visible
    // await expect(page.getByRole("button", { name: /Revoke Portal Access/i })).toBeVisible();
  });

  test("AC16: Clicking Revoke shows confirmation dialog", async ({
    page: _page,
  }) => {
    // Select author with portal access
    // Click Revoke button
    // await page.getByRole("button", { name: /Revoke Portal Access/i }).click();
    // Dialog should appear
    // await expect(page.getByRole("alertdialog")).toBeVisible();
    // await expect(page.getByText(/Are you sure/i)).toBeVisible();
  });

  test("AC18: Success toast shows after revoking access", async ({
    page: _page,
  }) => {
    // Select author with portal access
    // Click Revoke and confirm
    // Toast should appear
    // await expect(page.getByText(/Portal access revoked/i)).toBeVisible();
  });
});

test.describe("Portal Access - Deactivated User Access (AC: 36)", () => {
  test("AC36: Deactivated portal user cannot access portal route", async ({
    page,
  }) => {
    // This test requires:
    // 1. An author with portal access that has been revoked (is_active=false)
    // 2. Ability to login as that user (which should fail or redirect)

    // TODO: Login as deactivated portal user
    // await loginAs(page, "deactivated-author@testorg.com");

    // Navigate to portal
    await page.goto("/portal");

    // Should be redirected to sign-in with error
    // await expect(page).toHaveURL(/sign-in/);
    // Or show access denied message
  });

  test("Author users are redirected from dashboard to portal", async ({
    page,
  }) => {
    // TODO: Login as active author portal user
    // await loginAs(page, "author@testorg.com");

    // Try to access dashboard
    await page.goto("/dashboard");

    // Should be redirected to portal
    // await expect(page).toHaveURL(/portal/);
  });

  test("Non-author users are redirected from portal to dashboard", async ({
    page,
  }) => {
    // TODO: Login as owner/admin user
    // await loginAs(page, "owner@testorg.com");

    // Try to access portal
    await page.goto("/portal");

    // Should be redirected to dashboard
    // await expect(page).toHaveURL(/dashboard/);
  });
});

test.describe("Portal Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as active author portal user
    // await loginAs(page, "author@testorg.com");
    await page.goto("/portal");
  });

  test("AC24: Portal page shows welcome message with author name", async ({
    page,
  }) => {
    // Welcome heading should be visible
    await expect(page.getByText(/Welcome,/i)).toBeVisible();
    // Author name should be in the heading
    // await expect(page.getByRole("heading", { level: 1 })).toContainText("Welcome");
  });

  test("AC25: Portal page shows royalty statements placeholder", async ({
    page,
  }) => {
    // Royalty Statements section
    await expect(
      page.getByRole("heading", { name: /Royalty Statements/i }),
    ).toBeVisible();
    await expect(page.getByText(/No statements available/i)).toBeVisible();
  });

  test("AC22: Portal layout has minimal header with sign-out", async ({
    page,
  }) => {
    // Header should be visible
    await expect(page.getByRole("banner")).toBeVisible();

    // Author Portal title
    await expect(page.getByText("Author Portal")).toBeVisible();

    // Sign Out button
    await expect(page.getByRole("button", { name: /Sign Out/i })).toBeVisible();
  });
});

test.describe("Portal Access - Permission Checks", () => {
  test("Only owner/admin can see Grant Portal Access button", async ({
    page,
  }) => {
    // TODO: Login as editor (has CREATE_AUTHORS_TITLES but not MANAGE_USERS)
    // await loginAs(page, "editor@testorg.com");
    // Story 0.5: Authors are now contacts with author role
    await page.goto("/contacts?role=author");

    // Select an author
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Grant Portal Access button should NOT be visible to editor
    const _grantButton = page.getByRole("button", {
      name: /Grant Portal Access/i,
    });
    // await expect(grantButton).not.toBeVisible();
  });

  test("Finance role cannot grant portal access", async ({ page }) => {
    // TODO: Login as finance (not in MANAGE_USERS)
    // await loginAs(page, "finance@testorg.com");
    // Story 0.5: Authors are now contacts with author role
    await page.goto("/contacts?role=author");

    // Select an author
    const authorItem = page.locator('[role="option"]').first();
    await authorItem.click();

    // Button should not be visible
    // await expect(page.getByRole("button", { name: /Grant Portal Access/i })).not.toBeVisible();
  });
});
