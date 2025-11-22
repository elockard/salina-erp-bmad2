# Salina Bookshelf ERP - Decision Architecture

## Executive Summary

Salina ERP is a multi-tenant SaaS publishing platform built with a modern, serverless-first architecture. The system consolidates publishing workflows (ISBN management, tiered royalty calculations, author statements) into a unified platform optimized for operational efficiency and financial accuracy.

**Architectural Approach:** Modular monolith with feature-based organization, serverless deployment, and publishing-specific domain patterns.

**Key Architectural Decisions:**

- Next.js 16 App Router with React Server Components for optimal performance
- Neon PostgreSQL with Row-Level Security for multi-tenant data isolation
- Drizzle ORM with versioned migrations for type-safe database access
- Clerk for authentication with role-based authorization
- Inngest for background job processing (royalty calculations, PDF generation)
- AWS S3 for PDF statement storage with presigned URLs
- Resend + React Email for transactional emails

**Deployment Strategy:** Fly.io with Docker containers, horizontal scaling, serverless PostgreSQL auto-scaling.

## Project Initialization

**First Implementation Story: Create Next.js Project**

Execute the following command to initialize the base architecture:

```bash
npx create-next-app@latest salina-erp \
  --typescript \
  --tailwind \
  --biome \
  --app \
  --src-dir \
  --import-alias "@/*"
```

**What This Provides:**

- ✅ Next.js 16 with Turbopack (default bundler)
- ✅ TypeScript for type safety
- ✅ Tailwind CSS (foundation for shadcn/ui)
- ✅ Biome for linting + formatting (replaces ESLint + Prettier)
- ✅ App Router (React Server Components, Server Actions)
- ✅ src/ directory structure
- ✅ Import alias @/\* for clean imports

**Subsequent Setup Steps:**

1. Initialize shadcn/ui: `npx shadcn@latest init`
2. Install Drizzle ORM and Neon driver
3. Configure Clerk authentication
4. Set up Inngest background jobs
5. Configure AWS S3 and Resend integrations

## Decision Summary

| Category                | Decision                                 | Version               | Affects FRs      | Rationale                                                        |
| ----------------------- | ---------------------------------------- | --------------------- | ---------------- | ---------------------------------------------------------------- |
| **Framework**           | Next.js App Router                       | 16.x                  | All              | React Server Components, Server Actions, optimal performance     |
| **Language**            | TypeScript                               | 5.x                   | All              | Type safety, better DX, catches errors at compile time           |
| **Styling**             | Tailwind CSS                             | 3.x                   | All              | Utility-first, matches UX spec, shadcn/ui foundation             |
| **Linter/Formatter**    | Biome                                    | Latest                | All              | Faster than ESLint+Prettier, all-in-one tool, 70% less energy    |
| **Database**            | Neon PostgreSQL                          | Latest                | FR1-81           | Serverless, auto-scaling, RLS for multi-tenancy                  |
| **Connection Pooling**  | Neon built-in pooling                    | N/A                   | FR24-60          | Serverless-optimized, no external dependency                     |
| **ORM**                 | Drizzle ORM                              | Latest                | FR1-81           | Type-safe, PostgreSQL-optimized, excellent DX                    |
| **Database Driver**     | @neondatabase/serverless                 | 1.0+                  | FR1-81           | Neon-optimized, HTTP mode for speed                              |
| **Schema Organization** | src/db/schema/ directory                 | N/A                   | FR1-81           | Modular, organized by domain (10+ tables)                        |
| **Migrations**          | Drizzle Kit generate + migrate           | Latest                | FR1-81           | Versioned migrations for production safety                       |
| **Authentication**      | Clerk                                    | 5.x                   | FR1-8, FR61-66   | Next.js 16 compatible, MFA support, author portal                |
| **Authorization**       | RBAC (Owner/Admin/Editor/Finance/Author) | N/A                   | FR1-8            | Role-based permissions enforced in Server Actions                |
| **Email Service**       | Resend + React Email                     | 5.0+                  | FR53-60          | Modern API, React Email templates, excellent Next.js integration |
| **File Storage**        | AWS S3                                   | @aws-sdk/client-s3 v3 | FR53-60          | Industry standard, presigned URLs for secure downloads           |
| **Background Jobs**     | Inngest                                  | Latest                | FR45-52, FR53-60 | Serverless-native, visual debugging, no Redis needed             |
| **API Pattern**         | Server Actions (primary)                 | N/A                   | FR9-81           | Type-safe, colocated with components, simpler DX                 |
| **State Management**    | React Server Components + TanStack Query | 5.90+                 | All UI           | Server-first with client interactivity where needed              |
| **Form Handling**       | React Hook Form + Zod                    | 7.60+ / 3.25+         | FR9-44           | Type-safe validation, excellent DX, shadcn/ui integration        |
| **Form Resolver**       | @hookform/resolvers                      | 5.1+                  | FR9-44           | Connects React Hook Form with Zod                                |
| **UI Components**       | shadcn/ui + Radix UI                     | Latest                | All UI           | Accessible, customizable, code ownership, WCAG 2.1 AA            |
| **Data Tables**         | TanStack Table                           | 8.21+                 | FR24-29, FR72-76 | Headless, powerful, matches UX spec                              |
| **Charts**              | Recharts or Victory                      | Latest                | FR72-76          | Dashboard visualizations, sales charts                           |
| **Date/Time Library**   | date-fns + @date-fns/tz                  | 4.1+                  | FR24-60          | Lightweight, timezone support, functional                        |
| **Decimal Math**        | Decimal.js                               | Latest                | FR45-52          | Financial calculations without floating-point errors             |
| **Error Tracking**      | Sentry (recommended)                     | Latest                | FR77-81          | Production error monitoring, alerting                            |
| **Deployment**          | Fly.io + Docker                          | N/A                   | All              | Horizontal scaling, global edge, PostgreSQL proximity            |

## Project Structure

