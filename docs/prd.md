# Salina ERP - Product Requirements Document

**Author:** BMad
**Date:** 2025-11-21
**Version:** 1.0

---

## Executive Summary

Salina Bookshelf ERP is a specialized Enterprise Resource Planning system designed specifically for the publishing industry. It addresses the unique operational needs of publishing companies by providing integrated management of authors, manuscripts, ISBN assignment, inventory, sales tracking, and complex royalty calculations with advance recoupment.

The system consolidates workflows that publishers currently manage through disconnected tools (spreadsheets, generic accounting software, manual processes) into a unified, multi-tenant SaaS platform optimized for publishing operations.

### What Makes This Special

**Publishing-First Design:** Unlike generic ERP systems that require extensive customization, Salina is purpose-built for publishing workflows including:
- **Tiered royalty calculations** with advance tracking and recoupment
- **ISBN pool management** with 100-block import capabilities
- **Returns approval workflow** that correctly impacts royalty calculations
- **Multi-format support** (physical books, ebooks, audiobooks) with format-specific royalty rates
- **Author portal** for self-service statement access

This is an ERP that understands publishing, not a generic system forced to fit publishing needs.

---

## Project Classification

**Technical Type:** SaaS B2B
**Domain:** Publishing Industry (General complexity)
**Complexity:** Medium

**Classification Rationale:**

This is a **SaaS B2B platform** serving publishing companies with the following characteristics:
- Multi-tenant architecture (each publishing company is a tenant)
- Subscription-based business model
- Role-based access control for different user types within each publisher
- Publishing industry-specific workflows and data models

**Domain Complexity: Medium**
- Publishing is a specialized vertical but not a highly-regulated domain like healthcare or fintech
- No FDA/medical device approval, no HIPAA, no PCI-DSS requirements
- Primary compliance needs: Standard business financials, tax reporting (1099s for author royalties), ISBN registration
- Core complexity comes from business logic (tiered royalties, advance recoupment) rather than regulatory compliance

### Domain Context

Based on comprehensive domain research conducted 2025-11-21, the following architectural and technical patterns inform this PRD:

**Architecture Pattern:** Modular monolith with clear module boundaries (titles, authors, sales, royalties, finance)
**Multi-Tenancy Pattern:** Shared tables with tenant_id + Row-Level Security (RLS) for data isolation
**Technology Stack:** Next.js 16, Neon PostgreSQL, Drizzle ORM, Clerk auth, Docker, Fly.io deployment

---

## Success Criteria

**Primary Success Indicators:**

1. **Operational Efficiency**: Publishing companies reduce time spent on royalty calculations from days to hours, eliminating spreadsheet errors and manual reconciliation
2. **Author Satisfaction**: Authors receive accurate, timely royalty statements (quarterly/annually) with full transparency into sales and calculations
3. **Financial Accuracy**: Zero royalty calculation errors, accurate advance recoupment tracking, correct handling of approved returns
4. **Process Consolidation**: Single system replaces 3-5 disconnected tools (spreadsheets, QuickBooks, manual ISBN tracking, email-based author communication)
5. **Data Integrity**: Complete audit trail of all transactions, ISBN assignments, and royalty calculations for compliance and dispute resolution

**What Success Looks Like in Practice:**

- Finance team closes quarterly royalty statements in < 2 hours instead of 2-3 days
- Authors can access their statements on-demand through portal, reducing support inquiries
- ISBN pool management prevents duplicate assignments and tracks availability in real-time
- Returns approval workflow ensures only validated returns impact royalty calculations
- Multi-format sales (physical, ebook, audiobook) are tracked with format-specific royalty rates automatically applied

### Business Metrics

**Adoption Metrics:**
- Active publishing companies using the platform (tenants)
- Average titles managed per publisher
- Monthly active users (MAU) across all user roles

