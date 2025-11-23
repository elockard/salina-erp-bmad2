import { expect, test } from "@playwright/test";
import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { tenants, users } from "@/db/schema";

test.describe("Tenant Registration Flow", () => {
  const uniqueSubdomain = `testcorp-${Date.now()}`;
  const testEmail = `owner-${Date.now()}@testcorp.com`;

  test.afterEach(async () => {
    // Cleanup: Delete test tenant and user
    try {
      const tenant = await adminDb.query.tenants.findFirst({
        where: eq(tenants.subdomain, uniqueSubdomain),
      });

      if (tenant) {
        await adminDb.delete(users).where(eq(users.tenant_id, tenant.id));
        await adminDb.delete(tenants).where(eq(tenants.id, tenant.id));
      }
    } catch (error) {
      console.error("Cleanup failed:", error);
    }
  });

  test("Test 1: Navigate to registration page", async ({ page }) => {
    await page.goto("/register");
    await expect(
      page.getByRole("heading", { name: /create your workspace/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/company name/i)).toBeVisible();
    await expect(page.getByLabel(/subdomain/i)).toBeVisible();
    await expect(page.getByLabel(/owner email/i)).toBeVisible();
    await expect(page.getByLabel(/owner name/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
  });

  test("Test 2: Form fields render with correct labels and placeholders", async ({
    page,
  }) => {
    await page.goto("/register");

    const companyName = page.getByLabel(/company name/i);
    await expect(companyName).toHaveAttribute("placeholder", "Acme Publishing");

    const subdomain = page.getByLabel(/subdomain/i);
    await expect(subdomain).toHaveAttribute("placeholder", "acmepublishing");

    const email = page.getByLabel(/owner email/i);
    await expect(email).toHaveAttribute(
      "placeholder",
      "owner@acmepublishing.com",
    );

    const ownerName = page.getByLabel(/owner name/i);
    await expect(ownerName).toHaveAttribute("placeholder", "John Smith");
  });

  test("Test 3: Subdomain live preview updates as user types", async ({
    page,
  }) => {
    await page.goto("/register");

    const subdomainInput = page.getByLabel(/subdomain/i);
    await subdomainInput.fill("acme");

    // Wait for preview to update
    await expect(page.getByText(/acme\.salina-erp\.com/i)).toBeVisible();

    await subdomainInput.fill("testcorp");
    await expect(page.getByText(/testcorp\.salina-erp\.com/i)).toBeVisible();
  });

  test("Test 5: Available subdomain shows no error", async ({ page }) => {
    await page.goto("/register");

    const subdomainInput = page.getByLabel(/subdomain/i);
    await subdomainInput.fill(uniqueSubdomain);

    // Wait for availability check (debounced 500ms)
    await page.waitForTimeout(600);

    // Should show available message or no error
    await expect(page.getByText(/already taken/i)).not.toBeVisible();
  });

  test("Test 7: Invalid subdomain format shows validation error", async ({
    page,
  }) => {
    await page.goto("/register");

    const subdomainInput = page.getByLabel(/subdomain/i);

    // Test uppercase (should auto-convert to lowercase)
    await subdomainInput.fill("TestCorp");
    await expect(subdomainInput).toHaveValue("testcorp");

    // Test too short
    await subdomainInput.fill("ab");
    await page.getByRole("button", { name: /create workspace/i }).click();
    await expect(
      page.getByText(/must be at least 3 characters/i),
    ).toBeVisible();

    // Test leading hyphen
    await subdomainInput.fill("-testcorp");
    await page.getByRole("button", { name: /create workspace/i }).click();
    await expect(
      page.getByText(/lowercase letters, numbers, and hyphens/i),
    ).toBeVisible();
  });

  test("Test 11: Responsive design on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/register");

    // Form should be visible and usable on mobile
    await expect(
      page.getByRole("heading", { name: /create your workspace/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/company name/i)).toBeVisible();

    // Form should not overflow
    const card = page.locator("form").locator("..");
    const boundingBox = await card.boundingBox();
    expect(boundingBox?.width).toBeLessThanOrEqual(375);
  });

  test("Test: Character count feedback", async ({ page }) => {
    await page.goto("/register");

    const companyNameInput = page.getByLabel(/company name/i);
    await companyNameInput.fill("Acme Publishing");

    await expect(page.getByText(/15\/100 characters/i)).toBeVisible();

    const ownerNameInput = page.getByLabel(/owner name/i);
    await ownerNameInput.fill("John Smith");

    await expect(page.getByText(/10\/100 characters/i)).toBeVisible();
  });

  test("Test: Password minimum length validation", async ({ page }) => {
    await page.goto("/register");

    await page.getByLabel(/company name/i).fill("Test Corp");
    await page.getByLabel(/subdomain/i).fill(uniqueSubdomain);
    await page.getByLabel(/owner email/i).fill(testEmail);
    await page.getByLabel(/owner name/i).fill("Test Owner");
    await page.getByLabel(/password/i).fill("short");

    await page.getByRole("button", { name: /create workspace/i }).click();

    await expect(
      page.getByText(/must be at least 8 characters/i),
    ).toBeVisible();
  });

  test("Test: Form validation prevents submission with empty fields", async ({
    page,
  }) => {
    await page.goto("/register");

    // Try to submit empty form
    await page.getByRole("button", { name: /create workspace/i }).click();

    // Should show validation errors
    await expect(
      page.getByText(/company name must be at least 2 characters/i),
    ).toBeVisible();
    await expect(
      page.getByText(/subdomain must be at least 3 characters/i),
    ).toBeVisible();
  });

  test("Test: Already have account link navigates to sign-in", async ({
    page,
  }) => {
    await page.goto("/register");

    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/sign-in");
  });
});