```
salina-erp/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth routes (login, register)
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (dashboard)/              # Protected staff routes
│   │   │   ├── dashboard/            # Role-based dashboard
│   │   │   ├── authors/              # FR9-13: Author management
│   │   │   ├── titles/               # FR14-23: Title & ISBN management
│   │   │   ├── sales/                # FR24-29: Sales transactions
│   │   │   ├── returns/              # FR30-37: Returns approval
│   │   │   ├── royalties/            # FR38-52: Contracts & calculations
│   │   │   ├── statements/           # FR53-60: Statement generation
│   │   │   ├── reports/              # FR72-76: Reporting & analytics
│   │   │   └── settings/             # FR6, FR8, FR77-81: Tenant settings
│   │   ├── (portal)/                 # Author portal routes
│   │   │   └── portal/               # FR61-66: Author statement access
│   │   │       ├── page.tsx
│   │   │       └── statements/
│   │   ├── api/                      # API routes (if needed later)
│   │   │   └── inngest/              # Inngest webhook endpoint
│   │   │       └── route.ts
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Marketing/landing page
│   │
│   ├── components/                   # Shared components
│   │   ├── ui/                       # shadcn/ui components (Button, Card, etc.)
│   │   ├── layout/                   # Layout components (Navbar, Sidebar)
│   │   └── providers/                # Context providers (TanStack Query, etc.)
│   │
│   ├── modules/                      # Feature modules (domain-driven)
│   │   ├── tenant/                   # FR1-8: Multi-tenancy
│   │   │   ├── components/
│   │   │   ├── middleware.ts         # Subdomain extraction, tenant context
│   │   │   ├── actions.ts            # Tenant CRUD operations
│   │   │   ├── queries.ts            # Tenant queries
│   │   │   ├── schema.ts             # Zod validation
│   │   │   └── types.ts
│   │   ├── users/                    # FR3-6: User management
│   │   │   ├── components/
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── authors/                  # FR9-13: Author management
│   │   │   ├── components/
│   │   │   │   ├── author-list.tsx
│   │   │   │   ├── author-detail.tsx
│   │   │   │   └── author-form.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── titles/                   # FR14-15, FR22-23: Title management
│   │   │   ├── components/
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── isbn/                     # FR16-21: ISBN pool management
│   │   │   ├── components/
│   │   │   │   ├── isbn-pool-status.tsx
│   │   │   │   ├── isbn-import.tsx
│   │   │   │   └── isbn-assignment.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── sales/                    # FR24-29: Sales transactions
│   │   │   ├── components/
│   │   │   │   ├── sales-form.tsx
│   │   │   │   └── transaction-history.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── returns/                  # FR30-37: Returns approval
│   │   │   ├── components/
│   │   │   │   ├── return-approval-queue.tsx
│   │   │   │   └── return-detail.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── royalties/                # FR38-52: Contracts & calculations
│   │   │   ├── components/
│   │   │   │   ├── contract-form.tsx
│   │   │   │   └── tiered-royalty-config.tsx
│   │   │   ├── calculator.ts         # Royalty calculation engine
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   └── statements/               # FR53-60: Statement generation
│   │       ├── components/
│   │       ├── pdf-generator.ts      # PDF generation logic
│   │       ├── actions.ts
│   │       ├── queries.ts
│   │       ├── schema.ts
│   │       └── types.ts
│   │
│   ├── db/                           # Database
│   │   ├── schema/                   # Drizzle schemas by module
│   │   │   ├── tenants.ts            # FR1-8
│   │   │   ├── users.ts              # FR3-6
│   │   │   ├── authors.ts            # FR9-13
│   │   │   ├── titles.ts             # FR14-15
│   │   │   ├── isbns.ts              # FR16-21
│   │   │   ├── sales.ts              # FR24-29
│   │   │   ├── returns.ts            # FR30-37
│   │   │   ├── contracts.ts          # FR38-44
│   │   │   └── statements.ts         # FR53-60
│   │   ├── migrations/               # Drizzle migrations (versioned)
│   │   └── index.ts                  # DB client export
│   │
│   ├── lib/                          # Shared utilities
│   │   ├── auth.ts                   # Clerk helpers, permission checks
│   │   ├── email.ts                  # Resend integration
│   │   ├── storage.ts                # S3 integration, presigned URLs
│   │   ├── format-currency.ts        # Currency formatting (Intl.NumberFormat)
│   │   ├── format-date.ts            # Date formatting (date-fns)
│   │   ├── logger.ts                 # Structured logging
│   │   ├── constants.ts              # App-wide constants
│   │   └── types.ts                  # Shared TypeScript types
│   │
│   └── inngest/                      # Inngest background jobs
│       ├── client.ts                 # Inngest client configuration
│       ├── calculate-royalties.ts    # FR45-52: Royalty calculation job
│       └── generate-statements.ts    # FR53-60: PDF generation job
│
├── public/                           # Static assets
│   └── images/
├── drizzle.config.ts                 # Drizzle configuration
├── middleware.ts                     # Clerk + tenant middleware (Next.js 15) or proxy.ts (Next.js 16)
├── tailwind.config.ts                # Tailwind + shadcn/ui config
├── components.json                   # shadcn/ui configuration
├── biome.json                        # Biome linter/formatter config
├── tsconfig.json                     # TypeScript configuration
├── Dockerfile                        # Docker container for Fly.io
├── fly.toml                          # Fly.io deployment config
├── .env.local                        # Environment variables (gitignored)
└── package.json
```

## FR Category to Architecture Mapping

| FR Category                           | Module Path                                          | Database Tables                       | Key Components                                               | Background Jobs              |
| ------------------------------------- | ---------------------------------------------------- | ------------------------------------- | ------------------------------------------------------------ | ---------------------------- |
| **Tenant & User Management** (FR1-8)  | modules/tenant/, modules/users/                      | tenants, users                        | TenantSettings, UserManagement, RoleAssignment               | None                         |
| **Author Management** (FR9-13)        | modules/authors/                                     | authors                               | AuthorList, AuthorDetail, AuthorForm, AuthorPortalAccess     | None                         |
| **Title & ISBN Management** (FR14-23) | modules/titles/, modules/isbn/                       | titles, isbns                         | TitleList, TitleDetail, ISBNPool, ISBNAssignment, ISBNImport | None                         |
| **Sales Transactions** (FR24-29)      | modules/sales/                                       | sales                                 | SalesForm, TransactionHistory, TransactionDetail             | None                         |
| **Returns Management** (FR30-37)      | modules/returns/                                     | returns                               | ReturnApprovalQueue, ReturnDetail, ApprovalButtons           | None                         |
| **Royalty Contracts** (FR38-44)       | modules/royalties/                                   | contracts                             | ContractForm, TieredRoyaltyConfig, ContractHistory           | None                         |
| **Royalty Calculation** (FR45-52)     | modules/royalties/                                   | (calculations stored in statements)   | RoyaltyCalculationTrigger, CalculationStatus                 | Inngest: calculate-royalties |
| **Statement Generation** (FR53-60)    | modules/statements/                                  | statements                            | StatementList, StatementDetail, StatementGenerator           | Inngest: generate-statements |
| **Author Portal** (FR61-66)           | app/(portal)/                                        | (uses authors, statements tables)     | PortalDashboard, StatementList, DownloadPDF                  | None                         |
| **Financial Tracking** (FR67-71)      | modules/royalties/                                   | (aggregations from sales, statements) | FinancialReports, LiabilitySummary, RevenueTracking          | None                         |
| **Reporting & Analytics** (FR72-76)   | modules/reports/ (future), components in each module | (views/aggregations)                  | ReportBuilder, SalesReport, ISBNPoolReport, CSVExport        | None                         |
| **System Administration** (FR77-81)   | modules/tenant/, lib/logger.ts                       | audit_logs (future)                   | AuditLog, BackgroundJobMonitor, TenantUsage                  | None                         |

## Technology Stack Details

### Core Technologies

**Frontend:**

- **Next.js 16** - React framework with App Router, Server Components, Server Actions, Turbopack bundler
- **React 19** - UI library with latest features (useOptimistic, useFormStatus)
- **TypeScript 5.x** - Type-safe development
- **Tailwind CSS 3.x** - Utility-first styling
- **shadcn/ui** - Accessible component library built on Radix UI primitives
- **TanStack Table 8.21+** - Headless table library for data grids
- **React Hook Form 7.60+** - Form state management
- **Zod 3.25+** - Schema validation
- **TanStack Query 5.90+** - Server state management, client-side caching
- **date-fns 4.1+** - Date formatting and manipulation with timezone support (@date-fns/tz)

**Backend:**

- **Next.js Server Actions** - Type-safe server mutations
- **Neon PostgreSQL** - Serverless PostgreSQL with auto-scaling, RLS for multi-tenancy
- **Drizzle ORM** - Type-safe PostgreSQL ORM
- **@neondatabase/serverless** - Neon driver for serverless environments (HTTP mode)
- **Clerk** - Authentication and user management (5.x, Next.js 16 compatible)
- **Inngest** - Serverless background job processing
- **Resend + React Email 5.0** - Transactional email service with React templates
- **AWS S3** (@aws-sdk/client-s3 v3) - Object storage for PDF statements
- **Decimal.js** - Precise financial calculations

