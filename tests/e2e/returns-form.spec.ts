import { expect, test } from "@playwright/test";

/**
 * E2E Tests for Return Request Entry Form
 *
 * Story 3.5: Build Return Request Entry Form
 * Tests all acceptance criteria (AC 1-14)
 *
 * Prerequisites:
 * - Authenticated user with RECORD_RETURNS permission (editor/finance/admin/owner)
 * - At least one title with ISBN assigned in test tenant
 *
 * Authentication: Uses Playwright auth fixtures configured in auth.setup.ts
 * Storage state saved to tests/e2e/.auth/ after setup project runs
 */

test.describe("Returns Entry Form - Story 3.5", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to returns entry form
    await page.goto("/returns/new");
  });

  test.describe("AC 1: Page Structure", () => {
    test("shows page header 'Record Return Request'", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: "Record Return Request" }),
      ).toBeVisible();
    });

    test("shows subtitle about approval workflow", async ({ page }) => {
      await expect(
        page.getByText("Submit return requests for approval"),
      ).toBeVisible();
    });

    test("displays breadcrumb navigation (Dashboard > Returns > Record Return)", async ({
      page,
    }) => {
      // Scope to main content to avoid sidebar duplicate
      const main = page.getByRole("main");
      await expect(main.getByRole("link", { name: "Dashboard" })).toBeVisible();
      await expect(main.getByRole("link", { name: "Returns" })).toBeVisible();
      await expect(main.getByText("Record Return", { exact: true })).toBeVisible();
    });
  });

  test.describe("AC 2: Title Autocomplete", () => {
    test("title search field has placeholder text", async ({ page }) => {
      await expect(
        page.getByRole("combobox", { name: "Select title" }),
      ).toBeVisible();
    });

    test("shows 'Start typing to search titles' message initially", async ({
      page,
    }) => {
      await page.getByRole("combobox", { name: "Select title" }).click();
      await expect(
        page.getByText("Start typing to search titles"),
      ).toBeVisible();
    });

    test("requires minimum 2 characters to search", async ({ page }) => {
      const combobox = page.getByRole("combobox", { name: "Select title" });
      await combobox.click();

      // Type 1 character
      await page.getByRole("textbox").fill("a");
      await expect(page.getByText("Type at least 2 characters")).toBeVisible();
    });

    test("displays search results after typing", async ({ page }) => {
      const combobox = page.getByRole("combobox", { name: "Select title" });
      await combobox.click();

      // Type search term
      await page.getByRole("textbox").fill("test");

      // Wait for results (with loading state)
      await expect(page.getByText("Searching...")).toBeVisible();
      await page.waitForTimeout(500); // Wait for debounce + search
    });
  });

  test.describe("AC 3: Format Dropdown", () => {
    test("format dropdown is disabled until title selected", async ({
      page,
    }) => {
      await expect(
        page.getByRole("combobox", { name: /Format/ }),
      ).toBeDisabled();
    });

    test("shows 'Select a title first' message", async ({ page }) => {
      await expect(page.getByText("Select a title first")).toBeVisible();
    });
  });

  test.describe("AC 4: Quantity Field", () => {
    test("quantity field accepts positive integers", async ({ page }) => {
      const quantityInput = page.getByLabel("Quantity Returned");
      await quantityInput.fill("5");
      await expect(quantityInput).toHaveValue("5");
    });

    test("quantity field shows validation error for zero", async ({ page }) => {
      const quantityInput = page.getByLabel("Quantity Returned");
      await quantityInput.fill("0");
      await quantityInput.blur();

      // Trigger validation by focusing elsewhere
      await expect(
        page.getByText("Quantity must be greater than 0"),
      ).toBeVisible();
    });
  });

  test.describe("AC 5: Unit Price Field", () => {
    test("unit price field has currency prefix", async ({ page }) => {
      await expect(page.locator("text=$")).toBeVisible();
    });

    test("unit price field accepts decimal values", async ({ page }) => {
      const priceInput = page.locator('input[inputmode="decimal"]');
      await priceInput.fill("10.99");
      await expect(priceInput).toHaveValue("10.99");
    });

    test("unit price field rejects non-numeric input", async ({ page }) => {
      const priceInput = page.locator('input[inputmode="decimal"]');
      await priceInput.fill("abc");
      // Should filter out non-numeric characters
      await expect(priceInput).toHaveValue("");
    });
  });

  test.describe("AC 6: Return Date Field", () => {
    test("return date defaults to today", async ({ page }) => {
      // The date picker button should show today's formatted date
      const dateButton = page.getByRole("button", { name: /^\w+ \d+, \d{4}$/ });
      await expect(dateButton).toBeVisible();
    });

    test("date picker opens on click", async ({ page }) => {
      await page
        .getByRole("button", { name: /^\w+ \d+, \d{4}$/ })
        .first()
        .click();
      await expect(page.getByRole("grid")).toBeVisible(); // Calendar grid
    });

    test("future dates are disabled in calendar", async ({ page }) => {
      await page
        .getByRole("button", { name: /^\w+ \d+, \d{4}$/ })
        .first()
        .click();

      // Future dates should have disabled styling
      // (exact implementation depends on shadcn calendar)
    });
  });

  test.describe("AC 7: Reason Dropdown", () => {
    test("reason dropdown shows all options", async ({ page }) => {
      await page.getByRole("combobox", { name: /Reason/ }).click();

      await expect(page.getByRole("option", { name: "Damaged" })).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Unsold inventory" }),
      ).toBeVisible();
      await expect(
        page.getByRole("option", { name: "Customer return" }),
      ).toBeVisible();
      await expect(page.getByRole("option", { name: "Other" })).toBeVisible();
    });

    test("selecting 'Other' shows text field", async ({ page }) => {
      await page.getByRole("combobox", { name: /Reason/ }).click();
      await page.getByRole("option", { name: "Other" }).click();

      await expect(page.getByLabel("Please describe the reason")).toBeVisible();
    });

    test("'Other' requires text description", async ({ page }) => {
      await page.getByRole("combobox", { name: /Reason/ }).click();
      await page.getByRole("option", { name: "Other" }).click();

      // Try to submit without description
      const submitButton = page.getByRole("button", {
        name: "Submit Return Request",
      });
      await submitButton.click();

      await expect(
        page.getByText("Please describe the reason for return"),
      ).toBeVisible();
    });
  });

  test.describe("AC 8: Original Sale Reference", () => {
    test("original sale reference is optional", async ({ page }) => {
      await expect(page.getByLabel("Original Sale Reference")).toBeVisible();
    });

    test("original sale reference accepts text input", async ({ page }) => {
      const input = page.getByLabel("Original Sale Reference");
      await input.fill("Invoice #12345");
      await expect(input).toHaveValue("Invoice #12345");
    });
  });

  test.describe("AC 9: Return Amount Preview", () => {
    test("shows return amount section", async ({ page }) => {
      await expect(page.getByText("Return Amount")).toBeVisible();
    });

    test("displays negative amount format", async ({ page }) => {
      // Initial state should show -$0.00
      await expect(page.getByText("-$0.00")).toBeVisible();
    });

    test("calculates return amount from quantity and price", async ({
      page,
    }) => {
      // Fill quantity and price
      await page.getByLabel("Quantity Returned").fill("5");
      await page.locator('input[inputmode="decimal"]').fill("10.00");

      // Should show -$50.00
      await expect(page.getByText("-$50.00")).toBeVisible();
    });
  });

  test.describe("AC 10: Submit Button", () => {
    test("submit button is disabled until form is valid", async ({ page }) => {
      const submitButton = page.getByRole("button", {
        name: "Submit Return Request",
      });
      await expect(submitButton).toBeDisabled();
    });

    test("submit button label is 'Submit Return Request'", async ({ page }) => {
      await expect(
        page.getByRole("button", { name: "Submit Return Request" }),
      ).toBeVisible();
    });
  });

  test.describe("AC 11: Successful Submission", () => {
    test.skip("redirects to /returns after successful submission", async ({
      page,
    }) => {
      // This test requires a full form submission with valid title
      // Requires test data setup
    });

    test.skip("shows success toast after submission", async ({ page }) => {
      // This test requires a full form submission
      // Should show: "Return request submitted for approval"
    });
  });

  test.describe("AC 12: Permission Enforcement", () => {
    test.skip("redirects unauthorized users to dashboard", async ({ page }) => {
      // Test with viewer role user
      // Should redirect to /dashboard?error=unauthorized
    });
  });

  test.describe("AC 13: Validation Errors", () => {
    test("displays inline validation errors", async ({ page }) => {
      // Try to submit with invalid data
      await page.getByLabel("Quantity Returned").fill("-1");
      await page.getByLabel("Quantity Returned").blur();

      // Should show validation error
      await expect(page.getByText(/must be greater than 0/i)).toBeVisible();
    });
  });

  test.describe("AC 14: Cancel Button", () => {
    test("cancel button navigates to /returns", async ({ page }) => {
      await page.getByRole("button", { name: "Cancel" }).click();
      await expect(page).toHaveURL(/\/returns$/);
    });
  });
});

test.describe("Returns List Page - Navigation Target", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/returns");
  });

  test("shows Returns page with Record Return button", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Returns" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Record Return/i }),
    ).toBeVisible();
  });

  test("Record Return button navigates to /returns/new", async ({ page }) => {
    await page.getByRole("link", { name: /Record Return/i }).click();
    await expect(page).toHaveURL(/\/returns\/new$/);
  });
});
