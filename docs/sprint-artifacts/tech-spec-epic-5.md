# Epic Technical Specification: Royalty Statements & Author Portal

Date: 2025-11-30
Author: BMad
Epic ID: 5
Status: Draft

---

## Overview

Epic 5 delivers the royalty statement generation and author portal capabilities that enable transparent communication between publishers and authors. This epic builds on the royalty calculation engine from Epic 4 to produce professional PDF statements, store them securely, deliver them via email, and provide authors with self-service portal access.

The statement system is the final link in the royalty workflow chain: sales data → calculation engine → statement generation → author notification → portal access. This creates complete transparency for authors while reducing publisher support burden through self-service capabilities.

## Objectives and Scope

**In Scope:**
- Statements database schema with PDF storage references
- PDF statement generation using React Email templates
- S3 integration for PDF storage with presigned URLs
- Statement generation wizard for Finance users (period selection, author selection, preview)
- Email delivery via Resend with PDF attachments
- Statements list and detail view for Finance role
- Author portal with statement access (view, download)
- RLS policies for author-specific data isolation

**Out of Scope:**
- Payment processing integration (future enhancement)
- Real-time sales dashboards for authors (Growth feature)
- Multi-currency support (post-MVP)
- Direct messaging between authors and publishers
- Tax form generation (1099s - post-MVP)

## System Architecture Alignment

**Architecture References:**
- **Database:** Neon PostgreSQL with RLS (statements table per architecture.md data schema)
- **Background Jobs:** Inngest for async PDF generation and email delivery
- **File Storage:** AWS S3 with presigned URLs (15-minute expiry) per architecture.md
- **Email:** Resend + React Email per architecture.md decision
- **Auth:** Clerk with role-based authorization (Finance, Author roles)

**Component Integration:**
- Extends existing `contracts` table (FK relationships)
- Integrates with royalty calculator from Epic 4 (`src/modules/royalties/calculator.ts`)
- Uses existing author RLS patterns from Epic 2
- Follows module pattern: `src/modules/statements/`

## Detailed Design

### Services and Modules

| Module | Responsibility | Inputs | Outputs |
|--------|---------------|--------|---------|
| `src/modules/statements/` | Statement CRUD, generation orchestration | Period, author selection, calculation data | Statement records, generation status |
| `src/modules/statements/pdf-generator.ts` | React Email → PDF conversion | Statement data, tenant branding | PDF buffer, S3 upload |
| `src/modules/statements/email-service.ts` | Resend integration | Statement record, author email | Delivery status, email_sent_at |
| `src/inngest/generate-statements.ts` | Background job orchestration | Statement request params | Completed statements with PDFs |
| `src/app/(portal)/` | Author portal pages | Author context from RLS | Statement views, PDF downloads |

### Data Models and Contracts

**New Table: `statements`**

```typescript
// src/db/schema/statements.ts
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
    scale: 2
  }).notNull(),
  recoupment: decimal("recoupment", { precision: 10, scale: 2 }).notNull(),
  net_payable: decimal("net_payable", { precision: 10, scale: 2 }).notNull(),
  calculations: jsonb("calculations").notNull(), // Full calculation breakdown
  pdf_s3_key: text("pdf_s3_key"), // S3 object key: statements/{tenant_id}/{statement_id}.pdf
  status: text("status").notNull().default("draft"), // draft, sent, failed
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

**Indexes:**
- `tenant_id` (RLS enforcement)
- `author_id` (author portal queries)
- `(period_start, period_end)` (period filtering)
- `status` (queue management)

**JSONB `calculations` Structure:**
```typescript
interface StatementCalculations {
  period: { startDate: string; endDate: string };
  formatBreakdowns: Array<{
    format: "physical" | "ebook" | "audiobook";
    totalQuantity: number;
    totalRevenue: number;
    tierBreakdowns: Array<{
      tierMinQuantity: number;
      tierMaxQuantity: number | null;
      tierRate: number;
      quantityInTier: number;
      royaltyEarned: number;
    }>;
    formatRoyalty: number;
  }>;
  returnsDeduction: number;
  grossRoyalty: number;
  advanceRecoupment: {
    originalAdvance: number;
    previouslyRecouped: number;
    thisPeriodsRecoupment: number;
    remainingAdvance: number;
  };
  netPayable: number;
}
```

**RLS Policies:**

```sql
-- Tenant isolation (standard)
CREATE POLICY tenant_isolation ON statements
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Author portal isolation (author can only see own statements)
CREATE POLICY author_portal_access ON statements
  FOR SELECT
  USING (
    author_id = (
      SELECT a.id FROM authors a
      JOIN users u ON u.id = a.portal_user_id
      WHERE u.clerk_user_id = current_setting('app.current_user_id')
    )
  );
