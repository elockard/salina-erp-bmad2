# Epic 4 Retrospective: Royalty Contracts & Calculation Engine

**Date**: November 30, 2025
**Facilitator**: Bob (Scrum Master)
**Attendees**: BMad (Project Lead), Alice (Product Owner), Charlie (Senior Dev), Dana (QA Engineer), Elena (Junior Dev), Winston (Architect)

---

## Executive Summary

Epic 4 completed with **5/5 stories delivered** (100% completion rate). All stories passed code review and were marked done. The epic established the royalty contract management system with tiered calculations, advance tracking, and a manual calculation testing interface.

**Key Achievement**: Complete royalty calculation engine with pure function design, enabling dry-run testing and setting the foundation for Epic 5 statement generation.

**Significant Discoveries**:
1. Fiscal year flexibility needed for Epic 5 (payment date vs earning period for 1099 reporting)
2. Deployment platform is Fly.io, not Vercel (architecture review needed)

---

## Epic 4 Delivery Metrics

### Story Completion

| Story | Description | Status | Tests | Review |
|-------|-------------|--------|-------|--------|
| 4.1 | Royalty Contract Database Schema with Tiered Rates | done | 54 unit | APPROVED |
| 4.2 | Contract Creation Form with Tiered Royalty Configuration | done | 53 unit | APPROVED |
| 4.3 | Contract Detail View and Management | done | 82 unit | APPROVED |
| 4.4 | Tiered Royalty Calculation Engine | done | 20 unit | APPROVED |
| 4.5 | Manual Royalty Calculation Trigger (Testing) | done | 41 unit | APPROVED |

- **Total Stories**: 5
- **Completed**: 5 (100%)
- **Total Tests Created**: 250
- **All Code Reviews**: APPROVED

### Quality Metrics

- **HIGH Severity Issues Found in Review**: 0
- **MEDIUM Severity Issues Found**: 0
- **All Issues Resolved**: Yes
- **Production Blockers**: 0
- **Technical Debt Items**: 0 critical

### Business Outcomes

- Royalty contract CRUD with tiered rates by format (physical, ebook, audiobook)
- 5-step wizard for contract creation with validation
- Pure royalty calculation engine using Decimal.js for financial precision
- Advance tracking with recoupment logic
- Manual calculation testing interface for Finance users
- Complete audit trail for all contract operations

---

## Previous Retrospective Follow-Through (Epic 3)

| Action Item | Priority | Epic 3 Status | Epic 4 Follow-Through |
|-------------|----------|---------------|----------------------|
| Complete Story 0.1 (Auth Infrastructure) | BLOCKER | drafted | ✅ DONE - E2E tests working |
| Add `/` → `/dashboard` redirect | MEDIUM | Included in 0.1 | ✅ DONE |
| Plan Marketing Landing Page | LOW | Future backlog | ⏳ Still deferred |

**Impact**: Story 0.1 completion unblocked Epic 4. E2E tests now run instead of being skipped. Integration tests pass.

---

## What Went Well

### 1. Pure Calculation Function Design

The `calculateRoyaltyForPeriod` function in Story 4.4 was designed as a pure function with no side effects:
- No database writes
- Returns complete calculation breakdown
- Enabled Story 4.5's testing interface with zero additional logic
- Makes unit testing straightforward

### 2. Component Reuse: TierBuilder

The `contract-tier-builder.tsx` component created in Story 4.2 was reused in Story 4.3's edit modal:
- Same validation logic
- Consistent user experience
- Reduced code duplication
- Auto-fill tier minimum from previous max

### 3. Strong Test Coverage

250 new unit tests across 5 stories:
- Schema validation (Zod)
- Server Action logic
- Permission enforcement
- Calculation edge cases (tier boundaries, negative periods, advance recoupment)
- Decimal precision verification

### 4. Auth Infrastructure Investment Paid Off

Story 0.1 (auth testing fix) completed before Epic 4:
- E2E tests run successfully
- Integration tests pass
- Confidence in feature delivery

### 5. Clean Code Reviews

All 5 stories passed code review:
- 0 HIGH severity issues
- 0 MEDIUM severity issues
- Minor deferred items handled appropriately (e.g., AC 7 redirect in 4.2 → 4.3)

---

## What Could Be Improved

### 1. Client-Side Validation Documentation

**Issue**: Tier validation patterns (sequential, non-overlapping) not well documented in architecture
**Impact**: Extra learning time for developers
**Resolution**: Add client-side validation patterns to architecture or dev guide

### 2. Fiscal Year Flexibility (Significant Discovery)

**Issue**: System assumes royalty periods align with tax year
**Reality**: Some publishers use non-calendar fiscal years (e.g., July-June)
**Impact on Epic 5**:
- Statement schema needs `payment_date` field
- 1099 reporting based on payment date, not earning period
- `fiscal_year_start` tenant setting must be integrated

**Resolution**: PM to review Epic 5 stories before drafting

### 3. Deployment Platform Assumption

**Issue**: Architecture references Vercel patterns
**Reality**: Deployment platform is Fly.io
**Impact**: Docker container patterns, environment variable handling, Puppeteer compatibility
**Resolution**: Winston to review architecture.md

---

## Patterns & Learnings for Epic 5

### Established Patterns to Reuse

