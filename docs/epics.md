# Salina ERP - Epic Breakdown

**Author:** BMad
**Date:** 2025-11-21
**Project Level:** Enterprise MVP
**Target Scale:** Multi-tenant SaaS B2B Publishing Platform

---

## Overview

This document provides the complete epic and story breakdown for Salina ERP, decomposing the requirements from the [PRD](./prd.md) into implementable stories with detailed acceptance criteria, UX interaction patterns, and architectural implementation notes.

**Living Document Notice:** This epic breakdown incorporates full context from PRD + UX Design Specification + Decision Architecture, providing implementation-ready stories for development.

---

## Functional Requirements Inventory

### Tenant & User Management (FR1-8)
- FR1: Users can register a new publishing company tenant with unique subdomain
- FR2: System validates subdomain availability and prevents duplicates
- FR3: Owner users can invite additional users to their tenant via email
- FR4: Administrators can assign roles to users (Owner, Admin, Editor, Finance, Author)
- FR5: Users can authenticate via email/password or social login (Google, GitHub)
- FR6: Administrators can deactivate or remove users from their tenant
- FR7: System enforces Row-Level Security to prevent cross-tenant data access
- FR8: Tenant owners can configure tenant settings (fiscal year, default currency, statement frequency)

### Author Management (FR9-13)
- FR9: Editors can create author profiles with contact information
- FR10: Editors can record author tax IDs for 1099 reporting purposes
- FR11: Editors can update author information (address, email, payment details)
- FR12: Authors can log into author portal with limited access credentials
- FR13: System maintains complete history of author record changes for audit

### Title & ISBN Management (FR14-23)
- FR14: Editors can create title records with metadata (title, genre, word count, publication status)
- FR15: Editors can track multiple formats for a single title (physical, ebook, audiobook)
- FR16: Administrators can import ISBN blocks (100-count) via CSV upload
- FR17: System tracks ISBN pool status (available, assigned, registered, retired)
- FR18: Editors can assign available ISBNs to titles from the pool
- FR19: System prevents duplicate ISBN assignment across all titles
- FR20: Editors can assign ISBNs to titles for each format requiring an ISBN
- FR21: System validates ISBN-13 format before accepting
- FR22: Editors can update title metadata and publication status
- FR23: System displays ISBN pool availability count

### Sales Transaction Management (FR24-29)
- FR24: Editors can record individual sales transactions in real-time
- FR25: Users can specify sale details (title, format, quantity, unit price, sale date, channel)
- FR26: System supports multiple sales channels (retail, wholesale, direct, distributor)
- FR27: Users can view transaction history with filtering by date, title, format, channel
- FR28: System records transaction metadata (who entered, when entered) for audit
- FR29: System prevents modification of historical transactions (append-only ledger)

### Returns Management (FR30-37)
- FR30: Editors can record return transactions with negative quantity
- FR31: Users must provide return reason and reference to original sale (optional)
- FR32: Return requests are created with "pending" status awaiting approval
- FR33: Finance users can view queue of pending returns requiring approval
- FR34: Finance users can approve or reject return requests
- FR35: System tracks who approved/rejected returns and when
- FR36: Only approved returns affect royalty calculations
- FR37: Rejected returns are excluded from all financial calculations

### Royalty Contract Management (FR38-44)
- FR38: Editors can create royalty contracts linking authors to titles
- FR39: Users can configure tiered royalty rates by format and sales volume
- FR40: System supports multiple tiers per format (e.g., 0-5K @ 10%, 5K-10K @ 12%, 10K+ @ 15%)
- FR41: Users can record advance payments made to authors
- FR42: System tracks advance amount, amount paid, and amount recouped
- FR43: Users can update contract status (active, terminated, suspended)
- FR44: System maintains contract history for audit and compliance

### Royalty Calculation Engine (FR45-52)
- FR45: Finance users can trigger royalty calculations for specific periods (quarterly, annual, custom)
- FR46: System calculates net sales (total sales minus approved returns only)
- FR47: System applies tiered royalty rates based on sales volume and format
- FR48: System calculates advance recoupment from positive royalty earnings
- FR49: System calculates net payable amount (royalty earned minus advance recoupment)
- FR50: System handles negative periods (more returns than sales) without reversing recouped advances
- FR51: System supports multiple formats with different royalty rates per contract
- FR52: Calculation engine produces detailed breakdown showing tier application

### Royalty Statement Generation (FR53-60)
- FR53: Finance users can generate PDF royalty statements for one or all authors
- FR54: Statements display sales breakdown by title and format
- FR55: Statements show tiered royalty calculation details
- FR56: Statements display advance tracking (amount, paid, recouped, remaining)
- FR57: Statements show net payable amount for the period
- FR58: System emails PDF statements to authors automatically
- FR59: Statements are stored and accessible for historical retrieval
- FR60: System records statement generation metadata (who generated, when, for what period)

### Author Portal (FR61-66)
- FR61: Authors can log into dedicated author portal with limited access
- FR62: Authors can view list of their royalty statements
- FR63: Authors can download PDF statements
- FR64: Authors can view sales history for their titles only
- FR65: Authors cannot access other authors' data or publisher internal data
- FR66: System enforces author-specific data isolation via RLS

### Financial Tracking (FR67-71)
- FR67: System tracks total revenue from all sales transactions
- FR68: System calculates royalty liability (amount owed to authors)
- FR69: Finance users can view royalty liability by author
- FR70: System generates financial reports (sales by format, sales by title, royalty expenses)
- FR71: System maintains audit trail of all financial transactions

### Reporting & Analytics (FR72-76)
- FR72: Users can generate sales reports filtered by date range, title, format, channel
- FR73: Users can view ISBN pool status report (available vs. assigned by type)
- FR74: Finance users can view royalty liability summary across all authors
- FR75: Users can export reports to CSV format
- FR76: System provides dashboard views appropriate to user role

### System Administration (FR77-81)
- FR77: System administrators can monitor tenant usage and activity
- FR78: System enforces role-based permissions on all operations
- FR79: System logs all data modifications for audit trail
- FR80: System provides tenant-level configuration management
- FR81: System handles background jobs (PDF generation, email delivery) asynchronously

### Advanced Royalty Features (FR111-118)
- FR111: Users can assign multiple authors to a single title with ownership percentages
- FR112: System calculates split royalties based on author ownership percentages
- FR113: System generates separate royalty statements for each co-author
- FR114: Users can configure escalating royalty rates based on cumulative lifetime sales
- FR115: System tracks lifetime sales across all periods for escalation calculation
- FR116: System applies correct tier based on cumulative sales, not period sales
- FR117: Users can view royalty projection based on current sales trajectory
- FR118: System maintains co-author relationship history for audit

### Tax & Compliance (FR119-124)
- FR119: System collects and validates tax identification (TIN/SSN) for US-based authors
- FR120: System tracks annual earnings per author for 1099 threshold determination
- FR121: System generates 1099-MISC forms for authors earning $10+ in royalties annually
- FR122: System provides batch 1099 generation for all qualifying authors
- FR123: Users can download individual or bulk 1099 PDFs
- FR124: System maintains 1099 generation audit trail for IRS compliance

### Platform Administration (FR125-134)
- FR125: Platform administrators can view list of all tenants with status
- FR126: Platform administrators can view detailed tenant information (users, usage, subscription)
- FR127: Platform administrators can suspend tenant access
- FR128: Platform administrators can reactivate suspended tenants
- FR129: Platform administrators can impersonate tenant users for support
- FR130: System logs all platform administrator actions for audit
- FR131: Platform administrators can view platform-wide analytics (total tenants, users, activity)
- FR132: Platform administrators can broadcast announcements to all tenants
- FR133: Platform administrators can view system health and job status
- FR134: Platform authentication is separate from tenant authentication

---

## FR Coverage Map

| Epic | Epic Title | FRs Covered | FR Count |
|------|-----------|-------------|----------|
| Epic 1 | Foundation & Multi-Tenant Infrastructure | FR1-8 | 8 FRs |
| Epic 2 | Author & Title Catalog Management | FR9-23 | 15 FRs |
| Epic 3 | Sales & Returns Processing | FR24-37 | 14 FRs |
| Epic 4 | Royalty Contracts & Calculation Engine | FR38-52 | 15 FRs |
| Epic 5 | Royalty Statements & Author Portal | FR53-66 | 14 FRs |
| Epic 6 | Financial Reporting & Analytics | FR67-81 | 15 FRs |
| Epic 7 | Contact & ISBN Foundation | FR82-95 | 14 FRs |
| Epic 8 | Invoicing & Accounts Receivable | FR96-106 | 11 FRs |
| Epic 9 | Public Presence | FR107-110 | 4 FRs |
| Epic 10 | Advanced Royalty Features | FR111-118 | 8 FRs |
| Epic 11 | Tax & Compliance | FR119-124 | 6 FRs |
| Epic 13 | Platform Administration | FR125-134 | 10 FRs |
| **Total** | | **FR1-134** | **134 FRs** |

---

## Epic 1: Foundation & Multi-Tenant Infrastructure

**Epic Goal:** Establish secure multi-tenant platform foundation enabling publishing companies to onboard and manage their teams

**FRs Covered:** FR1-8

---

### Story 1.1: Initialize Next.js Project with Tech Stack

**As a** development team,
**I want** to initialize the Next.js 16 project with all core dependencies and configuration,
**So that** we have a working foundation for all subsequent development.

**Acceptance Criteria:**

**Given** a clean development environment
**When** the project initialization is complete
**Then** the following are configured and working:

**And** Next.js 16 with App Router is initialized via `npx create-next-app@latest salina-erp --typescript --tailwind --biome --app --src-dir --import-alias "@/*"`

**And** TypeScript 5.x is configured with strict mode enabled

**And** Tailwind CSS 3.x is installed with Editorial Navy theme colors configured:
- Primary: `#1e3a5f` (Editorial Navy)
- Secondary: `#5b7c99` (Slate Blue)
- Accent: `#c17d4a` (Warm Bronze)
- Semantic colors (success, warning, error) per UX spec

**And** Biome is configured for linting and formatting (replaces ESLint + Prettier)

**And** shadcn/ui is initialized via `npx shadcn@latest init` with:
- Base components: Button, Card, Input, Label, Form
- Editorial Navy theme applied
- Inter font configured as primary typeface

**And** Drizzle ORM is installed with @neondatabase/serverless driver

**And** Project structure follows Architecture pattern:
```
src/
├── app/          # Next.js App Router
├── components/   # Shared components
├── modules/      # Feature modules
├── db/           # Database schemas
└── lib/          # Shared utilities
```

**And** Environment variables template (.env.example) is created with placeholders for:
- DATABASE_URL
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

**And** Development server runs successfully on `npm run dev`

**And** Build succeeds with `npm run build`

**Prerequisites:** None (first story)

**Technical Notes:**
- Use architecture.md Section "Project Initialization" exact command
- Follow architecture.md "Project Structure" for directory layout
- Configure tailwind.config.ts with UX color system from ux-design-specification.md
- Install dependencies: react-hook-form, zod, @hookform/resolvers, date-fns, decimal.js per architecture.md "Technology Stack Details"

---

### Story 1.2: Set Up Database Schema and Multi-Tenant Infrastructure

**As a** platform architect,
**I want** to establish the database schema with Row-Level Security for multi-tenancy,
**So that** tenant data is completely isolated and secure.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** database schema is created
**Then** the following tables exist with correct structure:

**And** `tenants` table is created per architecture.md schema:
- id (UUID, primary key, auto-generated)
- subdomain (text, unique, not null)
- name (text, not null)
- timezone (text, default: "America/New_York")
- fiscal_year_start (date, nullable)
- default_currency (text, default: "USD")
- statement_frequency (text, default: "quarterly")
- created_at, updated_at (timestamps with timezone)

**And** `users` table is created with:
- id (UUID, primary key)
- tenant_id (UUID, foreign key to tenants, not null)
- clerk_user_id (text, unique, not null)
- email (text, not null)
- role (text, not null) - enum: owner, admin, editor, finance, author
- is_active (boolean, default: true)
- created_at, updated_at (timestamps)

**And** PostgreSQL Row-Level Security (RLS) is enabled on both tables:
```sql
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

**And** RLS policy is created for tenant isolation:
```sql
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

**And** Drizzle migration is generated via `npm run db:generate`

**And** Migration is applied to Neon database via `npm run db:migrate`

**And** Database connection is tested successfully

**And** Indexes are created on:
- tenants.subdomain (unique index)
- users.tenant_id
- users.clerk_user_id (unique index)
- users.email

**Prerequisites:** Story 1.1 (project initialized)

**Technical Notes:**
- Use exact schema from architecture.md "Data Architecture > Database Schema"
- Follow architecture.md "Novel Architectural Patterns > Pattern 2: Multi-Tenant Row-Level Security"
- Store drizzle schema in src/db/schema/tenants.ts and src/db/schema/users.ts
- Configure drizzle.config.ts to connect to Neon PostgreSQL
- Use Neon's serverless driver with HTTP mode for optimal performance

---

### Story 1.3: Implement Clerk Authentication with Multi-Tenant Middleware

**As a** platform architect,
**I want** to integrate Clerk authentication with subdomain-based tenant routing,
**So that** users authenticate securely and are automatically scoped to their tenant.

**Acceptance Criteria:**

**Given** Clerk account is created and configured
**When** authentication is implemented
**Then** the following functionality works:

**And** Clerk is installed and configured:
- @clerk/nextjs v5.x installed
- CLERK_SECRET_KEY and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY environment variables set
- Clerk provider wraps application in root layout

**And** Middleware extracts subdomain and loads tenant context per architecture.md pattern

**And** Auth helper functions are created in lib/auth.ts:
- `getCurrentUser()` - Returns authenticated user with role
- `getCurrentTenantId()` - Returns tenant ID from session
- `checkPermission(role)` - Validates user has required role

**And** Sign-in and sign-up pages are created at:
- app/(auth)/sign-in/page.tsx
- app/(auth)/sign-up/page.tsx
- Using Clerk's prebuilt <SignIn /> and <SignUp /> components

**And** Test user can sign up with email/password

**And** Test user can sign in successfully

**And** Authenticated user is redirected to /dashboard

**And** Unauthenticated user accessing /dashboard is redirected to /sign-in

**And** Session persists across page refreshes

**Prerequisites:** Story 1.2 (database schema exists)

**Technical Notes:**
- Follow architecture.md "Authentication & Authorization" section
- Implement "Defense in Depth" Layer 1: Middleware (Tenant Context)
- Configure Clerk for Next.js 16 compatibility
- Enable email/password authentication in Clerk dashboard
- Set up Google/GitHub social login (optional, can be enabled later)
- Follow UX spec: use Editorial Navy theme for auth pages

---

### Story 1.4: Create Tenant Registration Flow with Subdomain Validation

**As a** publishing company owner,
**I want** to register my company as a new tenant with a unique subdomain,
**So that** my team has a dedicated workspace at mycorp.salina-erp.com.

**Acceptance Criteria:**

**Given** an unauthenticated user visits the registration page
**When** they complete the tenant registration form
**Then** the following functionality works:

**And** Registration page displays form with fields per UX "Spacious Guided Flow":
- Company Name (text input, required, max 100 chars)
- Subdomain (text input, required, 3-20 chars, alphanumeric + hyphens only)
  - Shows live preview: "[subdomain].salina-erp.com"
  - Real-time validation: checks availability as user types (debounced 500ms)
  - Error message if unavailable: "This subdomain is already taken. Try another."
- Owner Email (email input, required, validated)
- Owner Name (text input, required)
- Password (password input, required, min 8 chars per Clerk requirements)

**And** Form validation uses Zod schema per architecture.md pattern

**And** Subdomain availability check Server Action validates uniqueness in real-time

**And** Registration Server Action creates:
1. Clerk user account
2. Tenant record in database
3. User record linked to tenant with role="owner"
4. Sets tenant_id in session

**And** After successful registration:
- User is authenticated automatically
- Redirected to onboarding page at [subdomain].salina-erp.com/welcome
- Success toast: "✓ Welcome to Salina ERP! Your workspace is ready."

