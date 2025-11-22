# System-Level Test Design - Salina ERP

**Date:** 2025-11-21
**Author:** Murat (TEA - Master Test Architect)
**Status:** Draft
**Mode:** Phase 3 - Testability Review

---

## Executive Summary

**Assessment Result:** ✅ **PASS** with Minor Concerns

Salina ERP's architecture demonstrates strong testability fundamentals with a serverless-first Next.js 16 stack optimized for automated testing. The multi-tenant Row-Level Security (RLS) pattern, combined with Playwright test framework scaffolding already in place, positions the project well for comprehensive test coverage.

**Key Strengths:**
- Serverless architecture enables fast, isolated test environments
- Fixture composition pattern with auto-cleanup already scaffolded
- Data factories for all domain entities (Tenant, User, Author, Title, ISBN, Sales)
- Multi-tenant test isolation strategy documented
- RBAC testing patterns demonstrated in sample tests

**Minor Concerns:**
- Performance testing strategy not yet defined (royalty calculations may be computationally intensive)
- Multi-format royalty tier complexity requires edge case validation
- Advance recoupment edge cases (negative periods, partial recoupment) need explicit coverage

**Recommendation:** Proceed to implementation with prioritized test scenarios (Phase 4).

---

## Testability Assessment

### Controllability: ✅ PASS

**Can we control system state for testing?**

**Strengths:**
- ✅ **API-first seeding**: Server Actions provide direct database access for fixture setup
- ✅ **Drizzle ORM with transactions**: Database state can be reset/rolled back between tests
- ✅ **Data factories**: 6 faker-based factories already built (Tenant, User, Author, Title, ISBN, Sales)
- ✅ **Multi-tenant isolation**: Tenant factory generates unique subdomains preventing cross-tenant pollution
- ✅ **Clerk test accounts**: Sample tests demonstrate RBAC setup for 5 roles

**Evidence from Architecture:**
```typescript
// From architecture.md - Drizzle enables direct state control
const db = drizzle(sql);
await db.insert(tenants).values({ subdomain: 'testpub' }); // Direct control

// From test framework - Auto-cleanup pattern
export const test = base.extend<TestFixtures>({
  tenantFactory: async ({}, use) => {
    const factory = new TenantFactory();
    await use(factory);
    await factory.cleanup(); // Automated cleanup
  },
});
```

**Can we trigger error conditions?**

- ✅ **Fault injection via route mocking**: Playwright intercepts enable simulating 500 errors, timeouts
- ✅ **Negative test data**: Factories support override patterns for invalid inputs
- ✅ **Edge case data**: ISBN check digit validation, negative quantities, tiered boundary conditions

**Gaps/Concerns:**
- ⚠️ **Background jobs (Inngest)**: No strategy yet for controlling/mocking async PDF generation and email delivery in tests
  - **Mitigation**: Use Inngest test utilities or mock event handlers

---

### Observability: ✅ PASS

**Can we inspect system state?**

**Strengths:**
- ✅ **Database query access**: Drizzle ORM enables direct state inspection
- ✅ **API endpoints for validation**: GET endpoints allow verifying state changes
- ✅ **Structured responses**: JSON responses from Server Actions are parseable
- ✅ **Network interception**: Playwright `waitForResponse()` captures API traffic for validation

**Evidence from Sample Tests:**
```typescript
// From tests/e2e/sales.spec.ts - Explicit state validation
await expect(page.locator('[data-testid="total-amount"]')).toContainText('$3,748.50');

// Can verify database state directly
const saleResponse = await request.get(`/api/sales/${saleId}`);
const sale = await saleResponse.json();
expect(sale.total_amount).toBe(3748.50);
```

**Are test results deterministic?**

- ✅ **Network-first pattern**: Sample tests use `waitForResponse()` instead of hard waits
- ✅ **Isolated data**: Faker-based factories generate unique data (no hardcoded IDs)
- ✅ **Auto-cleanup**: Fixtures prevent state pollution between tests