**1. Pure Function Pattern** (Story 4.4):
- Calculation logic separate from persistence
- Returns complete result object
- Enables dry-run testing and previews

**2. Multi-Step Wizard Pattern** (Story 4.2):
- Step-by-step form with validation per step
- Progress indicator
- Back/Next navigation
- Final review before submission

**3. Detail View Pattern** (Story 4.3):
- Server component for data fetch
- Client components for interactive elements
- Permission-gated actions
- Related data sections

**4. Decimal.js for Financial Math**:
- All currency calculations use Decimal.js
- Stored as DECIMAL in PostgreSQL
- Displayed with Intl.NumberFormat

### Technical Debt Carried Forward

| Item | Source | Priority |
|------|--------|----------|
| Architecture Fly.io review | Epic 4 retro | MEDIUM |
| Client-side validation docs | Epic 4 retro | LOW |

---

## Epic 5 Preparation

### Dependencies on Epic 4

Epic 5 (Royalty Statements & Author Portal) depends on:
- `calculateRoyaltyForPeriod` function - Story 5.2, 5.3
- Contract schema with tiers - Story 5.1 foreign keys
- `RoyaltyCalculation` type - Story 5.1 JSONB storage

### New Technologies in Epic 5

| Technology | Purpose | Setup Required |
|------------|---------|----------------|
| AWS S3 | PDF storage | Bucket configuration (guide created) |
| React Email | PDF templates | Package installation |
| Puppeteer | HTML-to-PDF | Container-compatible setup |
| Resend | Email delivery | API key setup |
| Inngest | Background jobs | Configuration |

### Preparation Checklist

| Category | Item | Owner | Priority | Status |
|----------|------|-------|----------|--------|
| PM Review | Update stories for fiscal year flexibility | John (PM) | HIGH | pending |
| Infrastructure | AWS S3 bucket configuration | BMad | HIGH | guide created |
| Infrastructure | Resend API key setup | BMad | HIGH | pending |
| Infrastructure | Inngest configuration | TBD | HIGH | pending |
| Research | React Email + Puppeteer spike | Charlie | MEDIUM | pending |
| Testing | PDF testing strategy | Dana | MEDIUM | pending |
| Documentation | Architecture Fly.io review | Winston | MEDIUM | pending |

---

## Significant Discoveries

### Discovery 1: Fiscal Year Flexibility

**Scenario Identified by BMad**:
- Royalty Period: July 1 - June 30 (fiscal year)
- Tax Year: January 1 - December 31 (calendar year)
- 1099 Reporting: Based on payment date, not earning period

**Current Gap**:
- Statement schema has `period_start`, `period_end` but no `payment_date`
- `fiscal_year_start` tenant setting exists but unused in calculations
- No way to query "payments made in calendar year X" for 1099s

**Required Changes for Epic 5**:
- Story 5.1: Add `payment_date` field to statements schema
- Story 5.3: Wizard should default periods based on tenant's fiscal year
- Story 5.5: Statement list should show payment status/date
- Epic 6: 1099 reporting queries by payment date

### Discovery 2: Fly.io Deployment

**Decision**: Deployment platform is Fly.io, not Vercel

**Implications**:
- Docker container deployment (full control)
- Better for Puppeteer/PDF generation (no serverless memory limits)
- IAM User with access keys (not IAM roles)
- Environment variables via `fly secrets`

**Action**: Review architecture.md for Vercel-specific patterns

---

## Action Items

| # | Action | Owner | Priority | Deadline |
|---|--------|-------|----------|----------|
| 1 | Review Epic 5 stories for fiscal year flexibility | John (PM) | HIGH | Before Epic 5 kickoff |
| 2 | Configure AWS S3 bucket per guide | BMad | HIGH | Before Story 5.1 |
| 3 | Set up Resend API account | BMad | HIGH | Before Story 5.4 |
| 4 | Review architecture.md for Fly.io | Winston | MEDIUM | Before Epic 5 |
| 5 | React Email + Puppeteer spike | Charlie | MEDIUM | During Story 5.2 |
| 6 | Define PDF testing strategy | Dana | MEDIUM | Before Story 5.2 |

---

## Documentation Created

- `docs/s3-configuration-guide.md` - Complete AWS S3 setup guide for Fly.io deployment

---

## Retrospective Metrics

**Session Duration**: ~45 minutes
**Significant Discoveries**: 2 (fiscal year flexibility, Fly.io deployment)
**Action Items Created**: 6
**Documentation Created**: 1 (S3 guide)

**Team Sentiment**: Confident and aligned. Clean epic execution with valuable discoveries for Epic 5.

---

## Conclusion

Epic 4 successfully delivered a complete royalty contract and calculation system. The pure function design for the calculation engine proved architecturally sound, enabling easy testing and setting up Epic 5 for success. Two significant discoveries (fiscal year flexibility and Fly.io deployment) have been captured for action before Epic 5 begins.

**Epic 4 Status**: COMPLETE ✅
**Epic 5 Status**: Ready to begin after preparation tasks

**Next Steps**:
1. PM reviews Epic 5 stories for fiscal year flexibility
2. BMad configures S3 bucket and Resend
3. Winston reviews architecture for Fly.io
4. Begin Epic 5 when preparation complete

---

**Retrospective Facilitated By**: Bob (Scrum Master)
**Document Version**: 1.0
**Date**: November 30, 2025