**Usage Metrics:**
- Royalty statements generated per quarter
- Sales transactions recorded per month
- ISBNs assigned per month
- Return approvals processed

**Value Metrics:**
- Time saved on royalty processing (hours per statement)
- Reduction in royalty calculation disputes
- Author portal self-service rate (% of authors accessing statements without contacting support)

---

## Product Scope

### MVP - Minimum Viable Product

**Core capabilities required for a publishing company to adopt and use Salina ERP:**

**Multi-Tenant Infrastructure:**
- Tenant registration with subdomain (e.g., acmepublishing.salina-erp.com)
- User authentication via Clerk with role-based access control (Owner, Admin, Editor, Finance, Author)
- Row-Level Security (RLS) for complete tenant data isolation
- Basic dashboard for each user role

**Author & Title Management:**
- Author profile management (name, contact, tax ID for 1099 reporting)
- Title creation with metadata (title, genre, word count, publication status)
- ISBN pool management: Import 100-block ISBN batches via CSV
- ISBN assignment workflow: Assign available ISBNs to titles (physical + ebook)
- Multi-format support: Track physical books, ebooks, and audiobooks

**Sales & Returns:**
- Real-time individual transaction recording (not batch imports)
- Sales entry: Title, format, quantity, unit price, sale date, channel (retail/wholesale/direct/distributor)
- Return request entry with approval workflow (pending → approved/rejected)
- Only approved returns affect royalty calculations
- Transaction history view with filtering

**Royalty Contracts & Calculations:**
- Royalty contract creation: Link author to title with contract terms
- Tiered royalty rate configuration: Multiple tiers by format and volume (e.g., 0-5K @ 10%, 5K-10K @ 12%, 10K+ @ 15%)
- Advance payment tracking: Record advance amount, paid amount, recoupment status
- Quarterly/annual royalty calculation engine: Calculate net sales (sales - approved returns), apply tiered rates, recoup advances
- Royalty statement generation: PDF statements with sales breakdown, royalty calculations, advance recoupment

**Author Portal:**
- Authors can log in and view their royalty statements
- Download PDF statements
- View sales history for their titles

**Financial Integration (Basic):**
- Track revenue from sales
- Track royalty expenses (amounts owed to authors)
- Basic reporting: Sales by format, sales by title, royalty liability

### Growth Features - Phase 1 (Epics 7-9)

*Identified during Story 0.4 Retrospective (2025-12-05) - Prioritized for immediate implementation*

**Unified Contact Database (Epic 7):**
- Refactor Authors entity to unified Contacts table with multi-role support
- Contact can have multiple roles: Author, Customer, Vendor, Distributor
- Migration strategy for existing author data to contacts
- Contact profile management with role-specific fields
- Role-based access: Authors see author portal, Customers see invoices, etc.

**Enhanced ISBN Management (Epic 7):**
- Publisher prefix system: Enter prefix → auto-generate full ISBN range
- Support multiple block sizes: 10, 100, 1,000, 10,000, 100,000, 1,000,000
- ISBN pool visualization by prefix and block
- Prefix validation against ISBN agency standards

**Royalty Period Configuration (Epic 7):**
- Customizable royalty calculation period independent of fiscal year
- Tenant setting for annual royalty period start/end dates
- Support for calendar year, fiscal year, or custom period
- Period selection in royalty calculation workflow

**Invoicing & Accounts Receivable (Epic 8):**
- Full invoice creation: bill to, ship to, terms, P.O. number, due date
- Line item entry: quantity, item code, description, price, tax
- Invoice templates and customization
- Customer management (linked to Contacts with Customer role)
- Accounts Receivable tracking: outstanding invoices, payments received
- Payment recording and application to invoices
- Aging reports: 30/60/90 day buckets
- Invoice PDF generation and email delivery

**Public Landing Page (Epic 9):**
- Marketing homepage for Salina ERP
- Feature highlights and benefits
- Pricing information (tiers if applicable)
- Call-to-action for tenant registration
- Professional design consistent with app branding