**Can we validate NFRs?**

- ✅ **Security**: Clerk + RLS enable auth/authz testing (sample RBAC tests exist)
- ⚠️ **Performance**: No performance test strategy yet (k6 or load testing framework not integrated)
  - **Mitigation**: Add k6 load testing for royalty calculation endpoints
- ✅ **Reliability**: Error handling testable via route mocking

**Gaps/Concerns:**
- ⚠️ **Advance recoupment determinism**: Complex tiered royalty + advance logic needs seeded edge cases
  - **Mitigation**: Create `createTieredSales()` fixtures with known boundary values

---

### Reliability: ✅ PASS with Concerns

**Are tests isolated?**

**Strengths:**
- ✅ **Parallel-safe fixtures**: Auto-cleanup pattern prevents cross-test pollution
- ✅ **Unique tenant subdomains**: Faker-generated subdomains prevent multi-tenant collisions
- ✅ **Stateless application**: Next.js serverless architecture supports parallel test workers
- ✅ **Transaction-based cleanup**: Drizzle transactions enable rollback on test failure

**Evidence:**
```typescript
// From playwright.config.ts (to be created)
fullyParallel: true, // Tests run in parallel
workers: process.env.CI ? 1 : undefined, // Local: max parallelism

// From test framework - Isolation via unique data
const tenant = await tenantFactory.createTenant({
  subdomain: `test${faker.string.alphanumeric(8).toLowerCase()}` // Unique each run
});
```

**Can we reproduce failures?**

- ✅ **Trace capture on failure**: Playwright config captures screenshots, video, trace
- ✅ **Seeded data**: Factories enable reproducing exact test scenarios
- ✅ **HAR capture capability**: Network traffic recordable for debugging

**Are components loosely coupled?**

- ✅ **Server Actions as boundaries**: Clear separation between UI and business logic
- ✅ **Drizzle schema as contracts**: Database schema defines testable boundaries
- ⚠️ **Royalty calculation engine**: Complex tiered calculation logic needs unit-level isolation
  - **Recommendation**: Extract royalty calculation to pure functions (unit testable)

**Gaps/Concerns:**
- ⚠️ **Inngest background jobs**: PDF generation/email delivery introduce async complexity
  - **Risk**: Tests may need to poll for completion or mock job execution
  - **Mitigation**: Test royalty calculations at API level (sync), mock PDF/email in E2E tests
- ⚠️ **S3 file uploads**: CSV imports (ISBN batches) require mock or test bucket
  - **Mitigation**: Use in-memory storage adapter for tests or dedicated test bucket

---

## Architecturally Significant Requirements (ASRs)

### High-Risk Quality Requirements (Score ≥6)

| ASR ID | Requirement | Category | Probability | Impact | Score | Testability Impact |
|--------|-------------|----------|-------------|--------|-------|-------------------|
| ASR-001 | Multi-tenant data isolation (RLS enforced) | SEC | 3 | 3 | **9** | Critical - Requires tenant leak tests across all modules |
| ASR-002 | Tiered royalty calculation accuracy | DATA | 2 | 3 | **6** | High - Complex edge cases (tier boundaries, negative periods, advance recoupment) |
| ASR-003 | ISBN uniqueness constraint | DATA | 2 | 3 | **6** | Medium - Requires collision detection tests |
| ASR-004 | Returns approval workflow integrity | BUS | 2 | 3 | **6** | Medium - Only approved returns affect royalties |
| ASR-005 | Quarterly statement generation performance | PERF | 2 | 2 | **4** | Medium - Load testing required for multi-author batches |

### ASR-001: Multi-Tenant Data Isolation (Score 9 - CRITICAL)

**Architectural Decision:** Shared tables with `tenant_id` + Row-Level Security (RLS)

**Quality Requirement:**
> "System enforces Row-Level Security to prevent cross-tenant data access" (FR7)
> "Automated tests verify no cross-tenant data leakage" (NFR - Security)

