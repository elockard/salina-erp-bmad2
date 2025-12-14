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

### Phase 3 NFR Extensions

#### Performance (Phase 3)

| Requirement | Target | Measurement |
|-------------|--------|-------------|
| ONIX feed generation | < 5 seconds single title, < 60 seconds full catalog | Performance benchmark |
| REST API response time | p95 < 200ms reads, p95 < 500ms writes | APM monitoring |
| Webhook delivery latency | < 30 seconds from event trigger | Event logs |
| Shipping label generation | < 3 seconds per label PDF | Performance benchmark |
| Catalog import processing | < 1 minute per 100 titles | Import job metrics |

#### Security (Phase 3)

| Requirement | Specification |
|-------------|---------------|
| API authentication | OAuth2 with JWT tokens, 24-hour expiration |
| API key management | Tenant-scoped keys with granular permission sets |
| Webhook signatures | HMAC-SHA256 with shared secret per endpoint |
| Channel credentials | Encrypted at rest using tenant-specific keys |
| Rate limiting | Configurable per tenant, default 1000 requests/minute |

#### Integration (Phase 3)

| Requirement | Specification |
|-------------|---------------|
| ONIX conformance | Valid against EDItEUR ONIX 3.1 XSD schema |
| BISG label compliance | Scannable GS1-128 barcodes per BISG specification |
| Channel feed delivery | At-least-once delivery with retry on failure |
| Webhook delivery | Exponential backoff retry (3 attempts over 24 hours) |
| API backwards compatibility | Semantic versioning, 90-day deprecation notices |

#### Reliability (Phase 3)

| Requirement | Target |
|-------------|--------|
| API availability | 99.9% uptime (8.7 hours downtime/year max) |
| Webhook delivery success | 99.5% within retry window |
| Channel feed success rate | 99% successful deliveries |
| Scheduled job execution | Jobs execute within 5 minutes of scheduled time |

#### Scalability (Phase 3)

| Requirement | Specification |
|-------------|---------------|
| Concurrent API requests | 100 concurrent requests per tenant |
| ONIX export size | Support catalogs up to 10,000 titles |
| Webhook fanout | Support 50 webhook endpoints per tenant |
| Import batch size | Support CSV imports up to 5,000 rows |

---

_This PRD captures the essence of Salina ERP - a publishing-first ERP that consolidates disconnected workflows into a unified platform with specialized capabilities for ISBN management, tiered royalty calculations, and author transparency._

_Created through collaborative discovery between BMad and AI facilitator, informed by comprehensive domain research conducted 2025-11-21._

---

## Phase 3: Distribution & Scale

**Added:** 2025-12-12
**Status:** Approved
**Epics:** 14-21

### Phase 3 Executive Summary

Phase 3 transforms Salina ERP from an internal operations platform into an **industry-connected distribution hub**. While Phase 1-2 focused on managing titles, royalties, and compliance internally, Phase 3 enables publishers to syndicate their catalog data industry-wide and integrate with major sales channels.

**The Core Problem Phase 3 Solves:**

Publishers currently maintain their catalog in Salina but must manually re-enter the same title information across multiple platforms - Ingram, Amazon, Bowker, library distributors, and discovery services. This duplication creates data inconsistencies, delays time-to-market, and wastes operational hours.

**Phase 3 Solution:**

ONIX 3.1 as the metadata backbone enables "update once, distribute everywhere" - publishers maintain a single source of truth in Salina that automatically syndicates to all connected channels.

### What Makes Phase 3 Special

**For Publishers:**
- Single catalog management with automated channel distribution
- ONIX 3.1 compliance for industry-standard metadata exchange
- Accessibility metadata support for European Accessibility Act compliance
- Bulk import capability for migrating existing catalogs

**For Operations:**
- Production pipeline from manuscript to finished book
- Real-time inventory synchronization with distributors
- API access for accounting and reporting integrations
- Webhook notifications for automated workflows

**For Authors:**
- Production status tracking in the author portal
- Marketing asset library access
- Manuscript upload workflow

### Phase 3 Classification

**Technical Type:** SaaS B2B (extending existing platform)
**Domain:** Publishing Industry
**Complexity:** Medium
**Project Context:** Brownfield - Phase 3 extension of established system

**Key Technical Decisions:**
- **ONIX 3.1** (not 3.0) as the metadata standard - current EDItEUR recommendation with accessibility support
- **REST API** with webhook events for third-party integration
- **Channel-specific adapters** for Ingram, Amazon, and future channels
- **Backwards compatibility** - ONIX 3.0 export for legacy channel requirements

