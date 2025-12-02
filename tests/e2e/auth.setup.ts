/**
 * Playwright Auth Setup
 *
 * Authenticates test users via Clerk and saves session state
 * for reuse across all E2E tests.
 *
 * This setup project runs before other test projects and creates
 * authenticated browser contexts that tests can reuse.
 *
 * Environment Variables Required (per role):
 * - TEST_OWNER_EMAIL / TEST_OWNER_PASSWORD
 * - TEST_ADMIN_EMAIL / TEST_ADMIN_PASSWORD
 * - TEST_EDITOR_EMAIL / TEST_EDITOR_PASSWORD
 * - TEST_FINANCE_EMAIL / TEST_FINANCE_PASSWORD
 * - TEST_AUTHOR_EMAIL / TEST_AUTHOR_PASSWORD
 *
 * Or for simple setup:
 * - TEST_USER_EMAIL / TEST_USER_PASSWORD (default user)
 */

import fs from "node:fs";
import { expect, type Page, test as setup } from "@playwright/test";

// Storage state file paths for different roles
export const AUTH_FILES = {
  default: "tests/e2e/.auth/user.json",
  owner: "tests/e2e/.auth/owner.json",
  admin: "tests/e2e/.auth/admin.json",
  editor: "tests/e2e/.auth/editor.json",
  finance: "tests/e2e/.auth/finance.json",
  author: "tests/e2e/.auth/author.json",
} as const;

// For backward compatibility
export const AUTH_FILE = AUTH_FILES.default;

setup.describe.configure({ mode: "serial" });

/**
 * Check if auth file exists and has valid (non-expired) session
 * Sessions are considered valid if the file exists and was created within last 24 hours
 */
function isAuthValid(authFile: string): boolean {
  try {
    if (!fs.existsSync(authFile)) {
      return false;
    }
    const stats = fs.statSync(authFile);
    const ageMs = Date.now() - stats.mtimeMs;
    const maxAgeMs = 24 * 60 * 60 * 1000; // 24 hours
    return ageMs < maxAgeMs;
  } catch {
    return false;
  }
}

/**
 * Authenticate with Clerk and save session state
 */
async function authenticateUser(
  page: Page,
  email: string,
  password: string,
  authFile: string,
): Promise<void> {
  // Navigate to sign-in page
  await page.goto("/sign-in");

  // Wait for Clerk sign-in form to be ready
  await expect(page.locator('input[name="identifier"]')).toBeVisible({
    timeout: 15000,
  });

  // Clerk uses a multi-step sign-in flow
  // Step 1: Enter email/identifier
  const emailInput = page.locator('input[name="identifier"]');
  await emailInput.fill(email);

  // Click continue to proceed to password step
  const continueButton = page.locator(
    'button[data-localization-key="formButtonPrimary"]',
  );
  await continueButton.click();

  // Step 2: Enter password
  const passwordInput = page.locator('input[name="password"]');
  await passwordInput.waitFor({ state: "visible", timeout: 10000 });
  await passwordInput.fill(password);

  // Click sign in
  await continueButton.click();

  // Wait for successful authentication and redirect to dashboard
  await page.waitForURL("**/dashboard", { timeout: 30000 });

  // Verify we're logged in by checking URL contains dashboard
  expect(page.url()).toContain("/dashboard");

  // Save signed-in state to file
  await page.context().storageState({ path: authFile });
}

/**
 * Get credentials from environment for a role
 */
function getCredentials(
  role: string,
): { email: string; password: string } | null {
  const roleUpper = role.toUpperCase();
  const email = process.env[`TEST_${roleUpper}_EMAIL`];
  const password = process.env[`TEST_${roleUpper}_PASSWORD`];

  if (email && password) {
    return { email, password };
  }
  return null;
}

// Default user authentication (required)
setup("authenticate as default test user", async ({ page }) => {
  // Skip if auth file already exists and is valid (avoids device verification on every run)
  if (isAuthValid(AUTH_FILES.default)) {
    console.log(
      `[Auth] Reusing existing auth state from ${AUTH_FILES.default}`,
    );
    return;
  }

  // Try role-specific credentials first, fall back to generic TEST_USER_*
  const credentials =
    getCredentials("OWNER") ||
    getCredentials("ADMIN") ||
    getCredentials("USER") ||
    (process.env.TEST_USER_EMAIL && process.env.TEST_USER_PASSWORD
      ? {
          email: process.env.TEST_USER_EMAIL,
          password: process.env.TEST_USER_PASSWORD,
        }
      : null);

  if (!credentials) {
    throw new Error(
      "Test user credentials not found. Set TEST_USER_EMAIL/TEST_USER_PASSWORD or TEST_OWNER_EMAIL/TEST_OWNER_PASSWORD in .env.local",
    );
  }

  await authenticateUser(
    page,
    credentials.email,
    credentials.password,
    AUTH_FILES.default,
  );
});

// Role-specific authentication (optional - only runs if credentials are set)
const roles = ["owner", "admin", "editor", "finance", "author"] as const;

for (const role of roles) {
  setup(`authenticate as ${role}`, async ({ page }) => {
    const credentials = getCredentials(role);

    if (!credentials) {
      // Skip if credentials not configured for this role
      setup.skip();
      return;
    }

    await authenticateUser(
      page,
      credentials.email,
      credentials.password,
      AUTH_FILES[role],
    );
  });
}