**Testability Strategy:**

1. **Unit Level**: RLS policy validation (database level)
   - Verify RLS policies exist on all tenant-scoped tables
   - Test policy logic with direct SQL queries

2. **Integration Level**: Server Action authorization checks
   - Verify tenant context middleware extracts correct tenant from subdomain
   - Test Server Actions reject cross-tenant requests (403)

3. **E2E Level**: Complete isolation workflow
   - Create data in Tenant A, attempt access from Tenant B subdomain
   - Verify zero cross-contamination in search, reports, APIs

**Test Coverage Plan:**
- **P0 Tests (Critical)**:
  - Multi-tenant author search isolation
  - Multi-tenant sales transaction isolation
  - Multi-tenant royalty statement isolation
- **Estimated Effort**: 12 hours (4 tests × 3 hours each)

**Risk Mitigation:**
- Create dedicated `tenant-isolation.spec.ts` test suite
- Run isolation tests on every PR (gate blocker)
- Automated RLS policy linting (verify all tables have tenant_id + RLS)

---

### ASR-002: Tiered Royalty Calculation Accuracy (Score 6 - HIGH)

**Architectural Decision:** Tiered royalty rates with advance recoupment logic

**Quality Requirement:**
> "System applies tiered royalty rates based on sales volume and format" (FR47)
> "System calculates advance recoupment from positive royalty earnings" (FR48)
> "System handles negative periods (more returns than sales) without reversing recouped advances" (FR50)

**Complex Edge Cases:**

1. **Tier boundary transitions**: 4,999 → 5,000 units (rate change mid-period)
2. **Multi-format tiering**: Physical (10%/12%/15%) vs Ebook (8%/10%/12%) different tiers
3. **Advance recoupment edge cases**:
   - Partial recoupment (earn $500, owe $1,000 advance)
   - Full recoupment in single period
   - Negative periods after full recoupment (returns > sales)
4. **Floating-point precision**: Financial calculations use Decimal.js (architecture decision)

**Testability Strategy:**

1. **Unit Level**: Pure function royalty calculation
   - **Recommendation**: Extract royalty engine to `src/lib/royalty-calculator.ts` (pure functions)
   - Test tier boundaries with exact values (4,999 vs 5,000 vs 5,001 units)
   - Test advance recoupment edge cases with controlled scenarios

2. **Integration Level**: Royalty API endpoint
   - Seed known sales/returns data via factories
   - Call `/api/royalties/calculate` endpoint
   - Verify JSON response matches expected tier application

3. **E2E Level**: Statement generation workflow
   - Finance user triggers statement generation
   - Verify PDF contains correct tier breakdown
   - Verify advance recoupment displayed accurately

**Test Coverage Plan:**
- **P0 Tests**:
  - Tier boundary transitions (4 tests)
  - Advance recoupment edge cases (3 tests)
  - Multi-format tier application (2 tests)
- **P1 Tests**:
  - Negative periods with zero recoupment reversal (2 tests)
  - Decimal precision validation (2 tests)
- **Estimated Effort**: 18 hours (13 tests × 1.5 hours avg)

**Risk Mitigation:**
- Create `royalty-calculator.test.ts` unit tests FIRST (TDD approach)
- Use `createTieredSales()` factory for known boundary scenarios
- Implement property-based testing for decimal precision (fuzz testing)

---

### ASR-003: ISBN Uniqueness Constraint (Score 6 - HIGH)

**Architectural Decision:** ISBN pool management with database uniqueness constraint

**Quality Requirement:**
> "System prevents duplicate ISBN assignment across all titles" (FR19)
> "System validates ISBN-13 format before accepting" (FR21)

**Edge Cases:**
- Concurrent ISBN assignment (race condition)
- ISBN pool exhaustion (no available ISBNs)
- Invalid ISBN-13 check digit

**Testability Strategy:**

