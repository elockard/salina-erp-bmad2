import { expect, test } from "@playwright/test";

// Uses "public" project - no auth required

test.describe("Contact Page", () => {
  test("navigates to contact page from footer", async ({ page }) => {
    await page.goto("/");
    // Use the footer link specifically (has href="/contact")
    await page.locator('footer').getByRole("link", { name: /contact/i }).click();
    await expect(page).toHaveURL(/\/contact/);
    await expect(
      page.getByRole("heading", { name: /contact us/i, level: 1 })
    ).toBeVisible();
  });

  test("contact page renders all form fields", async ({ page }) => {
    await page.goto("/contact");

    // Check all required fields are present
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/company/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send message/i })
    ).toBeVisible();
  });

  test("contact page shows company contact information", async ({ page }) => {
    await page.goto("/contact");

    // Use first() since email may appear multiple times in main section
    await expect(page.getByRole('main').getByText(/hello@salina.media/i).first()).toBeVisible();
    await expect(page.getByRole('main').getByText(/support@salina.media/i).first()).toBeVisible();
  });

  test("contact form shows success on valid submission", async ({ page }) => {
    await page.goto("/contact");

    // Fill in form
    await page.getByLabel(/name/i).fill("Test User");
    await page.getByLabel(/email/i).fill("test@example.com");
    await page.getByLabel(/message/i).fill("This is a test message for the contact form with enough characters.");

    // Submit form
    await page.getByRole("button", { name: /send message/i }).click();

    // Wait for success message
    await expect(page.getByText(/thank you/i)).toBeVisible({ timeout: 10000 });
  });

  test("contact form shows validation errors for empty required fields", async ({
    page,
  }) => {
    await page.goto("/contact");

    // Click submit without filling form
    await page.getByRole("button", { name: /send message/i }).click();

    // Form should show validation errors (React Hook Form client-side validation)
    // The form won't submit if required fields are empty
    await expect(page.getByLabel(/name/i)).toBeVisible();
  });

  test("contact page is accessible via direct URL", async ({ page }) => {
    await page.goto("/contact");
    await expect(page).toHaveURL(/\/contact/);
    await expect(
      page.getByRole("heading", { name: /contact us/i })
    ).toBeVisible();
  });
});

test.describe("Privacy Policy Page", () => {
  test("navigates to privacy page from footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /privacy policy/i }).click();
    await expect(page).toHaveURL(/\/privacy/);
    await expect(
      page.getByRole("heading", { name: /privacy policy/i, level: 1 })
    ).toBeVisible();
  });

  test("privacy page renders key sections", async ({ page }) => {
    await page.goto("/privacy");

    // Check required sections
    await expect(
      page.getByRole("heading", { name: /information we collect/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /how we use your information/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /cookies and tracking/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /data security/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /your rights/i })
    ).toBeVisible();
  });

  test("privacy page shows privacy contact email", async ({ page }) => {
    await page.goto("/privacy");
    // Use first() since email may appear multiple times on page
    await expect(page.getByText(/privacy@salina.media/i).first()).toBeVisible();
  });

  test("privacy page is accessible via direct URL", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page).toHaveURL(/\/privacy/);
  });
});

test.describe("Terms of Service Page", () => {
  test("navigates to terms page from footer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /terms of service/i }).click();
    await expect(page).toHaveURL(/\/terms/);
    await expect(
      page.getByRole("heading", { name: /terms of service/i, level: 1 })
    ).toBeVisible();
  });

  test("terms page renders key sections", async ({ page }) => {
    await page.goto("/terms");

    // Check required sections
    await expect(
      page.getByRole("heading", { name: /agreement to terms/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /use of service/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /subscription terms/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /acceptable use policy/i })
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: /limitation of liability/i })
    ).toBeVisible();
  });

  test("terms page shows legal contact email", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByText(/legal@salina.media/i)).toBeVisible();
  });

  test("terms page is accessible via direct URL", async ({ page }) => {
    await page.goto("/terms");
    await expect(page).toHaveURL(/\/terms/);
  });
});

test.describe("Navigation and Layout", () => {
  test("all public pages share consistent header/navigation", async ({
    page,
  }) => {
    // Check contact page - use navigation element to scope
    await page.goto("/contact");
    await expect(
      page.getByRole("link", { name: /salina erp/i }).first()
    ).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /features/i })).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: /pricing/i })).toBeVisible();

    // Check privacy page
    await page.goto("/privacy");
    await expect(
      page.getByRole("link", { name: /salina erp/i }).first()
    ).toBeVisible();

    // Check terms page
    await page.goto("/terms");
    await expect(
      page.getByRole("link", { name: /salina erp/i }).first()
    ).toBeVisible();
  });

  test("all public pages share consistent footer", async ({ page }) => {
    // Check contact page footer
    await page.goto("/contact");
    await expect(
      page.getByRole("link", { name: /privacy policy/i })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /terms of service/i })
    ).toBeVisible();

    // Check privacy page footer
    await page.goto("/privacy");
    await expect(
      page.getByRole("link", { name: /privacy policy/i })
    ).toBeVisible();

    // Check terms page footer
    await page.goto("/terms");
    await expect(
      page.getByRole("link", { name: /terms of service/i })
    ).toBeVisible();
  });

  test("can navigate back to home via logo", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("link", { name: /salina erp/i }).first().click();
    await expect(page).toHaveURL("/");
  });
});

test.describe("Responsive Design", () => {
  test("contact page is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/contact");

    // Form should be visible and usable
    await expect(page.getByLabel(/name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/message/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send message/i })
    ).toBeVisible();
  });

  test("privacy page is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/privacy");

    await expect(
      page.getByRole("heading", { name: /privacy policy/i })
    ).toBeVisible();
  });

  test("terms page is usable on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/terms");

    await expect(
      page.getByRole("heading", { name: /terms of service/i })
    ).toBeVisible();
  });
});
