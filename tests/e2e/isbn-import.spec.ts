import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * E2E Tests for ISBN Import Flow
 *
 * Story 2.7 - Build ISBN Import with CSV Upload and Validation
 *
 * Note: These tests require:
 * - Test database with test tenant and admin user
 * - Authentication helper to login as owner/admin
 */

test.describe("ISBN Import - Full Flow", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Login as owner/admin user with MANAGE_SETTINGS permission
    // await loginAs(page, "owner@testorg.com");
    await page.goto("/settings/isbn-import");
  });

  test("AC1: Import page accessible at /settings/isbn-import", async ({
    page,
  }) => {
    // Page title
    await expect(page.locator("h1")).toContainText("ISBN Import");

    // Breadcrumb navigation
    await expect(page.getByRole("link", { name: "Settings" })).toBeVisible();
    await expect(page.getByText("ISBN Import").first()).toBeVisible();
  });

  test("AC1: Permission check enforces MANAGE_SETTINGS", async ({ page }) => {
    // TODO: Login as non-admin user (editor/finance)
    // await loginAs(page, "editor@testorg.com");
    // await page.goto("/settings/isbn-import");
    // Should redirect or show unauthorized
    // await expect(page).toHaveURL(/sign-in|unauthorized/);
    test.skip();
  });

  test("AC3: ISBN type selection required before import", async ({ page }) => {
    // Radio buttons for type selection
    await expect(page.getByLabel("Physical (Print)")).toBeVisible();
    await expect(page.getByLabel("Ebook (Digital)")).toBeVisible();

    // Neither selected by default
    await expect(page.getByLabel("Physical (Print)")).not.toBeChecked();
    await expect(page.getByLabel("Ebook (Digital)")).not.toBeChecked();
  });

  test("AC2: File upload accepts CSV files only", async ({ page }) => {
    // Upload zone visible
    await expect(
      page.getByText("Drag and drop your CSV file here"),
    ).toBeVisible();
    await expect(page.getByText("browse to upload")).toBeVisible();

    // File input accepts CSV
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveAttribute("accept", ".csv,text/csv");
  });

  test("AC4, AC5, AC7: CSV parsing with validation and error display", async ({
    page,
  }) => {
    // Create temp CSV with invalid ISBN
    const csvContent = "isbn\n9780306406157\n9780306406158\n";
    const csvPath = path.join(__dirname, "test-isbns-invalid.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Wait for parsing
      await expect(page.getByText("Validation Results")).toBeVisible();

      // Should show validation errors
      await expect(page.getByText("1 valid")).toBeVisible();
      await expect(page.getByText("1 errors")).toBeVisible();

      // Preview table visible
      await expect(page.getByRole("table")).toBeVisible();

      // Error row highlighted
      await expect(page.getByText("Invalid checksum")).toBeVisible();
    } finally {
      // Cleanup
      fs.unlinkSync(csvPath);
    }
  });

  test("AC6: Duplicate detection within file", async ({ page }) => {
    // Create temp CSV with duplicates
    const csvContent = "isbn\n9780306406157\n9780306406157\n";
    const csvPath = path.join(__dirname, "test-isbns-duplicate.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Should show duplicate warning
      await expect(
        page.getByText("Duplicates found within file"),
      ).toBeVisible();
      await expect(page.getByText(/appears in rows/)).toBeVisible();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  test("AC2: File size validation (max 1MB)", async ({ page }) => {
    // Create large CSV (over 1MB)
    const largeContent = `isbn\n${"9780306406157\n".repeat(100000)}`;
    const csvPath = path.join(__dirname, "test-isbns-large.csv");
    fs.writeFileSync(csvPath, largeContent);

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Should show file size error
      await expect(page.getByText(/File too large/)).toBeVisible();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  test("AC2: Row count validation (max 100 ISBNs)", async ({ page }) => {
    // Create CSV with too many rows
    const manyRows = `isbn\n${Array(105).fill("9780306406157").join("\n")}`;
    const csvPath = path.join(__dirname, "test-isbns-many.csv");
    fs.writeFileSync(csvPath, manyRows);

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Should show row count error
      await expect(page.getByText(/Too many rows/)).toBeVisible();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  test("Full import flow: upload, validate, select type, import", async ({
    page,
  }) => {
    // Create valid CSV
    const csvContent = "isbn\n9780306406157\n9780140449136\n9780201633610\n";
    const csvPath = path.join(__dirname, "test-isbns-valid.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      // 1. Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // 2. Wait for validation
      await expect(page.getByText("Validation Results")).toBeVisible();
      await expect(page.getByText("3 valid")).toBeVisible();

      // 3. Select ISBN type
      await page.getByLabel("Physical (Print)").click();
      await expect(page.getByLabel("Physical (Print)")).toBeChecked();

      // 4. Submit button should be enabled
      const submitButton = page.getByRole("button", { name: /Import 3 ISBNs/ });
      await expect(submitButton).toBeEnabled();

      // 5. Click import (this would need mocked backend or test database)
      // await submitButton.click();
      // await expect(page.getByText("Successfully imported")).toBeVisible();
      // await expect(page).toHaveURL("/isbn-pool");
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  test("Cancel button clears file and resets form", async ({ page }) => {
    // Create valid CSV
    const csvContent = "isbn\n9780306406157\n";
    const csvPath = path.join(__dirname, "test-isbns-cancel.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Wait for validation
      await expect(page.getByText("Validation Results")).toBeVisible();

      // Click cancel
      await page.getByRole("button", { name: "Cancel" }).click();

      // Should reset to initial state
      await expect(
        page.getByText("Drag and drop your CSV file here"),
      ).toBeVisible();
      await expect(page.getByText("Validation Results")).not.toBeVisible();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });

  test("Remove file button clears selection", async ({ page }) => {
    // Create valid CSV
    const csvContent = "isbn\n9780306406157\n";
    const csvPath = path.join(__dirname, "test-isbns-remove.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      // Upload file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // File info should be visible
      await expect(page.getByText("test-isbns-remove.csv")).toBeVisible();

      // Click remove button
      await page.getByRole("button", { name: "Remove file" }).click();

      // Should reset
      await expect(
        page.getByText("Drag and drop your CSV file here"),
      ).toBeVisible();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });
});

test.describe("ISBN Import - Error Handling", () => {
  test("AC7: Shows inline errors for each invalid ISBN", async ({ page }) => {
    await page.goto("/settings/isbn-import");

    // Create CSV with multiple error types
    const csvContent = [
      "isbn",
      "9780306406157", // Valid
      "123456789", // Too short
      "9771234567890", // Wrong prefix
      "9780306406158", // Wrong checksum
    ].join("\n");
    const csvPath = path.join(__dirname, "test-isbns-errors.csv");
    fs.writeFileSync(csvPath, csvContent);

    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(csvPath);

      // Should show error summary
      await expect(page.getByText("1 valid")).toBeVisible();
      await expect(page.getByText("3 errors")).toBeVisible();

      // Should show specific error messages
      await expect(page.getByText(/Invalid length/)).toBeVisible();
      await expect(page.getByText(/Invalid prefix/)).toBeVisible();
      await expect(page.getByText(/Invalid checksum/)).toBeVisible();

      // Submit should be disabled
      await expect(page.getByRole("button", { name: /Import/ })).toBeDisabled();
    } finally {
      fs.unlinkSync(csvPath);
    }
  });
});