```

### APIs and Interfaces

**Server Actions (`src/modules/statements/actions.ts`):**

```typescript
// Generate statements for selected authors and period
export async function generateStatements(data: {
  periodStart: Date;
  periodEnd: Date;
  authorIds: string[]; // Empty = all authors
  sendEmail: boolean;
}): Promise<ActionResult<{ jobId: string; authorCount: number }>>;

// Get statement by ID (Finance role)
export async function getStatementById(
  id: string
): Promise<ActionResult<StatementWithDetails>>;

// Get statements list with filters (Finance role)
export async function getStatements(params: {
  page?: number;
  periodStart?: Date;
  periodEnd?: Date;
  authorId?: string;
  status?: "draft" | "sent" | "failed";
}): Promise<ActionResult<{ statements: Statement[]; total: number }>>;

// Resend email for statement
export async function resendStatementEmail(
  statementId: string
): Promise<ActionResult<{ sent: boolean }>>;

// Get presigned download URL
export async function getStatementDownloadUrl(
  statementId: string
): Promise<ActionResult<{ url: string; expiresAt: Date }>>;

// Author portal: get own statements
export async function getMyStatements(): Promise<ActionResult<Statement[]>>;
```

**Inngest Functions (`src/inngest/generate-statements.ts`):**

```typescript
// Bulk statement generation job
export const generateStatementsBatch = inngest.createFunction(
  { id: "generate-statements-batch" },
  { event: "statements/generate.batch" },
  async ({ event, step }) => {
    const { tenantId, periodStart, periodEnd, authorIds, sendEmail, userId } = event.data;

    // Step 1: Calculate royalties for each author
    const calculations = await step.run("calculate-royalties", async () => {
      // Use calculator from Epic 4
    });

    // Step 2: Generate PDFs
    const pdfs = await step.run("generate-pdfs", async () => {
      // React Email → PDF → S3
    });

    // Step 3: Send emails (if requested)
    if (sendEmail) {
      await step.run("send-emails", async () => {
        // Resend API
      });
    }

    return { completed: authorIds.length, failed: 0 };
  }
);
```

### Workflows and Sequencing

**Statement Generation Flow:**

```
1. Finance User → Statement Wizard (modal)
   ├─ Step 1: Select Period (Q1 2025, Annual 2024, Custom)
   ├─ Step 2: Select Authors (all or specific)
   ├─ Step 3: Preview Calculations (table with estimates)
   └─ Step 4: Generate & Send options

2. Submit → Server Action
   └─ Enqueue Inngest job with params

3. Inngest Job (background):
   ├─ For each author:
   │   ├─ Run royalty calculator (Epic 4)
   │   ├─ Create statement record (draft)
   │   ├─ Generate PDF with React Email
   │   ├─ Upload PDF to S3
   │   ├─ Update statement with pdf_s3_key
   │   ├─ Send email via Resend (if enabled)
   │   └─ Update status to "sent"
   └─ Notify completion

4. Finance User → View statements list
   └─ Monitor status, resend emails, download PDFs
```

**Author Portal Flow:**

```
1. Author logs in via Clerk
2. Middleware extracts author context from user record
3. Portal page queries statements with RLS
4. Author sees only own statements
5. Click "View" → Statement detail page
6. Click "Download" → Presigned S3 URL (15 min)
```

## Non-Functional Requirements

### Performance

| Metric | Target | Implementation |
|--------|--------|----------------|
| Statement list load | < 2s | Paginated queries, indexed columns |
| PDF generation per author | < 30s | Inngest async, Puppeteer optimization |
| Bulk generation (50 authors) | < 10 min | Parallel processing in Inngest |
| S3 presigned URL generation | < 100ms | Lightweight SDK call |
| Email delivery | < 5s per email | Resend API SLA |

### Security

**Data Protection:**
- PDF statements contain financial data - stored in S3 with server-side encryption
- Presigned URLs expire after 15 minutes (configurable)
- Tax IDs never included in statements (separate from author profile)
- RLS enforces author can only access own statements

**Authorization Matrix:**

| Action | Owner | Admin | Finance | Editor | Author |
|--------|-------|-------|---------|--------|--------|
| Generate statements | ✅ | ✅ | ✅ | ❌ | ❌ |
| View all statements | ✅ | ✅ | ✅ | ❌ | ❌ |
| View own statements | ✅ | ✅ | ✅ | ✅ | ✅ |
| Download PDF | ✅ | ✅ | ✅ | ❌ | ✅ (own) |
| Resend email | ✅ | ✅ | ✅ | ❌ | ❌ |
| Access portal | ❌ | ❌ | ❌ | ❌ | ✅ |

### Reliability/Availability

**Failure Handling:**
- PDF generation failure: Retry 3x with exponential backoff
- Email delivery failure: Statement still saved, admin notified, manual resend available
- S3 upload failure: Rollback statement to draft status, log error
- Inngest job timeout: Partial completion tracked, resume capability

**Data Integrity:**
- Transaction wraps statement creation + calculation storage
- PDF S3 key only set after successful upload confirmed
- email_sent_at only set after Resend API confirms acceptance

### Observability

**Logging Requirements:**
```typescript
logger.info("Statement generation started", {
  tenantId, periodStart, periodEnd, authorCount
});

