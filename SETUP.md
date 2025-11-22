# Salina ERP - Project Setup Guide

This guide walks you through initializing the Salina Bookshelf ERP project from scratch.

## Prerequisites

- Node.js 24.10.1 or higher (using nvm: `nvm use`)
- PostgreSQL database (Neon recommended)
- Clerk account for authentication
- AWS account for S3 storage
- Resend account for email delivery

## Step 1: Initialize Next.js Application

The architecture is designed for Next.js 16 with specific configuration:

```bash
npx create-next-app@latest salina-erp \
  --typescript \
  --tailwind \
  --biome \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**Note**: The `package.json` in this repository already includes all required dependencies. You can skip this step and proceed to Step 2 if using this repository.

## Step 2: Install Dependencies

```bash
npm install
```

This installs:

- **Next.js 16** - App Router, React Server Components
- **Clerk v6** - Authentication with RBAC
- **Drizzle ORM** - Type-safe database operations
- **TanStack Query** - Client-side state management
- **Playwright** - E2E testing framework
- **Faker-js** - Test data generation
- **Decimal.js** - Financial calculations
- **date-fns v4** - Timezone handling
- **Inngest** - Background jobs
- **Resend + React Email** - Email delivery
- **AWS SDK** - S3 file storage

## Step 3: Configure Environment Variables

Create `.env.local` for development:

```bash
# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@endpoint.neon.tech/salina_erp?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/onboarding"

# AWS S3 Storage
AWS_REGION="us-west-2"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="..."
AWS_S3_BUCKET="salina-erp-documents-prod"

# Email (Resend)
RESEND_API_KEY="re_..."
RESEND_FROM_EMAIL="Salina ERP <noreply@salina-erp.com>"

# Background Jobs (Inngest)
INNGEST_EVENT_KEY="..."
INNGEST_SIGNING_KEY="..."

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_TENANT_DOMAIN="localhost:3000"
NODE_ENV="development"
```

Create `.env.test` for test environment (copy from `.env.test.example`):

```bash
cp .env.test.example .env.test
```

Fill in test-specific credentials (see `tests/README.md` for details).

## Step 4: Initialize Database

### Create Database Schema

The database schema is defined in `src/db/schema/` using Drizzle ORM. Create the directory structure:

```bash
mkdir -p src/db/schema
mkdir -p src/db/migrations
```

Create `src/db/schema/tenants.ts`:

```typescript
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  subdomain: varchar("subdomain", { length: 63 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  timezone: varchar("timezone", { length: 100 })
    .notNull()
    .default("America/Phoenix"),
  default_currency: varchar("default_currency", { length: 3 })
    .notNull()
    .default("USD"),
  statement_frequency: varchar("statement_frequency", { length: 20 })
    .notNull()
    .default("quarterly"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});
```

(Continue creating schema files for all tables - see `docs/architecture.md` section "Database Schema")

### Generate Migrations

```bash
npm run db:generate
```

### Run Migrations

```bash
npm run db:migrate
```

### (Optional) Open Drizzle Studio

Inspect database visually:

```bash
npm run db:studio
```

## Step 5: Configure Clerk Authentication

### Create Clerk Application

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create new application: "Salina ERP"
3. Enable email/password authentication
4. Copy publishable key and secret key to `.env.local`

### Configure Multi-Tenant Support

In Clerk dashboard:

1. Navigate to **Paths** settings
2. Configure sign-in path: `/sign-in`
3. Configure sign-up path: `/sign-up`
4. Configure after sign-in redirect: `/dashboard`

### Configure Roles (RBAC)

Create custom roles in Clerk:

- `owner` - Full access
- `admin` - Administrative access
- `editor` - Content management
- `finance` - Financial operations
- `author` - Author portal access

### Create Test Users

Create users for each role with test credentials (for E2E tests):

```
owner@testpublisher.com - TEST_OWNER_PASSWORD
admin@testpublisher.com - TEST_ADMIN_PASSWORD
editor@testpublisher.com - TEST_EDITOR_PASSWORD
finance@testpublisher.com - TEST_FINANCE_PASSWORD
author@testpublisher.com - TEST_AUTHOR_PASSWORD
```

Assign corresponding roles to each user.

## Step 6: Configure AWS S3

### Create S3 Bucket

```bash
aws s3 mb s3://salina-erp-documents-prod
```

### Configure CORS

Create `cors.json`:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://salina-erp.com"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }
]
```

Apply CORS:

```bash
aws s3api put-bucket-cors --bucket salina-erp-documents-prod --cors-configuration file://cors.json
```

### Create IAM User

Create IAM user with S3 access and generate access keys (add to `.env.local`).

## Step 7: Install Playwright Browsers

```bash
npx playwright install
```

This installs Chromium, Firefox, and WebKit browsers for testing.

## Step 8: Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`.

## Step 9: Run Tests

Verify setup by running E2E tests:

```bash
npm run test:e2e
```

All tests should pass if setup is correct.

### Run Tests in Headed Mode

```bash
npm run test:e2e:headed
```

### Run Tests in UI Mode

```bash
npm run test:e2e:ui
```

## Step 10: Configure Multi-Tenant Subdomain Resolution

### Development (localhost)

Add wildcard subdomain entries to `/etc/hosts`:

```
127.0.0.1 testpublisher.localhost
127.0.0.1 acmepub.localhost
```

### Production (Fly.io)

Configure wildcard DNS in your domain registrar:

```
*.salina-erp.com → fly.io
```

## Project Structure

After initialization, your project should have this structure:

```
salina-erp/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/            # Auth group
│   │   ├── (dashboard)/       # Dashboard group
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── db/                    # Database layer
│   │   ├── schema/            # Drizzle schema
│   │   └── migrations/        # Migration files
│   ├── features/              # Feature modules
│   │   ├── authors/
│   │   ├── titles/
│   │   ├── sales/
│   │   ├── royalties/
│   │   └── ...
│   ├── lib/                   # Utilities
│   └── types/                 # TypeScript types
├── tests/                     # E2E tests
│   ├── e2e/                   # Test files
│   └── support/               # Fixtures & helpers
├── docs/                      # Documentation
├── .env.local                 # Environment (gitignored)
├── .env.test                  # Test environment (gitignored)
├── package.json
├── playwright.config.ts
└── README.md
```

## Next Steps

1. **Review Architecture**: Read `docs/architecture.md` for complete technical decisions
2. **Read Test Guide**: See `tests/README.md` for test patterns and best practices
3. **Implement Features**: Start building feature modules in `src/features/`
4. **Write Tests**: Add E2E tests in `tests/e2e/` for each feature

## Troubleshooting

### "Cannot connect to database"

Verify `DATABASE_URL` in `.env.local` is correct and Neon database is running.

### "Clerk authentication failing"

Verify `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` are correct.

### "Multi-tenant subdomain not resolving"

Verify `/etc/hosts` entries or use `localhost.run` for dynamic subdomain resolution.

### "Playwright browser not installed"

Run `npx playwright install chromium`.

## Support

- Architecture questions: See `docs/architecture.md`
- Test framework: See `tests/README.md`
- BMAD methodology: See `.bmad/docs/`

---

_Project scaffolded by BMad Architecture + Test Framework workflows_