### Phase 3 Scope

| Sub-Phase | Epics | Focus |
|-----------|-------|-------|
| **3A - Metadata Foundation** | 14, 15 | ONIX 3.1 Core, REST API & Webhooks |
| **3B - Channel Distribution** | 16, 17 | Ingram Integration, Amazon Integration |
| **3C - Operations** | 18, 19 | Production Pipeline, Data Import/Export |
| **3D - Experience** | 20, 21 | UX Enhancements, Author Portal Expansion |

**Removed from Scope:** Baker & Taylor integration (company winding down operations)

### Phase 3 Success Criteria

#### User Success Indicators

**Publishers will know Phase 3 succeeds when they can:**
1. Generate ONIX 3.1 metadata for any title with accessibility compliance
2. Send automated feeds to Ingram and Amazon with one-click distribution
3. Track production from manuscript to printed book in a unified pipeline
4. Generate BISG-compliant shipping labels with GS1-128 barcodes
5. Import existing catalogs via ONIX 2.1/3.0/3.1 or CSV templates
6. Access the platform seamlessly on mobile devices
7. Receive proactive notifications about distribution status changes

**Authors will know Phase 3 succeeds when they can:**
8. View real-time production status for their titles
9. Access and download marketing assets from a centralized library
10. Upload manuscripts directly through the author portal

#### Business Success Indicators

1. **Channel Coverage** - Support for 80%+ of industry distribution volume (Ingram + Amazon)
2. **Metadata Compliance** - 100% ONIX 3.1 validation pass rate for generated feeds
3. **Operational Efficiency** - 50% reduction in manual data entry for distribution setup
4. **Customer Acquisition** - Migration tools enable onboarding of publishers with existing catalogs
5. **API Adoption** - Third-party integrations demonstrate platform extensibility

#### Technical Success Indicators

1. **ONIX 3.1 Conformance** - Full EDItEUR codelist support with backwards-compatible 3.0 export
2. **API Reliability** - REST API with 99.9% uptime and <200ms p95 response time
3. **Webhook Delivery** - At-least-once delivery with retry logic for event notifications
4. **Label Generation** - BISG-compliant GS1-128 shipping labels with GTIN-14 ISBN encoding
5. **Import Flexibility** - Support ONIX 2.1, 3.0, 3.1, and CSV import formats

#### Measurable Outcomes (Phase 3)

| Outcome | Target | Measurement |
|---------|--------|-------------|
| ONIX feed generation | < 5 seconds per title | Performance benchmark |
| Channel sync latency | < 24 hours to distributor | Feed delivery logs |
| API rate limit | 1000 requests/minute | Rate limiter metrics |
| Shipping label accuracy | 100% GS1-128 compliant | Validation scan tests |
| Mobile responsiveness | 100% pages optimized | Lighthouse scores |

#### Product Scope - Phase 3

**In Scope:**
- ONIX 3.1 message generation, validation, and codelist management
- ONIX import (2.1/3.0/3.1) and export (3.1 default, 3.0 fallback)
- REST API with OAuth2 authentication and rate limiting
- Webhook event system for distribution status changes
- Ingram/IngramSpark ONIX feed automation and order data ingestion
- Amazon KDP/Advantage ONIX feeds and ASIN linking
- Production pipeline: manuscript intake, vendor management, proof tracking
- BISG shipping label generation (GS1-128, GTIN-14 ISBN encoding)
- Bulk data import/export with CSV templates
- Tenant onboarding wizard and notifications center
- Mobile-optimized responsive design
- Author portal: production tracking, marketing assets, manuscript upload

**Out of Scope:**
- Baker & Taylor integration (business wind-down)
- Print-on-demand manufacturing (vendor responsibility)
- eBook conversion (separate toolchain)
- International tax compliance beyond US (future phase)

### Phase 3 User Journeys

**Journey 1: Sarah Chen - From Metadata Nightmare to Channel Domination**

Sarah runs a mid-size independent publisher with 200 active titles. Every month, she dreads "distribution day" - manually copying metadata into Ingram's portal, reformatting the same data for Amazon, and praying she didn't transpose an ISBN. Last quarter, a pricing error cost her $3,000 in margin before anyone noticed.

When Sarah discovers Salina's ONIX 3.1 distribution module, she's skeptical but desperate. She imports her existing catalog via CSV and watches as Salina validates every field, flagging three titles with missing accessibility metadata required for European sales. Within an hour, her entire catalog is ONIX 3.1 compliant.

