import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";

// Load environment variables for test execution
// Playwright doesn't auto-load .env like Next.js does
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

/**
 * Playwright Configuration for Salina Bookshelf ERP
 * Multi-tenant SaaS publishing platform with role-based access
 *
 * Framework: Next.js 16 App Router + React Server Components
 * Testing Strategy: Risk-based, role-segregated test suites
 *
 * Auth Setup: Tests use Clerk authentication via auth.setup.ts
 * Storage state is saved to tests/e2e/.auth/user.json
 */

// Path to authenticated session storage
const authFile = "tests/e2e/.auth/user.json";

export default defineConfig({
  testDir: "./tests/e2e",
  testMatch: /.*\.spec\.ts$/,

  /**
   * Parallel Execution Strategy
   * - CI: Serial execution to avoid tenant data conflicts
   * - Local: Unlimited workers for faster feedback
   */
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  /**
   * Timeout Configuration
   * - Test timeout: 60s (royalty calculations may take time)
   * - Assertion timeout: 15s
   * - Action timeout: 15s
   * - Navigation timeout: 30s (SSR + data fetching)
   */
  timeout: 60 * 1000,
  expect: {
    timeout: 15 * 1000,
  },

  /**
   * Global Test Configuration
   */
  use: {
    // Base URL from environment (supports multi-tenant subdomains)
    baseURL: process.env.BASE_URL || "http://localhost:3000",

    // Debugging artifacts (failure-only to reduce storage)
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",

    // Timeout overrides
    actionTimeout: 15 * 1000,
    navigationTimeout: 30 * 1000,

    // Browser behavior
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: false,

    // Locale and timezone (US publishing market)
    locale: "en-US",
    timezoneId: "America/New_York",
  },

  /**
   * Reporter Configuration
   * - HTML: Visual test reports (./test-results/html)
   * - JUnit: CI/CD integration (./test-results/junit.xml)
   * - List: Console output during test runs
   */
  reporter: [
    ["html", { outputFolder: "playwright-report", open: "never" }],
    ["junit", { outputFile: "test-results/junit.xml" }],
    ["list"],
  ],

  /**
   * Browser Projects
   *
   * Setup: Auth setup project runs first, saves session state
   * Chromium: Primary browser for CI/CD (Clerk auth compatibility)
   * Firefox: Secondary validation
   * WebKit: Safari compatibility (author portal mobile users)
   */
  projects: [
    // Auth setup project - runs first to authenticate
    {
      name: "setup",
      testMatch: /.*\.setup\.ts$/,
    },

    // Main test projects - depend on setup for authenticated session
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
    {
      name: "firefox",
      use: {
        ...devices["Desktop Firefox"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
    {
      name: "webkit",
      use: {
        ...devices["Desktop Safari"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },

    /**
     * Mobile Projects (Author Portal)
     * Authors access statements on mobile devices
     */
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile-safari",
      use: {
        ...devices["iPhone 13"],
        storageState: authFile,
      },
      dependencies: ["setup"],
    },
  ],

  /**
   * Web Server Configuration
   * Auto-start Next.js dev server if not running
   */
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for Next.js cold start
  },
});