**And** Error handling:
- Duplicate subdomain: "This subdomain is already taken"
- Invalid subdomain format: Inline validation prevents submission
- Clerk user creation fails: "Unable to create account. Please try again."
- Network error: Retry button displayed

**Prerequisites:** Story 1.3 (Clerk authentication working)

**Technical Notes:**
- Implement FR1 (tenant registration) and FR2 (subdomain validation)
- Use React Hook Form + Zod per architecture.md "Form Handling"
- Follow UX Journey: "Spacious Guided Flow" pattern
- Use shadcn/ui Form components with Editorial Navy theme
- Implement transaction: if any step fails, rollback entire registration
- Set default tenant settings: timezone="America/New_York", currency="USD", statement_frequency="quarterly"

---

### Story 1.5: Implement Role-Based Access Control (RBAC) System

**As a** system architect,
**I want** to enforce role-based permissions on all operations,
**So that** users can only access features appropriate to their role.

**Acceptance Criteria:**

**Given** the RBAC system is implemented
**When** users perform actions
**Then** permissions are enforced correctly:

**And** Permission checking middleware is created in lib/auth.ts per architecture.md pattern

**And** All Server Actions check permissions before execution

**And** Role definitions are enforced per PRD:
- **Owner**: Full access, billing, tenant deletion
- **Admin**: User management, all data access, settings (NOT billing)
- **Editor**: Authors, titles, ISBN, sales entry (NOT returns approval, NOT royalty calculations)
- **Finance**: Return approval, royalty calculations, statements (NOT title/author editing)
- **Author**: Own statements only (portal access)

**And** Permission matrix is documented:

| Action | Owner | Admin | Editor | Finance | Author |
|--------|-------|-------|--------|---------|--------|
| Manage Users | ✅ | ✅ | ❌ | ❌ | ❌ |
| Tenant Settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Create Authors/Titles | ✅ | ✅ | ✅ | ❌ | ❌ |
| Record Sales | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve Returns | ✅ | ✅ | ❌ | ✅ | ❌ |
| Calculate Royalties | ✅ | ✅ | ❌ | ✅ | ❌ |
| View Own Statements | ✅ | ✅ | ✅ | ✅ | ✅ |
| View All Statements | ✅ | ✅ | ❌ | ✅ | ❌ |

**And** UI components hide/disable actions based on role

**And** Automated tests verify permission enforcement for each role

**Prerequisites:** Story 1.3 (authentication working)

**Technical Notes:**
- Implement FR4 (role assignment), FR78 (permission enforcement)
- Follow architecture.md "Security & Authorization" patterns
- Create reusable permission hooks: useHasPermission(roles)
- Log permission denials to audit log
- Return 403 Forbidden for permission errors (not 404)

---

### Story 1.6: Build User Invitation and Management System

**As a** tenant owner or admin,
**I want** to invite team members and assign them appropriate roles,
**So that** my team can collaborate in the platform.

**Acceptance Criteria:**

**Given** I am logged in as Owner or Admin
**When** I access the user management page
**Then** I can manage team members:

**And** User management page displays Split View Explorer per UX spec:
- Left panel (320px): List of all users in tenant with search/filter
  - Shows: Name, Email, Role badge, Status badge (Active/Inactive)
  - Sorted alphabetically, active users first
- Right panel: Selected user detail with actions

**And** "Invite User" button opens modal with form per UX pattern

**And** Invite Server Action uses Clerk's invitation API

**And** Invited user receives email with invitation link

**And** User accepts invitation and is automatically assigned to tenant with role

**And** Admin can manage users:
- Resend invitation (if pending)
- Change user role (if active)
- Deactivate user
- Reactivate user
- Delete user (with confirmation)

**And** Validation prevents:
- Duplicate email invitations
- Self-role changes
- Self-deactivation
- Non-Owner changing Owner role

**Prerequisites:** Story 1.5 (RBAC system working)

**Technical Notes:**
- Implement FR3 (invite users), FR6 (deactivate users)
- Use Clerk's invitation API: clerkClient.invitations.createInvitation
- Follow UX Split View Explorer pattern
- Create components in src/modules/users/
- Log all user management actions for audit (FR79)

---

### Story 1.7: Create Tenant Settings Configuration Page

**As a** tenant owner,
**I want** to configure my tenant's operational settings,
**So that** the platform behaves according to my company's preferences.

**Acceptance Criteria:**

**Given** I am logged in as Owner or Admin
**When** I access Settings page
**Then** I can configure tenant settings:

**And** Settings page displays sections per UX Spacious Guided Flow:

**Section 1: Company Information**
- Company Name (editable)
- Subdomain (display only)
- Timezone (dropdown, IANA timezones, default: America/New_York)
- Default Currency (dropdown, default: USD)

**Section 2: Financial Settings**
- Fiscal Year Start (month dropdown, default: January)
- Statement Frequency (radio buttons: Quarterly/Annual/Both)

**Section 3: Notification Preferences** (future placeholder)

**And** Form validation enforces required fields and valid values

**And** Save Settings Server Action updates tenant record

**And** After saving:
- Success toast displayed
- Changes apply immediately
- Audit log records change

**Prerequisites:** Story 1.2 (tenant table exists)

**Technical Notes:**
- Implement FR8 (configure tenant settings), FR80 (tenant-level configuration)
- Follow architecture.md date/time handling: all dates stored UTC, displayed in tenant timezone
- Use date-fns with @date-fns/tz for timezone conversions
- Create component in src/modules/tenant/

---

### Story 1.8: Build Role-Based Dashboard Landing Page

**As a** user,
**I want** to see a dashboard appropriate to my role when I log in,
**So that** I immediately see relevant information and quick actions.

**Acceptance Criteria:**

**Given** I am authenticated and assigned a role
**When** I access /dashboard
**Then** I see a role-specific dashboard:

**And** Dashboard uses Modular Dashboard Grid per UX Direction 5:
- Stats cards at top (3-4 key metrics)
- Recent activity table
- Quick action buttons

**And** Each role sees appropriate content:
- **Owner/Admin**: User stats, title/author counts, ISBN pool status, system events
- **Editor**: My titles, sales recorded, ISBN availability, my recent activity
- **Finance**: Pending returns, royalty liability, statements generated, recent approvals
- **Author**: Latest statement, total earned, pending payment, statement list

**And** Dashboard components:
- Stats cards use shadcn/ui Card with Editorial Navy accent
- Recent activity uses shadcn/ui Table with clickable rows
- Quick action buttons per UX spec
- Skeleton loaders for loading states

**And** Dashboard is responsive per UX spec:
- Desktop (1280px+): Full grid layout
- Tablet (768-1279px): Stacked cards
- Mobile (<768px): Single column

**Prerequisites:** Story 1.5 (RBAC working)

**Technical Notes:**
- Implement FR76 (role-based dashboard views)
- Follow UX spec "Design Direction > Alternative Contexts > Dashboard"
- Use React Server Components for data fetching
- Create reusable DashboardCard component in src/components/layout/
- Use Tailwind grid system for responsive layout

---

## Epic 2: Author & Title Catalog Management

**Epic Goal:** Enable publishers to build and maintain their author roster and title catalog with ISBN tracking

**FRs Covered:** FR9-23 (15 FRs)

---

### Story 2.1: Create Author Database Schema and Data Model

**As a** platform architect,
**I want** to establish the author data model with audit trail support,
**So that** publishers can manage author information securely.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** author schema is created
**Then** the following is implemented:

**And** `authors` table is created per architecture.md schema with all fields:
- id, tenant_id, name, email, phone, address, tax_id (encrypted), payment_method, is_active, created_at, updated_at

**And** RLS policy is enabled for tenant isolation

**And** Indexes created on: tenant_id, email, is_active

**And** Soft delete supported via is_active flag

**And** Migration generated and applied successfully

**Prerequisites:** Story 1.2 (database infrastructure exists)

**Technical Notes:**
- Implement FR13 (audit trail) via created_at/updated_at timestamps
- Tax ID encryption using database-level encryption
- Store schema in src/db/schema/authors.ts

---

### Story 2.2: Build Author Management Split View Interface

**As an** editor,
**I want** to view, create, and manage author profiles efficiently,
**So that** I can maintain our author roster.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Admin, or Owner
**When** I navigate to /authors
**Then** I see Split View Explorer per UX spec:

**And** Left panel (320px) displays author list with:
- Search box filtering by name/email
- Authors sorted alphabetically
- Shows: Name, email preview, active/inactive badge
- Click author loads detail in right panel

**And** Right panel displays selected author details:
- Name, email, phone, address
- Payment method
- Tax ID (masked, only visible to Finance/Owner/Admin)
- Titles by this author (linked table)
- Contract summary
- Edit/Deactivate buttons

**And** "Create Author" button opens form modal per UX Spacious Guided Flow:
- Name (required, text input)
- Email (optional, email validation)
- Phone (optional, formatted input)
- Address (optional, textarea)
- Tax ID (optional, masked input, encrypted on save)
- Payment Method (dropdown: Direct Deposit, Check, Wire Transfer)

**And** Form validation enforces required fields with Zod schema

**And** After creating author: Success toast, author appears in list, detail view loads

**And** Inline editing in right panel for all fields

**And** Permission check: Only Editor/Admin/Owner can create/edit authors

**Prerequisites:** Story 2.1 (author schema exists), Story 1.6 (Split View pattern established)

**Technical Notes:**
- Implement FR9 (create authors), FR10 (tax ID), FR11 (update author info)
- Follow UX Journey "Record Sales Transaction" pattern adapted for authors
- Use shadcn/ui Form components
- Create components in src/modules/authors/
- Tax ID encryption server-side before database insert

---

### Story 2.3: Implement Author Portal Access Provisioning

**As an** admin,
**I want** to grant authors access to the author portal,
**So that** they can view their royalty statements.

**Acceptance Criteria:**

**Given** an author record exists
**When** admin provisions portal access
**Then** author can log into portal:

**And** Author detail view has "Grant Portal Access" button

**And** Clicking button opens modal:
- Confirms author email is valid (required for portal login)
- Option to send invitation email immediately
- Option to set temporary password

**And** Server Action creates user record with role="author" linked to author record

**And** Author receives Clerk invitation email with portal login instructions

**And** Author accepts invitation and sets password

**And** Author can log in at authors.salina-erp.com (or tenant subdomain /portal)

**And** Author portal displays simplified interface per UX spec:
- Only "My Statements" visible
- No access to other authors' data
- No access to internal publisher tools

**And** RLS enforces author can only query their own data

**Prerequisites:** Story 2.2 (authors exist), Story 1.3 (Clerk auth configured)

**Technical Notes:**
- Implement FR12 (author portal login), FR65 (data isolation), FR66 (RLS enforcement)
- Link users.id to authors.id via new field: authors.portal_user_id
- Follow architecture.md RLS patterns for author-scoped queries

---

### Story 2.4: Create Title Database Schema and Multi-Format Support

**As a** platform architect,
**I want** to establish the title data model supporting multiple formats,
**So that** publishers can track physical books, ebooks, and audiobooks.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** title schema is created
**Then** the following is implemented:

**And** `titles` table is created per architecture.md schema:
- id, tenant_id, title, subtitle, genre, word_count, publication_status, publication_date, created_at, updated_at

**And** Publication status enum: draft, pending, published, out-of-print

**And** Unique constraints on isbn (globally unique across all tenants)

**And** RLS policy enabled for tenant isolation

**And** Indexes created on: tenant_id, publication_status, isbn

**And** Supports tracking 3 formats per architecture:
- Physical book
- Ebook
- Audiobook

**Prerequisites:** Story 2.1 (author schema exists for foreign key relationships)

**Technical Notes:**
- Implement FR14 (create titles), FR15 (multiple formats), FR22 (update metadata)
- Store schema in src/db/schema/titles.ts
- ISBN fields nullable (assigned later from pool)

---

### Story 2.5: Build Title Management Split View Interface

**As an** editor,
**I want** to create and manage title records with metadata,
**So that** I can track our publishing catalog.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Admin, or Owner
**When** I navigate to /titles
**Then** I see Split View Explorer:

**And** Left panel displays title list with:
- Search box filtering by title, author, ISBN
- Filter by publication status (dropdown)
- Shows: Title, author name, status badge, formats (icons: P/E/A for Physical/Ebook/Audiobook)
- Sorted by most recently updated

**And** Right panel displays selected title details:
- Title, subtitle
- Author (linked to author detail)
- Genre (dropdown or text)
- Word count
- Publication status (dropdown with visual badge)
- Formats section showing:
  - Physical: ISBN or "Not assigned" + Assign ISBN button
  - Ebook: ISBN or "Not assigned" + Assign ISBN button
  - Audiobook: "Coming soon" (future feature)
- Publication date (date picker)
- Sales summary (total units sold by format)
- Royalty contracts linked to this title

**And** "Create Title" button opens form modal:
- Title (required, text)
- Subtitle (optional)
- Genre (dropdown with common genres + "Other")
- Word Count (optional, number)
- Publication Status (dropdown, defaults to "draft")
- Author (searchable dropdown, required)

**And** Form validation with Zod schema

**And** After creating title: Success toast, title appears in list, detail loads

**And** Inline editing for all metadata fields in right panel

**And** Permission check: Only Editor/Admin/Owner can create/edit titles

**Prerequisites:** Story 2.4 (title schema exists), Story 2.2 (authors exist to link)

**Technical Notes:**
- Implement FR14 (create titles), FR15 (track formats), FR22 (update metadata)
- Follow UX Split View Explorer pattern
- Create components in src/modules/titles/
- Use TanStack Table for title list with sorting/filtering

---

### Story 2.6: Create ISBN Pool Database Schema and Tracking

**As a** platform architect,
**I want** to establish ISBN pool tracking with status management,
**So that** publishers can manage their ISBN inventory.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** ISBN pool schema is created
**Then** the following is implemented:

**And** `isbns` table is created per architecture.md schema:
- id, tenant_id, isbn_13, type (physical/ebook), status (available/assigned/registered/retired), assigned_to_title_id, assigned_at, assigned_by_user_id, created_at, updated_at

**And** Unique constraint on isbn_13 (globally unique)

**And** Foreign keys: assigned_to_title_id → titles.id, assigned_by_user_id → users.id

**And** Status enum enforced: available, assigned, registered, retired

**And** Type enum enforced: physical, ebook

**And** RLS policy for tenant isolation

**And** Indexes on: tenant_id, status, type, isbn_13 (unique)

**Prerequisites:** Story 2.4 (titles table exists)

**Technical Notes:**
- Implement FR17 (track ISBN status), FR19 (prevent duplicates), FR23 (display availability)
- Store schema in src/db/schema/isbns.ts
- isbn_13 is text field (13 digits as string, validated)

---

### Story 2.7: Build ISBN Import with CSV Upload and Validation

**As an** admin,
**I want** to import 100-block ISBN batches via CSV upload,
**So that** I can populate our ISBN pool inventory.

**Acceptance Criteria:**

**Given** I am logged in as Admin or Owner
**When** I navigate to /settings/isbn-import
**Then** I can import ISBNs:

**And** Import page displays:
- Instructions: "Upload a CSV file with ISBNs (one per row or with headers)"
- CSV format example shown
- File upload dropzone (drag & drop or click to browse)
- Type selector: Physical / Ebook (applies to all ISBNs in file)

**And** CSV file requirements:
- Maximum 100 ISBNs per import
- Format: Either single column of ISBNs OR CSV with "isbn" column header
- Example: `9781234567890` (one ISBN per line)

**And** After file selection, validation runs:
- Check each ISBN is exactly 13 digits
- Validate ISBN-13 checksum digit
- Check for duplicates within file
- Check for ISBNs already in database (across all tenants)
- Display validation results with errors highlighted

**And** If validation passes, "Import X ISBNs" button enabled

**And** Clicking import button:
- Server Action inserts ISBNs with status="available", type=[selected type]
- Transaction ensures all-or-nothing import
- Success toast: "✓ Imported 100 ISBNs (Physical)"
- Redirects to ISBN pool view

**And** If validation fails:
- Errors displayed inline (e.g., "Row 47: Invalid ISBN checksum")
- User can fix CSV and re-upload
- No database changes made

**And** Permission check: Only Admin/Owner can import ISBNs

**Prerequisites:** Story 2.6 (ISBN schema exists)