The breakthrough comes on her first automated distribution run. She clicks "Distribute to Ingram," watches the ONIX feed generate in seconds, and receives confirmation within minutes. Amazon follows. When Ingram sends back order data, it flows directly into her sales tracking. Sarah now spends distribution day doing acquisitions calls instead of data entry. Her error rate: zero.

**Journey 2: Marcus Webb - The Warehouse Shipping Revolution**

Marcus manages fulfillment for a publisher shipping 50,000 units monthly. His team prints labels from three different systems, hand-writes carton counts, and once shipped 500 books to the wrong distributor because someone misread an ISBN. The returns cost more than his monthly coffee budget.

He starts using Salina's BISG shipping label generator after a particularly painful mislabeling incident. The first time he scans a generated GS1-128 label and watches the GTIN-14 ISBN decode perfectly, he feels actual relief. The system auto-calculates carton weights, generates compliant zone labels, and creates pick lists that match his warehouse layout.

Six months later, Marcus's error rate has dropped 95%. Ingram's receiving team comments that his shipments are "the cleanest they see." He's promoted to operations director.

**Journey 3: Dev Team at BookFlow - API Integration**

The BookFlow team builds inventory management software for small publishers. Their customers keep asking for Salina integration, but they dread another custom API project with sparse documentation and breaking changes.

They discover Salina's REST API with OAuth2 authentication, OpenAPI documentation, and webhook events. Within a day, they have a proof-of-concept pulling title metadata. The webhook system notifies them when royalty statements are generated, triggering automatic reconciliation in BookFlow.

The integration launches in two weeks instead of the projected two months. BookFlow adds "Salina Certified Integration" to their marketing. Three publishers sign up specifically for the integration.

**Journey 4: Amanda Torres - Author Production Tracking**

Amanda is a first-time author whose book is "somewhere in production." Her publisher sends sporadic email updates, and she has no idea if her proof corrections were received or when to expect printed copies for her launch event.

When her publisher enables Salina's author portal expansion, Amanda logs in and sees her book's journey visualized: manuscript received → editing complete → cover design approved → interior layout (current) → proof pending → print queue. She can see her proof corrections were applied yesterday and the timeline shows printed copies arriving two weeks before her event.

Amanda stops anxious-emailing her publisher. She shares production status screenshots with her launch team. When friends ask about self-publishing, she recommends finding a publisher who uses "that system with the progress tracker."

**Journey 5: New Publisher Onboarding - Catalog Migration**

Rivera Press is switching from spreadsheets and manual tracking. They have 80 titles in various states of documentation - some with full metadata, some with just ISBNs and titles. The thought of manual data entry has delayed their Salina adoption for months.

The onboarding wizard detects their CSV upload, maps columns intelligently, and flags 12 titles with validation issues. The system suggests BISAC codes based on descriptions, auto-formats contributor names, and identifies duplicate ISBNs. What they expected to take a week takes an afternoon.

Within a month, Rivera Press has cleaner metadata than they've ever had. They distribute their first ONIX feed to Ingram and feel like a "real publisher" for the first time.

#### Journey Requirements Summary

| Journey | Capabilities Required |
|---------|----------------------|
| Sarah (Distribution) | ONIX 3.1 generation, validation, channel feeds, order ingestion |
| Marcus (Shipping) | BISG label generation, GS1-128 encoding, carton management |
| BookFlow (API) | REST API, OAuth2, webhooks, OpenAPI docs |
| Amanda (Author) | Production tracking, portal expansion, status visualization |
| Rivera (Onboarding) | Catalog import, CSV mapping, validation, onboarding wizard |

### Phase 3 Technical Requirements

#### ONIX 3.1 Integration Layer

| Requirement | Specification |
|-------------|---------------|
| **Message Format** | ONIX 3.1 XML with EDItEUR namespace |
| **Codelist Management** | Embed EDItEUR codelists with update mechanism |
| **Validation** | Schema validation + business rule validation |
| **Import Formats** | ONIX 2.1, 3.0, 3.1, CSV |
| **Export Formats** | ONIX 3.1 (default), 3.0 (legacy fallback) |
| **Accessibility** | Full ONIX 3.1 accessibility metadata support (EPUB Accessibility) |

#### REST API Architecture

| Requirement | Specification |
|-------------|---------------|
| **Authentication** | OAuth2 with JWT tokens |
| **Authorization** | Tenant-scoped API keys with permission sets |
| **Rate Limiting** | 1000 requests/minute per tenant (configurable) |
| **Versioning** | URL path versioning (`/api/v1/`) |
| **Documentation** | OpenAPI 3.0 spec auto-generated |
| **Response Format** | JSON with consistent error envelope |

