# Epic 17 Retrospective: Amazon Integration

**Date:** 2025-12-17
**Facilitator:** Bob (Scrum Master)
**Epic Status:** Complete (5/5 stories done)

---

## Epic Overview

| Attribute | Value |
|-----------|-------|
| **Epic** | 17 - Amazon Integration |
| **Stories Completed** | 5/5 (100%) |
| **Goal** | Full bi-directional Amazon integration: connection, feed delivery, sales import, ASIN linking, and troubleshooting |

---

## Overall Success Assessment

### Goal Achievement

| Story | Goal | Achieved? | Notes |
|-------|------|-----------|-------|
| **17.1** | Configure Amazon Account Connection | Yes | AWS Signature V4 auth, SP-API integration, encrypted credential storage |
| **17.2** | Schedule Automated ONIX Feeds | Yes | ONIX 3.1 generation, multi-step SP-API feed upload, scheduling |
| **17.3** | Import Amazon Sales Data | Yes | Reports API, GZIP handling, ISBN matching, duplicate detection |
| **17.4** | Link Titles to ASINs | Yes | ASIN schema, validation, enhanced sales matching |
| **17.5** | View Feed History | Yes | XML preview, retry, Amazon-specific error resolutions |

### What Went Well

1. **Pattern Reuse** - Successfully followed Ingram adapter patterns (Epic 16), reducing implementation time and ensuring consistency
2. **Multi-step Amazon Flow** - Properly implemented the 4-step SP-API feed upload process (createDocument → S3 upload → createFeed → pollStatus)
3. **Code Review Integration** - Applied code review fixes for N+1 queries, rate limiting, schema validation, and UX improvements
4. **ONIX Version Handling** - Correctly used ONIX 3.1 for Amazon vs 3.0 for Ingram
5. **Comprehensive Testing** - Unit tests for API clients, parsers, and Inngest jobs

### Challenges Encountered

1. **ASIN vs ISBN Gap** - Story 17.3 initially couldn't match sales without ISBN in SKU; Story 17.4 addressed this
2. **Amazon API Complexity** - SP-API required more steps than Ingram's simpler FTPS approach
3. **Polling Strategy** - Needed Inngest step.sleep for long-running status polls
4. **Schema Migration Order** - Had to add 'amazon' to sales channel enum before implementing sales import

---

## Lessons Learned

### Technical Insights

| Lesson | Source | Recommendation |
|--------|--------|----------------|
| **Export shared functions** | Story 17.2 Dev Notes | Always export utility functions (like `signRequest`) from the start to avoid refactoring |
| **Use step.sleep for polling** | Story 17.2, 17.3 | Inngest's step.sleep handles long waits better than inline polling loops |
| **Batch queries for N+1** | Story 17.2 code review | Use `getTitlesWithAuthorsAdminBatch` pattern for bulk operations |
| **Rate limit manual triggers** | Story 17.2 code review | Add rate limiting to prevent spam on manual trigger buttons |
| **Schema validation on retrieval** | Story 17.2 code review | Validate data shapes when reading from JSONB metadata fields |

### Process Insights

1. **Prerequisite Tasks First** - Story 17.3 correctly identified schema migration as Task 0 (prerequisite before other tasks)
2. **Cross-Story Dependencies** - Story 17.4's ASIN matching was explicitly called out in Story 17.3's dev notes as "not in scope" - good boundary management
3. **Copy-and-Adapt Pattern** - Story 17.5 explicitly stated "follow Story 16.5 pattern exactly" - effective knowledge transfer

### Patterns Established

- **Channel Adapter Structure**: `src/modules/channels/adapters/{channel}/` with `api-client.ts`, `actions.ts`, `queries.ts`, `schema.ts`, `types.ts`, and `components/`
- **Feed Storage**: Unified `channel_feeds` table with channel discriminator
- **Inngest Job Naming**: `channel/{channel}.{action}` (e.g., `channel/amazon.feed`, `channel/amazon.sales-import`)
- **Multi-step API Pattern**: Document creation → content upload → submission → status polling

---

## Impact on Future Epics

### New Information Discovered

