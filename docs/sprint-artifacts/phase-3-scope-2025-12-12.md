# Phase 3 Scope Definition

**Date:** 2025-12-12
**Status:** APPROVED
**Participants:** Eric (Project Lead), John (PM), Mary (Analyst), Winston (Architect), Sally (UX), Murat (QA), Bob (SM)

---

## Executive Summary

Phase 3 focuses on **Distribution & Scale** - enabling publishers to syndicate metadata industry-wide, integrate with major sales channels, and streamline production operations.

**Key Decision:** ONIX 3.1 (not 3.0) as the metadata standard, with backwards compatibility for legacy channels.

**Dropped:** Baker & Taylor integration (company winding down operations)

---

## Phase 3 Epics

### Phase 3A - Metadata Foundation

| Epic | Name | Description |
|------|------|-------------|
| **14** | ONIX 3.1 Core | ONIX 3.1 message generator, validator, accessibility metadata support, codelist management, import (2.1/3.0/3.1), export (3.1 default, 3.0 fallback) |
| **15** | REST API & Webhooks | Public REST API with authentication, webhook event system, rate limiting, developer documentation |

### Phase 3B - Channel Distribution

| Epic | Name | Description |
|------|------|-------------|
| **16** | Ingram Integration | ONIX feed automation to Ingram/IngramSpark, order data ingestion, inventory synchronization |
| **17** | Amazon Integration | KDP/Advantage ONIX feeds, sales data import, ASIN linking and tracking |

### Phase 3C - Operations

| Epic | Name | Description |
|------|------|-------------|
| **18** | Production Pipeline | Manuscript-to-print workflow, vendor management, proof tracking, production scheduling |
| **19** | Data Import/Export | Bulk operations, ONIX catalog import, CSV templates, migration tools for new customers |

### Phase 3D - Experience

| Epic | Name | Description |
|------|------|-------------|
| **20** | UX Enhancements | Tenant onboarding wizard, notifications center, mobile optimization, contextual help |
| **21** | Author Portal Expansion | Production status tracking, marketing asset library, manuscript upload workflow |

---

## Dependencies

```
Epic 14 (ONIX) ──┬──► Epic 16 (Ingram)
                 └──► Epic 17 (Amazon)

Epic 15 (API) ──────► Epic 19 (Import/Export)

Epic 18 (Production) ──► Epic 21 (Author Portal)

Epic 20 (UX) - Independent, can start immediately
```

---

## Recommended Execution Tracks

| Track | Focus | Epics | Rationale |
|-------|-------|-------|-----------|
| **Track 1** | Metadata/Integration | 14 → 16 → 17 | ONIX foundation enables channel distribution |
| **Track 2** | Platform/API | 15 → 19 | API enables data operations and third-party integration |
| **Track 3** | Experience | 20 → 21 | User-facing improvements, independent of backend |
| **Track 4** | Operations | 18 | Production pipeline, starts after Epic 14 patterns established |

---

## ONIX 3.1 Decision Rationale

- **Current standard** - Released 2021, recommended by EDItEUR
- **Accessibility metadata** - Required for European Accessibility Act (2025) compliance
- **Better pricing/tax handling** - Critical for international distribution
- **Forward-compatible** - Building new system, no legacy constraints
- **Backwards output available** - Can generate 3.0 for legacy channels

---

## Key Channels (Priority Order)

| Channel | Priority | Integration Type |
|---------|----------|------------------|
| Ingram/IngramSpark | P0 | ONIX 3.1 + API |
| Amazon (KDP/Advantage) | P0 | ONIX 3.1 + Portal |
| Bowker (Books In Print) | P1 | ONIX feed |
| Library Distributors | P2 | ONIX to aggregators |
| Google Books | P2 | ONIX metadata |

**Removed:** Baker & Taylor (business wind-down announced)

---

## Next Steps

1. [ ] PM: Update PRD with Phase 3 functional requirements (FR135+)
2. [ ] Analyst: Research ONIX 3.1 field mappings, channel integration specs
3. [ ] Architect: Update tech spec with ONIX architecture, API design
4. [ ] PM: Add Epic 14-21 definitions to `docs/epics.md`
5. [ ] SM: Run `*sprint-planning` to generate updated sprint-status.yaml
6. [ ] SM: Draft first Phase 3 story (Epic 14 or Epic 20)

---

## Approval

- [x] Project Lead (Eric) - Approved 2025-12-12
- [ ] PRD Updated
- [ ] Tech Spec Updated
- [ ] Epics Defined

---

*Generated from Party Mode brainstorming session*
*Facilitated by Bob (Scrum Master)*