**Development:**

- **Biome** - Fast linting and formatting (replaces ESLint + Prettier)
- **Drizzle Kit** - Database migrations and schema management
- **TypeScript** - Compile-time type checking
- **Sentry** (recommended) - Error tracking and monitoring

**Deployment:**

- **Fly.io** - Global application platform
- **Docker** - Container runtime
- **Neon PostgreSQL** - Database (same provider, low latency)

### Integration Points

**Authentication Flow:**

```
User → Clerk (auth) → Middleware → Extract tenant from subdomain → Load user + permissions → Server Action/Page
```

**Multi-Tenant Request Flow:**

```
1. Request arrives at acmepublishing.salina-erp.com
2. Middleware extracts "acmepublishing" subdomain
3. Query: SELECT id FROM tenants WHERE subdomain = 'acmepublishing'
4. Store tenant_id in session/context
5. All Drizzle queries auto-inject: WHERE tenant_id = ?
6. RLS policies enforce at database level (defense in depth)
```

**Background Job Flow:**

```
User triggers action → Server Action enqueues Inngest job → Inngest executes async → Job updates database → User notified via toast/email
```

**Email Delivery:**

```
Server Action → Resend API → React Email template → Email sent → Track delivery status
```

**File Storage:**

```
Generate PDF → Upload to S3 → Store S3 key in database → Generate presigned URL (15 min expiry) → User downloads
```

**Data Flow Example (Sales Transaction):**

```
1. User submits form (SalesForm component)
2. React Hook Form validates with Zod schema (client-side)
3. Server Action receives data, validates again (server-side)
4. Check permissions (user has Editor or Finance role)
5. Get tenant_id from context
6. Drizzle inserts into sales table with tenant_id
7. Database CHECK constraint validates (quantity > 0, price > 0)
8. Return { success: true, data: sale }
9. Toast notification shown to user
10. Transaction appears in history immediately (Server Component refetch)
```

## Novel Architectural Patterns

### Pattern 1: Tiered Royalty Calculation Engine

**Problem:** Publishing contracts have complex tiered royalty structures that vary by format, with advance recoupment and return adjustments.

**Solution:**

```typescript
// Royalty Calculation Algorithm
// Location: src/modules/royalties/calculator.ts

interface TierConfig {
  min_quantity: number;
  max_quantity: number | null; // null = infinity
  rate: number; // decimal (0.10 = 10%)
  format: "physical" | "ebook" | "audiobook";
}

async function calculateRoyaltyForPeriod(
  authorId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<RoyaltyCalculation> {
  // Step 1: Get contract with tiered rates
  const contract = await getContractByAuthor(authorId, tenantId);

  // Step 2: Calculate net sales per format
  const salesByFormat = await getSalesByFormat(
    authorId,
    startDate,
    endDate,
    tenantId
  );
  const approvedReturnsByFormat = await getApprovedReturnsByFormat(
    authorId,
    startDate,
    endDate,
    tenantId
  );

  const netSalesByFormat = Object.keys(salesByFormat).map((format) => ({
    format,
    netQuantity:
      salesByFormat[format].quantity -
      (approvedReturnsByFormat[format]?.quantity || 0),
    netRevenue:
      salesByFormat[format].revenue -
      (approvedReturnsByFormat[format]?.revenue || 0),
  }));

  // Step 3: Apply tiered rates per format
  let totalRoyaltyEarned = new Decimal(0);
  const calculations: FormatCalculation[] = [];

  for (const formatData of netSalesByFormat) {
    const tiers = contract.tiers.filter((t) => t.format === formatData.format);
    let quantityRemaining = formatData.netQuantity;
    let formatRoyalty = new Decimal(0);
    const tierBreakdown: TierBreakdown[] = [];

    // Apply each tier in order
    for (const tier of tiers.sort((a, b) => a.min_quantity - b.min_quantity)) {
      const tierMax = tier.max_quantity || Infinity;
      const tierQuantity = Math.min(
        quantityRemaining,
        tierMax - tier.min_quantity
      );

      if (tierQuantity > 0) {
        const tierRevenue = new Decimal(tierQuantity).times(
          formatData.netRevenue / formatData.netQuantity
        );
        const tierRoyalty = tierRevenue.times(tier.rate);

        formatRoyalty = formatRoyalty.plus(tierRoyalty);
        tierBreakdown.push({
          tier,
          quantity: tierQuantity,
          royalty: tierRoyalty.toNumber(),
        });

        quantityRemaining -= tierQuantity;
      }

      if (quantityRemaining <= 0) break;
    }

    totalRoyaltyEarned = totalRoyaltyEarned.plus(formatRoyalty);
    calculations.push({
      format: formatData.format,
      tiers: tierBreakdown,
      total: formatRoyalty.toNumber(),
    });
  }

  // Step 4: Calculate advance recoupment
  let recoupment = new Decimal(0);
  let netPayable = new Decimal(0);

  if (totalRoyaltyEarned.greaterThan(0) && contract.advance_remaining > 0) {
    recoupment = Decimal.min(
      totalRoyaltyEarned,
      new Decimal(contract.advance_remaining)
    );
    netPayable = totalRoyaltyEarned.minus(recoupment);
  } else if (totalRoyaltyEarned.greaterThan(0)) {
    netPayable = totalRoyaltyEarned;
  }
  // If totalRoyaltyEarned <= 0 (negative period), netPayable stays 0, no reversal of recouped advances

  // Step 5: Update contract advance_recouped
  if (recoupment.greaterThan(0)) {
    await updateContractRecoupment(contract.id, recoupment.toNumber());
  }

  return {
    period: { startDate, endDate },
    authorId,
    calculations,
    totalRoyaltyEarned: totalRoyaltyEarned.toNumber(),
    recoupment: recoupment.toNumber(),
    netPayable: netPayable.toNumber(),
  };
}
```

**Implementation Notes:**

- Runs as Inngest background job (handles 30s+ processing time per author)
- Uses Decimal.js for financial precision (no floating-point errors)
- Critical testing: Comprehensive unit tests for edge cases (negative periods, boundary tiers, multiple formats)
- Audit trail: All calculations stored in statements table with full breakdown

### Pattern 2: Multi-Tenant Row-Level Security

**Problem:** Multiple publishing companies (tenants) share the same database. Data must be completely isolated with zero leakage.

**Solution: Defense in Depth - Three Layers**

**Layer 1: Middleware (Tenant Context)**

```typescript
// middleware.ts
export default clerkMiddleware((auth, req) => {
  // Extract subdomain
  const host = req.headers.get("host") || "";
  const subdomain = host.split(".")[0];

  // Query tenant
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, subdomain),
  });

  if (!tenant) {
    return NextResponse.redirect(new URL("/tenant-not-found", req.url));
  }

  // Store tenant_id in session
  // This makes tenant_id available to all Server Actions and Server Components

  // Protect routes
  if (isProtectedRoute(req)) auth().protect();
});
```

**Layer 2: Application (Drizzle Query Wrapper)**

