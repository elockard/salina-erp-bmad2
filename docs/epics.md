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
- FR20: Editors can assign separate ISBNs for physical books and ebooks (eISBN)
- FR21: System validates ISBN-13 format before accepting
- FR22: Editors can update title metadata and publication status
- FR23: System displays ISBN pool availability count by type (physical/ebook)

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
| **Total** | | **FR1-81** | **81 FRs** |

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
- id, tenant_id, title, subtitle, genre, word_count, publication_status, isbn (physical), eisbn (ebook), publication_date, created_at, updated_at

**And** Publication status enum: draft, pending, published, out-of-print

**And** Unique constraints on isbn and eisbn (globally unique across all tenants)

**And** RLS policy enabled for tenant isolation

**And** Indexes created on: tenant_id, publication_status, isbn, eisbn

**And** Supports tracking 3 formats per architecture:
- Physical (uses isbn field)
- Ebook (uses eisbn field)
- Audiobook (future: separate ISBN field or format tracking table)

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
  - Ebook: eISBN or "Not assigned" + Assign ISBN button
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
- Physical ISBNs: X available / Y total
- Ebook ISBNs: X available / Y total
- Progress bars showing utilization
- Warning badge if available < 10 for either type

**And** Full /isbn-pool page displays:
- Stats cards:
  - Physical: Available / Assigned / Retired counts
  - Ebook: Available / Assigned / Retired counts
- Table of all ISBNs with columns:
  - ISBN-13 (monospace font)
  - Type badge (Physical/Ebook)
  - Status badge (Available/Assigned/Registered/Retired)
  - Assigned To (title link, if assigned)
  - Assigned Date
  - Actions (View Details)

**And** Filters:
- Type (All / Physical / Ebook)
- Status (All / Available / Assigned / Retired)
- Search ISBN (partial match)

**And** Table pagination (20 per page)

**And** Click ISBN row shows detail modal:
- Full ISBN
- Type, Status
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
- Available count: "42 Physical ISBNs available"
- Primary button: "Assign This ISBN"
- Secondary link: "Choose Different ISBN"

**And** Clicking "Assign This ISBN" (fast path):
- Server Action uses transaction with row-level locking per architecture.md Pattern 3
- SELECT ... FOR UPDATE ensures no concurrent assignment
- Updates ISBN status to "assigned"
- Updates ISBN assigned_to_title_id, assigned_at, assigned_by_user_id
- Updates title.isbn or title.eisbn field
- Success toast: "✓ ISBN 978-1-234567-90-7 assigned to [Title]"
- Title detail refreshes showing assigned ISBN

**And** Clicking "Choose Different ISBN":
- Shows browsable list of available ISBNs (filtered by type)
- User can select specific ISBN
- Same assignment flow as fast path

**And** Error handling:
- No ISBNs available: "⚠️ No Physical ISBNs available. Import ISBN block first."
- Race condition (ISBN assigned concurrently): "This ISBN was just assigned. Please try again." → auto-loads next available
- Already assigned: "This title already has a Physical ISBN assigned."

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
  - Physical ISBNs: X Available / Y Assigned / Z Total
  - Ebook ISBNs: X Available / Y Assigned / Z Total
  - Utilization: X% (percent assigned)
- Charts:
  - Pie chart: Available vs Assigned by type
  - Timeline: ISBN assignments over time
- Warning alerts:
  - "⚠️ Only 8 Physical ISBNs remaining - consider importing more"
  - Alert threshold: < 10 available

**And** Detailed breakdown table:
- Import Date | Type | Count Imported | Currently Available | Currently Assigned
- Grouped by import batch
- Shows "burn rate" (ISBNs assigned per month)

**And** Actionable insights:
- "At current rate, Physical ISBNs will run out in approximately 3 months"
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

**Validation:** ✅ All 81 FRs mapped to specific stories across all 6 epics

---

## Summary

**✅ Epic Breakdown Complete**

**Total Epics:** 6
**Total Stories:** 45
**Total FRs Covered:** 81

### Epic Summary

| Epic | Title | Stories | FRs | Key Value |
|------|-------|---------|-----|-----------|
| 1 | Foundation & Multi-Tenant Infrastructure | 8 | FR1-8 | Secure platform foundation with tenant registration and user management |
| 2 | Author & Title Catalog Management | 9 | FR9-23 | Complete catalog management with ISBN tracking |
| 3 | Sales & Returns Processing | 7 | FR24-37 | Daily operational tracking with approval workflow |
| 4 | Royalty Contracts & Calculation Engine | 5 | FR38-52 | Complex tiered royalty automation |
| 5 | Royalty Statements & Author Portal | 6 | FR53-66 | Transparent statement generation and author self-service |
| 6 | Financial Reporting & Analytics | 7 | FR67-81 | Comprehensive financial visibility and compliance |

### Implementation Readiness

**✅ Complete Coverage:** All 81 FRs from PRD mapped to implementable stories
**✅ Full Context Integration:** Every story incorporates PRD + UX patterns + Architecture decisions
**✅ Detailed Acceptance Criteria:** BDD-style criteria with specific UX/technical requirements
**✅ Sequential Dependencies:** No forward dependencies, clear prerequisite chains
**✅ User Value Focus:** Each epic delivers tangible user value

### Next Steps

1. **Sprint Planning**: Use this epic breakdown to create sprint backlogs
2. **Story Refinement**: Development team reviews stories for estimation
3. **Implementation**: Begin with Epic 1, Story 1.1 (project initialization)
4. **Validation**: Run architecture validation workflow before Phase 4 implementation

**Document Location:** `/Users/elockard/office/salina-erp-bmad2/docs/epics.md`

---

