# Epic Technical Specification: Foundation & Multi-Tenant Infrastructure

Date: 2025-11-21
Author: BMad
Epic ID: 1
Status: Draft

---

## Overview

Epic 1 establishes the foundational multi-tenant infrastructure for Salina ERP, a specialized publishing industry SaaS platform. This epic implements the core technical scaffolding required for all subsequent features: Next.js 16 application initialization, PostgreSQL database schema with Row-Level Security (RLS) for tenant isolation, Clerk authentication integration with role-based access control (RBAC), and a complete tenant onboarding flow with subdomain routing.

The primary deliverable is a secure, production-ready multi-tenant platform where publishing companies can register as tenants, invite team members with role-specific permissions (Owner, Admin, Editor, Finance, Author), and access role-appropriate dashboard views. This foundation ensures complete data isolation between tenants while providing the authentication and authorization framework required for complex publishing workflows in subsequent epics.

## Objectives and Scope

**In Scope:**
- Next.js 16 project initialization with TypeScript, Tailwind CSS, Biome, shadcn/ui, and Drizzle ORM
- Database schema creation: `tenants` and `users` tables with PostgreSQL Row-Level Security enabled
- Drizzle migrations setup with version control for production deployments
- Clerk authentication integration with multi-factor authentication (MFA) support
- Multi-tenant middleware: Subdomain extraction and tenant context injection
- Five-role RBAC system: Owner, Admin, Editor, Finance, Author
- Tenant registration flow with subdomain validation and uniqueness enforcement
- User invitation system with email-based onboarding
- Role-based dashboard landing pages with appropriate navigation per role
- Tenant settings configuration page (timezone, fiscal year, currency, statement frequency)

**Out of Scope:**
- Author portal (Epic 5)
- Publishing-specific business logic (authors, titles, ISBN, sales, royalties - covered in Epics 2-6)
- Background job processing (Inngest integration deferred to Epic 4-5)
- PDF generation and email delivery (Epic 5)
- Advanced reporting and analytics (Epic 6)
- API routes for third-party integrations (post-MVP)

## System Architecture Alignment

Epic 1 directly implements the architectural foundation defined in `architecture.md`:

**Framework & Stack:**
- Next.js 16 App Router with React Server Components (ADR-001)
- TypeScript 5.x with strict mode for type safety
- Tailwind CSS + shadcn/ui for accessible component library (WCAG 2.1 AA)
- Biome for linting/formatting (ADR-003)
- Drizzle ORM with Neon PostgreSQL serverless driver (ADR-002)

**Multi-Tenancy Pattern:**
- Shared-table architecture with `tenant_id` column on all tenant-scoped tables
- Three-layer security: Middleware → Application → Database RLS (ADR-007)
- Subdomain routing (e.g., `acmepublishing.salina-erp.com`)
- Defense-in-depth: Automatic `tenant_id` injection in queries + RLS enforcement

**Authentication & Authorization:**
- Clerk v5.x for authentication (MFA support for Finance/Admin roles)
- Application-level RBAC enforcement in Server Actions before database access
- Permission checks validate user role matches required capability
- Session management via HTTP-only secure cookies

**Project Structure:**
- Feature-based module organization (`modules/tenant/`, `modules/users/`) per ADR-005
- Server Actions as primary API pattern (ADR-006)
- Standardized `ActionResult<T>` response format for type-safe error handling

**Deployment Context:**
- Neon PostgreSQL with RLS policies for tenant isolation
- Fly.io deployment readiness (Dockerfile, environment variables template)
- Connection pooling via Neon's built-in serverless pooling

## Detailed Design

### Services and Modules

Epic 1 implements two core feature modules following the architecture's feature-based organization pattern:

| Module | Responsibility | Key Components | Inputs | Outputs | Owner |
|--------|---------------|----------------|--------|---------|-------|
| **modules/tenant/** | Tenant registration, subdomain management, tenant settings configuration | - TenantRegistrationForm<br>- TenantSettings<br>- SubdomainValidator | - Registration form data (name, subdomain)<br>- Settings updates (timezone, fiscal year, currency, statement frequency) | - Tenant record created<br>- Subdomain validated and reserved<br>- Settings persisted | SM + Dev |
| **modules/users/** | User invitation, role management, user CRUD operations | - UserInviteForm<br>- UserManagementTable<br>- RoleAssignmentDropdown<br>- UserDetail | - Invite form data (email, role)<br>- Role update requests<br>- User activation/deactivation | - Clerk invite sent<br>- User record created/updated<br>- Role permissions enforced | SM + Dev |
| **middleware.ts** | Multi-tenant request context, subdomain extraction, Clerk auth protection | - clerkMiddleware()<br>- getTenantFromSubdomain()<br>- setTenantContext() | - HTTP request with subdomain<br>- Clerk session | - Tenant ID in session context<br>- Protected routes enforced<br>- Redirect if tenant not found | Dev |
| **lib/auth.ts** | Permission checking, user context retrieval, role validation | - getCurrentUser()<br>- getCurrentTenantId()<br>- checkPermission(role[]) | - Session/auth token | - Current user object<br>- Tenant ID<br>- Boolean permission result | Dev |
| **app/(auth)/sign-in/** | Clerk authentication UI | - Clerk SignIn component | - User credentials | - Authenticated session | Clerk (built-in) |
| **app/(auth)/sign-up/** | Clerk registration UI | - Clerk SignUp component | - User credentials | - New user account + session | Clerk (built-in) |
| **app/(dashboard)/dashboard/** | Role-based dashboard landing pages | - OwnerDashboard<br>- AdminDashboard<br>- EditorDashboard<br>- FinanceDashboard<br>- AuthorDashboard | - Current user role | - Role-appropriate dashboard view | SM + UX + Dev |
| **app/(dashboard)/settings/** | Tenant settings configuration | - TenantSettingsForm<br>- UserManagementTable | - Tenant settings, user list | - Updated settings, managed users | SM + Dev |

**Module Interaction Flow:**
1. User accesses `acmepublishing.salina-erp.com`
2. Middleware extracts subdomain → queries `tenants` table → sets `tenant_id` in session
3. Clerk authenticates user → middleware loads `users` record (linked by `clerk_user_id` + `tenant_id`)
4. User role determines accessible routes and dashboard view
5. All Server Actions check permissions via `lib/auth.ts` before database operations

### Data Models and Contracts

**Core Database Tables (Epic 1):**

```typescript
// src/db/schema/tenants.ts
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  subdomain: text('subdomain').notNull().unique(),
  name: text('name').notNull(),
  timezone: text('timezone').notNull().default('America/New_York'),
  fiscal_year_start: date('fiscal_year_start', { mode: 'date' }),
  default_currency: text('default_currency').notNull().default('USD'),
  statement_frequency: text('statement_frequency').notNull().default('quarterly'), // quarterly, annual
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Indexes
// - subdomain (unique constraint auto-creates index)

// src/db/schema/users.ts
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: uuid('tenant_id').notNull().references(() => tenants.id),
  clerk_user_id: text('clerk_user_id').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull(), // owner | admin | editor | finance | author
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// Indexes
// - tenant_id (for RLS and queries)
// - clerk_user_id (unique constraint auto-creates index)
// - email (for lookups)

// Foreign Keys
// - users.tenant_id → tenants.id (ON DELETE CASCADE)
```

**Row-Level Security Policies:**

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy for users table
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Tenants table: Users can only see their own tenant
CREATE POLICY tenant_isolation_policy ON tenants
  USING (id = current_setting('app.current_tenant_id')::uuid);
```

**Zod Validation Schemas:**

```typescript
// src/modules/tenant/schema.ts
export const createTenantSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters').max(100),
  subdomain: z.string()
    .min(3, 'Subdomain must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9-]+$/, 'Subdomain can only contain lowercase letters, numbers, and hyphens')
    .refine((s) => !s.startsWith('-') && !s.endsWith('-'), 'Subdomain cannot start or end with hyphen'),
})

export const updateTenantSettingsSchema = z.object({
  timezone: z.string().optional(),
  fiscal_year_start: z.date().optional(),
  default_currency: z.string().length(3).optional(), // ISO 4217 (USD, EUR, GBP)
  statement_frequency: z.enum(['quarterly', 'annual']).optional(),
})

// src/modules/users/schema.ts
export const inviteUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['owner', 'admin', 'editor', 'finance', 'author']),
})

export const updateUserRoleSchema = z.object({
  role: z.enum(['owner', 'admin', 'editor', 'finance', 'author']),
})
```

**TypeScript Types:**

```typescript
// src/modules/tenant/types.ts
export type Tenant = typeof tenants.$inferSelect
export type CreateTenantInput = z.infer<typeof createTenantSchema>
export type UpdateTenantSettingsInput = z.infer<typeof updateTenantSettingsSchema>

// src/modules/users/types.ts
export type User = typeof users.$inferSelect
export type UserRole = 'owner' | 'admin' | 'editor' | 'finance' | 'author'
export type InviteUserInput = z.infer<typeof inviteUserSchema>
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>

// src/lib/types.ts (shared)
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; fields?: Record<string, string> }
```

### APIs and Interfaces

**Server Actions (Epic 1):**

All Server Actions follow the architecture's standard pattern: validation → authorization → tenant scoping → execution → logging.

```typescript
// src/modules/tenant/actions.ts
'use server'

export async function createTenant(data: unknown): Promise<ActionResult<Tenant>>
// Validates subdomain uniqueness, creates tenant record, returns tenant object

export async function getTenantSettings(): Promise<ActionResult<Tenant>>
// Returns current tenant's settings for authenticated user

export async function updateTenantSettings(data: unknown): Promise<ActionResult<Tenant>>
// Permission: owner, admin
// Updates tenant settings (timezone, fiscal year, currency, statement frequency)

// src/modules/users/actions.ts
'use server'

export async function inviteUser(data: unknown): Promise<ActionResult<User>>
// Permission: owner, admin
// Sends Clerk invitation, creates user record with pending status

export async function getUsers(): Promise<ActionResult<User[]>>
// Permission: owner, admin
// Returns all users for current tenant

export async function updateUserRole(userId: string, data: unknown): Promise<ActionResult<User>>
// Permission: owner, admin
// Updates user role, validates role change is permitted

export async function deactivateUser(userId: string): Promise<ActionResult<void>>
// Permission: owner, admin
// Sets is_active = false, prevents login

export async function reactivateUser(userId: string): Promise<ActionResult<void>>
// Permission: owner, admin
// Sets is_active = true, allows login

// lib/auth.ts (helpers, not Server Actions)
export async function getCurrentUser(): Promise<User | null>
// Returns current authenticated user from session

export async function getCurrentTenantId(): Promise<string>
// Returns current tenant ID from session context

export async function checkPermission(allowedRoles: UserRole[]): Promise<boolean>
// Validates current user's role is in allowedRoles array
```

**Clerk Integration:**

```typescript
// Clerk webhook endpoint (optional for Epic 1, required for production)
// app/api/webhooks/clerk/route.ts
export async function POST(request: Request)
// Handles Clerk user.created, user.updated, user.deleted events
// Syncs Clerk user changes to local users table
```

**Middleware Pattern:**

```typescript
// middleware.ts (Next.js 16 + Clerk v6)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // 1. Extract subdomain from host
  const host = req.headers.get('host') || ''
  const subdomain = host.split('.')[0]

  // 2. Query tenants table for tenant_id
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.subdomain, subdomain)
  })

  if (!tenant) {
    return NextResponse.redirect(new URL('/tenant-not-found', req.url))
  }

  // 3. Set tenant_id in session context (accessible in Server Actions)
  // Store in auth().sessionClaims or use request headers

  // 4. Protect authenticated routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

### Workflows and Sequencing

**Tenant Registration Flow:**

```
1. User visits salina-erp.com/sign-up
2. User enters company name + desired subdomain
3. Client-side Zod validation (createTenantSchema)
4. Server Action: createTenant()
   a. Validate subdomain uniqueness (SELECT WHERE subdomain = ?)
   b. If unique: INSERT INTO tenants
   c. If duplicate: Return error "Subdomain already taken"
5. Create Clerk organization (links to tenant)
6. Redirect to Clerk sign-up flow
7. After Clerk auth: Create first user record (role: owner)
8. Redirect to subdomain: acmepublishing.salina-erp.com/dashboard
9. Show onboarding checklist (invite team, configure settings)
```

**User Invitation Flow:**

```
1. Owner/Admin navigates to /settings/users
2. Clicks "Invite User" button
3. Form: Email + Role selection
4. Server Action: inviteUser()
   a. Validate email format + role (inviteUserSchema)
   b. Check permission (owner or admin only)
   c. Send Clerk invitation email
   d. INSERT INTO users (tenant_id, email, role, clerk_user_id: pending)
5. Invited user receives email
6. User clicks link → Clerk sign-up flow
7. Webhook: user.created → Update users.clerk_user_id
8. User redirected to subdomain/dashboard (role-based view)
```

**Authentication & Authorization Flow:**

```
1. User navigates to acmepublishing.salina-erp.com/dashboard
2. Middleware:
   a. Extract subdomain: "acmepublishing"
   b. Query: SELECT id FROM tenants WHERE subdomain = 'acmepublishing'
   c. Store tenant_id in session
   d. Clerk checks authentication
   e. If unauthenticated: Redirect to /sign-in
3. User authenticated:
   a. Query: SELECT * FROM users WHERE clerk_user_id = ? AND tenant_id = ?
   b. Load user.role into session
4. Route to role-based dashboard:
   - owner/admin → Full dashboard with all modules
   - editor → Dashboard with authors, titles, ISBN, sales modules
   - finance → Dashboard with returns, royalties, statements modules
   - author → Redirect to /portal (author-only view)
5. User clicks "Record Sale" (requires editor or finance role)
6. Server Action: recordSale()
   a. getCurrentUser() → Validate user exists
   b. checkPermission(['editor', 'finance', 'admin', 'owner'])
   c. If unauthorized: Return { success: false, error: 'Unauthorized' }
   d. getCurrentTenantId() → Get tenant context
   e. Execute: INSERT INTO sales (tenant_id, ...)
   f. RLS policy enforces tenant_id matches session
```

**Tenant Settings Update Flow:**

```
1. Owner/Admin navigates to /settings
2. Form displays current settings (timezone, fiscal year, currency, frequency)
3. User updates timezone from "America/New_York" to "America/Los_Angeles"
4. Server Action: updateTenantSettings()
   a. Validate input (updateTenantSettingsSchema)
   b. checkPermission(['owner', 'admin'])
   c. getCurrentTenantId()
   d. UPDATE tenants SET timezone = ?, updated_at = NOW() WHERE id = ?
   e. RLS ensures only current tenant row is updated
5. Toast notification: "Settings updated successfully"
6. Page revalidated, shows new timezone
```

## Non-Functional Requirements

### Performance

**Response Time Targets (from PRD):**
- Page loads (dashboard, settings): < 2 seconds
- CRUD operations (create tenant, invite user, update settings): < 500ms
- Authentication flow (Clerk + tenant lookup): < 1 second
- Middleware processing (subdomain extraction + tenant query): < 100ms

**Implementation Strategies:**
- **React Server Components**: Render dashboard on server, reduce client-side JavaScript
- **Database indexing**: Unique index on `tenants.subdomain` for fast tenant lookup (primary middleware query)
- **Tenant context caching**: Cache subdomain → tenant_id mapping for 5 minutes (reduce repeated queries)
- **Clerk session caching**: Clerk manages session state, no additional database queries per request
- **Selective data fetching**: Only fetch user list when viewing settings page (not on every dashboard load)

**Concurrent Usage:**
- Support 20-50 concurrent users per tenant without degradation (MVP scale)
- Neon PostgreSQL connection pooling handles concurrent requests
- Stateless Next.js Server Components enable horizontal scaling if needed

**Database Query Optimization:**
```sql
-- Critical query: Middleware tenant lookup (executed on every request)
SELECT id, subdomain, name FROM tenants WHERE subdomain = ?
-- Optimized by unique index on subdomain (< 10ms typical)

-- User context query (executed after authentication)
SELECT * FROM users WHERE clerk_user_id = ? AND tenant_id = ?
-- Optimized by unique index on clerk_user_id + composite index on (tenant_id, clerk_user_id)
```

### Security

**Multi-Tenant Data Isolation (Critical):**

**Layer 1: Middleware**
- Extract subdomain from HTTP host header
- Validate tenant exists before proceeding
- Inject `tenant_id` into session context (accessible to all Server Actions)
- No direct user input influences tenant_id (prevents injection attacks)

**Layer 2: Application (Server Actions)**
- Every Server Action calls `getCurrentTenantId()` to retrieve session tenant_id
- All Drizzle queries include `WHERE tenant_id = ?` clause
- Query wrapper ensures tenant_id is ALWAYS first condition:
```typescript
where: and(
  eq(users.tenant_id, tenantId), // FIRST - MANDATORY
  ...otherConditions
)
```

**Layer 3: Database (Row-Level Security)**
```sql
-- RLS enforces at PostgreSQL level (defense in depth)
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Before each query, set session variable
SET app.current_tenant_id = '<tenant_id>';
```

**Authentication & Authorization:**
- **Clerk v5.x** handles authentication (industry-standard security)
- **MFA support** available for Finance and Admin roles (configured in Clerk dashboard)
- **RBAC enforcement**: Every Server Action checks `checkPermission(allowedRoles)` before execution
- **Session security**: HTTP-only, secure cookies with appropriate expiration (managed by Clerk)
- **CSRF protection**: Next.js built-in CSRF protection on all Server Actions

**Input Validation:**
- **Client-side**: React Hook Form + Zod validation (immediate feedback)
- **Server-side**: Zod schema validation in every Server Action (security boundary)
- **Database-side**: PostgreSQL constraints (NOT NULL, UNIQUE, CHECK constraints)
- **Subdomain validation**: Regex `/^[a-z0-9-]+$/` prevents injection, no leading/trailing hyphens

**Data Protection:**
- **HTTPS/TLS**: All connections encrypted (enforced in production)
- **Database encryption at rest**: Neon PostgreSQL default
- **Sensitive data**: Tax IDs will be encrypted in future epics (not applicable to Epic 1)
- **Audit logging**: User actions logged with `created_by_user_id`, `updated_at` timestamps

**Rate Limiting:**
- Clerk enforces rate limits on authentication endpoints (prevents brute force)
- Application-level rate limiting not implemented in Epic 1 (can add via middleware in future)

### Reliability/Availability

**Uptime Target:**
- 99.5% uptime (allows ~3.6 hours downtime per month per PRD)
- Neon PostgreSQL: 99.95% SLA (higher than application target)
- Clerk: 99.99% SLA (authentication provider)

**Error Handling:**
- **Graceful degradation**: If Clerk unavailable, show maintenance page (don't expose errors)
- **User-friendly errors**: Never expose stack traces or technical details
- **Validation errors**: Clear, actionable messages ("Subdomain already taken" not "Unique constraint violation")
- **Network errors**: Retry logic with exponential backoff for transient failures

**Data Integrity:**
- **Foreign key constraints**: `users.tenant_id → tenants.id` ensures referential integrity
- **Unique constraints**: `tenants.subdomain`, `users.clerk_user_id` prevent duplicates
- **NOT NULL constraints**: All required fields enforced at database level
- **Transactions**: Multi-step operations (create tenant + owner user) wrapped in database transactions

**Backup & Recovery:**
- **Automated backups**: Neon PostgreSQL daily backups with point-in-time recovery
- **Migration safety**: Drizzle versioned migrations ensure schema consistency across environments
- **Rollback capability**: Database migrations can be rolled back if deployment fails

**Error Recovery Patterns:**
```typescript
// Server Action error handling pattern
try {
  const validated = schema.parse(data)
  const result = await db...
  return { success: true, data: result }
} catch (error) {
  logger.error('Operation failed', { error, context })

  if (error instanceof z.ZodError) {
    return { success: false, error: 'Invalid data', fields: error.flatten() }
  }

  return {
    success: false,
    error: 'An unexpected error occurred. Please try again or contact support.'
  }
}
```

### Observability

**Logging Strategy:**

**Structured Logging (Production):**
```typescript
logger.info('Tenant created', {
  tenantId: tenant.id,
  subdomain: tenant.subdomain,
  userId: owner.id,
  timestamp: new Date().toISOString()
})

logger.warn('Subdomain conflict', {
  attemptedSubdomain: subdomain,
  userId: currentUser.id
})

logger.error('Database query failed', {
  query: 'createTenant',
  error: error.message,
  tenantId: context.tenantId
})
```

**What to Log (Epic 1):**
- ✅ Tenant creation (with subdomain, creator user ID)
- ✅ User invitations sent (email, role, inviting user)
- ✅ Role changes (from role → to role, changed by user ID)
- ✅ Authentication failures (Clerk handles, but log custom errors)
- ✅ Permission denials (which action, which user, required role)
- ✅ Database errors (query name, error type, tenant context)

**What NOT to Log:**
- ❌ Passwords (never stored, Clerk handles)
- ❌ Session tokens (security risk)
- ❌ Full user records (log IDs only)

**Metrics & Monitoring:**
- **Error tracking**: Sentry integration (recommended for production)
- **Performance monitoring**: Next.js built-in Web Vitals tracking
- **Database metrics**: Neon dashboard (connection count, query latency, storage usage)
- **Authentication metrics**: Clerk dashboard (sign-ups, active users, MFA adoption)

**Debugging Tools:**
- **Development**: Console.log with context objects
- **Drizzle Studio**: Visual database browser (`npm run db:studio`)
- **Clerk Dashboard**: User management, session inspection, webhook logs
- **Browser DevTools**: React DevTools for component inspection

**Alerting (Production):**
- Sentry alerts on error rate threshold (e.g., > 10 errors/minute)
- Neon alerts on database connection pool exhaustion
- Uptime monitoring (e.g., Pingdom, UptimeRobot) for critical paths

## Dependencies and Integrations

### Production Dependencies

Epic 1 requires the following npm packages (from architecture.md and existing package.json):

| Package | Version | Purpose | Critical? |
|---------|---------|---------|-----------|
| **next** | ^16.0.3 | React framework with App Router, Server Components, Server Actions | Yes |
| **react** | ^19.2.0 | UI library | Yes |
| **react-dom** | ^19.2.0 | React DOM renderer | Yes |
| **typescript** | ^5.9.3 | Type safety, compile-time error detection | Yes |
| **@clerk/nextjs** | ^6.35.3 | Authentication, user management, MFA support | Yes |
| **drizzle-orm** | ^0.44.7 | Type-safe PostgreSQL ORM | Yes |
| **@neondatabase/serverless** | ^1.0.2 | Neon PostgreSQL driver (serverless-optimized) | Yes |
| **zod** | ^4.1.12 | Schema validation (client + server) | Yes |
| **react-hook-form** | ^7.54.2 | Form state management | Yes |
| **@hookform/resolvers** | ^3.9.1 | Zod integration with React Hook Form | Yes |
| **tailwindcss** | ^4.1.17 | Utility-first CSS framework (v4 released Jan 2025) | Yes |
| **@tanstack/react-query** | ^5.62.12 | Server state management, client-side caching | No (MVP) |
| **date-fns** | ^4.1.0 | Date formatting, manipulation | No (Epic 1) |
| **decimal.js** | ^10.4.3 | Financial calculations (not needed in Epic 1) | No (Epic 4-5) |
| **inngest** | ^3.26.0 | Background jobs (not needed in Epic 1) | No (Epic 4-5) |
| **resend** | ^4.0.2 | Email delivery (not needed in Epic 1) | No (Epic 5) |
| **react-email** | ^3.0.3 | Email templates (not needed in Epic 1) | No (Epic 5) |
| **@aws-sdk/client-s3** | ^3.716.0 | S3 file storage (not needed in Epic 1) | No (Epic 5) |
| **@aws-sdk/s3-request-presigner** | ^3.716.0 | S3 presigned URLs (not needed in Epic 1) | No (Epic 5) |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| **@biomejs/biome** | ^2.3.7 | Linting and formatting (replaces ESLint + Prettier) |
| **drizzle-kit** | ^0.31.6 | Database migrations, schema generation, Drizzle Studio |
| **@playwright/test** | ^1.56.1 | End-to-end testing |
| **@faker-js/faker** | ^10.1.0 | Test data generation |
| **@types/node** | ^22.10.5 | TypeScript types for Node.js |
| **@types/react** | ^19.0.1 | TypeScript types for React |
| **@types/react-dom** | ^19.0.2 | TypeScript types for React DOM |
| **postcss** | ^8.4.49 | CSS processing (Tailwind dependency) |
| **autoprefixer** | ^10.4.20 | CSS vendor prefixes (Tailwind dependency) |

### External Services

| Service | Provider | Purpose | Configuration Required |
|---------|----------|---------|------------------------|
| **PostgreSQL Database** | Neon | Multi-tenant data storage with RLS | - DATABASE_URL<br>- Row-Level Security policies |
| **Authentication** | Clerk | User authentication, MFA, session management | - CLERK_SECRET_KEY<br>- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY<br>- Clerk dashboard: Configure app, domains, social login |
| **Deployment** | Fly.io | Application hosting, Docker containers | - Dockerfile<br>- fly.toml<br>- Environment variables |

### Environment Variables

Epic 1 requires the following environment variables (template created in Story 1.1):

```bash
# .env.local (development)
# .env (production - set via Fly.io secrets)

# Database (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/database?sslmode=require"

# Authentication (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_UP_URL="/sign-up"
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL="/dashboard"
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL="/dashboard"

# Application
NEXT_PUBLIC_APP_URL="https://salina-erp.com" # or localhost:3000 in dev
NODE_ENV="development" # or "production"
```

### Integration Points

**Clerk Authentication Integration:**

```typescript
// app/layout.tsx - Wrap app with ClerkProvider
import { ClerkProvider } from '@clerk/nextjs'

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  )
}

// middleware.ts - Protect routes with Clerk middleware (Clerk v6 API)
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isProtectedRoute = createRouteMatcher(['/dashboard(.*)', '/settings(.*)'])

export default clerkMiddleware(async (auth, req) => {
  // Custom tenant extraction logic here
  const host = req.headers.get('host') || ''
  const subdomain = host.split('.')[0]

  // Query tenant and set context
  // ...

  // Protect authenticated routes
  if (isProtectedRoute(req)) {
    await auth.protect()
  }
})
```

**Neon PostgreSQL Connection:**

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-serverless'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

**Drizzle Migrations Setup:**

```typescript
// drizzle.config.ts
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema/*',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### Third-Party Service Dependencies

**Clerk Configuration Requirements:**
1. Create Clerk application (Development instance for testing, Production instance for deployment)
2. Configure allowed redirect URLs (subdomain pattern support)
3. Enable email/password authentication
4. Optional: Configure social login providers (Google, GitHub)
5. Optional: Enable MFA for Finance/Admin roles (requires Pro plan in production)
6. Set up webhook endpoint (optional for Epic 1, recommended for production)
7. Note: Clerk v6 uses improved API with createRouteMatcher for route protection

**Neon PostgreSQL Setup:**
1. Create Neon project (free tier: 512MB storage, 1 compute endpoint)
2. Create database: `salina_erp_dev` (development), `salina_erp_prod` (production)
3. Copy connection string to DATABASE_URL
4. Enable Row-Level Security (RLS) on tenant-scoped tables
5. Create RLS policies (automated via Drizzle migrations)

**No external dependencies for:**
- Email delivery (Epic 5)
- File storage (Epic 5)
- Background jobs (Epic 4-5)
- Payment processing (post-MVP)

## Acceptance Criteria (Authoritative)

Epic 1 is considered complete when ALL of the following acceptance criteria are met:

**AC1: Project Initialization**
- Next.js 16 project created with TypeScript, Tailwind CSS, Biome, shadcn/ui, and Drizzle ORM
- Development server runs successfully (`npm run dev`)
- Production build succeeds (`npm run build`)
- All linting and formatting passes (`npm run lint`)
- Project structure matches architecture.md (src/app, src/modules, src/db, src/lib)

**AC2: Database Schema and RLS**
- `tenants` table created with all required columns (id, subdomain, name, timezone, fiscal_year_start, default_currency, statement_frequency, created_at, updated_at)
- `users` table created with all required columns (id, tenant_id, clerk_user_id, email, role, is_active, created_at, updated_at)
- Foreign key constraint: `users.tenant_id → tenants.id` exists
- Unique constraints: `tenants.subdomain`, `users.clerk_user_id` enforced
- Row-Level Security (RLS) enabled on both tables
- RLS policies created for tenant isolation
- Drizzle migrations generated and successfully applied

**AC3: Authentication Integration**
- Clerk installed and configured with environment variables
- ClerkProvider wraps application in root layout
- Sign-in and sign-up pages functional
- User can authenticate via email/password
- MFA configuration documented (available for Admin/Finance roles)
- Session persists across page refreshes

**AC4: Multi-Tenant Middleware**
- Middleware extracts subdomain from HTTP host header
- Middleware queries `tenants` table to find matching tenant
- If tenant not found, redirects to `/tenant-not-found` error page
- If tenant found, stores `tenant_id` in session context
- Protected routes require authentication (via Clerk)
- `getCurrentTenantId()` helper function returns session tenant_id
- `getCurrentUser()` helper function returns authenticated user with role

**AC5: Tenant Registration Flow**
- Public sign-up page accessible at `/sign-up`
- Form captures company name and desired subdomain
- Client-side validation: subdomain regex `/^[a-z0-9-]+$/`, 3-30 characters, no leading/trailing hyphens
- Server-side validation: subdomain uniqueness enforced
- If subdomain taken, error displayed: "Subdomain already taken"
- If successful: Tenant record created, first user created with role=owner
- User redirected to subdomain URL (e.g., `acmepublishing.salina-erp.com/dashboard`)

**AC6: Role-Based Access Control (RBAC)**
- Five roles defined: owner, admin, editor, finance, author
- Permission helper: `checkPermission(allowedRoles[])` validates user role
- All Server Actions check permissions before executing
- Unauthorized access returns `{ success: false, error: 'Unauthorized' }`
- UI elements hidden/disabled based on user role

**AC7: User Invitation System**
- Owner/Admin can access `/settings/users` page
- "Invite User" button opens form with email + role selection
- `inviteUser()` Server Action validates email and role
- Clerk invitation email sent to invited user
- User record created with `clerk_user_id: pending` until user accepts
- Invited user receives email with registration link
- After registration, user can access tenant's dashboard

**AC8: Role-Based Dashboards**
- `/dashboard` route displays different views based on user role:
  - **Owner/Admin**: Full dashboard with navigation to all modules
  - **Editor**: Dashboard with Authors, Titles, ISBN, Sales navigation
  - **Finance**: Dashboard with Returns, Royalties, Statements navigation
  - **Author**: Redirect to `/portal` (author-only view)
- Navigation menu items filtered by user role
- Placeholder content or "Coming soon" for modules not yet implemented (Epics 2-6)

**AC9: Tenant Settings Configuration**
- Owner/Admin can access `/settings` page
- Form displays current tenant settings:
  - Timezone (dropdown with common zones)
  - Fiscal year start date (date picker)
  - Default currency (dropdown: USD, EUR, GBP)
  - Statement frequency (radio: quarterly, annual)
- `updateTenantSettings()` Server Action updates settings
- Success toast notification displayed after save
- Settings persist across sessions

**AC10: Cross-Tenant Isolation Verification**
- Automated test: Create Tenant A, create data in Tenant A
- Automated test: Authenticate as Tenant B user, query for Tenant A data
- Expected result: Tenant B cannot see Tenant A's data (RLS enforced)
- Manual test: Attempt to access another tenant's resource by ID
- Expected result: 404 Not Found (middleware blocks cross-tenant access)

**AC11: Error Handling**
- Validation errors show user-friendly messages (no stack traces)
- Database errors logged with context (tenant_id, user_id, operation)
- Network errors handled gracefully (show retry option)
- Clerk unavailable: Show maintenance page
- Invalid subdomain format: Show clear error message

**AC12: Environment Configuration**
- `.env.example` file created with all required variables
- `.env.local` documented in SETUP.md
- All environment variables validated at startup
- Missing variables cause clear error message (not silent failure)

## Traceability Mapping

This table maps Acceptance Criteria → Technical Implementation → Components/APIs → Test Strategy

| AC # | Requirement | Spec Section | Implementation | Components/APIs | Test Approach |
|------|-------------|--------------|----------------|-----------------|---------------|
| **AC1** | Project Initialization | Dependencies & Integrations | Story 1.1: `npx create-next-app@latest`, install dependencies, configure tools | - package.json<br>- tsconfig.json<br>- tailwind.config.ts<br>- biome.json<br>- drizzle.config.ts | - Manual: `npm run dev` succeeds<br>- Manual: `npm run build` succeeds<br>- CI: Lint check passes |
| **AC2** | Database Schema and RLS | Data Models | Story 1.2: Create Drizzle schemas, generate migrations, apply RLS policies | - src/db/schema/tenants.ts<br>- src/db/schema/users.ts<br>- drizzle/migrations/*.sql | - Manual: `npm run db:studio` shows tables<br>- E2E: Query validation test<br>- Unit: Schema validation |
| **AC3** | Authentication Integration | APIs & Interfaces | Story 1.3: Install Clerk, wrap app with ClerkProvider, create auth routes | - app/layout.tsx<br>- app/(auth)/sign-in/page.tsx<br>- app/(auth)/sign-up/page.tsx<br>- lib/auth.ts | - E2E: Sign-up flow test<br>- E2E: Sign-in flow test<br>- E2E: Protected route redirect test |
| **AC4** | Multi-Tenant Middleware | Workflows & Sequencing | Story 1.3: Create middleware with subdomain extraction, tenant lookup, session context | - middleware.ts<br>- lib/auth.ts (getCurrentTenantId, getCurrentUser) | - E2E: Subdomain routing test<br>- E2E: Tenant isolation test<br>- Unit: Subdomain extraction |
| **AC5** | Tenant Registration | Workflows & Sequencing | Story 1.4: Create registration form, validate subdomain, create tenant + owner user | - modules/tenant/components/TenantRegistrationForm.tsx<br>- modules/tenant/actions.ts (createTenant)<br>- modules/tenant/schema.ts | - E2E: Happy path registration<br>- E2E: Subdomain conflict error<br>- E2E: Validation errors |
| **AC6** | RBAC | Security (NFR) | Story 1.5: Define roles, create checkPermission helper, enforce in Server Actions | - lib/auth.ts (checkPermission)<br>- modules/users/types.ts (UserRole) | - Unit: Permission check logic<br>- E2E: Unauthorized action blocked<br>- E2E: Authorized action succeeds |
| **AC7** | User Invitation | APIs & Interfaces | Story 1.6: Create invite form, send Clerk invite, create user record | - modules/users/components/UserInviteForm.tsx<br>- modules/users/actions.ts (inviteUser) | - E2E: Invite user flow<br>- E2E: Invited user registration<br>- Manual: Email delivery check |
| **AC8** | Role-Based Dashboards | Services & Modules | Story 1.8: Create dashboard layouts per role, filter navigation by permissions | - app/(dashboard)/dashboard/page.tsx<br>- components/layout/Navbar.tsx (role-filtered nav) | - E2E: Owner dashboard view<br>- E2E: Editor dashboard view<br>- E2E: Finance dashboard view<br>- Visual: Screenshot comparison |
| **AC9** | Tenant Settings | APIs & Interfaces | Story 1.7: Create settings form, update tenant record | - modules/tenant/components/TenantSettingsForm.tsx<br>- modules/tenant/actions.ts (updateTenantSettings) | - E2E: Update timezone<br>- E2E: Update fiscal year<br>- E2E: Settings persist |
| **AC10** | Cross-Tenant Isolation | Security (NFR) | Story 1.2: RLS policies + Story 1.3: Middleware tenant scoping | - RLS policies in migrations<br>- Middleware tenant context<br>- Query wrapper with tenant_id | - E2E: Cross-tenant query blocked<br>- E2E: Cross-tenant resource access 404<br>- Security audit |
| **AC11** | Error Handling | Reliability (NFR) | All stories: Implement try-catch, user-friendly errors, logging | - All Server Actions (standardized error handling)<br>- lib/logger.ts | - E2E: Validation error display<br>- E2E: Network error handling<br>- Manual: Error messages review |
| **AC12** | Environment Configuration | Dependencies & Integrations | Story 1.1: Create .env.example, document variables | - .env.example<br>- SETUP.md (documentation) | - Manual: Missing var error test<br>- CI: Environment validation |

**PRD Functional Requirements Traceability:**

| FR # | Requirement | Epic 1 Coverage | Implementation |
|------|-------------|-----------------|----------------|
| **FR1** | Register new tenant with subdomain | ✅ Complete | AC5 - Story 1.4 |
| **FR2** | Validate subdomain uniqueness | ✅ Complete | AC5 - Story 1.4 |
| **FR3** | Invite users via email | ✅ Complete | AC7 - Story 1.6 |
| **FR4** | Assign roles to users | ✅ Complete | AC7 - Story 1.6 |
| **FR5** | Authenticate via email/password | ✅ Complete | AC3 - Story 1.3 |
| **FR6** | Deactivate/remove users | ✅ Complete | AC7 - Story 1.6 |
| **FR7** | Enforce Row-Level Security | ✅ Complete | AC2, AC4, AC10 - Story 1.2, 1.3 |
| **FR8** | Configure tenant settings | ✅ Complete | AC9 - Story 1.7 |

All FR1-8 are fully covered by Epic 1.

## Risks, Assumptions, Open Questions

### Risks

**RISK-1: Subdomain Routing in Development** (Medium Impact, Medium Likelihood)
- **Description**: Local development typically uses `localhost:3000`, making it difficult to test subdomain routing (`acmepublishing.localhost:3000` may not work on all systems)
- **Mitigation**: Use `/etc/hosts` entries to map `*.localhost` to `127.0.0.1`, or use tools like `ngrok` for testing. Document setup in SETUP.md.
- **Owner**: Dev

**RISK-2: RLS Policy Performance** (Low Impact, Low Likelihood)
- **Description**: PostgreSQL Row-Level Security policies add slight overhead to queries. With hundreds of tenants and complex policies, performance could degrade.
- **Mitigation**: Neon benchmarks show RLS overhead <5% for typical queries. Monitor query performance via Neon dashboard. Indexed `tenant_id` columns minimize impact.
- **Owner**: Dev

**RISK-3: Clerk Service Dependency** (High Impact, Low Likelihood)
- **Description**: If Clerk experiences downtime, authentication is unavailable, blocking all user access.
- **Mitigation**: Clerk has 99.99% SLA. Implement graceful degradation: show maintenance page instead of error. Monitor Clerk status page. Consider fallback authentication in future (post-MVP).
- **Owner**: SM + Dev

**RISK-4: Next.js 16 Stability** (Medium Impact, Low Likelihood)
- **Description**: Next.js 16 is relatively new; potential bugs or breaking changes in minor versions.
- **Mitigation**: Pin exact versions in package.json (not `^` ranges). Test thoroughly before upgrading. Monitor Next.js GitHub issues and changelog. Community adoption is strong (stable).
- **Owner**: Dev

**RISK-5: Multi-Tenant Session Context Complexity** (Medium Impact, Medium Likelihood)
- **Description**: Storing tenant context in session and ensuring it's accessible across Server Actions and middleware is complex. Incorrect implementation could leak tenant_id across requests.
- **Mitigation**: Thorough testing of tenant isolation (AC10). Use proven patterns from Next.js + Clerk documentation. Code review focused on session management.
- **Owner**: Dev + SM (review)

### Assumptions

**ASSUMPTION-1**: Publishing companies will use modern browsers (Chrome, Firefox, Safari, Edge) with JavaScript enabled.
- **Validation**: UX spec targets WCAG 2.1 AA, which assumes modern browser support. Progressive enhancement not required for MVP.

**ASSUMPTION-2**: Tenants will choose unique, business-appropriate subdomains (not attempting to squat popular names).
- **Validation**: Subdomain validation prevents reserved words (e.g., "www", "api", "admin"). Future: implement subdomain approval/moderation if abuse occurs.

**ASSUMPTION-3**: Clerk's free tier (up to 10,000 monthly active users for development) is sufficient for MVP and early customers.
- **Validation**: Confirmed via Clerk pricing page. Production requires Pro plan ($25/month) for production features.

**ASSUMPTION-4**: Neon's free tier (512MB storage, 1 compute endpoint) supports MVP development and testing.
- **Validation**: Confirmed via Neon pricing. Upgrade to paid plan before production launch (expected: $19/month for production workload).

**ASSUMPTION-5**: Email/password authentication is acceptable for MVP; social login (Google, GitHub) is optional enhancement.
- **Validation**: PRD specifies email/password as primary, social as optional. Clerk supports both; easy to enable later.

**ASSUMPTION-6**: User roles are assigned at invitation time and rarely change. Role change workflow is manual (via settings page).
- **Validation**: Publishing industry typically has stable team roles. Automated role transitions not required for MVP.

### Open Questions

**QUESTION-1**: Should we implement tenant-level feature flags for gradual rollout of new features?
- **Current Status**: Not in Epic 1 scope. Can add `tenants.feature_flags` JSONB column in future epic if needed.
- **Decision Needed By**: Before Epic 2 (if feature flags required for author management)

**QUESTION-2**: How should we handle subdomain changes (e.g., company rebrand)?
- **Current Status**: Not supported in Epic 1. Subdomain is immutable after creation.
- **Decision Needed By**: Before GA (general availability). Likely requires: update subdomain → flush DNS cache → notify users.

**QUESTION-3**: Should we support custom domains (e.g., `erp.acmepublishing.com` instead of `acmepublishing.salina-erp.com`)?
- **Current Status**: Out of scope for MVP. Requires DNS configuration, SSL certificate provisioning.
- **Decision Needed By**: Post-MVP enhancement (Growth phase, per PRD).

**QUESTION-4**: What happens when a tenant owner leaves the company? How is ownership transferred?
- **Current Status**: Manual process: Admin invites new owner, new owner logs in, original owner deactivated.
- **Decision Needed By**: Before production launch. Document process in user guide.

**QUESTION-5**: Should we implement tenant deletion (self-service or admin-only)?
- **Current Status**: Not implemented in Epic 1. Requires careful handling: data export, cascade deletion, billing cancellation.
- **Decision Needed By**: Before GA. Likely requires: confirmation workflow, grace period, data retention policy.

## Test Strategy Summary

Epic 1 testing follows a multi-layered approach ensuring comprehensive coverage from unit to end-to-end:

### Test Levels

**1. Unit Tests (Component/Function Level)**
- **Scope**: Helper functions, validation logic, permission checks
- **Framework**: Jest (or Vitest, decision pending)
- **Coverage Target**: 80%+ for critical logic
- **Examples**:
  - `checkPermission()` logic (all role combinations)
  - Subdomain validation regex
  - Zod schema validation (createTenantSchema, inviteUserSchema)
  - Error handling in Server Actions

**2. Integration Tests (Module Level)**
- **Scope**: Server Actions with database, Drizzle ORM queries
- **Framework**: Jest + test database (isolated Neon instance or pg-mem)
- **Examples**:
  - `createTenant()` Server Action creates tenant + owner user atomically
  - `inviteUser()` creates user record and sends Clerk invitation
  - RLS policies enforce tenant isolation (query Tenant A data as Tenant B user → empty result)

**3. End-to-End Tests (User Flow Level)**
- **Scope**: Full user workflows through browser
- **Framework**: Playwright (already installed per package.json)
- **Coverage Target**: All AC scenarios (AC1-AC12)
- **Examples**:
  - Tenant registration flow: Sign up → Create tenant → Redirect to dashboard
  - User invitation flow: Invite user → User receives email → User signs up → Access dashboard
  - Cross-tenant isolation: Create data in Tenant A → Login as Tenant B → Verify no access
  - Role-based access: Login as Editor → Verify Finance menu items hidden
  - Settings update: Change timezone → Reload → Verify persisted

**4. Manual/Exploratory Testing**
- **Scope**: UX review, accessibility, edge cases
- **Focus Areas**:
  - Visual consistency across role-based dashboards
  - Error message clarity and user-friendliness
  - Mobile responsiveness (tablet, phone)
  - Keyboard navigation and screen reader compatibility (WCAG 2.1 AA)

### Critical Test Scenarios

**Scenario 1: Multi-Tenant Isolation (Security Critical)**
```typescript
// E2E test: cross-tenant-isolation.spec.ts
test('Tenant B cannot access Tenant A data', async ({ page }) => {
  // Create Tenant A, add author record
  const tenantA = await createTestTenant({ subdomain: 'tenant-a' })
  const authorA = await createTestAuthor({ tenantId: tenantA.id, name: 'Author A' })

  // Create Tenant B, authenticate as Tenant B user
  const tenantB = await createTestTenant({ subdomain: 'tenant-b' })
  await loginAs({ tenant: tenantB, role: 'editor' })

  // Attempt to query authors (should only see Tenant B authors, not Author A)
  await page.goto('https://tenant-b.localhost:3000/authors')
  await expect(page.getByText('Author A')).not.toBeVisible()

  // Attempt to access Tenant A author by direct URL (should 404)
  await page.goto(`https://tenant-b.localhost:3000/authors/${authorA.id}`)
  await expect(page.getByText('404')).toBeVisible()
})
```

**Scenario 2: Role-Based Access Control**
```typescript
// E2E test: rbac-enforcement.spec.ts
test('Editor cannot approve returns (Finance-only action)', async ({ page }) => {
  const tenant = await createTestTenant()
  await loginAs({ tenant, role: 'editor' })

  // Navigate to returns page
  await page.goto('https://test.localhost:3000/returns')

  // Approve button should not be visible (UI enforcement)
  await expect(page.getByRole('button', { name: 'Approve' })).not.toBeVisible()

  // Attempt direct Server Action call via API (should fail)
  const response = await fetch('/api/returns/approve', {
    method: 'POST',
    body: JSON.stringify({ returnId: 'test-123' })
  })

  expect(response.status).toBe(403) // Unauthorized
})
```

**Scenario 3: Tenant Registration Happy Path**
```typescript
// E2E test: tenant-registration.spec.ts
test('Complete tenant registration flow', async ({ page }) => {
  await page.goto('https://salina-erp.com/sign-up')

  // Fill registration form
  await page.fill('input[name="companyName"]', 'Acme Publishing')
  await page.fill('input[name="subdomain"]', 'acmepublishing')
  await page.click('button[type="submit"]')

  // Should redirect to Clerk sign-up
  await expect(page).toHaveURL(/clerk.*sign-up/)

  // Complete Clerk registration
  await page.fill('input[name="emailAddress"]', 'owner@acmepublishing.com')
  await page.fill('input[name="password"]', 'SecurePass123!')
  await page.click('button[type="submit"]')

  // Should redirect to tenant subdomain dashboard
  await expect(page).toHaveURL('https://acmepublishing.salina-erp.com/dashboard')
  await expect(page.getByText('Welcome to Acme Publishing')).toBeVisible()
})
```

### Test Data Management

**Test Database Strategy:**
- **Development**: Shared Neon dev instance, reset before each test run
- **CI**: Isolated Neon preview instance per PR (auto-provisioned)
- **Production**: Separate Neon project, never used for testing

**Test Data Generation:**
- Use `@faker-js/faker` for realistic data (company names, emails, subdomains)
- Seed scripts for common scenarios (multiple tenants, multiple users per tenant)
- Cleanup: Truncate tables after each test suite (or use transactions)

### Continuous Integration

**GitHub Actions Workflow:**
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm run test:unit
      - run: npm run test:e2e
        env:
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          CLERK_SECRET_KEY: ${{ secrets.TEST_CLERK_SECRET_KEY }}
```

### Acceptance Testing

**Definition of Done (DoD) for Epic 1:**
- ✅ All AC1-AC12 scenarios pass (automated E2E tests)
- ✅ Unit test coverage ≥80% for critical logic
- ✅ Manual security audit: Cross-tenant isolation verified
- ✅ Manual UX review: All role-based dashboards reviewed
- ✅ Accessibility audit: WCAG 2.1 AA compliance verified (keyboard nav, screen reader)
- ✅ Performance benchmarks met: Page loads <2s, CRUD operations <500ms
- ✅ Code review completed: Two approvals required (one from senior dev)
- ✅ Documentation complete: SETUP.md, README.md updated with Epic 1 setup instructions