1. **Unit Level**: ISBN check digit validation
   - Test `calculateISBN13CheckDigit()` with known ISBNs
   - Verify invalid check digits rejected

2. **Integration Level**: Database constraint enforcement
   - Attempt duplicate ISBN insertion (expect 409 Conflict)
   - Test concurrent assignment with parallel requests

3. **E2E Level**: ISBN assignment workflow
   - Assign ISBN to Title A
   - Attempt to assign same ISBN to Title B (expect error)

**Test Coverage Plan:**
- **P0 Tests**: Duplicate assignment prevention (2 tests)
- **P1 Tests**: Concurrent assignment race conditions (2 tests)
- **P2 Tests**: Check digit validation (3 tests)
- **Estimated Effort**: 8 hours

---

## Test Levels Strategy

### Recommended Test Distribution

Based on architecture characteristics:
- **Serverless Next.js 16**: Fast Server Component integration tests
- **Complex business logic**: Tiered royalties, advance recoupment require unit-level precision
- **Multi-tenant SaaS**: E2E tests validate complete tenant isolation

**Test Pyramid:**

```
        E2E (20%)
       /         \
  Integration (30%)
     /             \
  Unit (50%)
```

**Rationale:**

- **Unit (50%)**: Highest ROI for complex royalty calculations, ISBN validation, financial logic
  - Fast feedback (<10ms per test)
  - Edge case coverage (tier boundaries, decimal precision)
  - Pure functions (royalty calculator, ISBN check digit)

- **Integration (30%)**: Server Action contracts and database operations
  - API endpoint validation (Server Actions return correct JSON)
  - Database constraints (uniqueness, RLS)
  - Moderate speed (100-500ms per test)

- **E2E (20%)**: Critical user journeys only
  - Multi-tenant isolation (cross-tenant leak tests)
  - RBAC enforcement (role-specific access)
  - Complete workflows (statement generation end-to-end)
  - Slower (5-30 seconds per test)

**Why This Distribution:**

Publishing domain has **high business logic complexity** (tiered royalties, advance recoupment) that benefits from granular unit testing. Multi-tenant SaaS adds **isolation verification** requirement at E2E level. Balance optimizes for:
- Fast feedback loop (50% unit tests)
- Confidence in integration points (30% API tests)
- Real-world workflows (20% E2E)

---

## NFR Testing Approach

### Security (SEC) - RBAC and Multi-Tenant Isolation

**Tools**: Playwright E2E + Security Audit Tools

**Test Scenarios:**

1. **Authentication (Clerk Integration)**
   - ✅ Unauthenticated users redirected to login (sample test exists)
   - ⚠️ Token expiration after 15 minutes (add test)
   - ⚠️ MFA enforcement for Admin/Finance roles (add test)

2. **Authorization (RBAC)**
   - ✅ Editor cannot access Returns approval (sample test exists)
   - ✅ Finance can approve Returns (sample test exists)
   - ⚠️ Author cannot view other authors' statements (add test)
   - ⚠️ Cross-role privilege escalation blocked (add test)

3. **Multi-Tenant Isolation (RLS)**
   - ✅ Cross-tenant data isolation (sample test exists)
   - ⚠️ RLS policy enforcement on all tenant-scoped tables (automated linting)
   - ⚠️ Subdomain spoofing prevention (middleware validation)

4. **OWASP Top 10**
   - ⚠️ SQL injection blocked (add test - parameterized queries)
   - ⚠️ XSS sanitization (add test - React auto-escaping)
   - ⚠️ CSRF protection on Server Actions (add test)

**Security NFR Criteria:**
- ✅ PASS: All auth/authz/RLS tests green, no critical vulnerabilities
- ⚠️ CONCERNS: Minor gaps (MFA, XSS) with mitigation plans
- ❌ FAIL: Cross-tenant leak or privilege escalation possible

**Estimated Effort**: 16 hours (8 additional security tests)

---