```typescript
// lib/db-wrapper.ts
export async function getTenantScopedDb() {
  const tenantId = await getCurrentTenantId(); // From session

  return {
    query: {
      authors: {
        findMany: (opts) =>
          db.query.authors.findMany({
            ...opts,
            where: and(
              eq(authors.tenant_id, tenantId), // ALWAYS inject
              opts?.where
            ),
          }),
        findFirst: (opts) =>
          db.query.authors.findFirst({
            ...opts,
            where: and(
              eq(authors.tenant_id, tenantId), // ALWAYS inject
              opts?.where
            ),
          }),
      },
      // ... wrap all tables
    },
  };
}

// Usage in Server Action
("use server");
export async function getAuthors() {
  const db = await getTenantScopedDb();
  return db.query.authors.findMany(); // tenant_id automatically injected
}
```

**Layer 3: Database (Row-Level Security Policies)**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE titles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Create RLS policy
CREATE POLICY tenant_isolation_policy ON authors
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON titles
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Before each query, set session variable
SET app.current_tenant_id = '<tenant_id>';
```

**Testing Strategy:**

- Automated tests verify no cross-tenant data leakage
- Test: Create data in Tenant A, query as Tenant B → should return empty
- Test: Attempt to access another tenant's resource by ID → should return 404
- Continuous monitoring: Audit logs for any RLS policy violations

### Pattern 3: ISBN Pool Management with Row Locking

**Problem:** Prevent duplicate ISBN assignment when multiple users assign ISBNs concurrently.

**Solution: PostgreSQL Row-Level Locking**

```typescript
// modules/isbn/actions.ts
"use server";
export async function assignISBNToTitle(
  titleId: string,
  format: "physical" | "ebook"
): Promise<ActionResult<ISBN>> {
  const tenantId = await getCurrentTenantId();
  const user = await currentUser();

  // Permission check
  if (!["editor", "admin", "owner"].includes(user.role)) {
    return { success: false, error: "Only editors can assign ISBNs" };
  }

  // Use transaction with row locking
  try {
    const result = await db.transaction(async (tx) => {
      // Step 1: Find available ISBN with row lock
      const availableISBN = await tx
        .select()
        .from(isbns)
        .where(
          and(
            eq(isbns.tenant_id, tenantId),
            eq(isbns.status, "available"),
            eq(isbns.type, format)
          )
        )
        .limit(1)
        .forUpdate() // ← ROW LOCK (blocks other transactions)
        .execute();

      if (!availableISBN || availableISBN.length === 0) {
        throw new Error(`No available ${format} ISBNs in pool`);
      }

      const isbn = availableISBN[0];

      // Step 2: Assign ISBN to title
      await tx
        .update(isbns)
        .set({
          status: "assigned",
          assigned_to_title_id: titleId,
          assigned_at: new Date(),
          assigned_by_user_id: user.id,
        })
        .where(eq(isbns.id, isbn.id))
        .execute();

      // Step 3: Update title with ISBN
      await tx
        .update(titles)
        .set({
          [format === "physical" ? "isbn" : "eisbn"]: isbn.isbn_13,
        })
        .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)))
        .execute();

      return isbn;
    });

    return { success: true, data: result };
  } catch (error) {
    logger.error("ISBN assignment failed", { titleId, format, error });
    return {
      success: false,
      error: error.message || "Failed to assign ISBN. Please try again.",
    };
  }
}
```

**Implementation Notes:**

- `.forUpdate()` creates a row-level lock, preventing concurrent assignment of same ISBN
- Transaction ensures atomicity: both ISBN update and title update succeed or both rollback
- If two users try to assign ISBNs simultaneously, one will get the lock, the other waits
- Once locked ISBN is assigned, second transaction finds next available ISBN

## Implementation Patterns

These patterns ensure consistent implementation across all AI agents:

### Naming Conventions

**Database (PostgreSQL + Drizzle):**

- **Table names**: Plural, snake_case (`sales_transactions`, `royalty_contracts`, `isbn_pool`)
- **Column names**: snake_case (`author_id`, `created_at`, `sale_date`, `royalty_rate`, `is_active`)
- **Foreign keys**: `{table}_id` format (`author_id`, `title_id`, `tenant_id`, `contract_id`)
- **Boolean columns**: `is_` or `has_` prefix (`is_active`, `has_isbn`, `is_approved`)
- **Timestamp columns**: `created_at`, `updated_at` (always include both on all tables)
- **Junction tables**: `{table1}_{table2}` (e.g., `titles_authors` for many-to-many)

**Files & Components:**

- **File names**: kebab-case (`sales-form.tsx`, `calculate-royalty.ts`, `format-currency.ts`)
- **Component names**: PascalCase (`SalesForm`, `AuthorCard`, `RoyaltyTable`, `ISBNPoolStatus`)
- **Server Action files**: kebab-case with .ts (`actions.ts`, `queries.ts`)
- **Utility/helper files**: kebab-case (`format-currency.ts`, `validate-isbn.ts`)

**Code Identifiers:**

- **Server Actions**: camelCase verbs (`createAuthor`, `recordSale`, `approveReturn`, `calculateRoyalties`)
- **Query functions**: `get` prefix (`getAuthors`, `getTitleById`, `getSalesByPeriod`)
- **Hooks**: camelCase with `use` prefix (`useAuthors`, `useTenantContext`, `useRoyaltyCalculation`)
- **Types/Interfaces**: PascalCase (`Author`, `Sale`, `RoyaltyContract`, `TierConfig`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_UPLOAD_SIZE`, `DEFAULT_PAGE_SIZE`, `ROYALTY_PERIOD_QUARTERLY`)

### Code Organization

**Module Structure (Feature-Based):**

```typescript
src/modules/{feature}/
├── components/              // Feature-specific UI components
│   ├── {feature}-list.tsx   // List view (Split View left panel)
│   ├── {feature}-detail.tsx // Detail view (Split View right panel)
│   ├── {feature}-form.tsx   // Create/edit form
│   └── {feature}-card.tsx   // Card component for dashboard
├── actions.ts               // Server Actions (mutations, "use server")
├── queries.ts               // Database queries (reads, exported functions)
├── schema.ts                // Zod validation schemas
└── types.ts                 // TypeScript types/interfaces
```

**Component File Structure:**

```typescript
// sales-form.tsx

// 1. Imports (grouped and ordered)
import React from 'react'
import { useForm } from 'react-hook-form'  // External libraries
import { zodResolver } from '@hookform/resolvers/zod'

import { Button } from '@/components/ui/button'  // Internal components
import { recordSale } from './actions'  // Local imports
import { saleSchema, type SaleInput } from './schema'

// 2. Types/Interfaces (if not in separate types.ts)
interface SalesFormProps {
  onSuccess?: () => void
}

// 3. Component definition
export function SalesForm({ onSuccess }: SalesFormProps) {
  const form = useForm<SaleInput>({
    resolver: zodResolver(saleSchema)
  })

  // ... component logic

  return (
    // ... JSX
  )
}

// 4. Export (default export for components)
export default SalesForm
```

**Server Action File Structure:**

```typescript
// actions.ts

// 1. "use server" directive at the TOP
"use server";

// 2. Imports
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sales } from "@/db/schema/sales";
import { saleSchema } from "./schema";
import { getCurrentTenantId, getCurrentUser } from "@/lib/auth";
import { logger } from "@/lib/logger";

// 3. Action functions (named exports only, no default export)
export async function recordSale(data: unknown): Promise<ActionResult<Sale>> {
  try {
    // Validate
    const validated = saleSchema.parse(data);

    // Authorize
    const user = await getCurrentUser();
    if (!["editor", "finance", "admin", "owner"].includes(user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    // Get tenant context
    const tenantId = await getCurrentTenantId();

    // Execute
    const sale = await db
      .insert(sales)
      .values({
        ...validated,
        tenant_id: tenantId,
        created_by: user.id,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning();

    // Revalidate
    revalidatePath("/sales");

    // Log
    logger.info("Sale recorded", { saleId: sale[0].id, userId: user.id });

    return { success: true, data: sale[0] };
  } catch (error) {
    logger.error("Failed to record sale", { error, data });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to record sale",
    };
  }
}
```

