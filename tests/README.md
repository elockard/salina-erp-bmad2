# Salina ERP Test Suite

Production-ready E2E test framework for Salina Bookshelf ERP using Playwright.

## Architecture

### Framework: Playwright

**Why Playwright?**
- Worker parallelism for faster CI/CD execution
- Trace viewer for powerful debugging (screenshots, network, console)
- Multi-browser support (Chromium, Firefox, WebKit)
- Excellent Next.js 16 integration
- Built-in API testing capabilities

### Project Structure

```
tests/
├── e2e/                      # Test files organized by feature
│   ├── auth.spec.ts          # Authentication & RBAC tests
│   ├── sales.spec.ts         # Sales transaction tests
│   ├── royalties.spec.ts     # Royalty calculation tests
│   └── ...                   # Additional feature tests
│
├── support/                  # Test infrastructure (DO NOT MODIFY)
│   ├── fixtures/             # Test fixtures with auto-cleanup
│   │   ├── index.ts          # Main fixture composition
│   │   └── factories/        # Data factories (faker-based)
│   │       ├── tenant-factory.ts
│   │       ├── user-factory.ts
│   │       ├── author-factory.ts
│   │       ├── title-factory.ts
│   │       ├── isbn-factory.ts
│   │       └── sales-factory.ts
│   ├── helpers/              # Utility functions
│   └── page-objects/         # Page Object Models (optional)
│
└── README.md                 # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `@playwright/test` - Playwright test runner
- `@faker-js/faker` - Test data generation
- TypeScript and related dependencies

### 2. Install Playwright Browsers

```bash
npx playwright install
```

Installs Chromium, Firefox, and WebKit browsers.

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.test.example .env.test
```

Fill in required values:

```bash
# Multi-Tenant Configuration
TEST_TENANT_SUBDOMAIN=testpublisher
TEST_TENANT_DOMAIN=localhost:3000

# Authentication (Clerk test users)
TEST_OWNER_EMAIL=owner@testpublisher.com
TEST_OWNER_PASSWORD=your_password_here

# ... (see .env.test.example for complete list)
```

**Important**: Create test users in Clerk dashboard with corresponding roles.

### 4. Start Development Server

Ensure Next.js development server is running:

```bash
npm run dev
```

Server should be accessible at `http://localhost:3000`.

## Running Tests

### Run All Tests

```bash
npm run test:e2e
```

### Run Tests in Headed Mode

See browser interactions in real-time:

```bash
npm run test:e2e -- --headed
```

### Run Specific Test File

```bash
npm run test:e2e -- tests/e2e/sales.spec.ts
```

### Run Tests in Debug Mode

Step through tests with Playwright Inspector:

```bash
npm run test:e2e -- --debug
```

### Run Tests in UI Mode

Interactive test explorer:

```bash
npm run test:e2e -- --ui
```

### Run Specific Browser

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### View Test Report

After test run:

```bash
npx playwright show-report test-results/html
```

## Test Architecture Patterns

### Fixture Pattern

Tests use **fixture composition** for clean, isolated test data:

```typescript
import { test, expect } from '../support/fixtures';

test('should create author', async ({ authorFactory, tenantFactory }) => {
  const tenant = await tenantFactory.createTenant();
  const author = await authorFactory.createAuthor(tenant);

  // Test logic
  expect(author.name).toBeTruthy();

  // Auto-cleanup: tenant and author deleted after test
});
```

**Benefits:**
- Automatic resource cleanup (no manual deletion needed)
- Test isolation (each test gets fresh data)
- Composable fixtures (factories depend on other factories)

### Data Factories

Faker-based factories generate realistic test data:

```typescript
// Create author with defaults
const author = await authorFactory.createAuthor();

// Override specific fields
const author = await authorFactory.createAuthor(tenant, {
  name: 'Specific Author Name',
  email: 'specific@email.com'
});
```

**Available Factories:**
- `tenantFactory` - Multi-tenant isolation
- `userFactory` - Role-based users (Owner, Admin, Editor, Finance, Author)
- `authorFactory` - Publishing authors
- `titleFactory` - Book titles
- `isbnFactory` - ISBN pool management
- `salesFactory` - Sales transactions

### Selector Strategy

**Always use `data-testid` attributes:**

```typescript
// ✅ Good - Stable selectors
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="email-input"]', 'test@example.com');

// ❌ Bad - Brittle selectors
await page.click('.btn-primary'); // CSS class may change
await page.click('button:nth-child(3)'); // Position may change
```

### Multi-Tenant Testing

Access tenant-specific URLs:

```typescript
const tenant = await tenantFactory.createTenant({ subdomain: 'acmepub' });
const tenantURL = tenantFactory.getTenantURL(tenant.subdomain);
// Returns: http://acmepub.localhost:3000

await page.goto(`${tenantURL}/dashboard`);
```