### Performance (PERF) - Royalty Calculation SLOs

**Tools**: k6 Load Testing (NOT Playwright)

**Critical Performance Requirements:**

From PRD NFRs:
> "Royalty calculation for quarterly statement completes in < 30 seconds per author" (Performance NFR)
> "Page loads complete in < 2 seconds for dashboard and list views" (Performance NFR)

**Test Scenarios:**

1. **Royalty Calculation Performance**
   - **SLO**: Calculate quarterly statement for single author in <30s
   - **Test**: Load test with 100 authors, 1,000 sales each → measure p95 latency
   - **Tool**: k6 load testing script

2. **Dashboard Load Time**
   - **SLO**: Dashboard loads in <2s
   - **Test**: Measure Core Web Vitals (LCP, FID, CLS) with Lighthouse
   - **Tool**: Playwright + Lighthouse integration

3. **Search and Autocomplete**
   - **SLO**: Title search results in <300ms
   - **Test**: k6 stress test with 1,000 concurrent searches
   - **Tool**: k6

**k6 Test Strategy:**

```javascript
// tests/nfr/performance.k6.js
export const options = {
  stages: [
    { duration: '1m', target: 50 },  // Ramp to 50 users
    { duration: '3m', target: 50 },  // Sustain
    { duration: '1m', target: 100 }, // Spike to 100
  ],
  thresholds: {
    'http_req_duration': ['p(95)<2000'], // 95% under 2s
    'http_req_duration{endpoint:royalty}': ['p(95)<30000'], // Royalty <30s
  },
};
```

**Performance NFR Criteria:**
- ✅ PASS: SLOs met with k6 evidence (p95 <2s dashboard, <30s royalty calc)
- ⚠️ CONCERNS: Trending toward limits (p95 = 28s approaching 30s threshold)
- ❌ FAIL: SLO breached (p95 >30s for royalty calculations)

**Gaps/Concerns:**
- ⚠️ **Performance testing not yet integrated**: k6 not installed, no baseline metrics
  - **Mitigation**: Add k6 in Sprint 0, establish baseline before implementation

**Estimated Effort**: 12 hours (k6 setup + 3 load test scenarios)

---

### Reliability (REL) - Error Handling and Recovery

**Tools**: Playwright E2E + API Tests

**Test Scenarios:**

1. **Graceful Degradation**
   - ⚠️ API 500 error shows user-friendly message (add test)
   - ⚠️ Failed PDF generation retries with exponential backoff (add test)
   - ⚠️ Email delivery failure logs error, queues retry (add test)

2. **Retry Logic**
   - ⚠️ Transient failures (503) retry 3 times before failing (add test)
   - ⚠️ Background jobs (Inngest) retry on failure (add test)

3. **Health Checks**
   - ⚠️ `/api/health` endpoint monitors database, S3, email service (add endpoint + test)

4. **Circuit Breaker**
   - ⚠️ External service failures trigger fallback behavior (add test)

**Reliability NFR Criteria:**
- ✅ PASS: Error handling, retries, health checks verified
- ⚠️ CONCERNS: Partial coverage (missing circuit breaker)
- ❌ FAIL: No recovery path (500 error crashes app)

**Gaps/Concerns:**
- ⚠️ **Background job testing**: Inngest integration not tested yet
  - **Mitigation**: Add Inngest test utilities, mock event handlers

**Estimated Effort**: 10 hours (5 reliability tests)

---

### Maintainability (MAINT) - Code Quality and Observability

**Tools**: CI Tools (GitHub Actions, not Playwright)

**Test Scenarios:**

1. **Test Coverage**
   - ⚠️ Target: ≥80% coverage for business logic (royalty calculations, RBAC)
   - **Tool**: Jest/Vitest coverage reports in CI

2. **Code Duplication**
   - ⚠️ Target: <5% duplication
   - **Tool**: jscpd in CI pipeline