### Data Access Patterns

**Tenant Scoping (CRITICAL - ALWAYS ENFORCE):**

```typescript
// CORRECT: Always include tenant_id in WHERE clause
const authors = await db.query.authors.findMany({
  where: and(
    eq(authors.tenant_id, tenantId), // ← FIRST condition, ALWAYS
    eq(authors.is_active, true)
    // ... other conditions
  ),
});

// INCORRECT: Missing tenant_id filter
const authors = await db.query.authors.findMany({
  where: eq(authors.is_active, true), // ⚠️ CROSS-TENANT DATA LEAK
});
```

**CRUD Pattern:**

```typescript
// CREATE
export async function createAuthor(
  data: CreateAuthorInput
): Promise<ActionResult<Author>> {
  const tenantId = await getCurrentTenantId();
  const validated = createAuthorSchema.parse(data);

  const author = await db
    .insert(authors)
    .values({
      ...validated,
      tenant_id: tenantId,
      created_at: new Date(),
      updated_at: new Date(),
    })
    .returning();

  return { success: true, data: author[0] };
}

// READ (single)
export async function getAuthorById(id: string): Promise<Author | null> {
  const tenantId = await getCurrentTenantId();

  return db.query.authors.findFirst({
    where: and(eq(authors.tenant_id, tenantId), eq(authors.id, id)),
  });
}

// READ (list with pagination)
export async function getAuthors(
  page = 1,
  pageSize = 20
): Promise<{ authors: Author[]; total: number }> {
  const tenantId = await getCurrentTenantId();

  const results = await db.query.authors.findMany({
    where: eq(authors.tenant_id, tenantId),
    limit: pageSize,
    offset: (page - 1) * pageSize,
    orderBy: desc(authors.created_at),
  });

  const total = await db
    .select({ count: count() })
    .from(authors)
    .where(eq(authors.tenant_id, tenantId));

  return { authors: results, total: total[0].count };
}

// UPDATE
export async function updateAuthor(
  id: string,
  data: UpdateAuthorInput
): Promise<ActionResult<Author>> {
  const tenantId = await getCurrentTenantId();
  const validated = updateAuthorSchema.parse(data);

  const author = await db
    .update(authors)
    .set({
      ...validated,
      updated_at: new Date(),
    })
    .where(and(eq(authors.tenant_id, tenantId), eq(authors.id, id)))
    .returning();

  if (!author.length) {
    return { success: false, error: "Author not found" };
  }

  revalidatePath("/authors");
  return { success: true, data: author[0] };
}

// DELETE (soft delete preferred)
export async function deleteAuthor(id: string): Promise<ActionResult<void>> {
  const tenantId = await getCurrentTenantId();

  await db
    .update(authors)
    .set({
      is_active: false,
      deleted_at: new Date(),
      updated_at: new Date(),
    })
    .where(and(eq(authors.tenant_id, tenantId), eq(authors.id, id)));

  revalidatePath("/authors");
  return { success: true, data: undefined };
}
```

**Transaction Pattern (Multi-Step Operations):**

```typescript
export async function assignISBNToTitle(
  titleId: string,
  format: "physical" | "ebook"
): Promise<ActionResult<ISBN>> {
  const tenantId = await getCurrentTenantId();

  try {
    const result = await db.transaction(async (tx) => {
      // Step 1: Find and lock available ISBN
      const isbn = await tx
        .select()
        .from(isbns)
        .where(
          and(
            eq(isbns.tenant_id, tenantId),
            eq(isbns.status, "available"),
            eq(isbns.type, format)
          )
        )
        .limit(1)
        .forUpdate(); // Row lock

      if (!isbn.length) throw new Error("No available ISBNs");

      // Step 2: Update ISBN status
      await tx
        .update(isbns)
        .set({ status: "assigned", assigned_to_title_id: titleId })
        .where(eq(isbns.id, isbn[0].id));

      // Step 3: Update title with ISBN
      await tx
        .update(titles)
        .set({ [format === "physical" ? "isbn" : "eisbn"]: isbn[0].isbn_13 })
        .where(and(eq(titles.id, titleId), eq(titles.tenant_id, tenantId)));

      return isbn[0];
    });

    return { success: true, data: result };
  } catch (error) {
    return { success: false, error: "Failed to assign ISBN" };
  }
}
```

### API Response Format

**Standardized ActionResult Type:**

```typescript
// lib/types.ts
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> };
```

**Success Response:**

```typescript
return {
  success: true,
  data: { id: '123', name: 'Author Name', ... }
}
```

**Error Response:**

```typescript
return {
  success: false,
  error: "Author not found",
};
```

**Validation Error Response:**

```typescript
return {
  success: false,
  error: "Validation failed",
  fields: {
    email: "Invalid email format",
    tax_id: "Tax ID is required",
  },
};
```

**Client-Side Usage:**

```typescript
const result = await recordSale(formData);

if (result.success) {
  toast.success("Sale recorded successfully");
  router.push(`/sales/${result.data.id}`);
} else {
  toast.error(result.error);
  if (result.fields) {
    Object.entries(result.fields).forEach(([field, error]) => {
      form.setError(field, { message: error });
    });
  }
}
```

### Error Handling

**Three-Layer Validation:**

```typescript
// Layer 1: Client-side (Zod + React Hook Form)
const formSchema = z.object({
  quantity: z.number().positive("Quantity must be positive"),
  price: z.number().positive("Price must be positive"),
  sale_date: z.date().max(new Date(), "Sale date cannot be in the future"),
});

// Layer 2: Server-side (Server Action)
("use server");
export async function recordSale(data: unknown) {
  try {
    const validated = saleSchema.parse(data); // Throws ZodError if invalid
    // ... proceed with validated data
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Validation failed",
        fields: error.flatten().fieldErrors,
      };
    }
    throw error; // Re-throw unexpected errors
  }
}

// Layer 3: Database (Constraints)
export const sales = pgTable(
  "sales",
  {
    // ...
    quantity: integer("quantity").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  },
  (table) => ({
    // CHECK constraints enforce business rules
    positiveQuantity: check("positive_quantity", sql`${table.quantity} > 0`),
    positivePrice: check("positive_price", sql`${table.price} > 0`),
  })
);
```

**Error Handling Pattern:**

```typescript
"use server"
export async function performAction(data: unknown): Promise<ActionResult<Result>> {
  try {
    // 1. Validate input
    const validated = schema.parse(data)

    // 2. Authorize user
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")

    // 3. Get tenant context
    const tenantId = await getCurrentTenantId()

    // 4. Execute operation
    const result = await db...

    // 5. Log success
    logger.info('Action completed', { userId: user.id, tenantId })

    // 6. Return success
    return { success: true, data: result }

  } catch (error) {
    // Log error with context
    logger.error('Action failed', { error, data })

    // Return user-friendly error
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: "Invalid data",
        fields: error.flatten().fieldErrors
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred'
    }
  }
}
```

**User-Facing Error Messages:**

```typescript
// GOOD: Clear, actionable, no jargon
"This ISBN is already assigned to another title";
"Please enter a positive quantity";
"Author not found. They may have been deleted.";
"Failed to approve return. Please try again or contact support.";

// BAD: Technical, confusing, exposes internals
"Foreign key constraint violation on isbns.assigned_to_title_id";
"Unexpected error in calculateRoyalties() at line 247";
"Database connection pool exhausted";
```