### Role-Based Access Control (RBAC)

Test role permissions:

```typescript
// Create users with different roles
const { owner, admin, editor, finance } = await userFactory.createStaffTeam(tenant);

// Test Editor permissions
await loginAs(page, editor);
await page.goto(`${tenantURL}/authors`); // ✅ Allowed
await page.goto(`${tenantURL}/returns`); // ❌ Unauthorized (Finance only)
```

## Best Practices

### 1. Test Isolation

Each test is fully isolated:
- Fresh database state
- Independent test data
- No shared state between tests

### 2. Deterministic Tests

Avoid flaky tests:
- Wait for network requests to complete
- Use `await expect(...).toBeVisible()` instead of timeouts
- Leverage Playwright's auto-waiting capabilities

### 3. Explicit Assertions

Be specific in assertions:

```typescript
// ✅ Good - Explicit assertions
await expect(page.locator('[data-testid="total-amount"]')).toContainText('$3,748.50');

// ❌ Bad - Vague assertions
await expect(page.locator('[data-testid="total-amount"]')).toBeVisible();
```

### 4. Test Length Limits

Keep tests concise:
- **< 60 seconds per test** (configured timeout)
- **< 15 seconds per action** (configured action timeout)
- Focus on critical user paths

### 5. Cleanup Strategy

All fixtures auto-cleanup:
- Database records deleted after test
- S3 objects removed
- Background jobs cancelled

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps

      - name: Run tests
        run: npm run test:e2e
        env:
          BASE_URL: ${{ secrets.TEST_BASE_URL }}
          TEST_OWNER_PASSWORD: ${{ secrets.TEST_OWNER_PASSWORD }}

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: test-results/
```

### Environment Variables in CI

Configure secrets in CI/CD platform:
- `TEST_BASE_URL`
- `TEST_DATABASE_URL`
- `TEST_OWNER_PASSWORD` (and other role passwords)
- `TEST_AWS_ACCESS_KEY_ID`
- `TEST_AWS_SECRET_ACCESS_KEY`
- `TEST_RESEND_API_KEY`

## Debugging Failed Tests

### 1. View Trace File

Playwright captures trace on failure:

```bash
npx playwright show-trace test-results/.../trace.zip
```

Trace viewer shows:
- Screenshots at each step
- Network requests
- Console logs
- DOM snapshots

### 2. View Screenshots

Failure screenshots saved to:

```
test-results/{test-name}/test-failed-1.png
```

### 3. View Videos

Failure videos saved to:

```
test-results/{test-name}/video.webm
```

### 4. Enable Debug Logging

```bash
DEBUG=pw:api npm run test:e2e
```

## Knowledge Base References

This test framework implements patterns from TEA (Test Engineering Architect) knowledge base:

- **Fixture Architecture** (`.bmad/bmm/testarch/knowledge/fixture-architecture.md`)
  - Pure function → fixture → mergeTests composition
  - Auto-cleanup pattern

- **Data Factories** (`.bmad/bmm/testarch/knowledge/data-factories.md`)
  - Faker-based test data generation
  - Nested factory dependencies
  - API seeding with cleanup

- **Network-First Testing** (`.bmad/bmm/testarch/knowledge/network-first.md`)
  - Intercept before navigate
  - HAR capture for debugging
  - Deterministic network waiting

- **Test Quality Principles** (`.bmad/bmm/testarch/knowledge/test-quality.md`)
  - Deterministic tests
  - Isolated with cleanup
  - Explicit assertions
  - Length/time limits

## Troubleshooting

### "Browser not installed"

```bash
npx playwright install chromium
```

### "Test timeout exceeded"

Increase timeout in `playwright.config.ts`:

```typescript
timeout: 120 * 1000, // 2 minutes
```

### "Cannot connect to database"

Verify `TEST_DATABASE_URL` in `.env.test` is correct and accessible.

### "Multi-tenant subdomain not resolving"

Ensure `/etc/hosts` has wildcard subdomain mapping:

```
127.0.0.1 testpublisher.localhost
127.0.0.1 acmepub.localhost
```

Or use localhost.run for dynamic subdomain resolution.

## Next Steps

1. **Copy** `.env.test.example` to `.env.test` and configure
2. **Create** Clerk test users for each role
3. **Run** `npm run test:e2e` to verify setup
4. **Review** sample tests in `tests/e2e/`
5. **Write** tests for additional features

## Support

For test architecture questions, consult:
- TEA knowledge base: `.bmad/bmm/testarch/knowledge/`
- Playwright docs: https://playwright.dev
- BMad documentation: `.bmad/docs/`

---

_Test framework initialized by BMad Test Architect (Murat) v6.0_
_Architecture: Playwright + TypeScript + Fixture Composition + Auto-Cleanup_
