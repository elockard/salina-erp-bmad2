import { expect, test } from "@playwright/test";

// Note: These tests assume the test database is seeded with:
// - Tenant with subdomain "testorg"
// - Users with roles: owner, editor, finance, author
// - Clerk authentication is mocked or test accounts exist

test.describe("Dashboard - Role-Based Access", () => {
  test("Owner sees full dashboard with all navigation", async ({ page }) => {
    // Login as owner
    // TODO: Implement login helper when authentication test infrastructure is ready
    // await loginAs(page, "owner@testorg.com", "password");

    await page.goto("/dashboard");

    // AC7: Welcome message with role
    await expect(page.locator("h1")).toContainText("Welcome back");
    await expect(page.locator("h1")).toContainText("owner");

    // AC9: Owner/Admin dashboard shows user counts and titles
    await expect(page.getByText("Active Users")).toBeVisible();
    await expect(page.getByText("Total Titles")).toBeVisible();
    await expect(page.getByText("Recent Activity")).toBeVisible();
  });

  test("Editor sees filtered dashboard with editor-specific content", async ({
    page,
  }) => {
    // Login as editor
    // await loginAs(page, "editor@testorg.com", "password");

    await page.goto("/dashboard");

    // AC10: Editor dashboard shows authors, titles, ISBN
    await expect(page.getByText("Total Authors")).toBeVisible();
    await expect(page.getByText("Total Titles")).toBeVisible();
    await expect(page.getByText("ISBN Available")).toBeVisible();

    // AC10: Quick action buttons present (with Coming Soon badges)
    await expect(page.getByText("Create Author")).toBeVisible();
    await expect(page.getByText("Create Title")).toBeVisible();
    await expect(page.getByText("Assign ISBN")).toBeVisible();
  });

  test("Finance sees finance-specific dashboard", async ({ page }) => {
    // Login as finance
    // await loginAs(page, "finance@testorg.com", "password");

    await page.goto("/dashboard");

    // AC11: Finance dashboard shows pending returns, royalty liability, statement date
    await expect(page.getByText("Pending Returns")).toBeVisible();
    await expect(page.getByText("Royalty Liability")).toBeVisible();
    await expect(page.getByText("Last Statement")).toBeVisible();

    // AC11: Quick action buttons present (with Coming Soon badges)
    await expect(page.getByText("Approve Returns")).toBeVisible();
    await expect(page.getByText("Calculate Royalties")).toBeVisible();
    await expect(page.getByText("Generate Statements")).toBeVisible();
  });

  test("Author redirects to /portal", async ({ page }) => {
    // Login as author
    // await loginAs(page, "author@testorg.com", "password");

    await page.goto("/dashboard");

    // AC6: Author role redirects to portal
    await expect(page).toHaveURL("/portal");
  });

  test("Unauthenticated user redirects to sign-in", async ({ page }) => {
    // Don't login
    await page.goto("/dashboard");

    // AC22: Redirects unauthenticated users
    await expect(page).toHaveURL(/sign-in/);
  });
});

test.describe("Dashboard - Content Display", () => {
  test("Dashboard displays tenant name in header", async ({ page }) => {
    // Login as owner
    // await loginAs(page, "owner@testorg.com", "password");

    await page.goto("/dashboard");

    // AC13: Tenant name in header (layout component)
    // TODO: Verify once layout component is implemented
  });

  test("Dashboard shows correct page title", async ({ page }) => {
    // Login as owner
    // await loginAs(page, "owner@testorg.com", "password");

    await page.goto("/dashboard");

    // AC24: Browser tab title
    await expect(page).toHaveTitle("Dashboard - Salina ERP");
  });

  test("Coming soon badges appear on unimplemented modules", async ({
    page,
  }) => {
    // Login as editor
    // await loginAs(page, "editor@testorg.com", "password");

    await page.goto("/dashboard");

    // AC25: Coming soon badges on placeholder actions
    const comingSoonBadges = page.locator("text=Coming Soon");
    await expect(comingSoonBadges).toHaveCount(3); // Create Author, Create Title, Assign ISBN
  });
});

test.describe("Dashboard - Welcome Page Integration", () => {
  test("Welcome page has Go to Dashboard button", async ({ page }) => {
    // Login
    // await loginAs(page, "owner@testorg.com", "password");

    await page.goto("/welcome");

    // AC26: Dashboard accessible from welcome page
    const dashboardLink = page.getByRole("link", {
      name: "Continue to Dashboard",
    });
    await expect(dashboardLink).toBeVisible();

    // Click and verify navigation
    await dashboardLink.click();
    await expect(page).toHaveURL("/dashboard");
  });
});

test.describe("Dashboard - Responsive Design", () => {
  test("Dashboard layout responsive on mobile", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login as owner
    // await loginAs(page, "owner@testorg.com", "password");

    await page.goto("/dashboard");

    // AC15: Responsive layout
    // Verify cards stack vertically on mobile
    const cards = page.locator('[class*="Card"]');
    await expect(cards.first()).toBeVisible();
  });
});

// Note: Full test implementation requires:
// 1. Test database seeding (tenants, users with different roles)
// 2. Authentication test helpers (loginAs, logout)
// 3. Clerk test mode or mock authentication
// 4. Setup in tests/setup.ts