3. **Vulnerability Scanning**
   - ⚠️ No critical/high vulnerabilities
   - **Tool**: `npm audit` in CI

4. **Observability Validation**
   - ⚠️ Error tracking configured (Sentry integration)
   - ⚠️ Structured logging with trace IDs
   - **Tool**: Playwright E2E validates telemetry headers

**Maintainability NFR Criteria:**
- ✅ PASS: 80%+ coverage, <5% duplication, no critical vulnerabilities, observability validated
- ⚠️ CONCERNS: Coverage 60-79%, duplication 5-10%
- ❌ FAIL: <60% coverage, >10% duplication, critical vulnerabilities

**Gaps/Concerns:**
- ⚠️ **CI pipeline not configured**: No coverage/audit gates yet
  - **Mitigation**: Configure GitHub Actions in Sprint 0

**Estimated Effort**: 8 hours (CI pipeline setup)

---

## Test Environment Requirements

### Environment Strategy

**Local Development:**
- **Database**: Neon PostgreSQL development branch (isolated from staging/production)
- **Auth**: Clerk development instance with test users
- **File Storage**: Local file system or test S3 bucket
- **Email**: Resend test mode (no actual emails sent)

**CI/CD (GitHub Actions):**
- **Database**: Ephemeral Neon branch created per PR
- **Auth**: Clerk test environment with API keys in secrets
- **File Storage**: Mock S3 adapter or test bucket
- **Email**: Mock email service or test inbox

**Staging:**
- **Database**: Neon staging branch with production-like data volume
- **Auth**: Clerk staging instance
- **File Storage**: Dedicated S3 test bucket
- **Email**: Resend test mode with real SMTP

**Infrastructure Needs:**

1. **Neon PostgreSQL Branching**
   - PR-based database branches for isolated testing
   - Automatic branch cleanup after PR merge

2. **Playwright Configuration**
   - Headless mode in CI
   - Headed mode locally for debugging
   - Trace capture on failure (screenshots, video, HAR)

3. **Test Data Management**
   - Factory-based seeding (no manual SQL scripts)
   - Auto-cleanup via fixtures
   - Isolated tenants per test

---

## Testability Concerns (If Any)

### Concern 1: Background Job Observability (MINOR)

**Issue**: Inngest background jobs (PDF generation, email delivery) are async and opaque in tests.

**Impact**:
- Tests may need to poll for completion (introduces timing uncertainty)
- Failures in background jobs may not surface in test runs

**Mitigation:**
1. Test royalty calculations at API level (synchronous, no PDF generation)
2. Mock PDF/email generation in E2E tests (Playwright route mocking)
3. Add Inngest test utilities for job execution in integration tests
4. Create explicit "background job completed" webhooks for E2E validation

**Risk Level**: LOW (can be mitigated with mocking strategy)

---

### Concern 2: Decimal Precision Edge Cases (MINOR)

**Issue**: Financial calculations use Decimal.js for precision, but edge cases (rounding, tier boundaries) need explicit validation.

**Impact**:
- Incorrect rounding may cause penny discrepancies in royalty statements
- Tier boundary transitions (4,999 → 5,000) require exact precision

**Mitigation:**
1. Create unit tests for decimal precision edge cases
2. Use property-based testing (fuzz testing) for decimal operations
3. Add explicit assertions for boundary values (4,999.99 vs 5,000.00)

**Risk Level**: LOW (Decimal.js handles precision, but needs validation)

---

### Concern 3: Multi-Tenant Subdomain Resolution in Tests (MINOR)

**Issue**: Local development requires wildcard subdomain resolution (`*.localhost:3000`), which may not work consistently across all OSes.

**Impact**:
- Tests may fail on developer machines with restrictive `/etc/hosts` configurations
- CI environments need special DNS configuration

**Mitigation:**
1. Document `/etc/hosts` setup in tests/README.md (already done)
2. Use localhost.run for dynamic subdomain resolution (alternative)
3. Playwright config can override base URL per tenant programmatically

