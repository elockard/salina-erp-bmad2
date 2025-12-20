# Story 20.2: Build Notifications Center

## Story

**As a** user,
**I want** a notifications center,
**So that** I can see important alerts and actions in one place.

## Status

completed

## Epic Reference

[Epic 20: UX Enhancements](../epics.md#epic-20-ux-enhancements)

## FRs Implemented

- **FR177:** User can view notifications center with distribution status, system alerts, and action items

## Business Value

- Keeps users informed about system events without requiring manual checks
- Reduces time spent monitoring distribution feeds and returns queues
- Improves user engagement by surfacing actionable items proactively
- Creates foundation for Story 20.3 (notification preferences) and Story 21.4 (production milestone notifications)

## Dependencies

- **Prerequisites:** Epic 1 (Foundation) - Complete
- **Depends On:**
  - User authentication (Clerk) - Complete
  - Channel feeds (Epic 16, 17) - Complete (for feed delivery status events)
  - Returns approval workflow (Epic 3) - Complete (for pending returns actions)
  - Story 20.1 (Onboarding Wizard) - Complete (for UI patterns)

---

## UX Design Reference

This story implements notification patterns from the UX Design Specification:

- **Bell icon** in header navigation for notification access
- **Dropdown panel** with scrollable notification list
- **Unread indicator** (badge count) on bell icon
- **Editorial Navy** (`#1E3A5F`) for primary actions

**Notification System Clarification:**

| Type | Purpose | Implementation |
|------|---------|----------------|
| **Toast Notifications** | Real-time ephemeral alerts (Sonner) | Already exists throughout app |
| **Notifications Center** | Persistent historical notifications | This story |

Important events (feed delivery, import complete) should create BOTH a toast (immediate feedback) AND a persistent notification (review later).

---

## Acceptance Criteria

### AC 20.2.1: Notification Bell Icon in Header

**Given** I am logged in to the dashboard
**When** I view the header navigation
**Then** I see a bell icon with:
- Unread count badge (if > 0), no badge when all read
- Maximum display of "99+" for large counts
- Clicking opens the notifications panel

---

### AC 20.2.2: Notifications Panel Display

**Given** I click the notifications bell icon
**When** the notifications panel opens
**Then** I see a dropdown panel with:
- Header: "Notifications" title with unread count
- Scrollable list (max-height 400px)
- "Mark All Read" button
- Empty state when no notifications
- Closes on click outside or Escape key

---

### AC 20.2.3: Notification Item Display

**Given** I view the notifications panel
**When** I see a notification item
**Then** each displays: type-specific icon, title (max 60 chars), description (max 100 chars truncated), relative timestamp, unread indicator (dot/highlight)

**And** unread notifications highlighted, ordered by timestamp (newest first)

---

### AC 20.2.4: Notification Types

| Type | Event | Icon | Example |
|------|-------|------|---------|
| `feed_success` | ONIX feed delivered | CheckCircle | "Ingram feed delivered (42 titles)" |
| `feed_failed` | ONIX feed failed | XCircle | "Amazon feed failed: Connection timeout" |
| `action_pending_return` | Return awaiting approval | FileWarning | "Return request #123 pending approval" |
| `action_low_isbn` | ISBN pool below threshold | Hash | "ISBN pool below 10 remaining" |
| `system_announcement` | Platform announcement | Bell | "Scheduled maintenance: Dec 25" |
| `import_complete` | CSV import completed | FileCheck | "Catalog import complete: 150 titles" |

---

### AC 20.2.5: Mark as Read

**Given** I have unread notifications
**When** I click a notification item → marked as read + navigate to related item
**When** I click "Mark All Read" → all marked as read, badge disappears

---

### AC 20.2.6: Navigation from Notifications

| Notification Type | Navigation Target |
|-------------------|-------------------|
| `feed_success` / `feed_failed` | `/settings/integrations` |
| `action_pending_return` | `/returns?id={return_id}` |
| `action_low_isbn` | `/settings/isbn-import` |
| `system_announcement` | Modal or external link |
| `import_complete` | `/titles/import` |

**Note:** Verify routes exist before implementation. If route differs, use actual path from codebase.

---

### AC 20.2.7: Notification Generation

Notifications created automatically by:
- `feed_success/failed`: Inngest channel feed job (amazon-feed.ts, ingram-feed.ts)
- `action_pending_return`: Returns actions when status = pending
- `action_low_isbn`: ISBN pool alert component when count < threshold
- `system_announcement`: Manual DB insert (admin UI future story)
- `import_complete`: Inngest CSV import job on completion

---

### AC 20.2.8: Notification Persistence

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| tenant_id | UUID | Tenant isolation |
| user_id | UUID | Target user (nullable for tenant-wide) |
| type | varchar | Notification type enum |
| title | varchar(100) | Notification title |
| description | text | Details (nullable) |
| link | varchar(255) | Navigation URL (nullable) |
| metadata | jsonb | Context data (return_id, feed_id, etc.) |
| read_at | timestamp | When marked as read (nullable) |
| created_at | timestamp | When created |

---

### AC 20.2.9: Polling for Updates

- Polling interval: 30 seconds
- Stops when panel closed
- Pauses when tab hidden (`refetchIntervalInBackground: false`)

---

### AC 20.2.10: Notification Retention

- Read notifications older than 30 days: deleted by cleanup job
- Unread notifications: retained until read
- Cleanup: Daily scheduled Inngest job at 2 AM

---

## Technical Notes

### Architecture Decision: Server Actions + TanStack Query

**DO NOT create API routes.** Use Server Actions directly with TanStack Query (established pattern).

```typescript
// Pattern from src/modules/api/webhooks/components/webhook-list.tsx:81-84
const { data, isLoading } = useQuery({
  queryKey: ["notifications"],
  queryFn: () => getNotifications(), // Server action, NOT fetch()
});
```

### User Targeting Rules

| user_id Value | Use Case | Examples |
|---------------|----------|----------|
| `null` (tenant-wide) | All users in tenant | system_announcement |
| Specific UUID | Individual user | feed triggered by user, import by user |
| `null` + role filter | Role-based (client-side) | action_low_isbn → Owner/Admin only |

Query pattern: `WHERE (user_id = current_user OR user_id IS NULL)`

### Database Schema

```typescript
// src/db/schema/notifications.ts
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { index, jsonb, pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";
import { users } from "./users";

export const NOTIFICATION_TYPES = [
  "feed_success", "feed_failed", "action_pending_return",
  "action_low_isbn", "system_announcement", "import_complete",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  type: varchar("type", { length: 50 }).notNull().$type<NotificationType>(),
  title: varchar("title", { length: 100 }).notNull(),
  description: text("description"),
  link: varchar("link", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
  createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("notifications_tenant_idx").on(table.tenantId),
  userIdx: index("notifications_user_idx").on(table.tenantId, table.userId),
  unreadIdx: index("notifications_unread_idx").on(table.tenantId, table.readAt),
  createdIdx: index("notifications_created_idx").on(table.tenantId, table.createdAt),
}));

export type Notification = InferSelectModel<typeof notifications>;
export type InsertNotification = InferInsertModel<typeof notifications>;
```

### Schema Exports (index.ts)

```typescript
// Add to src/db/schema/index.ts
export * from "./notifications";
```

### Relations Setup (relations.ts)

```typescript
// Add to src/db/schema/relations.ts

// 1. Import at top
import { notifications } from "./notifications";

// 2. Add to tenantsRelations (existing):
notifications: many(notifications),

// 3. Add to usersRelations (existing):
notifications: many(notifications),

// 4. Add new export:
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));
```

### File Structure

```
src/
├── components/providers/
│   └── query-provider.tsx              # TanStack Query provider (if not exists)
├── modules/notifications/
│   ├── components/
│   │   ├── notification-bell.tsx       # Bell icon with badge
│   │   ├── notification-panel.tsx      # Dropdown panel
│   │   ├── notification-item.tsx       # Individual notification
│   │   └── notification-empty.tsx      # Empty state
│   ├── hooks/
│   │   └── use-notifications.ts        # Polling + optimistic updates
│   ├── actions.ts                      # Server actions
│   ├── queries.ts                      # Data fetching
│   ├── schema.ts                       # Zod validation
│   ├── service.ts                      # Notification creation helpers
│   └── types.ts                        # TypeScript types
├── db/schema/
│   └── notifications.ts                # Drizzle schema
├── inngest/
│   └── notification-cleanup.ts         # Daily cleanup job
```

### Existing Patterns to Follow

| Pattern | Reference File | Key Lines |
|---------|---------------|-----------|
| Server Actions | `src/modules/onboarding/actions.ts` | 1-80 |
| TanStack Query polling | `src/modules/api/webhooks/components/webhook-delivery-history.tsx` | 96-100 |
| Dropdown UI | `src/modules/api/webhooks/components/webhook-list.tsx` | DropdownMenu usage |
| Date formatting | Any component with timestamps | `formatDistanceToNow(date, { addSuffix: true })` |

### Optimistic Updates Pattern

```typescript
// In use-notifications.ts - markAsRead mutation
const markAsReadMutation = useMutation({
  mutationFn: markNotificationAsRead,
  onMutate: async (notificationId) => {
    await queryClient.cancelQueries({ queryKey: ["notifications"] });
    const previous = queryClient.getQueryData(["notifications"]);
    queryClient.setQueryData(["notifications"], (old: Notification[]) =>
      old?.map((n) => n.id === notificationId ? { ...n, readAt: new Date() } : n)
    );
    return { previous };
  },
  onError: (err, variables, context) => {
    queryClient.setQueryData(["notifications"], context?.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  },
});
```

### ISBN Low Threshold Integration

Existing ISBN pool alert in `src/modules/reports/components/isbn-pool-alert.tsx` checks threshold.

**Option (Recommended):** Modify isbn-pool-alert.tsx to call `createLowIsbnNotification` when threshold hit. Threshold already configured (default: 10).

---

## Scope

### In Scope

- Notifications database schema and RLS
- Bell icon with unread badge in header
- Notification dropdown panel UI
- Mark as read (individual and all) with optimistic updates
- Navigation to related items
- Polling for updates (30 second interval)
- Notification creation from feed jobs, returns, imports
- 6 notification types
- Daily cleanup job for old notifications

### Out of Scope

- Real-time WebSocket updates (use polling; WebSocket is future)
- Email notifications (Story 20.3)
- Push notifications (future mobile app)
- Notification preferences UI (Story 20.3)
- Platform admin announcement UI (future admin story)
- Production milestone notifications (Story 21.4)

---

## Tasks

### Database & Schema

- [x] Create `src/db/schema/notifications.ts` with Drizzle schema
- [x] Add export to `src/db/schema/index.ts`: `export * from "./notifications";`
- [x] Add relations to `src/db/schema/relations.ts`:
  - Import notifications
  - Add `notifications: many(notifications)` to tenantsRelations
  - Add `notifications: many(notifications)` to usersRelations
  - Create notificationsRelations export
- [x] Generate migration: `npx drizzle-kit generate`
- [x] Run migration: `npx drizzle-kit push`
- [x] Test: Verify table created and RLS works

### TanStack Query Setup (if not exists)

- [x] Check if `src/components/providers/query-provider.tsx` exists
- [x] If not, create QueryClientProvider wrapper
- [x] Ensure root layout wraps app with QueryProvider

### Module Structure

- [x] Create `src/modules/notifications/` directory
- [x] Create `types.ts` with NotificationType, NotificationWithRelations
- [x] Create `schema.ts` with Zod schemas (markAsReadSchema, createNotificationSchema)
- [x] Create `queries.ts` with getNotifications, getUnreadCount
- [x] Create `actions.ts` with markNotificationAsRead, markAllNotificationsAsRead, deleteOldNotifications
- [x] Create `service.ts` with creation helpers:
  - createFeedNotification(tenantId, success, channel, productCount, feedId)
  - createReturnNotification(tenantId, returnId, returnNumber)
  - createLowIsbnNotification(tenantId, threshold, currentCount)
  - createImportCompleteNotification(tenantId, importId, recordCount)
  - createAnnouncementNotification(tenantId, title, description, link?)

### UI Components

- [x] Create `notification-bell.tsx` - Bell icon, badge (99+ max), DropdownMenuTrigger
- [x] Create `notification-panel.tsx` - DropdownMenuContent (320px), header, ScrollArea (400px), Mark All Read
- [x] Create `notification-item.tsx` - Icon mapping, title/desc truncation, timestamp, click handler
- [x] Create `notification-empty.tsx` - Empty state message

### Polling Hook

- [x] Create `hooks/use-notifications.ts`:
  - useQuery with refetchInterval: 30000, refetchIntervalInBackground: false
  - useMutation for markAsRead with optimistic updates
  - Return: notifications, unreadCount, isLoading, markAsRead, markAllAsRead

### Header Integration

- [x] Update `src/components/layout/dashboard-header.tsx`:
  - Import NotificationBell
  - Add before UserButton in header right section

### Notification Generation Integration

- [x] Update Inngest feed jobs (amazon-feed.ts, ingram-feed.ts):
  - Import createFeedNotification from service
  - Call after success: `createFeedNotification(tenantId, true, channel, productCount, feedId)`
  - Call after failure: `createFeedNotification(tenantId, false, channel, 0, feedId)`

- [x] Update `src/modules/returns/actions.ts`:
  - Find createReturn action (or equivalent)
  - Import createReturnNotification
  - After insert, if status === 'pending': `createReturnNotification(tenantId, returnRecord.id, returnRecord.return_number)`

- [x] Update `src/modules/import-export/actions.ts`:
  - Import createImportCompleteNotification
  - Call on completion: `createImportCompleteNotification(tenantId, importId, recordCount)`

- [x] Update `src/app/(dashboard)/reports/isbn-pool/page.tsx`:
  - Import createLowIsbnNotification
  - Call when count < threshold (with 24-hour deduplication)

### Cleanup Job

- [x] Create `src/inngest/notification-cleanup.ts`:
  - Schedule: Daily at 2 AM (cron: "0 2 * * *")
  - Delete notifications where readAt < 30 days ago
  - Use deleteOldNotifications action
- [x] Register in `src/inngest/functions.ts`

### Testing

- [x] `tests/unit/notifications-service.test.ts` - createFeedNotification, createReturnNotification, type validation
- [x] `tests/unit/notification-actions.test.ts` - markNotificationAsRead, markAllNotificationsAsRead, getUnreadCount
- [x] `tests/unit/notification-components.test.tsx` - component rendering tests
- [ ] `tests/unit/notification-bell.test.tsx` - badge visibility (0, 1, 99, 100+), dropdown open/close (deferred)
- [ ] `tests/unit/notification-item.test.tsx` - icon mapping, timestamp formatting, click navigation (deferred)
- [ ] `tests/integration/notifications-flow.test.ts` - feed creates notification, appears in panel, mark as read, RLS isolation (deferred)

---

## Dev Notes

### Icon Imports

```typescript
import {
  Bell, CheckCircle, FileCheck, FileWarning, Hash, XCircle,
  type LucideIcon,
} from "lucide-react";
```

### Quick Reference

- **Icon mapping:** feed_success→CheckCircle/green, feed_failed→XCircle/red, action_pending_return→FileWarning/amber, action_low_isbn→Hash/amber, system_announcement→Bell/blue, import_complete→FileCheck/green
- **Badge count:** `count > 99 ? "99+" : count.toString()`
- **Query filter:** `WHERE tenantId AND (userId IS NULL OR userId = current)`

---

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

_To be filled during implementation_

### Completion Notes List

_To be filled during implementation_

### File List

**Database Schema:**
- `src/db/schema/notifications.ts` (create)
- `src/db/schema/index.ts` (modify - add export)
- `src/db/schema/relations.ts` (modify - add relations)
- `drizzle/migrations/XXXX_notifications.sql` (create)

**Module:**
- `src/modules/notifications/actions.ts` (create)
- `src/modules/notifications/queries.ts` (create)
- `src/modules/notifications/service.ts` (create)
- `src/modules/notifications/types.ts` (create)
- `src/modules/notifications/schema.ts` (create)
- `src/modules/notifications/hooks/use-notifications.ts` (create)
- `src/modules/notifications/components/notification-bell.tsx` (create)
- `src/modules/notifications/components/notification-panel.tsx` (create)
- `src/modules/notifications/components/notification-item.tsx` (create)
- `src/modules/notifications/components/notification-empty.tsx` (create)

**Integrations:**
- `src/components/layout/dashboard-header.tsx` (modify)
- `src/inngest/amazon-feed.ts` (modify)
- `src/inngest/ingram-feed.ts` (modify)
- `src/inngest/csv-import.ts` (modify)
- `src/inngest/notification-cleanup.ts` (create)
- `src/inngest/functions.ts` (modify - register cleanup)
- `src/modules/returns/actions.ts` (modify)
- `src/modules/reports/components/isbn-pool-alert.tsx` (modify)

**Tests:**
- `tests/unit/notification-service.test.ts` (create)
- `tests/unit/notification-actions.test.ts` (create)
- `tests/unit/notification-bell.test.tsx` (create)
- `tests/unit/notification-item.test.tsx` (create)
- `tests/integration/notifications-flow.test.ts` (create)

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-20 | SM Agent | Initial story creation |
| 2025-12-20 | SM Agent | Validation improvements: Added TanStack Query setup task, explicit schema/relations code, removed API routes (use Server Actions), fixed csv-import.ts reference, added ISBN threshold integration, added returns action specifics, added optimistic updates pattern, added cleanup job details, added user targeting rules, consolidated tasks, reduced verbosity |