### Growth Features - Phase 2 (Future)

**Advanced ISBN Management:**
- ISBN registration tracking with national ISBN agencies
- Bulk ISBN operations across multiple prefixes
- ISBN status reporting (available, assigned, registered, retired)

**Advanced Royalty Features:**
- Multiple authors per title with split royalty percentages
- Escalating royalty rates based on cumulative lifetime sales (not just period sales)
- Foreign rights and sub-rights royalty tracking
- Royalty payment processing integration (Stripe, ACH)

**Enhanced Financial Management:**
- General Ledger (GL) integration for full accounting
- Accounts Payable (AP) for author royalty payments
- Multi-currency support for international sales
- Tax form generation (1099-MISC for author payments)

**Inventory Management:**
- Physical inventory tracking (warehouse stock levels)
- Distributor inventory consignment tracking
- Stock alerts and reorder points
- Inventory valuation reporting

**Advanced Reporting & Analytics:**
- Custom report builder
- Sales forecasting by title
- Author performance dashboards
- Business intelligence dashboards for executives

**Production Pipeline:**
- Manuscript submission and editorial workflow
- Editorial calendar and publication scheduling
- Design/layout tracking
- Print production scheduling

### Vision (Future)

**AI-Powered Features:**
- Predictive royalty modeling based on sales trends
- Automated return anomaly detection (fraud prevention)
- Sales forecasting using historical data

**Marketplace Integrations:**
- Amazon KDP integration for ebook sales import
- IngramSpark integration for print-on-demand
- Audible integration for audiobook sales
- Automated sales data import from multiple channels

**Author Experience Enhancements:**
- Real-time sales dashboards for authors (not just quarterly statements)
- Author marketing toolkit (promotional codes, sales tracking)
- Direct messaging between authors and publisher staff

**Enterprise Features:**
- Multi-company consolidation (publishing groups with multiple imprints)
- Advanced workflow automation and business rules engine
- API for third-party integrations
- White-label option for large publishers

---