logger.info("PDF generated", {
  statementId, authorId, pdfSizeBytes, s3Key
});

logger.info("Email sent", {
  statementId, authorId, resendMessageId
});

logger.error("PDF generation failed", {
  statementId, authorId, error: error.message
});
```

**Metrics to Track:**
- Statements generated per period
- PDF generation duration (p50, p95)
- Email delivery success rate
- Author portal usage (views, downloads)
- Inngest job completion rate

## Dependencies and Integrations

**Existing Dependencies (already in package.json):**
| Package | Version | Purpose |
|---------|---------|---------|
| `@aws-sdk/client-s3` | ^3.940.0 | S3 PDF storage |
| `@aws-sdk/s3-request-presigner` | ^3.940.0 | Presigned download URLs |
| `react-email` | ^5.0.5 | PDF template rendering |
| `resend` | ^6.5.2 | Email delivery |
| `inngest` | ^3.46.0 | Background job processing |
| `decimal.js` | ^10.6.0 | Financial calculations (via Epic 4) |

**New Dependencies Required:**
| Package | Purpose | Notes |
|---------|---------|-------|
| `@react-pdf/renderer` | React → PDF conversion | Alternative to Puppeteer, pure JS |

**Internal Dependencies:**
- Epic 4: Royalty calculation engine (`src/modules/royalties/calculator.ts`)
- Epic 2: Author portal access (`authors.portal_user_id`)
- Epic 4: Contracts table (FK for statement generation)

**Environment Variables Required:**
```bash
# S3 Configuration (likely existing from other features)
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET=salina-erp-statements

# Resend (for email)
RESEND_API_KEY=re_...

# Inngest (likely existing)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

## Acceptance Criteria (Authoritative)

**Story 5.1: Create Statements Database Schema and PDF Storage**
1. AC-5.1.1: `statements` table created with all columns per spec
2. AC-5.1.2: JSONB `calculations` field stores full breakdown structure
3. AC-5.1.3: Foreign keys to authors, contracts, users enforced
4. AC-5.1.4: RLS policy isolates statements by tenant_id
5. AC-5.1.5: Author-specific RLS policy restricts portal queries to own statements
6. AC-5.1.6: Indexes created on tenant_id, author_id, period columns

**Story 5.2: Implement PDF Statement Generation with React Email**
1. AC-5.2.1: PDF template includes company logo, period, author info
2. AC-5.2.2: Summary section shows net payable, gross royalties, recoupment
3. AC-5.2.3: Sales breakdown table shows title, format, units, rate, royalty
4. AC-5.2.4: Returns section (if applicable) shows impact
5. AC-5.2.5: Advance recoupment section shows progress
6. AC-5.2.6: PDF uploads to S3 with key pattern `statements/{tenant_id}/{statement_id}.pdf`
7. AC-5.2.7: Generation runs as Inngest background job

**Story 5.3: Build Statement Generation Wizard for Finance**
1. AC-5.3.1: 4-step wizard: Period → Authors → Preview → Generate
2. AC-5.3.2: Period selection supports Quarterly, Annual, Custom
3. AC-5.3.3: Author selection allows "Select All" or individual checkboxes
4. AC-5.3.4: Preview shows calculation estimates before generation
5. AC-5.3.5: Submit enqueues Inngest job for background processing
6. AC-5.3.6: Progress indicator shows completion status
7. AC-5.3.7: Only Finance, Admin, Owner roles can access wizard