**Technical Notes:**
- Implement FR16 (import ISBN blocks), FR21 (validate ISBN-13 format), FR19 (prevent duplicates)
- Use file upload with size limit (< 1MB)
- Parse CSV server-side using safe CSV library
- Validate each ISBN checksum: ((10 - ((sum of (digits 1-12 with odd positions *1, even *3)) % 10)) % 10) == digit 13
- Follow architecture.md "Input Sanitization" for file uploads

---

### Story 2.8: Build ISBN Pool Status View and Availability Tracking

**As an** editor,
**I want** to view ISBN pool status and availability by type,
**So that** I know when to request more ISBNs.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to /isbn-pool or view the dashboard ISBN widget
**Then** I see ISBN pool status:

**And** Dashboard widget displays summary:
- ISBNs: X available / Y total
- Progress bar showing utilization
- Warning badge if available < 10

**And** Full /isbn-pool page displays:
- Stats cards: Available / Assigned / Retired counts
- Table of all ISBNs with columns:
  - ISBN-13 (monospace font)
  - Status badge (Available/Assigned/Registered/Retired)
  - Assigned To (title link, if assigned)
  - Assigned Date
  - Actions (View Details)

**And** Filters:
- Status (All / Available / Assigned / Retired)
- Search ISBN (partial match)

**And** Table pagination (20 per page)

**And** Click ISBN row shows detail modal:
- Full ISBN
- Status
- If assigned: Title name, assigned by user, assigned date
- If available: "Assign to Title" button (opens title selector)

**Prerequisites:** Story 2.6 (ISBN data exists)

**Technical Notes:**
- Implement FR17 (track ISBN status), FR23 (display availability)
- Use TanStack Table with filtering/sorting
- Create ISBN pool components in src/modules/isbn/
- Dashboard widget uses real-time count queries

---

### Story 2.9: Implement Smart ISBN Assignment with Row Locking

**As an** editor,
**I want** to assign ISBNs to titles from the available pool,
**So that** each title has proper identification for sales tracking.

**Acceptance Criteria:**

**Given** I am viewing a title detail
**When** I click "Assign ISBN" for a format
**Then** the smart assignment flow works per UX Journey 5:

**And** Modal opens showing:
- Format: Physical Book (or Ebook)
- Next available ISBN preview: "978-1-234567-90-7"
- Available count: "42 ISBNs available"
- Primary button: "Assign This ISBN"
- Secondary link: "Choose Different ISBN"

**And** Clicking "Assign This ISBN" (fast path):
- Server Action uses transaction with row-level locking per architecture.md Pattern 3
- SELECT ... FOR UPDATE ensures no concurrent assignment
- Updates ISBN status to "assigned"
- Updates ISBN assigned_to_title_id, assigned_at, assigned_by_user_id
- Updates title ISBN assignment
- Success toast: "✓ ISBN 978-1-234567-90-7 assigned to [Title]"
- Title detail refreshes showing assigned ISBN

**And** Clicking "Choose Different ISBN":
- Shows browsable list of available ISBNs (filtered by type)
- User can select specific ISBN
- Same assignment flow as fast path

**And** Error handling:
- No ISBNs available: "⚠️ No ISBNs available. Import ISBN block first."
- Race condition (ISBN assigned concurrently): "This ISBN was just assigned. Please try again." → auto-loads next available
- Already assigned: "This title already has an ISBN assigned."

**And** Permission check: Only Editor/Admin/Owner can assign ISBNs

**And** Audit trail: All assignments logged with who/when/which ISBN/which title

**Prerequisites:** Story 2.5 (titles exist), Story 2.6 (ISBN pool exists)

**Technical Notes:**
- Implement FR18 (assign ISBNs), FR19 (prevent duplicates), FR20 (separate physical/ebook)
- Follow architecture.md "Pattern 3: ISBN Pool Management with Row Locking"
- Use PostgreSQL FOR UPDATE to prevent race conditions
- Follow UX Journey 5 "Assign ISBN to Title"

---

## Epic 3: Sales & Returns Processing

**Epic Goal:** Enable accurate tracking of sales transactions and managed return approvals for financial integrity

**FRs Covered:** FR24-37 (14 FRs)

---

### Story 3.1: Create Sales Transaction Database Schema

**As a** platform architect,
**I want** to establish immutable sales transaction ledger,
**So that** all sales data is append-only and auditable.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** sales schema is created
**Then** the following is implemented:

**And** `sales` table created per architecture.md schema:
- id, tenant_id, title_id, format, quantity, unit_price, total_amount, sale_date, channel, created_by_user_id, created_at, updated_at

**And** CHECK constraints enforce business rules:
- quantity > 0
- unit_price > 0
- total_amount = quantity * unit_price

**And** Channel enum: retail, wholesale, direct, distributor

**And** Format enum: physical, ebook, audiobook

**And** Foreign keys: title_id → titles.id, created_by_user_id → users.id

**And** RLS policy for tenant isolation

**And** Indexes on: tenant_id, title_id, sale_date, channel, format

**And** Append-only enforcement: No UPDATE or DELETE allowed (only INSERT)

**Prerequisites:** Story 2.4 (titles exist for foreign key)

**Technical Notes:**
- Implement FR28 (transaction metadata), FR29 (append-only ledger)
- Store schema in src/db/schema/sales.ts
- Use DECIMAL(10,2) for currency fields per architecture.md
- Prevent UPDATE/DELETE via database permissions or application-level blocks

---

### Story 3.2: Build Sales Transaction Entry Form

**As an** editor,
**I want** to quickly record individual sales transactions,
**So that** sales data feeds accurate royalty calculations.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Finance, Admin, or Owner
**When** I navigate to /sales/new or click "Record Sale" quick action
**Then** I see sales entry form per UX Journey 1:

**And** Form displays per UX "Spacious Guided Flow":
- Page header: "Record Sales Transaction"
- Subtitle: "Enter sales data for accurate royalty calculations"

**And** Fields in order:
1. **Title** (autocomplete search, required)
   - Type to search, dropdown shows: "[Title] ([Author]) - Physical, Ebook"
   - Shows only titles with assigned ISBNs
   - Focus on page load
2. **Format** (dropdown, required)
   - Pre-filtered based on selected title's available formats
   - Options: Physical Book / Ebook / Audiobook (only if ISBN assigned)
3. **Quantity** (number input, required)
   - Placeholder: "0"
   - Validation: positive integer
4. **Unit Price** (currency input, required)
   - Placeholder: "$0.00"
   - Validation: positive number
   - Helper text: "Price per unit sold"
5. **Sale Date** (date picker, defaults to today)
6. **Sales Channel** (dropdown, required)
   - Options: Retail, Wholesale, Direct, Distributor
   - Remembers last-used as default

**And** Real-time calculation preview:
- Displays: "Total Transaction Value: $3,748.50" (quantity × unit_price)
- Updates live as user types

**And** Submit button: "Record Sale ($3,748.50)" (shows calculated total)

**And** Form validation with Zod schema

**And** On submit:
- Server Action validates and inserts transaction
- Success toast: "✓ Sale recorded: 150 units of [Title] - $3,748.50"
- Form clears (except Sales Channel - keeps last used)
- Focus returns to Title field for next entry

**And** Error handling per UX Journey 1

**Prerequisites:** Story 3.1 (sales schema exists), Story 2.5 (titles exist)

**Technical Notes:**
- Implement FR24 (record sales), FR25 (sale details), FR26 (sales channels)
- Follow UX Journey 1 "Record Sales Transaction" exactly
- Use React Hook Form + Zod
- Create components in src/modules/sales/
- Use Decimal.js for price calculations server-side

---

### Story 3.3: Build Sales Transaction History View

**As a** user,
**I want** to view and filter sales transaction history,
**So that** I can verify recorded sales and analyze patterns.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to /sales
**Then** I see transaction history:

**And** Page displays using Modular Dashboard Grid:
- Stats cards at top:
  - Total Sales This Month ($ amount)
  - Transactions This Month (count)
  - Best Selling Title (title name, units sold)
- Transaction history table below

**And** Table columns:
- Date (formatted: "Nov 21, 2025")
- Title (linked to title detail)
- Format (badge: P/E/A)
- Quantity
- Unit Price (formatted currency)
- Total Amount (formatted currency, bold)
- Channel (badge)
- Recorded By (user name)

**And** Filters:
- Date range picker (defaults to current month)
- Title search (autocomplete)
- Format (All / Physical / Ebook / Audiobook)
- Channel (All / Retail / Wholesale / Direct / Distributor)

**And** Table features:
- Sortable columns (date, amount)
- Pagination (20 per page)
- Click row to view detail modal

**And** Transaction detail modal shows:
- All transaction data
- Audit trail (recorded by, recorded at)
- Related title information
- Note: "This transaction cannot be modified or deleted (immutable ledger)"

**And** Export button: Download filtered results as CSV

**Prerequisites:** Story 3.2 (sales transactions exist)

**Technical Notes:**
- Implement FR27 (view transaction history with filtering)
- Use TanStack Table with sorting/filtering
- Create components in src/modules/sales/
- Use date-fns for date formatting with tenant timezone

---

### Story 3.4: Create Returns Database Schema with Approval Workflow

**As a** platform architect,
**I want** to establish returns tracking with approval workflow,
**So that** only approved returns affect royalty calculations.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** returns schema is created
**Then** the following is implemented:

**And** `returns` table created per architecture.md schema:
- id, tenant_id, title_id, original_sale_id, format, quantity, unit_price, total_amount, return_date, reason, status, reviewed_by_user_id, reviewed_at, created_by_user_id, created_at, updated_at

**And** Status enum: pending, approved, rejected

**And** Default status: pending

**And** Foreign keys: title_id → titles.id, original_sale_id → sales.id (nullable), reviewed_by_user_id → users.id, created_by_user_id → users.id

**And** RLS policy for tenant isolation

**And** Indexes on: tenant_id, title_id, status, return_date

**And** Only approved returns included in royalty calculations (enforced by queries)

**Prerequisites:** Story 3.1 (sales table exists for foreign key)

**Technical Notes:**
- Implement FR32 (pending status), FR35 (track approver), FR36 (only approved affect royalties)
- Store schema in src/db/schema/returns.ts
- Quantity should be positive number (represents returned units, not negative)

---

### Story 3.5: Build Return Request Entry Form

**As an** editor,
**I want** to record return requests for approval,
**So that** returns go through proper workflow before affecting financials.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Finance, Admin, or Owner
**When** I navigate to /returns/new or click "Record Return" action
**Then** I can submit return request:

**And** Form displays:
- Title (autocomplete search, required)
- Format (dropdown filtered by title, required)
- Quantity Returned (number input, required, positive integer)
- Unit Price (currency input, required - should match original sale price)
- Return Date (date picker, defaults to today)
- Reason (dropdown + optional text):
  - Damaged
  - Unsold inventory
  - Customer return
  - Other (text field required if selected)
- Original Sale Reference (optional text input - helps verification)

**And** Real-time calculation: "Return Amount: -$312.50"

**And** Submit button: "Submit Return Request"

**And** On submit:
- Creates return with status="pending"
- Success toast: "✓ Return request submitted for approval"
- Redirects to returns list

**And** Validation: All required fields, positive quantity, positive price

**Prerequisites:** Story 3.4 (returns schema exists)

**Technical Notes:**
- Implement FR30 (record returns), FR31 (return reason, sale reference)
- Create components in src/modules/returns/
- Return amount displayed as negative to show it's a deduction

---

### Story 3.6: Build Return Approval Queue for Finance

**As a** finance user,
**I want** to review and approve/reject return requests,
**So that** only legitimate returns affect royalty calculations.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /returns/pending or click "Pending Returns" dashboard widget
**Then** I see approval queue per UX Journey 2:

**And** Split View Explorer displays:
- **Left panel**: Pending returns queue
  - Header: "Pending Returns (12)"
  - Each item shows: Title, Quantity: -25, Amount: -$312.50, Reason: "Damaged", Date submitted
  - Sorted by date (oldest first)
  - Click item loads detail in right panel

**And** **Right panel**: Return request detail
  - Header: "Return Request"
  - Metadata: Submitted by [User] on [Date]
  - Status badge: "Pending Approval"
  - Return Information card:
    - Title, Format, Quantity, Amount, Reason
  - Original Sale Context card (if reference provided):
    - Original sale date, amount, channel
    - Reference ID
  - Impact statement: "Approving this return will reduce Author royalties by $XX.XX"
  - Action buttons:
    - "Approve Return" (primary button)
    - "Reject Return" (secondary button)

**And** Clicking "Approve Return":
- Confirmation dialog: "Approve Return?"
  - Message: "This return of -$312.50 will be approved and will impact royalty calculations."
  - Optional "Add internal note" text field
  - Buttons: "Confirm Approval" / "Cancel"
- On confirm:
  - Updates status to "approved"
  - Records reviewed_by_user_id and reviewed_at
  - Success toast: "✓ Return approved - $312.50 will be deducted from royalties"
  - Next pending return auto-loads (efficient batch processing)

**And** Clicking "Reject Return":
- Confirmation dialog with required reason field
- On confirm:
  - Updates status to "rejected"
  - Records reviewer, date, and reason
  - Success toast: "✓ Return rejected - No impact on royalties"
  - Next pending return auto-loads

**And** Permission check: Only Finance/Admin/Owner can approve/reject

**Prerequisites:** Story 3.5 (returns exist)

**Technical Notes:**
- Implement FR33 (view queue), FR34 (approve/reject), FR35 (track approver), FR37 (rejected excluded)
- Follow UX Journey 2 "Approve/Reject Return Request" exactly
- Create components in src/modules/returns/
- Auto-loading next return improves workflow efficiency

---

### Story 3.7: Build Returns History View with Status Filtering

**As a** user,
**I want** to view all returns with status filtering,
**So that** I can track approved, rejected, and pending returns.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to /returns
**Then** I see returns history:

**And** Table displays all returns with columns:
- Date
- Title
- Format
- Quantity (displayed as negative: -25)
- Amount (displayed as negative: -$312.50)
- Reason
- Status (badge: Pending/Approved/Rejected)
- Reviewed By (if approved/rejected)
- Actions (View Detail)

**And** Filters:
- Status (All / Pending / Approved / Rejected)
- Date range
- Title search
- Format

**And** Table features:
- Sortable by date, amount, status
- Pagination (20 per page)
- Click row for detail modal

**And** Stats cards:
- Pending Returns (count and $ amount)
- Approved Returns This Month
- Rejected Returns This Month

**And** Permission-based display:
- Finance/Admin/Owner: See all returns
- Editor: See own submitted returns
- Author: No access to returns view

**Prerequisites:** Story 3.6 (returns with approval status exist)

**Technical Notes:**
- Implement FR27 (view with filtering) adapted for returns
- Use TanStack Table
- Display negative quantities/amounts clearly
- Filter approved/rejected by reviewed_at date

---

## Epic 4: Royalty Contracts & Calculation Engine

**Epic Goal:** Enable complex royalty contract management with automated tiered calculations and advance recoupment

**FRs Covered:** FR38-52 (15 FRs)

---

### Story 4.1: Create Royalty Contract Database Schema with Tiered Rates

**As a** platform architect,
**I want** to establish contract schema supporting tiered royalty rates,
**So that** complex publishing contracts can be modeled accurately.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** contract schema is created
**Then** the following is implemented:

**And** `contracts` table created per architecture.md schema:
- id, tenant_id, author_id, title_id, advance_amount, advance_paid, advance_recouped, status, created_at, updated_at

**And** Status enum: active, terminated, suspended

**And** `contract_tiers` table created:
- id, contract_id (FK to contracts, cascade delete), format, min_quantity, max_quantity (nullable = infinity), rate (DECIMAL(5,4) for 4 decimal precision), created_at

**And** Foreign keys: author_id → authors.id, title_id → titles.id

**And** RLS policies for tenant isolation on both tables

**And** Indexes on: tenant_id, author_id, title_id, status

**And** Advance fields use DECIMAL(10,2) for currency

**And** Rate field uses DECIMAL(5,4) to store percentages (0.1000 = 10%)

**Prerequisites:** Story 2.2 (authors exist), Story 2.4 (titles exist)