### Logging Strategy

**Structured Logging:**

```typescript
// lib/logger.ts
export const logger = {
  info: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === "production") {
      console.log(
        JSON.stringify({
          level: "info",
          timestamp: new Date().toISOString(),
          message,
          ...context,
        })
      );
    } else {
      console.log(`[INFO] ${message}`, context);
    }
  },

  warn: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        JSON.stringify({
          level: "warn",
          timestamp: new Date().toISOString(),
          message,
          ...context,
        })
      );
    } else {
      console.warn(`[WARN] ${message}`, context);
    }
  },

  error: (message: string, context?: Record<string, any>) => {
    if (process.env.NODE_ENV === "production") {
      console.error(
        JSON.stringify({
          level: "error",
          timestamp: new Date().toISOString(),
          message,
          ...context,
        })
      );
    } else {
      console.error(`[ERROR] ${message}`, context);
    }
  },
};
```

**Usage:**

```typescript
// Log important business events
logger.info("Royalty statement generated", {
  authorId: author.id,
  period: { startDate, endDate },
  netPayable: statement.netPayable,
});

// Log warnings
logger.warn("ISBN pool running low", {
  tenantId,
  availableCount: 5,
  threshold: 10,
});

// Log errors with full context
logger.error("Failed to send royalty statement email", {
  authorId,
  statementId,
  error: error.message,
  email: author.email,
});
```

**Never Log:**

- Passwords
- API keys
- Tax IDs (full)
- Credit card numbers
- Session tokens

**Production:**

- Logs to stdout (Fly.io captures)
- JSON format for parsing
- Ship to monitoring service (Sentry)

### Date/Time Handling

**Library:** date-fns v4.1+ with @date-fns/tz

**Storage Pattern:**

```typescript
// Database: Always UTC timestamps
created_at: timestamp("created_at", {
  withTimezone: true,
  mode: "date",
}).notNull();
updated_at: timestamp("updated_at", {
  withTimezone: true,
  mode: "date",
}).notNull();

// Store dates without time as DATE (not TIMESTAMP)
sale_date: date("sale_date", { mode: "date" }).notNull();
```

**Display Pattern:**

```typescript
import { format } from "date-fns";
import { toZonedTime } from "@date-fns/tz";

// Get tenant timezone from settings (default: America/New_York)
const tenantTimezone = tenant.timezone || "America/New_York";

// Convert UTC to tenant timezone for display
const displayDate = format(
  toZonedTime(utcDate, tenantTimezone),
  "MMM dd, yyyy h:mm a"
);

// For date-only (no time)
const displayDate = format(saleDate, "MMM dd, yyyy");
```

**Standard Formats:**

```typescript
// Full datetime: "Nov 21, 2025 2:30 PM"
format(date, "MMM dd, yyyy h:mm a");

// Date only: "Nov 21, 2025"
format(date, "MMM dd, yyyy");

// Short date: "11/21/25"
format(date, "MM/dd/yy");

// ISO for API: "2025-11-21T14:30:00Z"
date.toISOString();

// Relative: "2 hours ago"
import { formatDistanceToNow } from "date-fns";
formatDistanceToNow(date, { addSuffix: true });
```

**Timezone Strategy:**

- **Database:** Always UTC
- **Application logic:** UTC (calculations, comparisons)
- **Display to user:** Convert to tenant timezone
- **Tenant setting:** Store preferred timezone (defaults to America/New_York for US publishers)

### Currency Handling

**Storage:**

```typescript
// Database: DECIMAL(10, 2) for currency
royalty_amount: decimal("royalty_amount", {
  precision: 10,
  scale: 2,
}).notNull();
```

**Calculations:**

```typescript
import Decimal from "decimal.js";

// ALWAYS use Decimal.js for financial math
const price = new Decimal("24.99");
const quantity = new Decimal("150");
const total = price.times(quantity); // No floating-point errors

// Convert to number only for display or database storage
const totalNumber = total.toNumber(); // 3748.50
```

**Display:**

```typescript
// Format currency for display
export function formatCurrency(
  amount: number,
  currency = "USD",
  locale = "en-US"
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Usage
formatCurrency(3748.5); // "$3,748.50"
formatCurrency(3748.5, "EUR", "de-DE"); // "3.748,50 €"
```

**Rules:**

- Never use JavaScript `+`, `-`, `*`, `/` for currency (floating-point errors)
- Always use Decimal.js for calculations
- Store as DECIMAL(10, 2) in database
- Format with Intl.NumberFormat for display
- Support multi-currency via tenant settings (future enhancement)

### Security & Authorization

**Permission Checks (Every Server Action):**

```typescript
"use server";
export async function approveReturn(
  returnId: string
): Promise<ActionResult<Return>> {
  // 1. Check authentication
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "Unauthorized" };
  }

  // 2. Check role-based permission
  if (
    user.role !== "finance" &&
    user.role !== "admin" &&
    user.role !== "owner"
  ) {
    return { success: false, error: "Only Finance users can approve returns" };
  }

  // 3. Get tenant context
  const tenantId = await getCurrentTenantId();

  // 4. Verify resource belongs to tenant (prevent cross-tenant access)
  const returnRecord = await db.query.returns.findFirst({
    where: and(eq(returns.id, returnId), eq(returns.tenant_id, tenantId)),
  });

  if (!returnRecord) {
    return { success: false, error: "Return not found" };
  }

  // 5. Execute authorized action
  // ...
}
```

**Input Sanitization:**

```typescript
// ALWAYS validate with Zod before database operations
const validated = schema.parse(data);

// NEVER concatenate SQL (use Drizzle query builder, which parameterizes)
// ❌ BAD: db.execute(`SELECT * FROM users WHERE email = '${email}'`)
// ✅ GOOD: db.query.users.findFirst({ where: eq(users.email, email) })

// NEVER trust user input for IDs
// Use UUIDs instead of auto-incrementing integers
id: uuid("id").primaryKey().defaultRandom();

// Sanitize file uploads (CSV imports)
// - Validate file extension
// - Check file size (< 10MB)
// - Parse with safe CSV library
// - Validate each row with Zod
```

**Security Headers:**

```typescript
// next.config.js
const securityHeaders = [
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
];
```

### UI Patterns

**Loading States:**

```typescript
// Forms: Disable submit, show spinner
import { useFormStatus } from "react-dom";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button disabled={pending}>
      {pending ? (
        <>
          <Spinner className="mr-2" />
          Saving...
        </>
      ) : (
        "Save"
      )}
    </Button>
  );
}

// Lists: Show skeleton loaders
import { Skeleton } from "@/components/ui/skeleton";

{
  isLoading ? (
    <Skeleton className="h-12 w-full" count={5} />
  ) : (
    <Table data={authors} />
  );
}
```

**Toast Notifications:**

```typescript
import { toast } from "sonner"; // shadcn/ui uses sonner

// Success
toast.success("Author created successfully");

// Error with action
toast.error("Failed to save changes", {
  action: {
    label: "Retry",
    onClick: () => handleRetry(),
  },
});

// Info (background job started)
toast.info("Royalty calculation started. You'll be notified when complete.");

// Promise (auto-updates on resolution)
toast.promise(recordSale(data), {
  loading: "Recording sale...",
  success: "Sale recorded successfully",
  error: "Failed to record sale",
});
```

**Empty States:**