**Story 5.4: Implement Statement Email Delivery with Resend**
1. AC-5.4.1: Email template includes subject, summary, CTA button
2. AC-5.4.2: PDF attached to email
3. AC-5.4.3: email_sent_at recorded in database
4. AC-5.4.4: Failed deliveries retry 3x
5. AC-5.4.5: Failed emails allow manual resend from UI

**Story 5.5: Build Statements List and Detail View for Finance**
1. AC-5.5.1: Table displays period, author, date, status, net payable
2. AC-5.5.2: Filters by period, author, status
3. AC-5.5.3: Detail modal shows full calculation breakdown
4. AC-5.5.4: Download PDF button generates presigned URL
5. AC-5.5.5: Resend Email action available for sent statements

**Story 5.6: Build Author Portal Statement Access**
1. AC-5.6.1: Portal accessible at /portal with simplified nav
2. AC-5.6.2: Statement list shows only author's own statements
3. AC-5.6.3: Detail view matches PDF content structure
4. AC-5.6.4: Download PDF generates presigned S3 URL
5. AC-5.6.5: RLS prevents access to other authors' data
6. AC-5.6.6: Mobile-responsive design

## Traceability Mapping

| AC | Spec Section | Component(s) | Test Idea |
|----|--------------|--------------|-----------|
| AC-5.1.1 | Data Models | `src/db/schema/statements.ts` | Migration test, column validation |
| AC-5.1.4 | Data Models - RLS | DB policies | Cross-tenant query returns empty |
| AC-5.1.5 | Data Models - RLS | DB policies | Author query only returns own |
| AC-5.2.1-5.2.5 | PDF template | `pdf-generator.ts`, React Email | Visual regression, content validation |
| AC-5.2.6 | S3 Integration | `storage.ts`, `pdf-generator.ts` | Upload success, key format correct |
| AC-5.2.7 | Background Jobs | `generate-statements.ts` (Inngest) | Job completes, status updates |
| AC-5.3.1-5.3.4 | Wizard Flow | `statement-wizard.tsx` | E2E flow test with mock data |
| AC-5.3.7 | Authorization | `actions.ts` permission check | Unauthorized role returns error |
| AC-5.4.1-5.4.3 | Email Delivery | `email-service.ts`, Resend | Email sent, timestamp recorded |
| AC-5.5.1-5.5.5 | Finance Views | `statements-list.tsx`, `statement-detail.tsx` | UI renders, actions work |
| AC-5.6.1-5.6.6 | Author Portal | `app/(portal)/` pages | Portal isolated, mobile viewport |

## Risks, Assumptions, Open Questions

**Risks:**

| Risk | Impact | Mitigation |
|------|--------|------------|
| PDF generation slow for large statements | High | Optimize template, cache common elements, consider pagination |
| S3 presigned URL expiry causes download failures | Medium | Show expiry warning, regenerate on demand |
| Inngest job failures lose calculation data | High | Store calculation before PDF generation, retry logic |
| Email marked as spam | Medium | Configure SPF/DKIM for tenant domains, monitor deliverability |

**Assumptions:**
- AWS S3 bucket already configured (from Epic 4 or infrastructure setup)
- Resend API key provisioned with adequate sending limits
- Inngest endpoint configured in application
- Authors have valid email addresses in author records
- Royalty calculation engine from Epic 4 is complete and tested

**Open Questions:**
1. ❓ Should statement generation be triggered automatically on schedule (e.g., quarterly cron)?
   - *Recommendation:* Start with manual trigger, add scheduled option in future
2. ❓ What is the PDF retention policy? Delete after X years?
   - *Recommendation:* Retain indefinitely for audit, implement lifecycle policy later
3. ❓ Should authors be notified when new statement available even if email fails?
   - *Recommendation:* Yes, add in-app notification system in future epic

## Test Strategy Summary

**Unit Tests:**
- PDF template rendering with sample data
- Calculation breakdown formatting
- S3 key generation logic
- Email template rendering
- Presigned URL generation

**Integration Tests:**
- Full statement generation flow (calculation → PDF → S3 → DB)
- Email delivery via Resend (with test mode)
- Author portal RLS enforcement
- Inngest job completion

**E2E Tests:**
- Finance wizard flow: select period → authors → preview → generate
- Finance view: list → detail → download PDF → resend email
- Author portal: login → view statements → download PDF
- Permission enforcement: Editor/Author cannot access Finance features

**Performance Tests:**
- Bulk generation with 50+ authors
- Concurrent PDF downloads
- Portal list query with 100+ statements

---

*Generated by BMM Workflow v6.0*
*Project: Salina ERP*
*Epic: 5 - Royalty Statements & Author Portal*
