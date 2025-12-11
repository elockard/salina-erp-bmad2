import { expect, test } from "@playwright/test";

// No auth fixture needed - landing page is public
test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("loads for unauthenticated users", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /publishing erp/i }),
    ).toBeVisible();
  });

  test("displays hero section with headline", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Publishing ERP Built for/i }),
    ).toBeVisible();
    // Check hero subheadline - use first() to avoid matching other sections
    await expect(
      page.getByText(/streamline your publishing operations/i).first(),
    ).toBeVisible();
  });

  test("CTA navigates to sign-up", async ({ page }) => {
    await page
      .getByRole("link", { name: /get started/i })
      .first()
      .click();
    await expect(page).toHaveURL(/sign-up/);
  });

  test("login button navigates to sign-in", async ({ page }) => {
    // Use nav locator to target the main navigation login button
    await page
      .getByRole("navigation")
      .getByRole("link", { name: /login/i })
      .click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("displays features section with 6 features", async ({ page }) => {
    // Use the features section by id to scope the checks
    const featuresSection = page.locator("#features");
    await expect(
      featuresSection.getByRole("heading", {
        name: /Tiered Royalty Calculations/i,
      }),
    ).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", { name: /ISBN Pool Management/i }),
    ).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", { name: /Author Portal/i }),
    ).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", { name: /Financial Reporting/i }),
    ).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", { name: /Multi-tenant SaaS/i }),
    ).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", { name: /Returns Workflow/i }),
    ).toBeVisible();
  });

  test("displays pricing section with three tiers", async ({ page }) => {
    await expect(page.getByText(/Starter/).first()).toBeVisible();
    await expect(page.getByText(/Professional/).first()).toBeVisible();
    await expect(page.getByText(/Enterprise/).first()).toBeVisible();
  });

  test("displays how it works section with steps", async ({ page }) => {
    await expect(page.getByText(/How It Works/i)).toBeVisible();
    await expect(page.getByText(/Sign Up & Configure/i)).toBeVisible();
    await expect(page.getByText(/Add Your Catalog/i)).toBeVisible();
  });

  test("displays testimonials section", async ({ page }) => {
    await expect(page.getByText(/Trusted by Publishers/i)).toBeVisible();
    await expect(page.getByText(/Sarah Johnson/i)).toBeVisible();
  });

  test("displays footer with links", async ({ page }) => {
    await expect(
      page.getByRole("link", { name: /privacy policy/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /terms of service/i }),
    ).toBeVisible();
    await expect(page.getByText(/hello@salina.media/i)).toBeVisible();
  });

  test("anchor navigation scrolls to sections", async ({ page }) => {
    // Click features link
    await page
      .getByRole("link", { name: /features/i })
      .first()
      .click();

    // Wait for scroll
    await page.waitForTimeout(500);

    // Verify URL has hash
    await expect(page).toHaveURL(/#features/);

    // Click pricing link
    await page
      .getByRole("link", { name: /pricing/i })
      .first()
      .click();

    // Wait for scroll
    await page.waitForTimeout(500);

    // Verify URL has hash
    await expect(page).toHaveURL(/#pricing/);
  });

  test("has correct meta title", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain("Salina ERP");
    expect(title).toContain("Publishing ERP");
  });
});

test.describe("Landing Page Mobile Navigation", () => {
  test.beforeEach(async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/");
  });

  test("mobile menu button is visible", async ({ page }) => {
    await expect(page.getByLabel(/open menu/i)).toBeVisible();
  });

  test("mobile menu opens and closes", async ({ page }) => {
    // Open menu
    await page.getByLabel(/open menu/i).click();

    // Navigation links should be visible
    await expect(
      page.getByRole("link", { name: /features/i }).first(),
    ).toBeVisible();

    // Close menu
    await page.getByLabel(/close menu/i).click();

    // Menu should be closed (open button visible again)
    await expect(page.getByLabel(/open menu/i)).toBeVisible();
  });

  test("mobile menu links work", async ({ page }) => {
    // Open menu
    await page.getByLabel(/open menu/i).click();

    // Click Get Started
    await page
      .getByRole("link", { name: /get started/i })
      .first()
      .click();

    await expect(page).toHaveURL(/sign-up/);
  });
});

test.describe("Landing Page Responsive Design", () => {
  test("renders correctly on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /publishing erp/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /get started/i }).first(),
    ).toBeVisible();
  });

  test("renders correctly on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /publishing erp/i }),
    ).toBeVisible();

    // Desktop nav should be visible (not mobile menu)
    await expect(
      page.getByRole("link", { name: /features/i }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /pricing/i }).first(),
    ).toBeVisible();
  });
});