**Risk Level**: VERY LOW (already mitigated in test framework setup)

---

## Recommendations for Sprint 0

### Priority 1: Critical Setup (Before Implementation)

1. **Extract Royalty Calculation to Pure Functions** (8 hours)
   - Create `src/lib/royalty-calculator.ts` with pure functions
   - Enable unit testing without database/UI dependencies
   - **Owner**: Backend Developer

2. **Add k6 Load Testing Framework** (6 hours)
   - Install k6, create baseline performance tests
   - Establish SLO thresholds (p95 <2s dashboard, <30s royalty)
   - **Owner**: DevOps/QA

3. **Configure CI Pipeline with Quality Gates** (8 hours)
   - GitHub Actions: coverage, duplication, vulnerability scanning
   - Neon PR branching for ephemeral databases
   - **Owner**: DevOps

4. **Add Security Tests (RBAC + RLS)** (12 hours)
   - Cross-tenant isolation tests
   - Role-based authorization tests
   - OWASP Top 10 validation (SQL injection, XSS)
   - **Owner**: QA/Security

**Total Sprint 0 Effort**: 34 hours (~5 days)

---

### Priority 2: Test Scenario Creation (During Implementation)

1. **Run Test Design Workflow (Epic-Level)** (Per Epic)
   - Generate comprehensive test scenarios for each epic
   - Map requirements to test levels (unit/integration/E2E)
   - Risk assessment per epic

2. **Implement ATDD (Acceptance Test-Driven Development)** (Optional)
   - Generate failing E2E tests before implementation
   - Drive development with acceptance criteria

**Tool**: Use TEA workflows `*test-design` (epic-level) and `*atdd` after epics are created.

---

## Testability Gate Criteria

**For Implementation Readiness Workflow:**

- ✅ **PASS Criteria**:
  - [ ] Royalty calculation extracted to pure functions (unit testable)
  - [ ] k6 load testing framework installed with baseline metrics
  - [ ] CI pipeline configured (coverage, audit, Neon branching)
  - [ ] Security tests added (RBAC, RLS, OWASP)
  - [ ] Test framework validated (sample tests pass)
  - [ ] All concerns mitigated or waived

- ⚠️ **CONCERNS Criteria**:
  - [ ] Minor gaps with clear owners and deadlines
  - [ ] Performance baselines not yet established (can be done in Sprint 0)
  - [ ] Background job testing strategy documented but not implemented

- ❌ **FAIL Criteria**:
  - [ ] Multi-tenant RLS not testable (critical blocker)
  - [ ] Royalty calculation logic embedded in UI (not unit testable)
  - [ ] No test framework in place

**Current Status**: ✅ PASS (minor concerns acceptable for progression)

---

## Summary

**Testability Assessment**: ✅ **PASS**

Salina ERP's architecture is well-suited for comprehensive automated testing. The serverless Next.js 16 stack, combined with Playwright test framework already scaffolded, provides strong controllability, observability, and reliability foundations.

**Key Decisions:**
- Test pyramid: 50% unit, 30% integration, 20% E2E
- Security: RBAC + RLS testing critical (multi-tenant isolation)
- Performance: k6 load testing for royalty calculations (SLO <30s)
- Reliability: Mock background jobs (Inngest) in E2E tests

**Next Steps:**
1. Complete Sprint 0 setup (34 hours) - extract royalty logic, add k6, configure CI
2. Run epic-level test-design workflow for comprehensive test scenarios
3. Proceed to implementation with ATDD (acceptance test-driven development)

**Output**: `docs/test-design-system.md` (this document)

---

**Generated by**: BMad TEA Agent - System-Level Testability Review
**Workflow**: `.bmad/bmm/testarch/test-design` (System-Level Mode)
**Version**: 4.0 (BMad v6)
**Knowledge Base**: `nfr-criteria.md`, `test-levels-framework.md`, `risk-governance.md`, `test-quality.md`