**Technical Notes:**
- Implement FR38 (contracts), FR39-40 (tiered rates), FR41-42 (advance tracking), FR43-44 (status, history)
- Store schemas in src/db/schema/contracts.ts
- Follow architecture.md schema exactly
- One contract can have many tiers (one per format with multiple quantity breakpoints)

---

### Story 4.2: Build Contract Creation Form with Tiered Royalty Configuration

**As an** editor,
**I want** to create royalty contracts with tiered rates by format,
**So that** author payment terms are properly documented.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Admin, or Owner
**When** I create a new contract from title or author detail
**Then** I can configure complex contracts:

**And** Contract form displays multi-step wizard modal per UX "Wizard-Guided Modal":

**Step 1: Basic Information**
- Author (searchable dropdown, required)
- Title (searchable dropdown, required)
- Status (dropdown: Active/Suspended/Terminated, default: Active)
- Advance Amount (currency input, optional, default: $0.00)
- Advance Paid (currency input, optional, default: $0.00)

**Step 2: Physical Book Royalty Tiers**
- Header: "Physical Book Royalty Rates"
- Dynamic tier builder:
  - Tier 1: 0 - [input] units @ [input]% royalty
  - Tier 2: [auto-filled from Tier 1 max+1] - [input] units @ [input]%
  - Tier 3: [auto-filled] - Infinity @ [input]%
  - "Add Tier" button (up to 5 tiers)
- Example shown: "0-5,000 @ 10%, 5,001-10,000 @ 12%, 10,001+ @ 15%"
- Validation: Tiers cannot overlap, must be sequential

**Step 3: Ebook Royalty Tiers**
- Same tier builder as Step 2, but for ebook format
- Can have different tier structure than physical

**Step 4: Audiobook Royalty Tiers (Optional)**
- Same tier builder
- Can skip if audiobook not applicable

**Step 5: Review & Create**
- Summary display of all configured tiers
- Advance information
- "Create Contract" button

**And** On submit:
- Server Action creates contract record
- Creates separate contract_tiers rows for each tier/format combination
- Success toast: "✓ Contract created for [Author] - [Title]"
- Redirects to contract detail view

**And** Validation:
- Cannot create duplicate contract (same author + title)
- Tier quantities must be sequential and non-overlapping
- Royalty rates must be between 0% and 100%

**Prerequisites:** Story 4.1 (contract schema exists)

**Technical Notes:**
- Implement FR38 (create contracts), FR39-40 (configure tiered rates)
- Use progressive disclosure for complex tier configuration
- Create components in src/modules/royalties/
- Store tiers as separate rows in contract_tiers table
- Use Decimal.js for all financial calculations

---

### Story 4.3: Build Contract Detail View and Management

**As an** editor,
**I want** to view and update existing royalty contracts,
**So that** I can maintain accurate author agreements.

**Acceptance Criteria:**

**Given** a contract exists
**When** I view contract detail
**Then** I see complete contract information:

**And** Contract detail page displays:
- Header: "[Author Name] - [Title]"
- Status badge (Active/Suspended/Terminated)
- Metadata: Created on [date], Last updated [date]

**And** Advance Tracking section:
- Advance Amount: $10,000.00
- Advance Paid: $10,000.00
- Advance Recouped to Date: $6,835.00
- Remaining Balance: $3,165.00
- Progress bar: 68.35% recouped
- Note: "Updated with each royalty statement generation"

**And** Royalty Rate Tables by Format:
- **Physical Book Tiers:**
  | Tier | Range | Royalty Rate |
  |------|-------|--------------|
  | 1 | 0 - 5,000 units | 10.00% |
  | 2 | 5,001 - 10,000 units | 12.00% |
  | 3 | 10,001+ units | 15.00% |

- **Ebook Tiers:**
  | Tier | Range | Royalty Rate |
  |------|-------|--------------|
  | 1 | 0 - 3,000 units | 20.00% |
  | 2 | 3,001+ units | 25.00% |

**And** Related Data section:
- Royalty statements generated for this contract (linked table)
- Total lifetime royalties earned
- Total lifetime sales units

**And** Actions:
- "Edit Contract" button (opens edit modal)
- "Update Advance" button (opens form to record additional advance payments)
- "Change Status" dropdown (Active/Suspended/Terminated)

**And** Edit modal allows changing:
- Status
- Adding/updating advance payments
- Modifying tier rates (with confirmation warning)

**And** Permission check: Only Editor/Admin/Owner can edit contracts

**Prerequisites:** Story 4.2 (contracts exist)

**Technical Notes:**
- Implement FR42 (track advance recoupment), FR43 (update status), FR44 (contract history)
- Display advance recoupment calculated from all statements
- Show contract history via updated_at timestamps
- Warn before modifying tiers if statements already generated

---

### Story 4.4: Implement Tiered Royalty Calculation Engine

**As a** platform architect,
**I want** to build the core royalty calculation engine with tier application logic,
**So that** accurate royalties are calculated per contract terms.

**Acceptance Criteria:**

**Given** sales and returns data exists for a period
**When** royalty calculation is triggered
**Then** the calculation engine works per architecture.md Pattern 1:

**And** Calculation function created in src/modules/royalties/calculator.ts:

```typescript
async function calculateRoyaltyForPeriod(
  authorId: string,
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<RoyaltyCalculation>
```

**And** Calculation steps implemented:
1. Load contract with all tiered rates
2. Calculate net sales per format (sales - approved returns only)
3. Apply tiered rates per format:
   - Iterate through tiers in order
   - Apply rate to units falling within tier range
   - Accumulate royalty for each tier
   - Stop when all units allocated
4. Calculate advance recoupment (if applicable)
5. Calculate net payable (royalty - recoupment)
6. Handle negative periods (no advance reversal)
7. Return detailed breakdown

**And** Uses Decimal.js for all financial math (no floating-point errors)

**And** Calculation breakdown includes:
- Net sales by format (quantity, revenue)
- Tier-by-tier application (which tier, how many units, royalty amount)
- Total royalty earned
- Advance recoupment amount
- Net payable amount

**And** Negative period handling:
- If returns > sales, total royalty = $0 (not negative)
- No reversal of already-recouped advances
- Net payable = $0 for negative periods

**And** Multiple formats supported:
- Each format calculated independently
- Different tier structures per format
- Results aggregated for total

**And** Unit tests verify:
- Tier boundary calculations (e.g., exactly 5,000 units)
- Advance recoupment logic
- Negative period handling
- Multiple format aggregation
- Decimal precision (no rounding errors)

**Prerequisites:** Story 4.1 (contract schema), Story 3.1 (sales data), Story 3.4 (returns data)

**Technical Notes:**
- Implement FR45-52 (all calculation engine requirements)
- Follow architecture.md "Novel Architectural Patterns > Pattern 1: Tiered Royalty Calculation Engine" exactly
- Use Decimal.js for all currency math
- Calculation engine is pure function (no side effects)
- Results are passed to statement generation for storage

---

### Story 4.5: Build Manual Royalty Calculation Trigger (Testing)

**As a** finance user,
**I want** to manually trigger royalty calculations for testing,
**So that** I can verify calculations before statement generation.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /royalties/calculate (development/testing page)
**Then** I can test calculations:

**And** Manual calculation form displays:
- Author (dropdown, required)
- Period Start Date (date picker, required)
- Period End Date (date picker, required)
- "Calculate Royalties" button

**And** On submit:
- Calls calculation engine with parameters
- Displays detailed breakdown:
  - Net Sales by format
  - Tier-by-tier application
  - Total royalty earned
  - Advance recoupment
  - Net payable
- Shows JSON output of full calculation object
- Does NOT create statement (dry run)
- Does NOT update advance_recouped in contract (dry run)

**And** Allows finance team to:
- Verify tier calculations
- Test edge cases (negative periods, tier boundaries)
- Validate advance recoupment logic
- Compare against manual spreadsheet calculations

**And** Warning displayed: "This is a test calculation only. No statements created."

**Prerequisites:** Story 4.4 (calculation engine implemented)

**Technical Notes:**
- Implement FR45 (trigger calculations)
- This is a testing/verification tool, not production flow
- Production flow is statement generation (Epic 5) which calls calculation engine
- Create component in src/modules/royalties/
- Display results in readable format with collapsible JSON

---

## Epic 5: Royalty Statements & Author Portal

**Epic Goal:** Enable transparent royalty statement generation and author self-service access

**FRs Covered:** FR53-66 (14 FRs)

---

### Story 5.1: Create Statements Database Schema and PDF Storage

**As a** platform architect,
**I want** to establish statement storage with PDF references,
**So that** generated statements are persisted and accessible.

**Acceptance Criteria:**

**Given** Drizzle ORM is configured
**When** statements schema is created
**Then** the following is implemented:

**And** `statements` table created per architecture.md schema:
- id, tenant_id, author_id, contract_id, period_start, period_end, total_royalty_earned, recoupment, net_payable, calculations (JSONB), pdf_s3_key, email_sent_at, generated_by_user_id, created_at, updated_at

**And** Foreign keys: author_id → authors.id, contract_id → contracts.id, generated_by_user_id → users.id

**And** JSONB field stores full calculation breakdown from calculation engine

**And** pdf_s3_key stores S3 object key for PDF file

**And** RLS policy for tenant isolation

**And** Additional RLS policy for author portal:
  - Authors can only query statements where author_id = their linked author record

**And** Indexes on: tenant_id, author_id, period_start, period_end

**Prerequisites:** Story 4.1 (contracts exist)

**Technical Notes:**
- Implement FR59 (store statements), FR60 (generation metadata)
- Store schema in src/db/schema/statements.ts
- JSONB field allows flexible storage of calculation details
- S3 integration configured per architecture.md (AWS S3)

---

### Story 5.2: Implement PDF Statement Generation with React Email

**As a** platform architect,
**I want** to generate professional PDF royalty statements,
**So that** authors receive formal documentation of earnings.

**Acceptance Criteria:**

**Given** royalty calculation is complete
**When** PDF generation is triggered
**Then** professional statements are created:

**And** PDF template created using React Email per architecture.md:
- Company logo (tenant branding)
- Header: "Royalty Statement"
- Period: "Q4 2025 (October 1 - December 31, 2025)"
- Author name and address
- Statement number (unique ID)

**And** PDF content sections:
1. **Summary**:
   - Net Amount Payable: $4,165.00 (prominent)
   - Gross Royalties: $6,165.00
   - Advance Recoupment: -$2,000.00

2. **Sales Breakdown by Title**:
   - Table: Title | Format | Units | Revenue | Rate | Royalty
   - Shows tier application (e.g., "Tier 2: 15%")

3. **Returns** (if applicable):
   - Table: Title | Format | Units | Amount | Impact
   - Clearly shows negative impact

4. **Advance Recoupment** (if applicable):
   - Original Advance, Previously Recouped, This Period, Remaining
   - Progress bar visualization

5. **Payment Information**:
   - Net Payable, Payment Date, Payment Method
   - Bank information or check mailing address

6. **Footer**:
   - Statement generated by [User] on [Date]
   - Contact information
   - "Questions? Email finance@[tenant].com"

**And** PDF generation process:
- Uses React Email to render HTML template
- Converts HTML to PDF using puppeteer or similar
- Uploads PDF to S3 with key: `statements/${tenant_id}/${statement_id}.pdf`
- Stores S3 key in database

**And** PDF is formatted professionally:
- Uses tenant's color theme
- Clear typography (Inter font)
- Tables are well-formatted
- Page breaks handled correctly
- Total typically 2-3 pages

**And** Runs as background job via Inngest (async processing)

**Prerequisites:** Story 5.1 (statements table), Story 4.4 (calculation engine)

**Technical Notes:**
- Implement FR53 (generate PDFs), FR54-57 (statement content)
- Use React Email 5.0+ for templates per architecture.md
- PDF library: Puppeteer or similar
- AWS S3 for storage per architecture.md
- Create PDF generator in src/modules/statements/pdf-generator.ts
- Inngest job in src/inngest/generate-statements.ts

---

### Story 5.3: Build Statement Generation Wizard for Finance

**As a** finance user,
**I want** to generate royalty statements for one or all authors via guided wizard,
**So that** I can produce quarterly/annual statements efficiently.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I click "Generate Statements" action
**Then** I see wizard flow per UX Journey 3:

**And** Modal wizard opens with 4 steps:

**Step 1: Select Period**
- Period type: Radio buttons (Quarterly/Annual/Custom)
- If Quarterly: Dropdown (Q1 2025, Q2 2025, etc.)
- If Annual: Dropdown (2024, 2025)
- If Custom: Start/End date pickers
- Next button

**Step 2: Select Authors**
- "Select All Authors (47)" checkbox
- Scrollable author list with checkboxes
  - Shows: Name, pending royalties estimate
- Search/filter box
- Summary: "47 authors selected • Total pending royalties: $215,430"
- Back / Next buttons

**Step 3: Preview Calculations**
- Table showing calculation preview for all selected authors:
  - Author | Sales | Returns | Royalty Earned | Advance Recouped | Net Payable
- Totals row
- Warning callouts (if applicable):
  - Authors with negative periods
  - Authors with fully recouped advances
- Back / Next buttons

**Step 4: Generate & Send**
- Confirmation summary
- Delivery options:
  - ☑ Email PDF statements to authors
  - ☑ Make available in author portal
  - ☐ Export CSV summary
- "Generate Statements" button (green, final action)

**And** On clicking "Generate Statements":
- Enqueues Inngest background job
- Shows progress modal: "Generating statements... 12 of 47 complete"
- User can close and continue working
- Background job monitors in top nav

**And** Background job for each author:
1. Run calculation engine
2. Create statement record
3. Generate PDF
4. Upload to S3
5. Send email (if option selected)
6. Update contract advance_recouped

**And** On completion:
- Success toast: "✓ 47 royalty statements generated and sent"
- Option to view statements list

**And** Error handling:
- PDF generation fails: Retry logic
- Email fails: Log error, statement still saved, admin notified

**Prerequisites:** Story 5.2 (PDF generation works), Story 4.4 (calculation engine)

**Technical Notes:**
- Implement FR53 (generate statements), FR58 (email delivery)
- Follow UX Journey 3 "Generate Royalty Statements" exactly
- Use Inngest for background processing per architecture.md
- Create wizard in src/modules/statements/
- Inngest job handles bulk generation

---

### Story 5.4: Implement Statement Email Delivery with Resend

**As a** platform architect,
**I want** to email PDF statements to authors automatically,
**So that** authors receive timely notifications.

**Acceptance Criteria:**

**Given** PDF statement is generated and stored
**When** email delivery is triggered
**Then** authors receive professional emails:

**And** Email template created using React Email:
- Subject: "Your Q4 2025 Royalty Statement is Ready - [Publisher Name]"
- Preheader: "Total earned: $6,165.00 | Net payable: $4,165.00"
- Body:
  - Publisher logo
  - Greeting: "Hi [Author Name],"
  - Message: "Your royalty statement for Q4 2025 is ready."
  - Summary: Gross royalties, recoupment, net payable
  - CTA button: "View Statement" (links to author portal)
  - Attachment: PDF file
  - Footer: Publisher contact info

**And** Email sent via Resend API per architecture.md

**And** Email includes:
- PDF attachment (from S3 presigned URL or direct attachment)
- Plain text version for accessibility
- Unsubscribe link (future feature)

**And** Email delivery tracking:
- Records email_sent_at timestamp in statements table
- Logs delivery success/failure
- Retry logic for failed deliveries (3 attempts)

**And** If email fails:
- Statement is still saved and accessible in portal
- Finance user is notified
- Can manually resend from statement detail

**Prerequisites:** Story 5.2 (PDF exists), Story 5.3 (generation flow)

**Technical Notes:**
- Implement FR58 (automatic email delivery)
- Use Resend + React Email per architecture.md
- Create email template in src/modules/statements/email-template.tsx
- Email sending in Inngest job
- Store Resend API key in environment variables

---

### Story 5.5: Build Statements List and Detail View for Finance

**As a** finance user,
**I want** to view all generated statements with filtering,
**So that** I can manage and resend statements as needed.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /statements
**Then** I see statements list:

**And** Table displays all statements with columns:
- Period (formatted: "Q4 2025")
- Author
- Generated On (date)
- Status badge (Sent/Draft/Failed)
- Net Payable (currency, bold)
- Actions (View / Download PDF / Resend Email)

**And** Filters:
- Period (dropdown of all periods with statements)
- Author (search)
- Status (All / Sent / Draft / Failed)
- Date range generated

**And** Stats cards:
- Statements Generated This Quarter
- Total Liability (sum of net payables)
- Pending Emails (count of unsent)

**And** Click statement row opens detail modal:
- Full statement data (matches PDF content)
- Calculation breakdown (expandable JSON)
- PDF preview or download link
- Email delivery status
- Actions:
  - Download PDF
  - Resend Email
  - Regenerate (with confirmation warning)

**And** Bulk actions:
- Select multiple statements
- Batch download PDFs (ZIP file)
- Batch resend emails

**Prerequisites:** Story 5.3 (statements exist)

**Technical Notes:**
- Implement FR59 (historical retrieval), FR60 (metadata)
- Create components in src/modules/statements/
- Use TanStack Table
- PDF download uses S3 presigned URLs (15-minute expiry)

---

### Story 5.6: Build Author Portal Statement Access

**As an** author,
**I want** to view my royalty statements in a dedicated portal,
**So that** I can access my earnings information on-demand.

**Acceptance Criteria:**

**Given** I am logged in as author role
**When** I access the author portal
**Then** I see simplified statement interface per UX Journey 4:

**And** Portal displays at /portal (or authors.salina-erp.com):
- Simple navigation: Logo, "My Statements", Logout
- Clean, uncluttered design (Editorial Navy theme)

**And** Statement list page displays:
- Page header: "Your Royalty Statements"
- Table: Period | Date Generated | Status | Gross Royalties | Net Payable | Actions
- Sorted by date (newest first)
- Status badges: Paid / Pending Payment / New

**And** Click "View" opens statement detail page per UX Journey 4:
- Page header: "Q4 2025 Royalty Statement"
- Period: October 1 - December 31, 2025
- Status badge
- Action buttons: Download PDF, Print

**And** Summary card (prominent):
  ```
  Net Amount Payable: $4,165.00
  (Gross Royalties: $6,165 - Advance: $2,000)
  ```

**And** Sales breakdown section:
- Table: Title | Format | Units Sold | Revenue | Your Rate | Royalty Earned
- Shows tier rates (e.g., "15% (Tier 2)")
- Total row

**And** Returns section (if applicable):
- Table: Title | Format | Units | Amount | Royalty Impact
- Total row (negative amounts in red)

**And** Advance recoupment section (if applicable):
- Original Advance, Previously Recouped, This Period, Remaining
- Progress bar

**And** Final payment calculation:
- Net Royalties This Period
- Advance Recouped
- Net Amount Payable (highlighted)

**And** Footer: Payment date, generated date, contact info

**And** Download PDF button generates presigned S3 URL

**And** Permission enforcement:
- Author can only see own statements (via RLS)
- Cannot access other authors' data
- Cannot access publisher internal tools

**And** Mobile-responsive design

**Prerequisites:** Story 5.1 (statements exist), Story 2.3 (author portal access)

**Technical Notes:**
- Implement FR61-66 (all author portal requirements)
- Follow UX Journey 4 "Author Views Statement" exactly
- Create portal pages in app/(portal)/
- RLS policies enforce author_id isolation
- Simplified navigation per UX spec "mobile-responsive for author portal"

---

## Epic 6: Financial Reporting & Analytics

**Epic Goal:** Provide comprehensive financial reporting and role-based analytics dashboards

**FRs Covered:** FR67-81 (15 FRs)

---

### Story 6.1: Implement Revenue and Liability Tracking

**As a** finance user,
**I want** to view total revenue and royalty liability,
**So that** I understand the financial position.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I access finance dashboard or reports
**Then** I see financial metrics:

**And** Revenue tracking queries:
- Total revenue from all sales (sum of sales.total_amount)
- Revenue by period (daily/weekly/monthly/quarterly/annual)
- Revenue by format (physical/ebook/audiobook)
- Revenue by channel (retail/wholesale/direct/distributor)

**And** Royalty liability tracking queries:
- Total liability (sum of net_payable from unpaid statements)
- Liability by author (grouped sum)
- Liability by period
- Paid vs unpaid breakdown

**And** Finance dashboard displays stats cards:
- Total Revenue (current month)
- Total Royalty Liability (unpaid amount owed)
- Net Margin (revenue - royalty expense - other costs, future)
- Upcoming Statement Deadline (date)

**And** Drill-down capability:
- Click stat card opens detailed report
- Shows breakdown by title, format, channel, author

**Prerequisites:** Story 3.1 (sales data), Story 5.1 (statements data)

**Technical Notes:**
- Implement FR67 (track revenue), FR68 (calculate liability), FR69 (liability by author)
- Create aggregation queries in src/modules/reports/
- Use database views or materialized views for performance (future optimization)
- Display formatted currency

---

### Story 6.2: Build Sales Reports with Multi-Dimensional Filtering

**As a** user,
**I want** to generate sales reports with flexible filtering,
**So that** I can analyze sales patterns.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to /reports/sales
**Then** I can generate custom reports:

**And** Report builder interface displays:
- Date Range picker (required)
- Filters:
  - Title (multi-select)
  - Author (multi-select)
  - Format (Physical/Ebook/Audiobook/All)
  - Channel (Retail/Wholesale/Direct/Distributor/All)
  - Grouping (by Title / by Format / by Channel / by Date)
- "Generate Report" button

**And** Report displays results:
- Table showing grouped results based on selection
- Example (grouped by title):
  - Title | Format | Total Units | Total Revenue | Avg Unit Price
- Totals row at bottom
- Charts:
  - Bar chart: Sales by title (top 10)
  - Line chart: Sales over time (if date grouping)
  - Pie chart: Sales by format

**And** Export options:
- Download as CSV
- Download as PDF (formatted report)
- Copy to clipboard (tabular data)

**And** Saved reports (future enhancement):
- Save filter configuration
- Quick access to common reports

**And** Permission: All users can generate sales reports for visibility

**Prerequisites:** Story 3.1 (sales data exists)

**Technical Notes:**
- Implement FR72 (sales reports with filtering), FR75 (CSV export)
- Use Recharts or Victory for visualizations per architecture.md
- Create components in src/modules/reports/
- CSV export uses browser download

---

### Story 6.3: Build ISBN Pool Status Report

**As a** user,
**I want** to view ISBN pool status report,
**So that** I know when to order more ISBNs.

**Acceptance Criteria:**

**Given** I am logged in
**When** I navigate to /reports/isbn-pool
**Then** I see ISBN utilization report:

**And** Report displays:
- Stats cards:
  - ISBNs: X Available / Y Assigned / Z Total
  - Utilization: X% (percent assigned)
- Charts:
  - Pie chart: Available vs Assigned
  - Timeline: ISBN assignments over time
- Warning alerts:
  - "⚠️ Only 8 ISBNs remaining - consider importing more"
  - Alert threshold: < 10 available

**And** Detailed breakdown table:
- Import Date | Prefix | Count Imported | Currently Available | Currently Assigned
- Grouped by import batch
- Shows "burn rate" (ISBNs assigned per month)

**And** Actionable insights:
- "At current rate, ISBNs will run out in approximately 3 months"
- "Import ISBN Block" quick action button

**Prerequisites:** Story 2.6 (ISBN data exists)

**Technical Notes:**
- Implement FR73 (ISBN pool status report)
- Calculate utilization percentages
- Alert logic: if available < 10, show warning
- Create components in src/modules/reports/

---

### Story 6.4: Build Royalty Liability Summary Report

**As a** finance user,
**I want** to view royalty liability summary across all authors,
**So that** I can plan cash flow and payments.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /reports/royalty-liability
**Then** I see comprehensive liability report:

**And** Report displays:
- **Summary stats**:
  - Total Unpaid Liability: $XX,XXX.XX (sum of unpaid statements)
  - Number of Authors with Pending Payments: XX
  - Oldest Unpaid Statement: QX 20XX
  - Average Payment per Author: $X,XXX

**And** **Liability by author table**:
  - Author | Titles | Unpaid Statements | Total Owed | Oldest Statement | Payment Method
  - Sortable by amount owed (default: highest first)
  - Click author opens drill-down

**And** **Payment timeline**:
  - Table/Chart showing: Period | Statements Due | Total Amount | Status
  - Helps plan quarterly/annual payment schedules

**And** **Advance tracking**:
  - Authors with active advances
  - Advance balances remaining
  - Estimated recoupment timeline

**And** Export options:
  - CSV export for accounting system import
  - PDF report for executive review

**Prerequisites:** Story 5.1 (statements exist)

**Technical Notes:**
- Implement FR74 (royalty liability summary)
- Query unpaid statements (where payment_status = 'pending' or similar)
- Group by author
- Create components in src/modules/reports/

---

### Story 6.5: Implement Audit Logging for Compliance

**As a** system architect,
**I want** to log all data modifications for audit trail,
**So that** we have compliance and security visibility.

**Acceptance Criteria:**

**Given** audit logging is configured
**When** users perform actions
**Then** events are logged:

**And** Audit log records:
- User ID, Tenant ID
- Action type (CREATE, UPDATE, DELETE, APPROVE, REJECT)
- Resource type (author, title, sale, return, statement, etc.)
- Resource ID
- Changes made (before/after values for updates)
- Timestamp
- IP address
- Success/failure status

**And** Logged actions include:
- All financial transactions (sales, returns, statements)
- User management (invitations, role changes, deactivations)
- Contract modifications
- Return approvals/rejections
- Statement generation
- Sensitive data access (viewing tax IDs, full statements)

**And** Audit logs stored securely:
- Separate table: audit_logs (not user-modifiable)
- Retention policy: 7 years (configurable)
- Searchable and exportable

**And** Admin interface for audit logs:
- /admin/audit-logs (Admin/Owner only)
- Filters: User, Action Type, Resource Type, Date Range
- Export to CSV for compliance review

**And** Logging implementation:
- Centralized logging function: logAuditEvent()
- Called in all Server Actions after successful operations
- Async logging (does not block user operations)

**Prerequisites:** Story 1.2 (database exists)

**Technical Notes:**
- Implement FR79 (log all modifications), FR71 (audit trail for financial transactions)
- Create audit_logs table (id, tenant_id, user_id, action_type, resource_type, resource_id, changes, timestamp, ip_address, status)
- Use structured logging per architecture.md logger.ts pattern
- Consider separate database or table for audit logs (append-only)

---

### Story 6.6: Build Background Job Monitoring for System Administration

**As a** system administrator,
**I want** to monitor background jobs and system health,
**So that** I can ensure reliable operation.

**Acceptance Criteria:**

**Given** I am logged in as Admin or Owner
**When** I navigate to /admin/system
**Then** I see system monitoring dashboard:

**And** Background job monitor displays:
- Active Jobs: Count of currently running jobs
- Queued Jobs: Count of jobs waiting to execute
- Recent Completions: Last 20 completed jobs
- Recent Failures: Last 20 failed jobs

**And** Job types tracked:
- Royalty calculation jobs (per author)
- PDF statement generation jobs
- Email delivery jobs
- CSV import jobs (ISBNs)

**And** Job detail view shows:
- Job ID, Type, Status (Running/Completed/Failed)
- Started at, Completed at, Duration
- Input parameters
- Output/Result (if completed)
- Error message (if failed)
- Retry count, Next retry time

**And** Job management actions:
- Retry failed job
- Cancel running job (if supported)
- View job logs

**And** Inngest dashboard integration:
- Link to Inngest web dashboard for detailed monitoring
- Shows execution history, performance metrics

**And** System health metrics:
- Database connection status
- External service status (Clerk, Resend, S3)
- Error rate (last hour, last day)
- Average response times

**Prerequisites:** Story 5.3 (Inngest jobs configured)

**Technical Notes:**
- Implement FR77 (monitor usage and activity), FR81 (async job handling)
- Use Inngest's built-in monitoring and expose via UI
- Create admin dashboard in src/app/(dashboard)/admin/
- Only Admin/Owner roles can access
- Real-time updates via polling or webhooks

---

### Story 6.7: Enhance All Dashboards with Role-Specific Analytics

**As a** user,
**I want** my dashboard to show analytics relevant to my role,
**So that** I see actionable insights at a glance.

**Acceptance Criteria:**

**Given** I am logged in with assigned role
**When** I view my dashboard
**Then** I see enhanced analytics:

**And** **Owner/Admin Dashboard** includes:
- Revenue trend chart (last 6 months)
- Top selling titles (units sold, revenue)
- Author performance ranking
- ISBN utilization trend
- User activity log (recent actions)

**And** **Editor Dashboard** includes:
- My titles published this quarter
- Recent sales for my titles
- ISBN assignments I've made
- Pending tasks (titles without ISBNs, etc.)

**And** **Finance Dashboard** includes:
- Royalty liability trend (last 12 months)
- Pending returns requiring approval (with urgency indicator)
- Upcoming statement deadlines
- Payment schedule (which authors paid when)
- Top authors by royalty amount

**And** **Author Dashboard (Portal)** includes:
- Earnings timeline chart (quarterly)
- Best performing titles (units sold)
- Advance recoupment progress
- Upcoming statement date

**And** All charts interactive:
- Click data point for drill-down
- Hover for detailed tooltips
- Date range selection

**And** Dashboards refresh:
- Real-time data (or cached 60 seconds)
- Skeleton loaders while fetching
- Error states handled gracefully

**Prerequisites:** All previous stories (data exists from all modules)

**Technical Notes:**
- Implement FR76 (role-based dashboards) with enhanced analytics
- Use Recharts or Victory for visualizations
- Create reusable chart components in src/components/charts/
- Use React Server Components for data fetching
- Cache queries with Next.js revalidation

---

## Epic 7: Contact & ISBN Foundation

**Epic Goal:** Establish unified contact database with multi-role support, enhance ISBN management with publisher prefix system, and add customizable royalty period configuration

**FRs Covered:** FR82-95 (14 FRs) - Note: FR90-91 consolidated into prefix management

**Dependencies:** Epics 1-6 complete (MVP delivered)

**Architectural Note:** This epic includes a significant data model refactor - Authors become Contacts with roles. Migration strategy required.

---

### Story 7.1: Create Unified Contact Database Schema

**As a** system architect,
**I want** to create a unified contact database with multi-role support,
**So that** contacts can serve as authors, customers, vendors, or multiple roles simultaneously.

**Acceptance Criteria:**

**Given** the existing authors table exists with data
**When** I implement the contact refactor
**Then** the system has:

**And** New contacts table schema:
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- first_name, last_name (required)
- email (unique per tenant)
- phone, address fields
- tax_id (encrypted, for 1099 reporting)
- payment_info (JSON, bank details for royalty payments)
- notes (text)
- status (active/inactive)
- created_at, updated_at, created_by

**And** Contact roles table (many-to-many):
- contact_id (FK to contacts)
- role (enum: 'author', 'customer', 'vendor', 'distributor')
- role_specific_data (JSON for role-specific fields)
- assigned_at, assigned_by

**And** Role-specific fields in role_specific_data:
- Author: pen_name, bio, website, social_links
- Customer: billing_address, shipping_address, credit_limit, payment_terms
- Vendor: vendor_code, lead_time, min_order
- Distributor: territory, commission_rate, contract_terms

**And** Migration strategy:
- Create contacts table
- Migrate all authors to contacts with role='author'
- Update foreign keys (royalty_contracts.author_id → contact_id)
- Preserve all historical data and relationships
- Backward-compatible queries during transition

**And** RLS policies on contacts table:
- tenant_id isolation
- Author portal: contacts can only see own record

**Prerequisites:** Epic 1 (database infrastructure)

**Technical Notes:**
- Implement FR82, FR83, FR84
- Use Drizzle schema for type-safe migrations
- Create migration script with rollback capability
- Update all queries that reference authors table
- Consider soft-delete for authors table during transition

---

### Story 7.2: Build Contact Management Interface

**As an** editor or admin,
**I want** to manage contacts with multiple roles,
**So that** I can maintain a unified contact database.

**Acceptance Criteria:**