1. **Amazon Product Advertising API (PA-API)**
   - Requires separate Amazon Associates registration
   - Has performance requirements for affiliate accounts
   - Could enable automatic ASIN lookup by ISBN
   - **Impact**: Future enhancement story could add PA-API integration for automatic ASIN discovery

2. **Unmatched Sales Resolution**
   - Story 17.5's "Resolve Unmatched" flow navigates to title search
   - Could be extended to bulk resolution UI
   - **Impact**: Future UX story for bulk ASIN mapping workflow

3. **Amazon-Specific ONIX Requirements**
   - Amazon uses ONIX 3.1 (vs Ingram's 3.0)
   - Amazon-specific elements may be needed for enhanced discoverability
   - **Impact**: Future ONIX enhancement could add Amazon-specific extensions

### Recommendations for Future Epics

| Recommendation | Rationale |
|----------------|-----------|
| **Add more channel adapters using same pattern** | Structure is proven and extensible (Barnes & Noble, Apple Books, etc.) |
| **Consider bulk operations UI** | Unmatched records resolution would benefit from bulk actions |
| **Add PA-API optional integration** | Would reduce manual ASIN entry for large catalogs |
| **Monitor Amazon rate limits** | May need to implement request queuing for high-volume tenants |

---

## Retrospective Summary

### Epic Score: Success

Epic 17 delivered full Amazon integration capability, following established patterns from Epic 16 (Ingram) while handling Amazon's more complex SP-API requirements.

### Key Achievements

- Bi-directional data flow (ONIX out, sales in)
- Self-service troubleshooting with XML preview and retry
- ASIN-based sales matching with manual linking UI
- Comprehensive test coverage

### Areas for Improvement

- Could have anticipated ASIN matching gap earlier in sprint planning
- PA-API integration deferred as stretch goal

### Documentation Quality

- Dev Notes sections were thorough and actionable
- Code review fixes were documented in completion notes
- Cross-story references were explicit and helpful

---

## Files Delivered

### Story 17.1: Configure Amazon Account Connection
- `src/modules/channels/adapters/amazon/api-client.ts`
- `src/modules/channels/adapters/amazon/schema.ts`
- `src/modules/channels/adapters/amazon/types.ts`
- `src/modules/channels/adapters/amazon/actions.ts`
- `src/modules/channels/adapters/amazon/queries.ts`
- `src/modules/channels/adapters/amazon/components/amazon-settings-form.tsx`
- `src/app/(dashboard)/settings/integrations/amazon/page.tsx`

### Story 17.2: Schedule Automated ONIX Feeds to Amazon
- `src/modules/channels/adapters/amazon/feeds-api-client.ts`
- `src/modules/channels/adapters/amazon/components/amazon-feed-schedule.tsx`
- `src/modules/channels/adapters/amazon/components/amazon-feed-history.tsx`
- `src/inngest/amazon-feed.ts`
- `src/inngest/amazon-feed-scheduler.ts`

### Story 17.3: Import Amazon Sales Data
- `src/modules/channels/adapters/amazon/reports-api-client.ts`
- `src/modules/channels/adapters/amazon/sales-parser.ts`
- `src/modules/channels/adapters/amazon/components/amazon-sales-history.tsx`
- `src/inngest/amazon-sales-import.ts`

### Story 17.4: Link Titles to ASINs
- Modified `src/db/schema/titles.ts` (added asin column)
- Modified `src/modules/titles/actions.ts` (updateTitleAsin)
- Modified `src/modules/titles/schema.ts` (asinSchema)
- Modified `src/modules/titles/components/title-detail.tsx` (ASIN section)
- Modified `src/inngest/amazon-sales-import.ts` (ASIN matching)

### Story 17.5: View Amazon Feed History
- `src/modules/channels/adapters/amazon/components/amazon-feed-detail-modal.tsx`
- Modified `src/modules/channels/adapters/amazon/actions.ts` (getAmazonFeedContent, retryAmazonFeed)
- Modified `src/inngest/amazon-feed.ts` (amazonFeedRetry)
- `tests/unit/amazon-feed-history.test.ts`
- `tests/unit/amazon-feed-retry.test.ts`

---

*Generated by BMAD Retrospective Workflow*
