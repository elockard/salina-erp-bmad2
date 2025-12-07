import { expect, test } from "@playwright/test";

/**
 * @deprecated These tests are deprecated. Use contacts.spec.ts instead.
 *
 * Story 0.5: Consolidate Authors into Contacts
 *
 * Authors are now managed through the unified Contacts interface.
 * The /authors route redirects to /contacts?role=author.
 *
 * See contacts.spec.ts for the equivalent tests.
 *
 * Original Story 2.2 - Build Author Management Split View Interface
 */

// Skip all tests in this file - functionality covered by contacts.spec.ts
test.describe.skip("Author Management - DEPRECATED (see contacts.spec.ts)", () => {
  test.describe("Author Management - Split View Layout", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contacts?role=author");
    });

    test("AC1: Split View layout renders with left (320px) and right (fluid) panels", async ({
      page,
    }) => {
      const leftPanel = page.locator('[class*="w-\\[320px\\]"]');
      await expect(leftPanel).toBeVisible();
      await expect(page.getByRole("heading", { name: "Contacts" })).toBeVisible();
      const rightPanel = page.locator('[class*="flex-1"]');
      await expect(rightPanel).toBeVisible();
    });

    test("AC2: Left panel displays scrollable contact list with search box", async ({
      page,
    }) => {
      const searchInput = page.getByPlaceholder("Search contacts...");
      await expect(searchInput).toBeVisible();
      const contactList = page.getByRole("listbox", { name: "Contacts" });
      await expect(contactList).toBeVisible();
    });
  });

  test.describe("Author Management - Detail View", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/contacts?role=author");
    });

    test("AC6: Clicking contact row loads detail in right panel", async ({
      page,
    }) => {
      const contactItem = page.locator('[role="option"]').first();
      await contactItem.click();
      const detailPanel = page.locator('[class*="flex-1"]');
      await expect(detailPanel).toBeVisible();
    });
  });

  test.describe("Author Management - Permission Checks", () => {
    test("AC20: Author role redirects to portal", async ({ page }) => {
      await page.goto("/contacts?role=author");
      // Authors role redirects to /portal
      await expect(page).toHaveURL(/portal/);
    });
  });
});