**Given** I am logged in as Editor, Admin, or Owner
**When** I navigate to /contacts
**Then** I see contact management interface:

**And** Contact list view displays:
- Table: Name | Email | Roles (badges) | Status | Actions
- Role badges: 🖊️ Author, 🛒 Customer, 🏭 Vendor, 📦 Distributor
- Filter by role (multi-select)
- Search by name, email
- Sort by name, created date

**And** Create contact form:
- Basic info: First/Last name, Email, Phone
- Address fields (collapsible)
- Tax ID (masked input, encrypted storage)
- Role assignment (checkbox list)
- Role-specific fields shown based on selected roles
- Save button

**And** Contact detail/edit view:
- All fields editable
- Role management: Add/remove roles
- Role-specific sections expand based on assigned roles
- Activity history: Recent transactions, statements, invoices
- Related entities: Titles (if author), Invoices (if customer)

**And** Permission enforcement:
- Editors: Create/edit contacts, assign author role
- Finance: Assign customer role, view payment info
- Admin/Owner: All permissions, delete contacts

**And** Validation:
- Email unique per tenant
- Required fields enforced
- Tax ID format validation

**Prerequisites:** Story 7.1 (schema exists)

**Technical Notes:**
- Implement FR85, FR86, FR87
- Create pages in src/app/(dashboard)/contacts/
- Reuse form patterns from author management
- Badge component for role display

---

### Story 7.3: Migrate Authors to Contacts

**As a** system administrator,
**I want** existing author data migrated to the contacts table,
**So that** the unified contact system is populated with existing data.

**Acceptance Criteria:**

**Given** authors table has existing records
**When** migration runs
**Then** all data is preserved:

**And** Migration process:
- Create contact record for each author
- Copy all fields (name, email, tax_id, payment_info, etc.)
- Create contact_role record with role='author'
- Move author-specific fields to role_specific_data JSON
- Update royalty_contracts to reference contact_id
- Update statements to reference contact_id
- Preserve audit trail linkages

**And** Data validation:
- Count authors before = Count contacts with author role after
- All foreign key references updated
- No orphaned records

**And** Rollback capability:
- Authors table preserved (not deleted)
- Rollback script available
- Can revert within 30 days

**And** Application updates:
- Author queries use contacts table with role filter
- Author portal login uses contacts table
- All author references updated in UI

**Prerequisites:** Story 7.1, Story 7.2

**Technical Notes:**
- Implement FR84 (migration preserving relationships)
- Create migration script in drizzle/migrations/
- Run in transaction for atomicity
- Test on staging before production
- Schedule during low-usage window

---

### Story 7.4: Implement Publisher ISBN Prefix System

**As an** administrator,
**I want** to register publisher ISBN prefixes and auto-generate ISBN ranges,
**So that** ISBN management reflects real-world publisher prefix allocation.

**Acceptance Criteria:**

**Given** I am logged in as Admin or Owner
**When** I navigate to /settings/isbn-prefixes
**Then** I can manage ISBN prefixes:

**And** Prefix registration form:
- Publisher prefix input (e.g., "978-1-234567")
- Block size selection: 10, 100, 1,000, 10,000, 100,000, 1,000,000
- Notes field (agency, purchase date, etc.)
- "Register & Generate" button

**And** Prefix validation:
- Validates ISBN-13 prefix format (978 or 979 start)
- Validates check digit algorithm compatibility
- Prevents duplicate prefix registration
- Shows calculated ISBN range (first ISBN - last ISBN)

**And** Auto-generation on registration:
- System generates all ISBNs in the block
- Example: Prefix "978-1-234567" with block size 100 generates:
  - 978-1-234567-00-X through 978-1-234567-99-X
  - Check digits calculated per ISBN-13 algorithm
- ISBNs added to isbn_pool with status='available'
- Linked to prefix record for organization

**And** Prefix management view:
- Table: Prefix | Block Size | Type | Total | Available | Assigned | Actions
- Expand row shows all ISBNs in that block
- Visual utilization bar

**And** ISBN pool updates:
- New column: prefix_id (FK to isbn_prefixes)
- Existing ISBNs marked as "legacy" (no prefix)

**Prerequisites:** Story 2.6 (ISBN pool exists)

**Technical Notes:**
- Implement FR88, FR89, FR92
- Create isbn_prefixes table
- ISBN-13 check digit algorithm implementation
- Batch insert for large blocks (100K, 1M)
- Consider async job for very large blocks

---

### Story 7.5: Add Customizable Royalty Period Setting

**As a** tenant owner,
**I want** to configure the royalty calculation period independently of fiscal year,
**So that** royalty periods match our business practices.

**Acceptance Criteria:**

**Given** I am logged in as Owner or Admin
**When** I navigate to /settings/tenant
**Then** I can configure royalty period:

**And** Royalty Period Settings section:
- Period Type dropdown:
  - Calendar Year (Jan 1 - Dec 31)
  - Fiscal Year (uses existing fiscal_year_start setting)
  - Custom
- If Custom selected:
  - Start Month dropdown (1-12)
  - Start Day dropdown (1-31, validated per month)
- Preview: "Your royalty year runs from [date] to [date]"

**And** Impact on royalty calculations:
- Statement generation wizard shows royalty period options
- Period filter defaults to current royalty period
- Reports respect royalty period setting

**And** Validation:
- Start date must be valid
- Warning if changing mid-period: "Changing period settings may affect in-progress calculations"

**And** Database updates:
- New tenant settings: royalty_period_type, royalty_period_start_month, royalty_period_start_day
- Migration for existing tenants (default to fiscal year)

**Prerequisites:** Story 1.7 (tenant settings exists)

**Technical Notes:**
- Implement FR93, FR94, FR95
- Update tenant settings schema
- Update royalty calculation date filtering
- Update statement generation wizard

---

## Epic 8: Invoicing & Accounts Receivable

**Epic Goal:** Implement full invoicing capability with line items, customer management, and accounts receivable tracking

**FRs Covered:** FR96-106 (11 FRs)

**Dependencies:** Epic 7 (Contact system with Customer role)

---

### Story 8.1: Create Invoice Database Schema

**As a** system architect,
**I want** to create invoice and AR database schema,
**So that** the system can track invoices and receivables.

**Acceptance Criteria:**

**Given** the contacts table exists with Customer role support
**When** I implement invoice schema
**Then** the system has:

**And** Invoices table:
- id (UUID, primary key)
- tenant_id (UUID, foreign key)
- invoice_number (auto-generated, tenant-unique)
- customer_id (FK to contacts with Customer role)
- invoice_date, due_date
- status (draft/sent/paid/partially_paid/overdue/void)
- bill_to_address (JSON)
- ship_to_address (JSON)
- po_number (optional)
- payment_terms (enum: net_30, net_60, due_on_receipt, custom)
- custom_terms_days (if custom)
- shipping_method, shipping_cost
- subtotal, tax_rate, tax_amount, total
- amount_paid, balance_due
- notes, internal_notes
- created_at, updated_at, created_by

**And** Invoice line items table:
- id (UUID)
- invoice_id (FK)
- line_number (sequence)
- item_code (optional, for catalog items)
- description (required)
- quantity (decimal)
- unit_price (decimal)
- tax_rate (decimal, line-level override)
- amount (calculated: quantity * unit_price)
- title_id (optional FK, if selling a title)

**And** Payments table:
- id (UUID)
- tenant_id (FK)
- invoice_id (FK)
- payment_date
- amount
- payment_method (check, wire, credit_card, other)
- reference_number (check number, transaction ID)
- notes
- created_at, created_by

**And** Indexes for performance:
- invoice_number + tenant_id (unique)
- customer_id for customer queries
- status for queue filtering
- due_date for aging queries

**And** RLS policies enforcing tenant isolation

**Prerequisites:** Story 7.1 (contacts with Customer role)

**Technical Notes:**
- Implement FR96, FR97, FR98, FR99, FR100, FR101
- Use Decimal for all monetary values
- Invoice number format: INV-YYYYMMDD-XXXX

---

### Story 8.2: Build Invoice Creation Form

**As a** finance user,
**I want** to create invoices with bill-to, ship-to, and line items,
**So that** I can bill customers for products and services.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /invoices/new
**Then** I see invoice creation form:

**And** Header section:
- Customer selector (contacts with Customer role, searchable)
- Auto-populate bill-to from customer record
- Ship-to address (copy from bill-to or enter different)
- Invoice date (default today)
- Due date (calculated from payment terms)
- P.O. Number (optional)
- Payment terms dropdown
- Shipping method, shipping cost

**And** Line items section:
- Grid with columns: Item Code | Description | Qty | Unit Price | Tax | Amount
- Add row button
- Delete row button (X)
- Item code autocomplete (optional - for future catalog)
- Description text input
- Quantity number input
- Unit price currency input
- Tax checkbox or rate input
- Amount auto-calculated and displayed
- Subtotal row
- Tax row
- Shipping row
- Grand total row

**And** Footer section:
- Notes to customer (appears on invoice)
- Internal notes (not on invoice)
- Save as Draft button
- Save & Send button (generates PDF, emails to customer)

**And** Validation:
- Customer required
- At least one line item required
- All line items need description and quantity
- Unit price must be positive

**And** UX patterns (similar to QuickBooks screenshot):
- Clean, professional layout
- Tab navigation between fields
- Keyboard shortcuts for efficiency

**Prerequisites:** Story 8.1 (schema exists)

**Technical Notes:**
- Implement FR96, FR97, FR98, FR99, FR100
- Create pages in src/app/(dashboard)/invoices/
- Line item component with add/remove
- Currency formatting with Decimal.js

---

### Story 8.3: Build Invoice List and Detail Views

**As a** finance user,
**I want** to view and manage invoices,
**So that** I can track billing status.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /invoices
**Then** I see invoice management interface:

**And** Invoice list view:
- Table: Invoice # | Date | Customer | Amount | Balance | Status | Actions
- Status badges with colors (Draft=gray, Sent=blue, Paid=green, Overdue=red)
- Filters: Status, Customer, Date Range
- Sort by date (default newest first), amount, customer
- Quick actions: View, Edit (if draft), Record Payment, Send

**And** Invoice detail view (/invoices/[id]):
- Full invoice display (print-ready layout)
- Header: Company info, Invoice #, dates
- Bill-to / Ship-to addresses
- Line items table
- Totals section
- Payment history (if any payments)
- Action buttons: Edit (draft only), Send, Record Payment, Void, Print, Download PDF

**And** Edit invoice (draft only):
- Same form as create
- Pre-populated with existing data
- Save changes

**And** Invoice status workflow:
- Draft → Sent (on first send)
- Sent → Paid (when balance = 0)
- Sent → Partially Paid (when payment recorded but balance > 0)
- Sent → Overdue (automatic when past due_date)
- Any → Void (manual action with confirmation)

**Prerequisites:** Story 8.2 (create form exists)

**Technical Notes:**
- Implement FR101 (link to customers)
- Status badge component
- Print-friendly CSS
- PDF generation (reuse React-PDF from statements)

---

### Story 8.4: Implement Payment Recording

**As a** finance user,
**I want** to record payments against invoices,
**So that** I can track accounts receivable accurately.

**Acceptance Criteria:**

**Given** I have sent invoices with balances due
**When** I record a payment
**Then** the invoice balance updates:

**And** Record payment modal:
- Invoice reference (read-only)
- Current balance due (read-only)
- Payment date (default today)
- Payment amount (default to balance due)
- Payment method dropdown (Check, Wire, Credit Card, ACH, Other)
- Reference number (check #, transaction ID)
- Notes (optional)
- Apply Payment button

**And** Payment processing:
- Payment record created
- Invoice.amount_paid incremented
- Invoice.balance_due decremented
- Invoice.status updated:
  - If balance_due = 0 → status = 'paid'
  - If balance_due > 0 and amount_paid > 0 → status = 'partially_paid'

**And** Overpayment handling:
- Warning if payment amount > balance due
- Option to apply as credit (future feature)
- Or adjust to balance due

**And** Payment history on invoice:
- Table: Date | Amount | Method | Reference | Recorded By
- Running balance after each payment

**And** Audit logging:
- Payment recorded events logged
- Includes who, when, amount, invoice

**Prerequisites:** Story 8.3 (invoice detail view)

**Technical Notes:**
- Implement FR103 (record payments)
- Transaction wrapping for payment + invoice update
- Decimal arithmetic for accuracy

---

### Story 8.5: Build Accounts Receivable Dashboard

**As a** finance user,
**I want** to see AR summary and aging report,
**So that** I can manage cash flow and collections.

**Acceptance Criteria:**

**Given** I am logged in as Finance, Admin, or Owner
**When** I navigate to /reports/accounts-receivable
**Then** I see AR dashboard:

**And** Summary stats cards:
- Total Receivables: $XX,XXX (sum of all balance_due)
- Current (not yet due): $X,XXX
- Overdue: $X,XXX
- Average Days to Pay: XX days
- Number of Open Invoices: XX

**And** Aging report table:
- Customer | Current | 1-30 Days | 31-60 Days | 61-90 Days | 90+ Days | Total
- Sortable by total (highest first default)
- Click customer drills down to their invoices
- Totals row at bottom

**And** Aging chart:
- Stacked bar chart showing aging buckets
- Visual representation of AR health

**And** Customer detail drill-down:
- Shows all invoices for customer
- Payment history
- Average days to pay
- Credit status

**And** Export options:
- CSV export of aging report
- PDF summary report

**Prerequisites:** Story 8.4 (invoices and payments exist)

**Technical Notes:**
- Implement FR102 (track AR balance), FR104 (aging reports)
- Aging calculation: due_date vs today for bucket assignment
- Use Recharts for visualization

---

### Story 8.6: Implement Invoice PDF Generation and Email

**As a** finance user,
**I want** to generate invoice PDFs and email them to customers,
**So that** customers receive professional invoices.

**Acceptance Criteria:**

**Given** I have created an invoice
**When** I click "Send" or "Download PDF"
**Then** professional PDF is generated:

**And** Invoice PDF layout:
- Header: Company logo, name, address
- Invoice title with number and date
- Bill-to and Ship-to addresses
- Line items table (professional formatting)
- Subtotal, Tax, Shipping, Total
- Payment terms and due date
- Notes section
- Footer: Thank you message, payment instructions

**And** PDF generation:
- Uses React-PDF (same as statements)
- Stored in S3 for retrieval
- Linked to invoice record

**And** Email delivery:
- Send button triggers email via Resend
- Email includes:
  - Subject: "Invoice [#] from [Company Name]"
  - Body: Professional template with summary
  - PDF attachment
- Customer email from contact record

**And** Send tracking:
- Invoice.status → 'sent'
- sent_at timestamp recorded
- Email delivery status tracked (via Resend webhooks, future)

**And** Resend option:
- Can resend invoice email
- Tracks resend count

**Prerequisites:** Story 8.3 (invoice detail view)

**Technical Notes:**
- Implement FR105 (PDF generation), FR106 (email delivery)
- Reuse React-PDF patterns from statement generation
- Reuse Resend patterns from statement email

---

## Epic 9: Public Presence

**Epic Goal:** Create public-facing landing page to market Salina ERP

**FRs Covered:** FR107-110 (4 FRs)

**Dependencies:** None (independent of app functionality)

---

### Story 9.1: Build Marketing Landing Page

**As a** potential customer,
**I want** to view a professional landing page for Salina ERP,
**So that** I can understand the product and sign up.

**Acceptance Criteria:**

**Given** I visit the root domain (salina-erp.com or localhost:3000/)
**When** not logged in
**Then** I see the marketing landing page:

**And** Hero section:
- Headline: "Publishing ERP Built for Publishers"
- Subheadline: Value proposition (royalties, ISBN, authors)
- CTA button: "Start Free Trial" or "Get Started"
- Hero image or illustration

**And** Features section:
- 4-6 feature cards highlighting key capabilities:
  - Tiered Royalty Calculations
  - ISBN Pool Management
  - Author Portal
  - Financial Reporting
  - Multi-tenant SaaS
  - Returns Approval Workflow
- Icons and brief descriptions

**And** How It Works section:
- 3-4 step process illustration
- Simple explanation of user journey

**And** Pricing section (if applicable):
- Tier cards (Starter, Professional, Enterprise)
- Feature comparison
- CTA buttons per tier

**And** Social proof section:
- Testimonials (placeholder or real)
- "Trusted by X publishers" (future)

**And** Footer:
- Navigation links
- Contact information
- Legal links (Privacy, Terms)
- Copyright

**And** Responsive design:
- Mobile-first approach
- Works on all device sizes

**And** Navigation:
- Logo (links to home)
- Features, Pricing, Contact links
- Login button (links to /sign-in)
- Get Started button (links to /sign-up or tenant registration)

**And** SEO basics:
- Proper meta tags
- Open Graph tags
- Semantic HTML

**Prerequisites:** None

**Technical Notes:**
- Implement FR107, FR108, FR109, FR110
- Create public route at src/app/(public)/page.tsx
- Use Tailwind for styling
- Consistent with app branding (Editorial Navy theme)
- No authentication required
- Static generation for performance

---

### Story 9.2: Add Contact and Legal Pages

**As a** potential customer,
**I want** to access contact information and legal pages,
**So that** I can reach out with questions and understand terms.

**Acceptance Criteria:**

**Given** I am viewing the public site
**When** I click footer links
**Then** I see additional pages:

**And** Contact page (/contact):
- Contact form: Name, Email, Company, Message
- Form submission (email notification or store in DB)
- Company contact information
- Support email address

**And** Privacy Policy page (/privacy):
- Standard privacy policy content
- Data collection practices
- Cookie usage
- Contact for privacy questions

**And** Terms of Service page (/terms):
- Standard terms of service
- Subscription terms
- Acceptable use policy
- Liability limitations

**And** All pages:
- Consistent header/footer with landing page
- Responsive design
- Back to home navigation

**Prerequisites:** Story 9.1 (landing page)

**Technical Notes:**
- Create pages in src/app/(public)/
- Contact form can use server action
- Legal pages can be static MDX content
- Consider legal review for production

---

## Epic 10: Advanced Royalty Features

**Epic Goal:** Enable complex royalty scenarios including multiple authors per title with split percentages and escalating lifetime royalty rates

**FRs Covered:** FR111-118

**Business Value:** Unlocks the co-authored book market segment (a significant portion of publishing) and provides sophisticated royalty structures that larger publishers require.

---

### Story 10.1: Add Multiple Authors Per Title with Ownership Percentages

**As an** Editor,
**I want** to assign multiple authors to a single title with ownership percentages,
**So that** co-authored books can have royalties split correctly between contributors.

**Acceptance Criteria:**

**Given** I am editing a title
**When** I access the author assignment section
**Then** I can add multiple authors to the title

**And** for each author I specify an ownership percentage (1-100%)

**And** the system validates that all percentages sum to exactly 100%

**And** I can set different ownership percentages for each author (e.g., Author A: 60%, Author B: 40%)

**And** the system prevents saving if percentages don't sum to 100%

**And** existing single-author titles continue to work (default 100% ownership)

**And** I can view all authors assigned to a title with their percentages

**And** I can update ownership percentages after initial assignment

**And** the system maintains history of ownership changes for audit

**Prerequisites:** Epic 7 (Contacts), Epic 4 (Royalty Contracts)

**Technical Notes:**
- Implement FR111, FR118
- Create `title_authors` junction table: title_id, contact_id (author), ownership_percentage, created_at, updated_at
- Update Title detail view with multi-author assignment UI
- Validate ownership percentages sum to 100% (use Decimal.js for precision)
- Support both new titles and editing existing titles
- Consider UX for common splits (50/50, 60/40, etc.) as presets

---

### Story 10.2: Implement Split Royalty Calculation Engine

**As the** royalty calculation system,
**I want** to calculate royalties based on author ownership percentages,
**So that** co-authors receive their fair share of earnings.

**Acceptance Criteria:**

**Given** a title has multiple authors with ownership percentages
**When** royalties are calculated for a period
**Then** the system calculates total royalty for the title first

**And** the system splits the total royalty by each author's ownership percentage

**And** each author's split is applied to their individual royalty calculation

**And** advance recoupment is tracked separately per author

**And** each author's advance is recouped only from their split portion

**And** the calculation handles edge cases:
- One author fully recouped, other still recouping
- Negative periods don't reverse recoupment for either author
- Different advance amounts per author

**And** the calculation detail shows per-author breakdown

**Prerequisites:** Story 10.1

**Technical Notes:**
- Implement FR112
- Extend royalty calculation engine from Epic 4
- Calculate title-level royalty first, then split by ownership
- Handle Decimal precision for splits (avoid rounding errors that don't sum correctly)
- Update contracts to support per-author advances on shared titles
- Test with various split scenarios

---

### Story 10.3: Generate Split Royalty Statements for Co-Authors

**As a** Finance user,
**I want** to generate separate royalty statements for each co-author,
**So that** each author receives their individual earnings statement.

**Acceptance Criteria:**

**Given** a title has multiple authors
**When** I generate royalty statements for a period
**Then** the system generates a separate statement for each author

**And** each statement shows only that author's share of the royalty

**And** each statement shows their individual advance and recoupment status

**And** statements clearly indicate co-authored titles and ownership percentage

**And** the statement displays: "Your share: X% of [Title Name]"

**And** email delivery sends individual statements to each co-author

**And** the author portal shows each author only their own statements

**Prerequisites:** Story 10.2, Epic 5 (Statement Generation)

**Technical Notes:**
- Implement FR113
- Extend statement generation wizard to handle multi-author titles
- PDF template updated to show ownership percentage context
- Ensure author portal RLS only shows author's own split data
- Bulk statement generation iterates through all authors on shared titles

---

### Story 10.4: Implement Escalating Lifetime Royalty Rates

**As an** Editor,
**I want** to configure royalty rates that escalate based on cumulative lifetime sales,
**So that** authors earn higher percentages as their books achieve long-term success.

**Acceptance Criteria:**

**Given** I am creating or editing a royalty contract
**When** I configure tiered rates
**Then** I can choose between "Period Sales" (existing) or "Lifetime Sales" tier calculation

**And** when "Lifetime Sales" is selected, tiers apply based on total historical sales

**And** the system tracks cumulative sales across all periods for lifetime calculation

**And** example: If lifetime tiers are 0-10K @ 10%, 10K-50K @ 12%, 50K+ @ 15%:
- An author who has sold 45K lifetime, selling 10K more this period
- First 5K of period sales apply at 12% (until hitting 50K lifetime)
- Remaining 5K apply at 15% (after crossing 50K lifetime threshold)

**And** the calculation correctly handles tier transitions mid-period

**And** lifetime totals are displayed in contract detail view

**And** royalty statements show lifetime context when applicable

**Prerequisites:** Story 10.2

**Technical Notes:**
- Implement FR114, FR115, FR116, FR117
- Add `tier_calculation_mode` to contracts: 'period' | 'lifetime'
- Create `author_lifetime_sales` tracking table or computed from historical data
- Extend calculation engine to support lifetime tier lookups
- Handle complexity of split royalties + lifetime tiers together
- Consider performance for lifetime calculations (may need pre-computed totals)

---

## Epic 11: Tax & Compliance

**Epic Goal:** Generate IRS 1099-MISC forms for authors earning $10+ in royalties annually, ensuring regulatory compliance for US-based publishers (Note: $10 is the IRS threshold for royalties in Box 2, different from $600 for non-employee compensation)

**FRs Covered:** FR119-124

**Business Value:** Legal requirement for US publishers - automating 1099 generation saves significant time and reduces compliance risk.

---

### Story 11.1: Collect and Validate Tax Identification Information

**As an** Editor,
**I want** to collect and validate author tax identification numbers,
**So that** we have accurate information for 1099 reporting.

**Acceptance Criteria:**

**Given** I am editing a contact with Author role
**When** I access the tax information section
**Then** I can enter a Tax Identification Number (TIN)

**And** I can specify TIN type: SSN (individual) or EIN (business entity)

**And** the system validates TIN format:
- SSN: XXX-XX-XXXX pattern
- EIN: XX-XXXXXXX pattern

**And** TIN is stored encrypted at rest

**And** TIN display is masked except last 4 digits (***-**-1234)

**And** I can indicate if author is US-based (required for 1099)

**And** I can indicate if author has submitted W-9 form

**And** the system flags authors missing TIN when they have US earnings

**And** audit log captures TIN additions/changes (without logging actual TIN)

**Prerequisites:** Epic 7 (Contacts)

**Technical Notes:**
- Implement FR119
- Add to contacts table: tin_encrypted, tin_type, tin_last_four, is_us_based, w9_received, w9_received_date
- Use encryption for TIN storage (consider Clerk encryption or separate secrets management)
- Create TIN validation utilities
- Update contact form with tax information section (Finance/Admin only)

---

### Story 11.2: Track Annual Earnings for 1099 Threshold

**As the** system,
**I want** to track annual earnings per author for 1099 threshold determination,
**So that** we know which authors require 1099 forms.

**Acceptance Criteria:**

**Given** royalty statements are generated throughout the year
**When** I view the 1099 preparation report
**Then** the system shows all authors with their annual earnings

**And** earnings are calculated from all paid royalty statements in the calendar year

**And** authors earning $10+ in royalties are flagged as requiring 1099

**And** the report shows:
- Author name
- TIN status (provided/missing)
- Annual earnings
- 1099 required (Yes/No)
- W-9 status

**And** I can filter to show only authors requiring 1099

**And** I can filter by TIN status to identify missing information

**And** the system warns about authors over $600 with missing TIN

**Prerequisites:** Story 11.1, Epic 5 (Statements)

**Technical Notes:**
- Implement FR120
- Create 1099 preparation report/dashboard
- Query paid statements by calendar year
- Sum royalties per author
- $10 threshold is IRS requirement for 1099-MISC royalties (Box 2)
- Consider that some authors may have multiple payment types

---

### Story 11.3: Generate 1099-MISC Forms

**As a** Finance user,
**I want** to generate 1099-MISC forms for qualifying authors,
**So that** I can fulfill IRS reporting requirements.

**Acceptance Criteria:**

**Given** the tax year has ended
**When** I access the 1099 generation feature
**Then** I can select the tax year to generate forms for

**And** the system shows list of authors requiring 1099 (earnings >= $10 in royalties)

**And** I can generate individual 1099 PDFs

**And** I can generate all 1099s in batch (bulk download as ZIP)

**And** the generated 1099-MISC includes:
- Box 1: Payer information (publisher/tenant)
- Box 2: Recipient information (author)
- Box 3: Recipient TIN
- Box 7: Nonemployee compensation (royalty amount)
- Tax year

**And** the form follows official IRS 1099-MISC format

**And** the system records when each 1099 was generated

**And** I can regenerate a 1099 if corrections are needed

**And** the system prevents generation for authors with missing TIN (with override option)

**Prerequisites:** Story 11.2

**Technical Notes:**
- Implement FR121, FR122, FR123, FR124
- Create 1099-MISC PDF template following IRS specifications
- Use similar PDF generation infrastructure from statements (Epic 5)
- Store generated 1099s for audit trail
- Consider Copy B (recipient) vs Copy A (IRS) formats
- May need tenant's EIN for payer information (add to tenant settings)

---

## Epic 13: Platform Administration

**Epic Goal:** Provide SaaS operator tools to manage tenants, monitor platform health, and support customers effectively

**FRs Covered:** FR125-134

**Business Value:** Essential for operating a multi-tenant SaaS business - enables customer support, abuse prevention, and business metrics tracking.

---

### Story 13.1: Implement Platform Administrator Authentication

**As a** platform administrator,
**I want** to authenticate separately from tenant users,
**So that** platform admin access is secure and distinct from customer access.

**Acceptance Criteria:**

**Given** I am a designated platform administrator
**When** I access the platform admin area
**Then** I authenticate using platform admin credentials

**And** platform admin authentication is separate from tenant Clerk auth

**And** platform admins are defined by email whitelist in environment configuration

**And** platform admin sessions are separate from tenant user sessions

**And** the platform admin area is accessible at /platform-admin route

**And** non-platform-admins receive 403 Forbidden on platform admin routes

**And** platform admin authentication events are logged

**Prerequisites:** Epic 1 (Foundation)

**Technical Notes:**
- Implement FR134
- Create platform admin middleware checking against PLATFORM_ADMIN_EMAILS env var
- Can use Clerk metadata or separate auth mechanism
- /platform-admin route group with dedicated layout
- Consider 2FA requirement for platform admins
- All platform admin routes protected by this middleware

---

### Story 13.2: Build Tenant List and Search Interface

**As a** platform administrator,
**I want** to view and search all tenants on the platform,
**So that** I can manage and support customers effectively.

**Acceptance Criteria:**

**Given** I am authenticated as platform admin
**When** I access the tenant management page
**Then** I see a list of all tenants on the platform

**And** the list shows: tenant name, subdomain, status, created date, user count

**And** I can search tenants by name or subdomain

**And** I can filter by status (active, suspended)

**And** I can sort by name, created date, or user count

**And** the list is paginated for performance

**And** I can click a tenant to view detailed information

**Prerequisites:** Story 13.1

**Technical Notes:**
- Implement FR125
- Create platform admin queries that bypass tenant RLS
- Tenant list page at /platform-admin/tenants
- Server-side pagination and filtering
- Display aggregate metrics (user count requires cross-tenant query)

---

### Story 13.3: Build Tenant Detail View

**As a** platform administrator,
**I want** to view detailed information about a specific tenant,
**So that** I can understand their usage and support them effectively.

**Acceptance Criteria:**

**Given** I am viewing a tenant in platform admin
**When** I access the tenant detail page
**Then** I see comprehensive tenant information:

**And** Basic info: name, subdomain, created date, status

**And** Configuration: timezone, fiscal year, statement frequency

**And** Users: list of all users with roles, last login, status

**And** Usage metrics:
- Total authors/contacts
- Total titles
- Total sales transactions
- Total royalty statements generated

**And** Activity: recent activity log for the tenant

**And** I can see when the tenant was last active

**Prerequisites:** Story 13.2

**Technical Notes:**
- Implement FR126
- Tenant detail page at /platform-admin/tenants/[id]
- Cross-tenant queries for usage metrics
- Consider caching for expensive metrics calculations
- Activity data from existing audit logs filtered by tenant

---

### Story 13.4: Implement Tenant Suspension and Reactivation

**As a** platform administrator,
**I want** to suspend and reactivate tenant access,
**So that** I can handle non-payment, abuse, or customer requests.

**Acceptance Criteria:**

**Given** I am viewing a tenant in platform admin
**When** I click "Suspend Tenant"
**Then** I must provide a suspension reason

**And** the tenant status changes to "suspended"

**And** all users of that tenant are immediately blocked from accessing the application

**And** suspended tenant users see a "Account Suspended" message when trying to log in

**And** the suspension is logged with timestamp and admin who performed it

**And** I can reactivate a suspended tenant

**And** reactivation restores normal access for all tenant users

**And** reactivation is logged with timestamp and admin

**And** suspension/reactivation events trigger notification to tenant owner (email)

**Prerequisites:** Story 13.3

**Technical Notes:**
- Implement FR127, FR128, FR130
- Add `status` and `suspended_at`, `suspended_reason` to tenants table
- Middleware checks tenant status before allowing access
- Suspended tenants redirect to suspension notice page
- Email notification to tenant owner on status change
- Cannot suspend your own platform admin tenant (safety check)

---

### Story 13.5: Build Platform Analytics Dashboard

**As a** platform administrator,
**I want** to view platform-wide analytics and metrics,
**So that** I can understand business health and growth.

**Acceptance Criteria:**

**Given** I am authenticated as platform admin
**When** I access the platform dashboard
**Then** I see key platform metrics:

**And** Tenant metrics:
- Total tenants
- Active tenants (logged in last 30 days)
- New tenants this month
- Tenant growth trend chart

**And** User metrics:
- Total users across all tenants
- Active users (last 30 days)
- Users by role distribution

**And** Usage metrics:
- Total titles across platform
- Total sales transactions this month
- Total royalty statements generated this month

**And** System health:
- Database connection status
- Background job queue status (Inngest)
- Recent error count

**And** the dashboard updates in near real-time (refreshes on page load)

**Prerequisites:** Story 13.1

**Technical Notes:**
- Implement FR131, FR133
- Platform admin dashboard at /platform-admin
- Aggregate queries across all tenants
- Consider caching for expensive queries (Redis or in-memory)
- Inngest job monitoring via Inngest dashboard link or API
- Error tracking integration if Sentry is set up

---

### Story 13.6: Implement Tenant Impersonation for Support

**As a** platform administrator,
**I want** to impersonate a tenant user for support purposes,
**So that** I can see exactly what customers see and debug issues.

**Acceptance Criteria:**

**Given** I am viewing a tenant's user list in platform admin
**When** I click "Impersonate" on a user
**Then** I am logged in as that user and see their view

**And** a clear banner indicates I am in impersonation mode

**And** I can click "End Impersonation" to return to platform admin

**And** all actions taken while impersonating are logged with my platform admin identity

**And** impersonation events are logged: who impersonated whom, when, duration

**And** impersonated users are notified that an admin accessed their account (optional)

**And** impersonation requires confirmation dialog with reason field

**And** I can only impersonate users, not perform destructive actions while impersonating

**Prerequisites:** Story 13.3

**Technical Notes:**
- Implement FR129, FR130
- Create impersonation session mechanism (store original admin identity)
- Banner component showing impersonation status
- Audit log all actions with `impersonated_by` field
- Consider limiting impersonation duration (auto-expire after X minutes)
- Privacy consideration: document impersonation policy

---

### Story 13.7: Build System Health and Job Monitoring

**As a** platform administrator,
**I want** to monitor system health and background job status,
**So that** I can ensure the platform is operating correctly.

**Acceptance Criteria:**

**Given** I am authenticated as platform admin
**When** I access the system monitoring page
**Then** I see current system status:

**And** Database status:
- Connection pool health
- Recent slow queries (if available)
- Database size

**And** Background jobs (Inngest):
- Queue depth
- Recent job failures with errors
- Job success rate
- Link to Inngest dashboard

**And** Application health:
- Memory usage (if available)
- Recent application errors
- API response times (if tracked)

**And** Email delivery status:
- Recent sends
- Delivery failures
- Resend dashboard link

**And** I can acknowledge/dismiss alerts

**Prerequisites:** Story 13.5

**Technical Notes:**
- Implement FR133
- System monitoring page at /platform-admin/system
- Integrate with Inngest API for job monitoring
- Consider health check endpoints
- Error aggregation from logging service
- This builds on Story 6.6 (background job monitoring) but at platform level

---

### Story 13.8: Implement Platform-Wide Announcements

**As a** platform administrator,
**I want** to broadcast announcements to all tenants,
**So that** I can communicate maintenance, updates, or important information.

**Acceptance Criteria:**

**Given** I am authenticated as platform admin
**When** I create a platform announcement
**Then** I can specify:
- Announcement message (supports markdown)
- Announcement type: info, warning, critical
- Start date/time
- End date/time (optional, for temporary announcements)
- Target: all users or specific roles

**And** active announcements display in a banner on all tenant dashboards

**And** users can dismiss informational announcements (stored in localStorage)

**And** critical announcements cannot be dismissed

**And** I can view all current and past announcements

**And** I can edit or deactivate announcements

**And** announcements are ordered by type (critical first) then date

**Prerequisites:** Story 13.1

**Technical Notes:**
- Implement FR132
- Create `platform_announcements` table (outside tenant context)
- Announcement management UI at /platform-admin/announcements
- Global banner component checking for active announcements
- Use localStorage to track dismissed announcements per user
- Consider announcement targeting (e.g., only Finance users see finance-related announcements)

---

## FR Coverage Matrix (Complete)

| FR | Requirement | Epic | Story |
|---|---|---|---|
| FR1 | Register tenant with subdomain | 1 | 1.4 |
| FR2 | Validate subdomain availability | 1 | 1.4 |
| FR3 | Invite users via email | 1 | 1.6 |
| FR4 | Assign user roles | 1 | 1.5, 1.6 |
| FR5 | User authentication | 1 | 1.3 |
| FR6 | Deactivate users | 1 | 1.6 |
| FR7 | Row-Level Security enforcement | 1 | 1.2, 1.3 |
| FR8 | Configure tenant settings | 1 | 1.7 |
| FR9 | Create author profiles | 2 | 2.2 |
| FR10 | Record author tax IDs | 2 | 2.2 |
| FR11 | Update author information | 2 | 2.2 |
| FR12 | Author portal login | 2 | 2.3 |
| FR13 | Author audit trail | 2 | 2.1 |
| FR14 | Create title records | 2 | 2.5 |
| FR15 | Track multiple formats | 2 | 2.4, 2.5 |
| FR16 | Import ISBN blocks | 2 | 2.7 |
| FR17 | Track ISBN pool status | 2 | 2.6, 2.8 |
| FR18 | Assign ISBNs to titles | 2 | 2.9 |
| FR19 | Prevent duplicate ISBN assignment | 2 | 2.6, 2.9 |
| FR20 | Separate ISBNs for physical/ebook | 2 | 2.4, 2.9 |
| FR21 | Validate ISBN-13 format | 2 | 2.7 |
| FR22 | Update title metadata | 2 | 2.5 |
| FR23 | Display ISBN availability | 2 | 2.8 |
| FR24 | Record sales transactions | 3 | 3.2 |
| FR25 | Specify sale details | 3 | 3.2 |
| FR26 | Support sales channels | 3 | 3.1, 3.2 |
| FR27 | View transaction history | 3 | 3.3 |
| FR28 | Record transaction metadata | 3 | 3.1 |
| FR29 | Prevent transaction modification | 3 | 3.1 |
| FR30 | Record return transactions | 3 | 3.5 |
| FR31 | Return reason and reference | 3 | 3.5 |
| FR32 | Pending return status | 3 | 3.4, 3.5 |
| FR33 | View pending returns queue | 3 | 3.6 |
| FR34 | Approve/reject returns | 3 | 3.6 |
| FR35 | Track return approver | 3 | 3.4, 3.6 |
| FR36 | Only approved returns affect royalties | 3 | 3.4, 3.6 |
| FR37 | Rejected returns excluded | 3 | 3.6, 3.7 |
| FR38 | Create royalty contracts | 4 | 4.2 |
| FR39 | Configure tiered royalty rates | 4 | 4.2 |
| FR40 | Support multiple tiers per format | 4 | 4.1, 4.2 |
| FR41 | Record advance payments | 4 | 4.2, 4.3 |
| FR42 | Track advance recoupment | 4 | 4.1, 4.3, 4.4 |
| FR43 | Update contract status | 4 | 4.2, 4.3 |
| FR44 | Maintain contract history | 4 | 4.1, 4.3 |
| FR45 | Trigger royalty calculations | 4 | 4.4, 4.5 |
| FR46 | Calculate net sales | 4 | 4.4 |
| FR47 | Apply tiered royalty rates | 4 | 4.4 |
| FR48 | Calculate advance recoupment | 4 | 4.4 |
| FR49 | Calculate net payable | 4 | 4.4 |
| FR50 | Handle negative periods | 4 | 4.4 |
| FR51 | Support multiple formats | 4 | 4.4 |
| FR52 | Produce calculation breakdown | 4 | 4.4 |
| FR53 | Generate PDF statements | 5 | 5.2, 5.3 |
| FR54 | Sales breakdown in statements | 5 | 5.2 |
| FR55 | Tiered royalty details in statements | 5 | 5.2 |
| FR56 | Advance tracking in statements | 5 | 5.2 |
| FR57 | Net payable in statements | 5 | 5.2 |
| FR58 | Email statements to authors | 5 | 5.3, 5.4 |
| FR59 | Store statements for retrieval | 5 | 5.1, 5.5 |
| FR60 | Record statement generation metadata | 5 | 5.1, 5.5 |
| FR61 | Author portal login | 5 | 5.6 |
| FR62 | Authors view statement list | 5 | 5.6 |
| FR63 | Authors download PDF | 5 | 5.6 |
| FR64 | Authors view own sales history | 5 | 5.6 |
| FR65 | Authors cannot access others' data | 5 | 5.6 |
| FR66 | Author-specific RLS enforcement | 5 | 5.1, 5.6 |
| FR67 | Track total revenue | 6 | 6.1 |
| FR68 | Calculate royalty liability | 6 | 6.1 |
| FR69 | View liability by author | 6 | 6.1, 6.4 |
| FR70 | Generate financial reports | 6 | 6.1, 6.2, 6.4 |
| FR71 | Maintain audit trail | 6 | 6.5 |
| FR72 | Generate sales reports | 6 | 6.2 |
| FR73 | ISBN pool status report | 6 | 6.3 |
| FR74 | Royalty liability summary | 6 | 6.4 |
| FR75 | Export reports to CSV | 6 | 6.2, 6.4 |
| FR76 | Role-based dashboard views | 1, 6 | 1.8, 6.7 |
| FR77 | Monitor tenant usage | 6 | 6.6 |
| FR78 | Enforce role-based permissions | 1 | 1.5 |
| FR79 | Log data modifications | 6 | 6.5 |
| FR80 | Tenant configuration management | 1 | 1.7 |
| FR81 | Handle background jobs | 5, 6 | 5.2, 5.3, 6.6 |
| FR82 | Unified contact database with multi-role | 7 | 7.1 |
| FR83 | Assign multiple roles to contact | 7 | 7.1, 7.2 |
| FR84 | Migrate authors to contacts | 7 | 7.3 |
| FR85 | Role-specific contact profiles | 7 | 7.2 |
| FR86 | Author portal via contact role | 7 | 7.2, 7.3 |
| FR87 | Customer invoicing via contact role | 7 | 7.2 |
| FR88 | Register publisher ISBN prefixes | 7 | 7.4 |
| FR89 | Auto-generate ISBN range from prefix | 7 | 7.4 |
| FR90 | Organize ISBN pool by prefix | 7 | 7.4 |
| FR91 | View ISBN pool by prefix and block | 7 | 7.4 |
| FR92 | Validate ISBN prefix format | 7 | 7.4 |
| FR93 | Configure royalty period | 7 | 7.5 |
| FR94 | Support multiple period types | 7 | 7.5 |
| FR95 | Royalty calculation uses period setting | 7 | 7.5 |
| FR96 | Create invoices with addresses | 8 | 8.1, 8.2 |
| FR97 | Invoice line items | 8 | 8.1, 8.2 |
| FR98 | Calculate invoice totals | 8 | 8.2 |
| FR99 | Payment terms on invoices | 8 | 8.1, 8.2 |
| FR100 | P.O. and shipping on invoices | 8 | 8.1, 8.2 |
| FR101 | Link invoices to customers | 8 | 8.1, 8.3 |
| FR102 | Track AR balance per customer | 8 | 8.5 |
| FR103 | Record payments against invoices | 8 | 8.4 |
| FR104 | AR aging reports | 8 | 8.5 |
| FR105 | Generate invoice PDFs | 8 | 8.6 |
| FR106 | Email invoices to customers | 8 | 8.6 |
| FR107 | Public landing page | 9 | 9.1 |
| FR108 | Landing page features display | 9 | 9.1 |
| FR109 | Landing page CTA | 9 | 9.1 |
| FR110 | Landing page branding | 9 | 9.1, 9.2 |
| FR111 | Multiple authors per title | 10 | 10.1 |
| FR112 | Split royalty calculation | 10 | 10.2 |
| FR113 | Separate co-author statements | 10 | 10.3 |
| FR114 | Escalating lifetime royalty rates | 10 | 10.4 |
| FR115 | Track lifetime sales | 10 | 10.4 |
| FR116 | Apply lifetime-based tiers | 10 | 10.4 |
| FR117 | View royalty projection | 10 | 10.4 |
| FR118 | Co-author relationship history | 10 | 10.1 |
| FR119 | Collect and validate TIN | 11 | 11.1 |
| FR120 | Track annual earnings for 1099 | 11 | 11.2 |
| FR121 | Generate 1099-MISC forms | 11 | 11.3 |
| FR122 | Batch 1099 generation | 11 | 11.3 |
| FR123 | Download 1099 PDFs | 11 | 11.3 |
| FR124 | 1099 generation audit trail | 11 | 11.3 |
| FR125 | View all tenants | 13 | 13.2 |
| FR126 | View tenant details | 13 | 13.3 |
| FR127 | Suspend tenant access | 13 | 13.4 |
| FR128 | Reactivate suspended tenants | 13 | 13.4 |
| FR129 | Impersonate tenant users | 13 | 13.6 |
| FR130 | Log platform admin actions | 13 | 13.4, 13.6 |
| FR131 | Platform-wide analytics | 13 | 13.5 |
| FR132 | Broadcast announcements | 13 | 13.8 |
| FR133 | System health monitoring | 13 | 13.5, 13.7 |
| FR134 | Platform admin authentication | 13 | 13.1 |

**Validation:** ✅ All 134 FRs mapped to specific stories across all 12 epics

---

## Summary

**✅ Epic Breakdown Complete (Updated 2025-12-07)**

**Total Epics:** 12
**Total Stories:** 73
**Total FRs Covered:** 134

### Epic Summary

| Epic | Title | Stories | FRs | Key Value | Status |
|------|-------|---------|-----|-----------|--------|
| 1 | Foundation & Multi-Tenant Infrastructure | 8 | FR1-8 | Secure platform foundation with tenant registration and user management | ✅ COMPLETE |
| 2 | Author & Title Catalog Management | 9 | FR9-23 | Complete catalog management with ISBN tracking | ✅ COMPLETE |
| 3 | Sales & Returns Processing | 7 | FR24-37 | Daily operational tracking with approval workflow | ✅ COMPLETE |
| 4 | Royalty Contracts & Calculation Engine | 5 | FR38-52 | Complex tiered royalty automation | ✅ COMPLETE |
| 5 | Royalty Statements & Author Portal | 6 | FR53-66 | Transparent statement generation and author self-service | ✅ COMPLETE |
| 6 | Financial Reporting & Analytics | 7 | FR67-81 | Comprehensive financial visibility and compliance | ✅ COMPLETE |
| 7 | Contact & ISBN Foundation | 6 | FR82-95 | Unified contacts with multi-role, enhanced ISBN with prefix system | ✅ COMPLETE |
| 8 | Invoicing & Accounts Receivable | 6 | FR96-106 | Full invoicing, AR tracking, aging reports | ✅ COMPLETE |
| 9 | Public Presence | 2 | FR107-110 | Marketing landing page and legal pages | ✅ COMPLETE |
| 10 | Advanced Royalty Features | 4 | FR111-118 | Split royalties for co-authors, lifetime escalating rates | 🆕 PHASE 2 |
| 11 | Tax & Compliance | 3 | FR119-124 | 1099-MISC generation for IRS compliance | 🆕 PHASE 2 |
| 13 | Platform Administration | 8 | FR125-134 | SaaS operator tools for tenant management and monitoring | 🆕 PHASE 2 |

### Implementation Status

**MVP (Epics 1-6):** ✅ COMPLETE - All 81 FRs implemented
**Growth Phase 1 (Epics 7-9):** ✅ COMPLETE - 29 FRs implemented
**Growth Phase 2 (Epics 10, 11, 13):** 🆕 Ready for implementation - 24 FRs, 15 stories

### Implementation Readiness

**✅ Complete Coverage:** All 134 FRs from PRD mapped to implementable stories
**✅ Full Context Integration:** Every story incorporates PRD + UX patterns + Architecture decisions
**✅ Detailed Acceptance Criteria:** BDD-style criteria with specific UX/technical requirements
**✅ Sequential Dependencies:** No forward dependencies, clear prerequisite chains
**✅ User Value Focus:** Each epic delivers tangible user value

### Next Steps

1. **Sprint Planning**: Run `*sprint-planning` to update sprint-status.yaml with Phase 2 epics
2. **Story Drafting**: SM to create detailed story files starting with Story 10.1
3. **Implementation Order**: Recommended sequence: Epic 10 → Epic 11 → Epic 13
4. **Architecture Review**: Winston to review multi-author schema and platform admin patterns

**Document Location:** `/Users/elockard/office/salina-erp-bmad2/docs/epics.md`
**Last Updated:** 2025-12-07

---