```typescript
{
  authors.length === 0 ? (
    <div className="text-center py-12">
      <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
      <h3 className="mt-2 text-sm font-semibold">No authors yet</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Get started by creating your first author.
      </p>
      <Button className="mt-4" onClick={handleCreateAuthor}>
        Create Author
      </Button>
    </div>
  ) : (
    <AuthorList authors={authors} />
  );
}
```

## Data Architecture

### Database Schema

**Core Tables:**

```typescript
// tenants (FR1-8)
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  subdomain: text("subdomain").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  fiscal_year_start: date("fiscal_year_start", { mode: "date" }),
  default_currency: text("default_currency").notNull().default("USD"),
  statement_frequency: text("statement_frequency")
    .notNull()
    .default("quarterly"),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// users (FR3-6)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  clerk_user_id: text("clerk_user_id").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull(), // owner, admin, editor, finance, author
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// authors (FR9-13)
export const authors = pgTable("authors", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  tax_id: text("tax_id"), // Encrypted
  payment_method: text("payment_method"),
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// titles (FR14-15, FR22-23)
export const titles = pgTable("titles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  genre: text("genre"),
  word_count: integer("word_count"),
  publication_status: text("publication_status").notNull().default("draft"),
  isbn: text("isbn").unique(), // Physical book ISBN
  eisbn: text("eisbn").unique(), // Ebook ISBN
  publication_date: date("publication_date", { mode: "date" }),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// isbns (FR16-21)
export const isbns = pgTable("isbns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  isbn_13: text("isbn_13").notNull().unique(),
  type: text("type").notNull(), // physical, ebook
  status: text("status").notNull().default("available"), // available, assigned, registered, retired
  assigned_to_title_id: uuid("assigned_to_title_id").references(
    () => titles.id
  ),
  assigned_at: timestamp("assigned_at", { withTimezone: true }),
  assigned_by_user_id: uuid("assigned_by_user_id").references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// sales (FR24-29)
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    title_id: uuid("title_id")
      .notNull()
      .references(() => titles.id),
    format: text("format").notNull(), // physical, ebook, audiobook
    quantity: integer("quantity").notNull(),
    unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    total_amount: decimal("total_amount", {
      precision: 10,
      scale: 2,
    }).notNull(),
    sale_date: date("sale_date", { mode: "date" }).notNull(),
    channel: text("channel").notNull(), // retail, wholesale, direct, distributor
    created_by_user_id: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id),
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    positiveQuantity: check("positive_quantity", sql`${table.quantity} > 0`),
    positivePrice: check("positive_price", sql`${table.unit_price} > 0`),
  })
);

// returns (FR30-37)
export const returns = pgTable("returns", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  title_id: uuid("title_id")
    .notNull()
    .references(() => titles.id),
  original_sale_id: uuid("original_sale_id").references(() => sales.id),
  format: text("format").notNull(),
  quantity: integer("quantity").notNull(),
  unit_price: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  total_amount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  return_date: date("return_date", { mode: "date" }).notNull(),
  reason: text("reason"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  reviewed_by_user_id: uuid("reviewed_by_user_id").references(() => users.id),
  reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
  created_by_user_id: uuid("created_by_user_id")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// contracts (FR38-44)
export const contracts = pgTable("contracts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  author_id: uuid("author_id")
    .notNull()
    .references(() => authors.id),
  title_id: uuid("title_id")
    .notNull()
    .references(() => titles.id),
  advance_amount: decimal("advance_amount", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  advance_paid: decimal("advance_paid", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  advance_recouped: decimal("advance_recouped", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  status: text("status").notNull().default("active"), // active, terminated, suspended
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// contract_tiers (FR39-40)
export const contractTiers = pgTable("contract_tiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  contract_id: uuid("contract_id")
    .notNull()
    .references(() => contracts.id, { onDelete: "cascade" }),
  format: text("format").notNull(), // physical, ebook, audiobook
  min_quantity: integer("min_quantity").notNull(),
  max_quantity: integer("max_quantity"), // null = infinity
  rate: decimal("rate", { precision: 5, scale: 4 }).notNull(), // 0.1000 = 10%
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// statements (FR53-60)
export const statements = pgTable("statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenant_id: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id),
  author_id: uuid("author_id")
    .notNull()
    .references(() => authors.id),
  contract_id: uuid("contract_id")
    .notNull()
    .references(() => contracts.id),
  period_start: date("period_start", { mode: "date" }).notNull(),
  period_end: date("period_end", { mode: "date" }).notNull(),
  total_royalty_earned: decimal("total_royalty_earned", {
    precision: 10,
    scale: 2,
  }).notNull(),
  recoupment: decimal("recoupment", { precision: 10, scale: 2 }).notNull(),
  net_payable: decimal("net_payable", { precision: 10, scale: 2 }).notNull(),
  calculations: jsonb("calculations").notNull(), // Store full calculation breakdown
  pdf_s3_key: text("pdf_s3_key"),
  email_sent_at: timestamp("email_sent_at", { withTimezone: true }),
  generated_by_user_id: uuid("generated_by_user_id")
    .notNull()
    .references(() => users.id),
  created_at: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
```

**Relationships:**

- Tenant → Users (1:many)
- Tenant → Authors (1:many)
- Tenant → Titles (1:many)
- Tenant → ISBNs (1:many)
- Title → Sales (1:many)
- Title → Returns (1:many)
- Author + Title → Contract (many:many via contracts)
- Contract → ContractTiers (1:many)
- Author → Statements (1:many)

**Indexes (for performance):**

```typescript
// tenant_id on all tenant-scoped tables (for RLS and queries)
// sale_date, return_date (for period queries)
// status columns (for filtering pending/approved/etc.)
// email on users (for Clerk lookup)
// isbn_13 on isbns (unique constraint also creates index)
```

## API Contracts

### Server Actions (Primary Pattern)

**Standard Signature:**

```typescript
"use server";
export async function actionName(
  data: unknown
): Promise<ActionResult<ReturnType>> {
  // Implementation
}
```

**Examples:**

```typescript
// Create
"use server";
export async function createAuthor(
  data: unknown
): Promise<ActionResult<Author>>;

// Read
("use server");
export async function getAuthors(
  page?: number
): Promise<ActionResult<{ authors: Author[]; total: number }>>;

// Update
("use server");
export async function updateAuthor(
  id: string,
  data: unknown
): Promise<ActionResult<Author>>;

// Delete
("use server");
export async function deleteAuthor(id: string): Promise<ActionResult<void>>;

// Complex operations
("use server");
export async function approveReturn(
  returnId: string
): Promise<ActionResult<Return>>;

("use server");
export async function assignISBN(
  titleId: string,
  format: "physical" | "ebook"
): Promise<ActionResult<ISBN>>;
```

### API Routes (Future External Integrations)

**Pattern:** REST with standardized responses

```typescript
// app/api/v1/sales/route.ts
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validated = saleSchema.parse(body);

    // ... create sale

    return NextResponse.json(
      {
        success: true,
        data: sale,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid request",
      },
      { status: 400 }
    );
  }
}
```

## Security Architecture

### Multi-Tenant Isolation

**Defense in Depth (3 Layers):**

1. **Middleware Layer** - Extract subdomain, load tenant context
2. **Application Layer** - Auto-inject tenant_id in all queries
3. **Database Layer** - Row-Level Security policies enforce isolation

### Authentication & Authorization

**Provider:** Clerk v5.x

**Roles:**