#### Webhook Event System

| Requirement | Specification |
|-------------|---------------|
| **Delivery** | At-least-once with exponential backoff retry |
| **Signature** | HMAC-SHA256 payload signature |
| **Events** | title.created, statement.generated, distribution.completed, etc. |
| **Management** | Webhook endpoint registration per tenant |
| **Logging** | Delivery attempts with response codes |

#### Channel Integration Adapters

| Channel | Integration Type | Data Flow |
|---------|------------------|-----------|
| **Ingram/IngramSpark** | ONIX 3.1 feed + FTP | Outbound: metadata, Inbound: orders/inventory |
| **Amazon KDP/Advantage** | ONIX 3.1 feed + API | Outbound: metadata, Inbound: sales/ASIN |
| **Bowker (Books In Print)** | ONIX 3.1 feed | Outbound only |

#### BISG Shipping Label Generation

| Requirement | Specification |
|-------------|---------------|
| **Label Format** | GS1-128 with GTIN-14 ISBN encoding |
| **Zones** | A-I shipping zones per BISG spec |
| **Product Label** | Zones 1-3 per BISG spec |
| **Application Identifiers** | AI-01 (ISBN), AI-30 (qty), AI-3401 (weight), AI-9012Q (price) |
| **Output** | PDF with 300 DPI barcode resolution |

#### Production Pipeline Workflow

| Stage | Capabilities |
|-------|-------------|
| **Manuscript Intake** | File upload, metadata extraction, format validation |
| **Vendor Assignment** | Vendor database, task assignment, SLA tracking |
| **Proof Management** | Proof upload, correction workflow, approval gates |
| **Scheduling** | Production calendar, milestone tracking, alerts |

#### Multi-Tenant API Considerations

- API keys scoped to tenant with platform-admin override
- Request logging with tenant attribution
- Usage metering for potential monetization
- Cross-tenant data isolation in all endpoints

### Phase 3 Scoping & Delivery Plan

#### Phase 3 MVP Approach

**Strategy:** Platform MVP - Build the distribution foundation for channel expansion

**Product State:**
- Phase 1 (MVP): COMPLETE - Foundation, Multi-Tenant, Auth, Catalog, ISBN
- Phase 2 (Growth): COMPLETE - Advanced Royalties, Tax Compliance, Platform Admin
- Phase 3 (Distribution): 8 epics across 4 sub-phases

#### Sub-Phase Delivery Sequence

**Sub-Phase 3A: Metadata Foundation** (Must ship first)
| Epic | Priority | Rationale |
|------|----------|-----------|
| 14: ONIX 3.1 Core | P0 | Foundation for all distribution |
| 15: REST API & Webhooks | P0 | Enables integrations and automation |

**Sub-Phase 3B: Channel Distribution** (Depends on 3A)
| Epic | Priority | Rationale |
|------|----------|-----------|
| 16: Ingram Integration | P0 | 40%+ of industry distribution |
| 17: Amazon Integration | P0 | Largest retail channel |

**Sub-Phase 3C: Operations** (Can parallelize)
| Epic | Priority | Rationale |
|------|----------|-----------|
| 18: Production Pipeline | P1 | Operational efficiency, BISG labels |
| 19: Data Import/Export | P1 | Customer onboarding |

**Sub-Phase 3D: Experience** (Independent track)
| Epic | Priority | Rationale |
|------|----------|-----------|
| 20: UX Enhancements | P1 | Onboarding, notifications, mobile |
| 21: Author Portal Expansion | P2 | Enhanced author experience |

#### Risk Mitigation Strategy

**Technical Risks:**
- ONIX 3.1 complexity → Start with core fields, expand progressively
- Channel API changes → Abstract behind adapter pattern
- BISG label compliance → Validate against physical scanners early

**Market Risks:**
- Channel adoption timing → Start with Ingram (most standardized)
- Publisher migration → Robust import tools, CSV fallback

**Resource Risks:**
- Parallel track capacity → 3A+3B sequential, 3C+3D can parallelize
- ONIX expertise → EDItEUR documentation, reference implementations

### Phase 3 Functional Requirements (FR111-FR163)

#### ONIX Metadata Management (Epic 14)

