# Testing Documentation

This document describes the testing infrastructure for Salina ERP, including how to run tests locally, understanding the auth fixtures, and adding new tests.

## Test Types

### Unit Tests (Vitest)

Unit tests use Vitest and run in a JSDOM environment. They test individual functions, components, and modules in isolation.

**Location:** `tests/unit/**/*.test.ts`

**Run locally:**

```bash
npm test                    # Run all unit tests
npm test -- tests/unit      # Run only unit tests
npm run test:watch          # Run in watch mode
```

### Integration Tests (Vitest)

Integration tests test server actions and database queries with mocked auth context.

**Location:** `tests/integration/**/*.test.ts`

**Run locally:**

```bash
npm test -- tests/integration
```

### E2E Tests (Playwright)

End-to-end tests use Playwright to test full user flows in a real browser.

**Location:** `tests/e2e/**/*.spec.ts`

**Run locally:**

```bash
npm run test:e2e            # Run all E2E tests (headless)
npm run test:e2e:headed     # Run with visible browser
npm run test:e2e:ui         # Run with Playwright UI
npm run test:e2e:debug      # Run in debug mode
```

## Authentication Setup

### E2E Tests - Playwright Auth Fixtures

E2E tests use Playwright's storage state feature to share authenticated sessions across tests.

#### How It Works

1. **Setup Project**: The `setup` project in `playwright.config.ts` runs first
2. **Authentication**: `tests/e2e/auth.setup.ts` logs in via Clerk and saves the session
3. **Storage State**: Session is saved to `tests/e2e/.auth/user.json`
4. **Reuse**: All test projects load this storage state to start authenticated

#### Required Environment Variables

Create `.env.local` with test credentials:

```env
# Required for E2E tests
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password

# Optional: Role-specific users for RBAC testing
TEST_OWNER_EMAIL=owner@example.com
TEST_OWNER_PASSWORD=...
TEST_ADMIN_EMAIL=admin@example.com
TEST_ADMIN_PASSWORD=...
TEST_EDITOR_EMAIL=editor@example.com
TEST_EDITOR_PASSWORD=...
TEST_FINANCE_EMAIL=finance@example.com
TEST_FINANCE_PASSWORD=...
TEST_AUTHOR_EMAIL=author@example.com
TEST_AUTHOR_PASSWORD=...
```

#### Setting Up Test Users in Clerk

1. Go to your Clerk Dashboard
2. Create test users for each role you need to test
3. Note their email addresses and passwords
4. Add credentials to `.env.local` (not committed to git)

### Integration Tests - Auth Mocking

Integration tests mock the auth module to avoid needing real Clerk credentials.

#### How It Works

The `tests/setup.ts` file provides:

- `testAuthContext` - Configurable auth state (tenant ID, user, role)
- Global mocks for `@/lib/auth`, `@clerk/nextjs/server`, `next/headers`

#### Changing Test User Role

```typescript
import { setTestUserRole, setTestTenantId } from "../setup";

describe("Admin-only feature", () => {
  beforeEach(() => {
    setTestUserRole("admin");
  });

  test("allows admin access", async () => {
    // Test with admin role
  });
});

describe("Editor restrictions", () => {
  beforeEach(() => {
    setTestUserRole("editor");
  });

  test("blocks editor from admin features", async () => {
    // Test permission denial
  });
});
```

#### Available Helpers

```typescript
// Set user role (owner, admin, editor, finance, author)
setTestUserRole("finance");

// Set tenant ID
setTestTenantId("custom-tenant-uuid");

// Set custom user properties
setTestUser({
  email: "custom@example.com",
  is_active: false,
});

// Reset to defaults (automatic in afterEach)
resetTestAuthContext();
```

## Adding New Tests

### New E2E Test

1. Create `tests/e2e/your-feature.spec.ts`
2. Import from Playwright test

```typescript
import { expect, test } from "@playwright/test";

test.describe("Your Feature", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/your-page");
  });

  test("should do something", async ({ page }) => {
    await expect(page.getByRole("heading")).toBeVisible();
  });
});
```

Tests automatically have an authenticated session from the setup project.

### New Integration Test

1. Create `tests/integration/your-module.test.ts`
2. Import from Vitest and setup helpers if needed

```typescript
import { describe, expect, test, beforeEach } from "vitest";
import { setTestUserRole } from "../setup";
import { yourAction } from "@/modules/your-module/actions";

describe("Your Module Actions", () => {
  beforeEach(() => {
    setTestUserRole("editor");
  });

  test("performs action for editor", async () => {
    const result = await yourAction({ data: "test" });
    expect(result.success).toBe(true);
  });
});
```

### New Unit Test

1. Create `tests/unit/your-module.test.ts`
2. Mock any dependencies as needed

```typescript
import { describe, expect, test, vi } from "vitest";
import { yourFunction } from "@/lib/your-module";

describe("Your Function", () => {
  test("returns expected value", () => {
    const result = yourFunction("input");
    expect(result).toBe("expected");
  });
});
```

## CI Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) runs:

1. **Lint**: Biome linter checks
2. **Type Check**: TypeScript compilation
3. **Unit Tests**: Vitest unit tests
4. **E2E Tests**: Playwright tests (requires secrets)
5. **Build**: Next.js production build

### Required Secrets for CI

Configure these in GitHub repository settings:

| Secret                              | Description           |
| ----------------------------------- | --------------------- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `CLERK_SECRET_KEY`                  | Clerk secret key      |

| `TEST_DATABASE_URL` | Test database connection string |
| `TEST_DATABASE_AUTHENTICATED_URL` | Database URL for RLS queries |

| `ENCRYPTION_KEY` | 64-char hex encryption key |

| `TEST_USER_EMAIL` | Test user email for E2E |
| `TEST_USER_PASSWORD` | Test user password for E2E |

## Troubleshooting

### E2E Tests Failing with Auth Errors

1. Check that `.env.local` has valid test credentials
2. Verify the test user exists in Clerk
3. Run `rm -rf tests/e2e/.auth` to clear cached auth state
4. Check Clerk dashboard for any user issues

### Integration Tests Failing

1. Check that `tests/setup.ts` is loaded (configured in `vitest.config.ts`)
2. Verify mocks are not being overridden in individual test files
3. Use `vi.unmock('@/lib/auth')` if testing the real auth module

### CI E2E Tests Not Running

E2E tests only run on:

- Push to main branch
- PRs from the same repository (not forks)

This is because they require secrets that aren't available in fork PRs.

### TypeScript Errors in Tests

Make sure `@types/node` and other type dependencies are installed:

```bash
npm install -D @types/node
```

## File Structure

```
tests/
├── e2e/
│   ├── .auth/              # Generated auth state (gitignored)
│   │   ├── user.json       # Default user session
│   │   ├── owner.json      # Owner role session
│   │   └── ...
│   ├── auth.setup.ts       # Auth setup fixture
│   ├── returns-form.spec.ts
│   ├── returns-approval.spec.ts
│   └── ...
├── integration/
│   ├── users-actions.test.ts
│   ├── tenant-settings.test.ts
│   └── ...
├── unit/
│   ├── auth.test.ts
│   ├── sales-schema.test.ts
│   └── ...
├── support/
│   └── fixtures/           # Playwright test fixtures
│       └── index.ts
└── setup.ts                # Vitest global setup with auth mocks
```

## References

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Auth](https://playwright.dev/docs/auth)
- [Vitest Documentation](https://vitest.dev/)
- [Clerk Testing](https://clerk.com/docs/testing/overview)