- **Owner** - Full access, billing, tenant deletion
- **Admin** - User management, settings, all data access
- **Editor** - Authors, titles, ISBN, sales entry
- **Finance** - Return approval, royalty calculations, statements
- **Author** - Own statements only (portal access)

**Permission Enforcement:**

- Checked in every Server Action before database access
- UI elements hidden/disabled based on user role
- Clerk handles authentication, application handles authorization

### Data Protection

- **HTTPS/TLS** - All connections encrypted
- **Database encryption at rest** - Neon PostgreSQL default
- **Sensitive data encryption** - Tax IDs encrypted in database
- **CSRF protection** - Next.js built-in
- **Rate limiting** - Clerk authentication endpoints
- **Audit logging** - All financial transactions logged with user context

## Performance Considerations

### Response Time Targets

- **Page loads:** < 2 seconds (dashboard, list views)
- **CRUD operations:** < 500ms (create title, record sale)
- **Search/autocomplete:** < 300ms
- **Report generation:** < 3 seconds (non-PDF)

### Database Optimization

**Connection Pooling:**

- Neon's built-in pooling (serverless-optimized)
- HTTP mode for @neondatabase/serverless driver (faster for non-interactive queries)

**Indexes:**

- tenant_id (all tenant-scoped tables)
- sale_date, return_date (period queries)
- status columns (filtering)
- Foreign keys (automatic indexes)

**Query Optimization:**

- Use Drizzle's `.select()` to fetch only needed columns
- Pagination on all list views (default 20 per page)
- Avoid N+1 queries (use `.with()` for eager loading)

**Caching:**

- React Server Components cache by default
- TanStack Query for client-side caching
- Tenant lookup cached (subdomain → tenant_id)
- User permissions cached per session

### Background Processing

**Inngest Jobs:**

- Royalty calculations (30s+ per author)
- PDF generation (async, doesn't block user)
- Bulk email sending

**Pattern:**

```typescript
// User triggers action
await inngest.send({
  name: "royalty.calculate",
  data: { authorId, period },
});

// User sees toast: "Calculation started, you'll be notified when complete"

// Inngest job runs async
// On completion, send email or trigger notification
```

### Scalability

**Horizontal Scaling:**

- Stateless Next.js application (can run multiple instances)
- Fly.io deployment with auto-scaling
- Session state managed by Clerk (not in-memory)

**Database Scaling:**

- Neon PostgreSQL serverless compute auto-scales
- Connection pooling handles concurrent connections
- Table partitioning (if sales table exceeds millions of records)

## Deployment Architecture

**Platform:** Fly.io

**Container:** Docker

**Database:** Neon PostgreSQL (same region for low latency)

**Deployment Flow:**

```
1. Git push to main
2. CI/CD builds Docker image
3. Push image to Fly.io registry
4. Deploy new version (rolling update)
5. Run database migrations (Drizzle Kit)
6. Health checks pass
7. Old instances terminated
```

**Environment Variables:**

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_URL_POOLED=postgresql://...

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Email
RESEND_API_KEY=re_...

# File Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=salina-erp-statements
AWS_REGION=us-east-1

# Background Jobs
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...

# Monitoring
SENTRY_DSN=...

# App
NEXT_PUBLIC_APP_URL=https://salina-erp.com
```

**Regions:**

- Primary: US East (close to Neon database)
- Future: Multi-region for global publishers

## Development Environment

### Prerequisites

- **Node.js:** 24.x or higher
- **npm:** 10.x or higher
- **Docker:** 24.x or higher (for local development database, optional)
- **Git:** Latest version

### Setup Commands

```bash
# 1. Clone repository
git clone <repository-url>
cd salina-erp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# 4. Initialize database
npm run db:push  # Push schema to Neon (dev)

# 5. Seed database (optional)
npm run db:seed

# 6. Run development server
npm run dev

# Open http://localhost:3000
```

**Available Scripts:**

```bash
npm run dev          # Start development server with Turbopack
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run Biome linter
npm run format       # Format code with Biome
npm run db:generate  # Generate Drizzle migrations
npm run db:migrate   # Run migrations
npm run db:push      # Push schema (dev only)
npm run db:studio    # Open Drizzle Studio (database GUI)
npm run test         # Run tests (when implemented)
```

## Architecture Decision Records (ADRs)

### ADR-001: Next.js 16 with App Router

**Decision:** Use Next.js 16 App Router with React Server Components as primary architecture pattern.

**Rationale:**

- Server Components reduce client-side JavaScript, improving performance
- Server Actions provide type-safe mutations without API routes
- Turbopack is stable and faster than Webpack
- Best-in-class DX for React applications in 2025

**Consequences:**

- Team must understand Server vs Client Components
- Some libraries require 'use client' directive
- Excellent performance, simpler architecture

### ADR-002: Drizzle ORM over Prisma

**Decision:** Use Drizzle ORM instead of Prisma for database access.

**Rationale:**

- Better PostgreSQL support (Neon serverless driver)
- Lighter weight, faster query execution
- SQL-like query builder (easier for SQL-experienced developers)
- Excellent TypeScript inference

**Consequences:**

- Smaller ecosystem than Prisma
- Less tooling (but Drizzle Studio is excellent)
- Better performance, closer to SQL

### ADR-003: Biome over ESLint + Prettier

**Decision:** Use Biome for linting and formatting instead of ESLint + Prettier.

**Rationale:**

- All-in-one tool (linting + formatting)
- 70% less energy consumption
- Faster than ESLint + Prettier combined
- Officially supported by Next.js 15.5+

**Consequences:**

- Smaller plugin ecosystem than ESLint
- Need to configure rules in biome.json
- Significantly faster linting and formatting

### ADR-004: Inngest for Background Jobs

**Decision:** Use Inngest instead of BullMQ + Redis for background job processing.

**Rationale:**

- Serverless-native, no Redis infrastructure needed
- Visual debugging and workflow monitoring
- Built-in retries, error handling, scheduling
- Excellent Next.js integration

**Consequences:**

- Additional SaaS dependency
- Less control than self-hosted BullMQ
- Simpler architecture, better observability

### ADR-005: Feature-Based Module Organization

**Decision:** Organize code by feature modules (authors/, titles/, sales/) instead of type-based (components/, actions/, lib/).

**Rationale:**

- Better encapsulation, clearer boundaries
- Easier for AI agents to understand scope
- Scales better as application grows
- Aligns with domain-driven design principles

**Consequences:**

- Some shared code still in lib/
- Need to decide module boundaries carefully
- Clearer codebase organization

### ADR-006: Server Actions as Primary API Pattern

**Decision:** Use Server Actions as primary pattern for data mutations instead of API routes.

**Rationale:**

- Type-safe, end-to-end TypeScript
- Colocated with components (better DX)
- No need to define REST endpoints
- Automatic request deduplication by Next.js

**Consequences:**

- External integrations require API routes
- Team must learn Server Actions pattern
- Simpler, more maintainable codebase

### ADR-007: Row-Level Security for Multi-Tenancy

**Decision:** Use PostgreSQL Row-Level Security (RLS) for multi-tenant data isolation.

**Rationale:**

- Database-level enforcement (defense in depth)
- Prevents data leakage even if application has bugs
- Neon PostgreSQL supports RLS natively
- Industry best practice for multi-tenancy

**Consequences:**

- Must set session variable per query
- Slight performance overhead (minimal)
- Strongest security guarantee

---

_Generated by BMAD Decision Architecture Workflow v1.0_
_Date: 2025-11-21_
_For: BMad_
_Project: Salina Bookshelf ERP_