- **FR111:** Publisher can generate ONIX 3.1 messages for individual titles or batch catalog exports
- **FR112:** Publisher can validate ONIX messages against EDItEUR schema and business rules before export
- **FR113:** Publisher can import title metadata from ONIX 2.1, 3.0, or 3.1 files
- **FR114:** Publisher can manage EDItEUR codelist values for subject codes, contributor roles, and product forms
- **FR115:** Publisher can add accessibility metadata (EPUB Accessibility, screen reader compatibility) to titles
- **FR116:** Publisher can export ONIX 3.0 format for legacy channel compatibility
- **FR117:** System validates required fields and displays specific validation errors before feed generation
- **FR118:** Publisher can preview generated ONIX XML before distribution

#### REST API & Webhooks (Epic 15)

- **FR119:** Developer can authenticate API requests using OAuth2 with tenant-scoped API keys
- **FR120:** Developer can retrieve title metadata, sales transactions, and royalty data via REST endpoints
- **FR121:** Developer can create and update titles via API with validation feedback
- **FR122:** Developer can register webhook endpoints to receive event notifications
- **FR123:** System delivers webhook events with HMAC-SHA256 signatures for verification
- **FR124:** Developer can view API request logs and webhook delivery history
- **FR125:** System enforces configurable rate limits per tenant
- **FR126:** Developer can access auto-generated OpenAPI 3.0 documentation

#### Ingram Integration (Epic 16)

- **FR127:** Publisher can configure Ingram/IngramSpark account credentials and FTP settings
- **FR128:** Publisher can schedule automated ONIX feed delivery to Ingram
- **FR129:** Publisher can manually trigger immediate ONIX feed to Ingram
- **FR130:** System can ingest order data from Ingram and create sales transactions
- **FR131:** System can synchronize inventory availability status with Ingram
- **FR132:** Publisher can view Ingram feed history with delivery status and error logs

#### Amazon Integration (Epic 17)

- **FR133:** Publisher can configure Amazon KDP/Advantage account settings
- **FR134:** Publisher can schedule automated ONIX feed delivery to Amazon
- **FR135:** System can import sales data from Amazon and create sales transactions
- **FR136:** Publisher can link titles to ASINs for sales tracking
- **FR137:** Publisher can view Amazon feed history with delivery status

#### Production Pipeline (Epic 18)

- **FR138:** Publisher can create production projects for titles with manuscript upload
- **FR139:** Publisher can assign production tasks to vendors with due dates
- **FR140:** Publisher can track production status through workflow stages (manuscript, editing, design, proof, print)
- **FR141:** Publisher can upload and manage proof files with version tracking
- **FR142:** Publisher can approve or request corrections on proofs
- **FR143:** Publisher can view production calendar with milestone dates
- **FR144:** Publisher can generate BISG-compliant GS1-128 shipping labels with GTIN-14 ISBN encoding
- **FR145:** Publisher can configure carton contents and generate carton labels with Application Identifiers
- **FR146:** Publisher can print product labels with barcode and pricing zones per BISG specification

#### Data Import/Export (Epic 19)

- **FR147:** Publisher can import existing catalog via CSV with column mapping
- **FR148:** System validates imported data and displays row-level error details
- **FR149:** Publisher can download CSV templates for bulk data entry
- **FR150:** Publisher can export catalog data to CSV for external analysis
- **FR151:** Publisher can bulk update title metadata via CSV upload
- **FR152:** System suggests BISAC codes based on title descriptions during import

#### User Experience Enhancements (Epic 20)

- **FR153:** New tenant can complete guided onboarding wizard with essential setup steps
- **FR154:** User can view notifications center with distribution status, system alerts, and action items
- **FR155:** User can configure notification preferences by channel and event type
- **FR156:** User can access all core functionality on mobile devices with responsive layout
- **FR157:** User can access contextual help tooltips and documentation links throughout the interface
- **FR158:** System displays onboarding progress indicator until essential setup is complete

#### Author Portal Expansion (Epic 21)

- **FR159:** Author can view real-time production status for their titles with visual timeline
- **FR160:** Author can access marketing asset library with downloadable cover images and promotional materials
- **FR161:** Author can upload manuscript files directly through the portal
- **FR162:** Author can receive notifications when production milestones are reached
- **FR163:** Author can view scheduled publication dates and estimated delivery timelines

---

## PRD Summary

**Document Status:** Complete (Updated 2025-12-12 with Phase 3)
**Total Functional Requirements:** 163 FRs across 25 capability areas
- MVP (FR1-FR81): 81 FRs across 12 capability areas - **COMPLETE**
- Growth Phase 1 (FR82-FR110): 29 FRs across 5 capability areas - **COMPLETE (Epics 7-9)**
- Phase 3 Distribution (FR111-FR163): 53 FRs across 8 capability areas - **Epics 14-21**

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