{{#if domain_considerations}}

## Domain-Specific Requirements

{{domain_considerations}}

This section shapes all functional and non-functional requirements below.
{{/if}}

---

{{#if innovation_patterns}}

## Innovation & Novel Patterns

{{innovation_patterns}}

### Validation Approach

{{validation_approach}}
{{/if}}

---

## SaaS B2B Specific Requirements

As a multi-tenant SaaS platform serving publishing companies, Salina ERP requires specific architectural and functional capabilities to support multiple organizations on a shared infrastructure.

### Multi-Tenancy Architecture

**Tenant Isolation Model:**
- **Pattern**: Shared tables with `tenant_id` column on all tenant-scoped tables
- **Security**: PostgreSQL Row-Level Security (RLS) policies enforce tenant isolation at database level
- **Subdomain Routing**: Each tenant accesses via unique subdomain (e.g., `acmepublishing.salina-erp.com`)
- **Defense in Depth**: Three-layer isolation (application middleware, ORM filters, database RLS)

**Tenant Onboarding:**
- Self-service tenant registration with subdomain selection
- Subdomain availability validation
- Automatic tenant record creation with default settings
- Owner user creation and linking to tenant
- Optional sample data seeding for new tenants

**Tenant Management:**
- Tenant settings (fiscal year start, default currency, statement frequency)
- Tenant branding (logo, color scheme for author portal)
- Tenant-level feature flags for gradual rollout
- Tenant usage monitoring and quota enforcement

**Data Isolation Requirements:**
- All queries automatically scoped to current tenant
- Cross-tenant data access strictly prohibited (enforced by RLS)
- Tenant context derived from subdomain via middleware
- Session-based tenant context stored securely

### Permissions & Roles

**Role-Based Access Control (RBAC):**

**Owner Role:**
- Full administrative access to tenant
- Can manage all users, settings, and data
- Can delete tenant (with confirmation)
- Billing and subscription management

**Admin Role:**
- Manage users within tenant (invite, deactivate, assign roles)
- Configure tenant settings
- Access all modules and data
- Cannot delete tenant or manage billing

**Editor Role:**
- Create and edit authors, titles, manuscripts
- Assign ISBNs from pool
- Record sales transactions
- View reports
- Cannot approve returns, cannot access royalty calculations

**Finance Role:**
- Approve/reject return requests
- Run royalty calculations
- Generate royalty statements
- Access financial reports and data
- Cannot edit titles or assign ISBNs

**Author Role (External):**
- View own royalty statements only
- Download PDF statements
- View sales data for own titles only
- Cannot access any other tenant data or functions

**Permission Enforcement:**
- Permissions checked at Server Action level (before database operations)
- UI elements hidden/disabled based on user role
- API endpoints validate user permissions via middleware
- Clerk handles authentication, application handles authorization

### Authentication & Authorization

**Authentication Provider: Clerk**
- Email/password authentication
- Social login (Google, GitHub) optional
- Magic link authentication for authors
- Multi-factor authentication (MFA) available for Admin/Finance roles
- Session management handled by Clerk

**Authorization Flow:**
1. User authenticates via Clerk → Clerk user ID obtained
2. Middleware extracts tenant from subdomain → Tenant ID stored in session
3. Application loads user record (linked to Clerk user ID + tenant ID)
4. User role determines available permissions
5. All Server Actions check permissions before executing

**Security Requirements:**
- HTTPS/TLS for all connections
- HTTP-only secure cookies for session management
- CSRF protection on all state-changing operations
- Rate limiting on authentication endpoints
- Password complexity requirements enforced by Clerk

### Subscription & Billing (Future - Post-MVP)

**Subscription Tiers:**
- **Starter**: Up to 50 titles, 5 users, quarterly statements only
- **Professional**: Up to 200 titles, 15 users, quarterly/annual statements, advanced reporting
- **Enterprise**: Unlimited titles, unlimited users, API access, custom features

**Billing Requirements:**
- Monthly/annual billing cycles
- Stripe integration for payment processing
- Usage-based pricing option (per title, per transaction)
- Trial period (14-30 days) for new tenants
- Downgrade/upgrade flow with prorating

---

## User Experience Principles

**Design Philosophy: Professional Efficiency**

Salina ERP is a professional tool for publishing operations. The UI should feel capable and efficient, not flashy. Users need to accomplish tasks quickly with minimal friction.

**Visual Personality:**
- Clean, professional interface with clear information hierarchy
- Publishing industry aesthetic (refined, editorial feel)
- Data-dense when needed (tables, reports) but not cluttered
- Dashboard-driven navigation with module-based organization

**Design Principles:**

1. **Role-Appropriate Views**: Each user role sees relevant functionality only
   - Finance users see approval queues and royalty tools prominently
   - Editors see title/author management and ISBN assignment
   - Authors see simplified portal focused on statements

2. **Progressive Disclosure**: Complex features (tiered royalty configuration) use step-by-step flows
   - Don't overwhelm with all options at once
   - Guided workflows for multi-step processes (royalty statement generation)

3. **Data Transparency**: Users can always see the "why" behind calculations
   - Royalty statements show tier breakdowns
   - Advance recoupment is explicitly displayed
   - Approved vs. pending returns clearly differentiated

4. **Confidence & Control**: Users need to trust financial calculations
   - Preview before finalizing (royalty statement preview before generation)
   - Confirmation dialogs on destructive actions
   - Clear audit trails ("Statement generated by [User] on [Date]")

### Key Interactions

**Dashboard (Role-Based):**
- Owner/Admin: Tenant overview, user activity, system health
- Finance: Pending returns queue, upcoming statement deadlines, royalty liability summary
- Editor: Recent titles, ISBN pool status, pending manuscript submissions
- Author: Latest statement, sales summary, title performance

**Title Management Flow:**
1. Create title → Fill metadata form
2. Assign ISBN → Select from available pool (filtered by type: physical/ebook)
3. Set publication status → Dropdown (draft, pending, published, out-of-print)
4. Link royalty contract → Create or select existing contract

**Sales Entry Flow:**
1. Select title → Autocomplete search
2. Select format → Radio buttons (Physical/Ebook/Audiobook)
3. Enter quantity, unit price, sale date, channel
4. Submit → Transaction recorded, available for royalty calculation

**Return Approval Flow (Finance Role):**
1. View returns queue → Table with pending returns
2. Review details → Return reason, original sale reference, requester
3. Approve/Reject → Button actions with confirmation
4. Status updates → Return marked approved, now affects royalties

**Royalty Statement Generation:**
1. Select period → Date range picker (Q1 2025, Annual 2024, custom)
2. Select author(s) → Multi-select or "all authors"
3. Preview calculations → Show net sales, tier application, advance recoupment
4. Generate PDFs → Background job, notify when complete
5. Send to authors → Email with PDF attachment, also available in portal

**Author Portal (Simplified Experience):**
- Single page with statement list
- Filter by year/quarter
- Download PDF button
- Sales chart visualization (optional enhancement)

---

## Functional Requirements

**Complete capability inventory organized by functional area. Each FR defines WHAT the system can do, not HOW it's implemented.**

### Tenant & User Management

**FR1**: Users can register a new publishing company tenant with unique subdomain
**FR2**: System validates subdomain availability and prevents duplicates
**FR3**: Owner users can invite additional users to their tenant via email
**FR4**: Administrators can assign roles to users (Owner, Admin, Editor, Finance, Author)
**FR5**: Users can authenticate via email/password or social login (Google, GitHub)
**FR6**: Administrators can deactivate or remove users from their tenant
**FR7**: System enforces Row-Level Security to prevent cross-tenant data access
**FR8**: Tenant owners can configure tenant settings (fiscal year, default currency, statement frequency)

### Author Management

**FR9**: Editors can create author profiles with contact information
**FR10**: Editors can record author tax IDs for 1099 reporting purposes
**FR11**: Editors can update author information (address, email, payment details)
**FR12**: Authors can log into author portal with limited access credentials
**FR13**: System maintains complete history of author record changes for audit

### Title & ISBN Management

**FR14**: Editors can create title records with metadata (title, genre, word count, publication status)
**FR15**: Editors can track multiple formats for a single title (physical, ebook, audiobook)
**FR16**: Administrators can import ISBN blocks (100-count) via CSV upload
**FR17**: System tracks ISBN pool status (available, assigned, registered, retired)
**FR18**: Editors can assign available ISBNs to titles from the pool
**FR19**: System prevents duplicate ISBN assignment across all titles
**FR20**: Editors can assign ISBNs to titles for each format requiring an ISBN
**FR21**: System validates ISBN-13 format before accepting
**FR22**: Editors can update title metadata and publication status
**FR23**: System displays ISBN pool availability count

### Sales Transaction Management

**FR24**: Editors can record individual sales transactions in real-time
**FR25**: Users can specify sale details (title, format, quantity, unit price, sale date, channel)
**FR26**: System supports multiple sales channels (retail, wholesale, direct, distributor)
**FR27**: Users can view transaction history with filtering by date, title, format, channel
**FR28**: System records transaction metadata (who entered, when entered) for audit
**FR29**: System prevents modification of historical transactions (append-only ledger)

### Returns Management

**FR30**: Editors can record return transactions with negative quantity
**FR31**: Users must provide return reason and reference to original sale (optional)
**FR32**: Return requests are created with "pending" status awaiting approval
**FR33**: Finance users can view queue of pending returns requiring approval
**FR34**: Finance users can approve or reject return requests
**FR35**: System tracks who approved/rejected returns and when
**FR36**: Only approved returns affect royalty calculations
**FR37**: Rejected returns are excluded from all financial calculations

### Royalty Contract Management

**FR38**: Editors can create royalty contracts linking authors to titles
**FR39**: Users can configure tiered royalty rates by format and sales volume
**FR40**: System supports multiple tiers per format (e.g., 0-5K @ 10%, 5K-10K @ 12%, 10K+ @ 15%)
**FR41**: Users can record advance payments made to authors
**FR42**: System tracks advance amount, amount paid, and amount recouped
**FR43**: Users can update contract status (active, terminated, suspended)
**FR44**: System maintains contract history for audit and compliance

### Royalty Calculation Engine

**FR45**: Finance users can trigger royalty calculations for specific periods (quarterly, annual, custom)
**FR46**: System calculates net sales (total sales minus approved returns only)
**FR47**: System applies tiered royalty rates based on sales volume and format
**FR48**: System calculates advance recoupment from positive royalty earnings
**FR49**: System calculates net payable amount (royalty earned minus advance recoupment)
**FR50**: System handles negative periods (more returns than sales) without reversing recouped advances
**FR51**: System supports multiple formats with different royalty rates per contract
**FR52**: Calculation engine produces detailed breakdown showing tier application

### Royalty Statement Generation

**FR53**: Finance users can generate PDF royalty statements for one or all authors
**FR54**: Statements display sales breakdown by title and format
**FR55**: Statements show tiered royalty calculation details
**FR56**: Statements display advance tracking (amount, paid, recouped, remaining)
**FR57**: Statements show net payable amount for the period
**FR58**: System emails PDF statements to authors automatically
**FR59**: Statements are stored and accessible for historical retrieval
**FR60**: System records statement generation metadata (who generated, when, for what period)

### Author Portal

**FR61**: Authors can log into dedicated author portal with limited access
**FR62**: Authors can view list of their royalty statements
**FR63**: Authors can download PDF statements
**FR64**: Authors can view sales history for their titles only
**FR65**: Authors cannot access other authors' data or publisher internal data
**FR66**: System enforces author-specific data isolation via RLS

### Financial Tracking

**FR67**: System tracks total revenue from all sales transactions
**FR68**: System calculates royalty liability (amount owed to authors)
**FR69**: Finance users can view royalty liability by author
**FR70**: System generates financial reports (sales by format, sales by title, royalty expenses)
**FR71**: System maintains audit trail of all financial transactions

### Reporting & Analytics

**FR72**: Users can generate sales reports filtered by date range, title, format, channel
**FR73**: Users can view ISBN pool status report (available vs. assigned by type)
**FR74**: Finance users can view royalty liability summary across all authors
**FR75**: Users can export reports to CSV format
**FR76**: System provides dashboard views appropriate to user role

### System Administration

**FR77**: System administrators can monitor tenant usage and activity
**FR78**: System enforces role-based permissions on all operations
**FR79**: System logs all data modifications for audit trail
**FR80**: System provides tenant-level configuration management
**FR81**: System handles background jobs (PDF generation, email delivery) asynchronously

### Contact Management (Growth - Epic 7)

**FR82**: System maintains unified contact database with multi-role support (Author, Customer, Vendor, Distributor)
**FR83**: Users can assign multiple roles to a single contact
**FR84**: System migrates existing author data to contact records preserving all relationships
**FR85**: Contact profiles display role-specific information based on assigned roles
**FR86**: Author portal access is granted to contacts with Author role
**FR87**: Customer invoicing is available for contacts with Customer role

### Enhanced ISBN Management (Growth - Epic 7)

**FR88**: Administrators can register publisher ISBN prefixes (e.g., 978-1-234567)
**FR89**: System auto-generates full ISBN range from registered prefix based on block size (10, 100, 1K, 10K, 100K, 1M)
**FR90**: System organizes ISBN pool by publisher prefix for easy management
**FR91**: Users can view ISBN pool organized by prefix and block
**FR92**: System validates ISBN prefixes against standard ISBN-13 format rules

### Royalty Period Configuration (Growth - Epic 7)

**FR93**: Tenant owners can configure royalty calculation period independent of fiscal year
**FR94**: System supports calendar year, fiscal year, or custom date range for royalty periods
**FR95**: Royalty calculation workflow uses configured royalty period for date filtering

### Invoicing & Accounts Receivable (Growth - Epic 8)

**FR96**: Users can create invoices with bill-to and ship-to addresses
**FR97**: Users can add line items to invoices with quantity, item code, description, unit price, and tax
**FR98**: System calculates invoice totals including subtotal, tax, and grand total
**FR99**: Users can specify payment terms (Net 30, Net 60, Due on Receipt, custom)
**FR100**: Users can record P.O. numbers and shipping methods on invoices
**FR101**: System links invoices to contacts with Customer role
**FR102**: System tracks accounts receivable balance per customer
**FR103**: Users can record payments received against outstanding invoices
**FR104**: System generates aging reports (current, 30, 60, 90+ days)
**FR105**: System generates invoice PDFs for delivery to customers
**FR106**: Users can email invoices directly from the system

### Public Landing Page (Growth - Epic 9)

**FR107**: System provides public landing page accessible without authentication
**FR108**: Landing page displays product features and benefits
**FR109**: Landing page includes call-to-action for tenant registration
**FR110**: Landing page design is consistent with application branding

---

## Non-Functional Requirements

### Performance

**Response Time:**
- Page loads complete in < 2 seconds for dashboard and list views
- CRUD operations (create title, record sale) respond in < 500ms
- Search and autocomplete results appear in < 300ms
- Report generation (non-PDF) completes in < 3 seconds

**Background Processing:**
- Royalty calculation for quarterly statement completes in < 30 seconds per author
- PDF statement generation handled asynchronously (does not block user)
- Bulk ISBN import (100 records) processes in < 5 seconds

**Concurrent Usage:**
- System supports 100+ concurrent users per tenant without degradation
- Database connection pooling prevents connection exhaustion
- Query optimization ensures complex royalty calculations don't block other operations

### Security

**Multi-Tenant Data Isolation:**
- PostgreSQL Row-Level Security (RLS) enforces tenant boundaries at database level
- Application middleware validates tenant context on every request
- ORM queries automatically include tenant_id filter
- Automated tests verify no cross-tenant data leakage

**Authentication & Authorization:**
- Clerk handles authentication with industry-standard security practices
- Multi-factor authentication (MFA) available for Finance and Admin roles
- Role-based access control enforced at Server Action level before database access
- Session tokens are HTTP-only, secure cookies with appropriate expiration

**Data Protection:**
- All connections use HTTPS/TLS encryption
- Database encryption at rest (Neon PostgreSQL default)
- Sensitive data (tax IDs) encrypted in database
- CSRF protection on all state-changing operations
- Rate limiting on authentication endpoints to prevent brute force

**Audit & Compliance:**
- Complete audit trail of all financial transactions (who, what, when)
- Immutable transaction ledger (append-only, no modifications)
- User action logging for security and compliance
- Author PII (tax IDs, payment info) access logged

### Scalability

**Horizontal Scaling:**
- Stateless Next.js application enables horizontal scaling via Fly.io
- Multiple application instances can run concurrently
- Session state managed by Clerk (not in-memory)

**Database Scaling:**
- Neon PostgreSQL serverless compute auto-scales based on load
- Connection pooling (PgBouncer or Neon pooling) handles concurrent connections
- Indexes on high-query columns (tenant_id, title_id, author_id, sale_date)
- Table partitioning for sales table if volume exceeds millions of records

**Tenant Growth:**
- Shared-table multi-tenancy scales to hundreds of tenants without infrastructure changes
- Adding new tenant is instant (no schema creation required)
- Tenant isolation via RLS imposes minimal performance overhead

**Caching Strategy:**
- Tenant lookup cached (subdomain → tenant_id mapping)
- User permissions cached per session
- Reference data (genres, formats) cached
- React Server Components provide automatic UI caching

### Accessibility

**WCAG 2.1 Level AA Compliance:**
- Keyboard navigation support for all interactive elements
- Screen reader compatibility (semantic HTML, ARIA labels)
- Sufficient color contrast ratios (4.5:1 minimum for text)
- Form validation with clear error messages
- Focus indicators visible on all interactive elements

**Responsive Design:**
- Application usable on desktop, tablet, and mobile devices
- Mobile-optimized author portal for statement viewing
- Tables respond gracefully on smaller screens (horizontal scroll or card layout)

### Integration

**Email Delivery:**
- Integrate with email service (Resend, SendGrid, or AWS SES)
- Automated email delivery of PDF statements to authors
- Transactional emails (user invites, password resets) via Clerk
- Email delivery tracking and retry logic for failures

**File Storage:**
- External object storage (S3, Cloudflare R2, or Tigris) for PDF statements
- Secure, time-limited URLs for PDF downloads
- File upload for CSV imports (ISBN blocks)

**Future API Integration:**
- RESTful API for third-party integrations (Growth phase)
- Webhook support for real-time events (statement generated, return approved)
- API authentication via tenant-specific API keys

### Reliability

**Uptime:**
- Target 99.5% uptime (allows ~3.6 hours downtime per month)
- Scheduled maintenance windows communicated in advance
- Database backups automated daily by Neon

**Error Handling:**
- Graceful degradation when external services unavailable (email, file storage)
- User-friendly error messages (never expose stack traces)
- Error tracking and alerting via Sentry or similar
- Failed background jobs (PDF generation) retry with exponential backoff

**Data Integrity:**
- Database transactions ensure consistency for multi-step operations
- Foreign key constraints prevent orphaned records
- Check constraints enforce business rules at database level (e.g., positive prices)
- Validation at application layer before database operations

---

_This PRD captures the essence of Salina ERP - a publishing-first ERP that consolidates disconnected workflows into a unified platform with specialized capabilities for ISBN management, tiered royalty calculations, and author transparency._

_Created through collaborative discovery between BMad and AI facilitator, informed by comprehensive domain research conducted 2025-11-21._

---

## PRD Summary

**Document Status:** Complete (Updated 2025-12-05 with Growth Phase 1)
**Total Functional Requirements:** 110 FRs across 17 capability areas
- MVP (FR1-FR81): 81 FRs across 12 capability areas - **COMPLETE**
- Growth Phase 1 (FR82-FR110): 29 FRs across 5 capability areas - **Epics 7-9**

**Non-Functional Requirements:** Performance, Security, Scalability, Accessibility, Integration, Reliability

**Key Differentiators:**
1. Tiered royalty calculation engine with advance recoupment
2. ISBN pool management with publisher prefix auto-generation
3. Returns approval workflow (only approved returns affect royalties)
4. Multi-format support with format-specific royalty rates
5. Author portal for self-service statement access
6. Unified contact database with multi-role support (Author, Customer, Vendor)
7. Full invoicing and accounts receivable module

**Technology Foundation:**
- Next.js 16 (App Router, Server Components, Server Actions)
- Neon PostgreSQL with Row-Level Security
- Drizzle ORM for type-safe queries
- Clerk for authentication and user management
- Docker + Fly.io deployment

**Next Steps:**
1. UX Design workflow (recommended) - Design user interfaces and interaction patterns
2. Architecture workflow (required) - Define technical architecture and system design
3. Create Epics & Stories workflow (required) - Break down into implementable units
