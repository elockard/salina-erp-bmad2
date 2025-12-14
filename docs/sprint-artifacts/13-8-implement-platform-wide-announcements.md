# Story 13.8: Implement Platform-Wide Announcements

Status: review

## Quick Implementation Path

1. Create `src/db/schema/platform-announcements.ts` with platform_announcements table (outside tenant context)
2. Add platform-announcements export to `src/db/schema/index.ts`
3. Run `drizzle-kit generate` and `drizzle-kit migrate` to apply schema
4. Add Announcement types to `src/modules/platform-admin/types.ts`
5. Create `src/modules/platform-admin/announcements.ts` with CRUD functions
6. Add announcement server actions to `src/modules/platform-admin/actions.ts`
7. Add audit constants (CREATE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT, DELETE_ANNOUNCEMENT) to `src/lib/platform-audit.ts`
8. Create `src/app/(platform-admin)/platform-admin/announcements/page.tsx` - management list view
9. Create `src/app/(platform-admin)/platform-admin/announcements/new/page.tsx` - create form
10. Create `src/app/(platform-admin)/platform-admin/announcements/[id]/page.tsx` - edit/view
11. Create `src/components/announcement-banner.tsx` - global banner component (client)
12. Create `src/components/announcement-banner-wrapper.tsx` - server wrapper to fetch active announcements
13. Add AnnouncementBannerWrapper to `src/app/(dashboard)/layout.tsx` and `src/app/(portal)/layout.tsx`
14. Update platform admin landing page navigation (add Announcements to activeFeatures)
15. Write comprehensive unit tests

**IMPORTANT:** This story creates a platform-level announcement system. The `platform_announcements` table is NOT tenant-scoped - it uses `adminDb` and affects all tenants.

---

## Story

As a **platform administrator**,
I want to **broadcast announcements to all tenants**,
So that **I can communicate maintenance, updates, or important information**.

## Acceptance Criteria

1. **Given** I am authenticated as platform admin **When** I create a platform announcement **Then** I can specify:
   - Announcement message (supports markdown)
   - Announcement type: info, warning, critical
   - Start date/time
   - End date/time (optional, for temporary announcements)
   - Target: all users or specific roles

2. **And** active announcements display in a banner on all tenant dashboards

3. **And** users can dismiss informational announcements (stored in localStorage)

4. **And** critical announcements cannot be dismissed

5. **And** I can view all current and past announcements

6. **And** I can edit or deactivate announcements

7. **And** announcements are ordered by type (critical first) then date

**Prerequisites:** Story 13.1 (Platform Administrator Authentication - DONE)

---

## Tasks / Subtasks

### Backend Tasks (Database & Server-Side)

- [x] **Task 1: Create Platform Announcements Schema** (AC: 1)
  - [x] Create `src/db/schema/platform-announcements.ts`
  - [x] Define `platformAnnouncements` table with fields:
    - id: uuid, primary key, default uuid_generate_v4()
    - message: text, not null (supports markdown)
    - type: varchar, enum ("info", "warning", "critical"), not null
    - starts_at: timestamp with time zone, not null
    - ends_at: timestamp with time zone, nullable (null = permanent until deactivated)
    - target_roles: text[] nullable (null = all users, or array like ["finance", "admin"])
    - is_active: boolean, default true
    - created_at: timestamp with time zone, default now()
    - created_by_admin_email: varchar, not null
    - updated_at: timestamp with time zone, default now()
    - updated_by_admin_email: varchar, nullable
  - [x] Export from `src/db/schema/index.ts`
  - [x] NOTE: This table is NOT tenant-scoped - uses adminDb

- [x] **Task 2: Run Database Migration** (AC: 1)
  - [x] Run `pnpm drizzle-kit generate`
  - [x] Run `pnpm drizzle-kit push` (used push due to existing tables)
  - [x] Verify table created in database

- [x] **Task 3: Add Announcement Types** (AC: 1-7)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Add `AnnouncementType = "info" | "warning" | "critical"`
  - [x] Add `PlatformAnnouncement` interface:
    - id: string
    - message: string
    - type: AnnouncementType
    - startsAt: Date
    - endsAt: Date | null
    - targetRoles: string[] | null
    - isActive: boolean
    - createdAt: Date
    - createdByAdminEmail: string
    - updatedAt: Date
    - updatedByAdminEmail: string | null
  - [x] Add `CreateAnnouncementInput` interface:
    - message: string (min 10 chars)
    - type: AnnouncementType
    - startsAt: Date
    - endsAt?: Date | null
    - targetRoles?: string[] | null
  - [x] Add `UpdateAnnouncementInput` interface (extends Partial<CreateAnnouncementInput>):
    - isActive?: boolean
  - [x] Add `ActiveAnnouncement` interface (for banner display):
    - id: string
    - message: string
    - type: AnnouncementType
    - targetRoles: string[] | null

- [x] **Task 4: Create Announcements Query Functions** (AC: 1, 5, 7)
  - [x] Create `src/modules/platform-admin/announcements.ts`
  - [x] Implement `getActiveAnnouncements(userRole?: string)`:
    - Query where is_active = true AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())
    - Filter by target_roles if userRole provided (null target_roles = all users)
    - Order by type (critical, warning, info), then starts_at desc
    - Return ActiveAnnouncement[]
  - [x] Implement `getAllAnnouncements(options?: { includeInactive?: boolean })`:
    - Query all announcements for management view
    - Order by created_at desc
    - Return PlatformAnnouncement[]
  - [x] Implement `getAnnouncementById(id: string)`:
    - Return single announcement for edit view

- [x] **Task 5: Create Announcement CRUD Actions** (AC: 1, 6)
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `createAnnouncement(input: CreateAnnouncementInput)`:
    - Validate platform admin authentication
    - Validate input (message min 10 chars, startsAt required)
    - Insert into platform_announcements
    - Log CREATE_ANNOUNCEMENT audit event
    - Return { success: true, data: announcement }
  - [x] Implement `updateAnnouncement(id: string, input: UpdateAnnouncementInput)`:
    - Validate platform admin authentication
    - Validate announcement exists
    - Update announcement record
    - Log UPDATE_ANNOUNCEMENT audit event
    - Return { success: true, data: announcement }
  - [x] Implement `deactivateAnnouncement(id: string)`:
    - Validate platform admin authentication
    - Set is_active = false
    - Log UPDATE_ANNOUNCEMENT audit event with metadata { action: "deactivate" }
    - Return { success: true }
  - [x] Implement `deleteAnnouncement(id: string)`:
    - Validate platform admin authentication
    - Hard delete announcement (or soft delete via is_active)
    - Log DELETE_ANNOUNCEMENT audit event
    - Return { success: true }

- [x] **Task 6: Add Audit Constants** (AC: 1, 6)
  - [x] Edit `src/lib/platform-audit.ts`
  - [x] Add to PLATFORM_ADMIN_ACTIONS:
    - CREATE_ANNOUNCEMENT: "create_announcement"
    - UPDATE_ANNOUNCEMENT: "update_announcement"
    - DELETE_ANNOUNCEMENT: "delete_announcement"
    - VIEW_ANNOUNCEMENTS: "view_announcements"

### Frontend Tasks (Platform Admin UI)

- [x] **Task 7: Create Announcements List Page** (AC: 5, 7)
  - [x] Create `src/app/(platform-admin)/platform-admin/announcements/page.tsx`
  - [x] Server component fetching all announcements
  - [x] Display table with columns: Type (icon), Message (truncated), Start/End dates, Status, Actions
  - [x] Status badge: Active (green), Scheduled (blue), Expired (gray), Inactive (red)
  - [x] Actions: View/Edit, Deactivate, Delete (with confirmation)
  - [x] "Create Announcement" button linking to /platform-admin/announcements/new
  - [x] Sort by type priority then date (critical first)

- [x] **Task 8: Create New Announcement Form** (AC: 1)
  - [x] Create `src/app/(platform-admin)/platform-admin/announcements/new/page.tsx` (server component - page wrapper)
  - [x] Create `src/modules/platform-admin/components/announcement-form.tsx` (client component)
  - [x] Use React Hook Form + Zod for validation (existing pattern in codebase)
  - [x] Form fields:
    - Message: textarea with live markdown preview (side-by-side or toggle)
    - Type: select (info, warning, critical)
    - Starts At: datetime-local input (default now)
    - Ends At: datetime-local input (optional, checkbox "Set end date" to enable)
    - Target Roles: multi-select checkboxes (all, owner, admin, editor, finance, author)
  - [x] Zod schema for validation:
    - message: z.string().min(10, "Message must be at least 10 characters")
    - type: z.enum(["info", "warning", "critical"])
    - startsAt: z.date()
    - endsAt: z.date().optional().nullable()
    - targetRoles: z.array(z.string()).optional().nullable()
  - [x] Submit calls createAnnouncement action
  - [x] On success: redirect to /platform-admin/announcements with toast
  - [x] Cancel returns to list

- [x] **Task 9: Create Edit Announcement Page** (AC: 6)
  - [x] Create `src/app/(platform-admin)/platform-admin/announcements/[id]/page.tsx`
  - [x] Load existing announcement data
  - [x] Same form as create, pre-populated
  - [x] Additional "Deactivate" button if currently active
  - [x] Save updates announcement and redirects to list

- [x] **Task 10: Update Platform Admin Navigation** (AC: 5)
  - [x] Edit `src/app/(platform-admin)/platform-admin/page.tsx`
  - [x] Add `Megaphone` to lucide-react import
  - [x] **REMOVE** from `upcomingFeatures` array (if present):
    ```typescript
    { title: "Announcements", description: "Broadcast platform-wide messages", story: "13.8" },
    ```
  - [x] **ADD** to `activeFeatures` array:
    ```typescript
    {
      title: "Announcements",
      description: "Broadcast platform-wide messages",
      href: "/platform-admin/announcements",
      icon: Megaphone,
      story: "13.8",
    },
    ```

### Frontend Tasks (Global Banner)

- [x] **Task 11: Create Announcement Banner Component** (AC: 2, 3, 4)
  - [x] Create `src/components/announcement-banner.tsx` (client component)
  - [x] Props: announcements: ActiveAnnouncement[]
  - [x] Render banners stacked at top of page (below impersonation banner if present)
  - [x] Color coding:
    - critical: red background (bg-red-600), white text
    - warning: amber background (bg-amber-500), black text
    - info: blue background (bg-blue-600), white text
  - [x] Display message with markdown support:
    - [x] Install `marked` package for markdown parsing: `pnpm add marked`
    - [x] Install `dompurify` for XSS sanitization: `pnpm add dompurify @types/dompurify`
    - [x] Parse markdown with `marked.parse(message)`
    - [x] Sanitize HTML with `DOMPurify.sanitize(html)`
    - [x] Render with `dangerouslySetInnerHTML={{ __html: sanitizedHtml }}`
  - [x] Dismiss button (X) for info and warning types
  - [x] NO dismiss button for critical type
  - [x] Use localStorage to track dismissed announcements:
    - Key: "dismissed_announcements"
    - Value: JSON array of dismissed announcement IDs
    - Check on mount, filter out dismissed
  - [x] Icon per type: AlertTriangle (critical), AlertCircle (warning), Info (info)
  - [x] Add z-40 for stacking below impersonation banner (z-50)

- [x] **Task 12: Create Announcement Banner Server Wrapper** (AC: 2)
  - [x] Create `src/components/announcement-banner-wrapper.tsx` (server component)
  - [x] Fetch active announcements using getActiveAnnouncements()
  - [x] Pass user's role from session for role-based filtering
  - [x] Return AnnouncementBanner client component with data
  - [x] Pattern follows existing ImpersonationBannerWrapper

- [x] **Task 13: Add Banner to Dashboard Layout** (AC: 2)
  - [x] Edit `src/app/(dashboard)/layout.tsx`
  - [x] Import AnnouncementBannerWrapper
  - [x] Add after ImpersonationBannerWrapper (or at top if no impersonation)
  - [x] Pass current user's role for filtering

- [x] **Task 14: Add Banner to Portal Layout** (AC: 2)
  - [x] Edit `src/app/(portal)/layout.tsx`
  - [x] Import AnnouncementBannerWrapper
  - [x] Add at top of layout
  - [x] Portal users have "author" role for filtering

### Testing

- [x] **Task 15: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-announcements.test.ts`
  - [x] Test createAnnouncement requires platform admin auth
  - [x] Test createAnnouncement validates message length
  - [x] Test createAnnouncement with all fields
  - [x] Test updateAnnouncement updates correctly
  - [x] Test deactivateAnnouncement sets is_active false
  - [x] Test getActiveAnnouncements filters by date range
  - [x] Test getActiveAnnouncements filters by target_roles
  - [x] Test getActiveAnnouncements orders by type priority
  - [x] Test getAllAnnouncements returns all announcements
  - [x] Test audit logging for all CRUD operations

---

## Dev Notes

### Critical: Database Schema

```typescript
// src/db/schema/platform-announcements.ts

import { pgTable, uuid, text, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

/**
 * Platform-wide announcements
 * Story 13.8: Implement Platform-Wide Announcements
 *
 * NOTE: This table is NOT tenant-scoped. It uses adminDb and affects all tenants.
 */
export const platformAnnouncements = pgTable("platform_announcements", {
  id: uuid("id").primaryKey().defaultRandom(),
  message: text("message").notNull(),
  type: varchar("type", { length: 20 }).notNull().$type<"info" | "warning" | "critical">(),
  starts_at: timestamp("starts_at", { withTimezone: true }).notNull(),
  ends_at: timestamp("ends_at", { withTimezone: true }),
  target_roles: text("target_roles").array(), // null = all users
  is_active: boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  created_by_admin_email: varchar("created_by_admin_email", { length: 255 }).notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updated_by_admin_email: varchar("updated_by_admin_email", { length: 255 }),
});
```

### Critical: Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

/**
 * Announcement severity type
 * Story 13.8: Implement Platform-Wide Announcements (AC: 1)
 */
export type AnnouncementType = "info" | "warning" | "critical";

/**
 * Platform announcement record
 * Story 13.8: Implement Platform-Wide Announcements
 */
export interface PlatformAnnouncement {
  id: string;
  message: string;
  type: AnnouncementType;
  startsAt: Date;
  endsAt: Date | null;
  targetRoles: string[] | null;
  isActive: boolean;
  createdAt: Date;
  createdByAdminEmail: string;
  updatedAt: Date;
  updatedByAdminEmail: string | null;
}

/**
 * Input for creating an announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 1)
 */
export interface CreateAnnouncementInput {
  message: string; // Min 10 chars
  type: AnnouncementType;
  startsAt: Date;
  endsAt?: Date | null;
  targetRoles?: string[] | null; // null = all users
}

/**
 * Input for updating an announcement
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 */
export interface UpdateAnnouncementInput {
  message?: string;
  type?: AnnouncementType;
  startsAt?: Date;
  endsAt?: Date | null;
  targetRoles?: string[] | null;
  isActive?: boolean;
}

/**
 * Active announcement for banner display (minimal data)
 * Story 13.8: Implement Platform-Wide Announcements (AC: 2)
 */
export interface ActiveAnnouncement {
  id: string;
  message: string;
  type: AnnouncementType;
  targetRoles: string[] | null;
}
```

### Critical: Query Functions

```typescript
// src/modules/platform-admin/announcements.ts

import { adminDb } from "@/db";
import { platformAnnouncements } from "@/db/schema/platform-announcements";
import { and, eq, or, lte, gte, isNull, desc, sql } from "drizzle-orm";
import type { PlatformAnnouncement, ActiveAnnouncement } from "./types";

/**
 * Get active announcements for banner display
 * Story 13.8: Implement Platform-Wide Announcements (AC: 2, 7)
 *
 * @param userRole - Optional role to filter by target_roles
 * @returns Active announcements ordered by type priority (critical > warning > info)
 */
export async function getActiveAnnouncements(
  userRole?: string
): Promise<ActiveAnnouncement[]> {
  const now = new Date();

  const results = await adminDb
    .select({
      id: platformAnnouncements.id,
      message: platformAnnouncements.message,
      type: platformAnnouncements.type,
      targetRoles: platformAnnouncements.target_roles,
    })
    .from(platformAnnouncements)
    .where(
      and(
        eq(platformAnnouncements.is_active, true),
        lte(platformAnnouncements.starts_at, now),
        or(
          isNull(platformAnnouncements.ends_at),
          gte(platformAnnouncements.ends_at, now)
        )
      )
    )
    .orderBy(
      // Order by type priority: critical (0), warning (1), info (2)
      sql`CASE ${platformAnnouncements.type}
        WHEN 'critical' THEN 0
        WHEN 'warning' THEN 1
        WHEN 'info' THEN 2
        ELSE 3
      END`,
      desc(platformAnnouncements.starts_at)
    );

  // Filter by role if provided
  return results.filter((a) => {
    if (!a.targetRoles || a.targetRoles.length === 0) {
      return true; // No target = all users
    }
    if (!userRole) {
      return true; // No role filter = show all
    }
    return a.targetRoles.includes(userRole);
  });
}

/**
 * Get all announcements for management view
 * Story 13.8: Implement Platform-Wide Announcements (AC: 5)
 */
export async function getAllAnnouncements(options?: {
  includeInactive?: boolean;
}): Promise<PlatformAnnouncement[]> {
  const conditions = options?.includeInactive
    ? undefined
    : eq(platformAnnouncements.is_active, true);

  const results = await adminDb
    .select()
    .from(platformAnnouncements)
    .where(conditions)
    .orderBy(desc(platformAnnouncements.created_at));

  return results.map((r) => ({
    id: r.id,
    message: r.message,
    type: r.type as "info" | "warning" | "critical",
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    targetRoles: r.target_roles,
    isActive: r.is_active,
    createdAt: r.created_at,
    createdByAdminEmail: r.created_by_admin_email,
    updatedAt: r.updated_at,
    updatedByAdminEmail: r.updated_by_admin_email,
  }));
}

/**
 * Get single announcement by ID
 * Story 13.8: Implement Platform-Wide Announcements (AC: 6)
 */
export async function getAnnouncementById(
  id: string
): Promise<PlatformAnnouncement | null> {
  const results = await adminDb
    .select()
    .from(platformAnnouncements)
    .where(eq(platformAnnouncements.id, id))
    .limit(1);

  if (results.length === 0) return null;

  const r = results[0];
  return {
    id: r.id,
    message: r.message,
    type: r.type as "info" | "warning" | "critical",
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    targetRoles: r.target_roles,
    isActive: r.is_active,
    createdAt: r.created_at,
    createdByAdminEmail: r.created_by_admin_email,
    updatedAt: r.updated_at,
    updatedByAdminEmail: r.updated_by_admin_email,
  };
}
```

### Critical: Server Actions

```typescript
// src/modules/platform-admin/actions.ts - ADD:
"use server";

import { revalidatePath } from "next/cache";
import { platformAnnouncements } from "@/db/schema/platform-announcements";
import type { CreateAnnouncementInput, UpdateAnnouncementInput, PlatformAnnouncement } from "./types";

// IMPORTANT: Call revalidatePath after all mutations to refresh UI
// revalidatePath("/platform-admin/announcements");

export async function createAnnouncement(
  input: CreateAnnouncementInput
): Promise<ActionResult<PlatformAnnouncement>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Validate message length
    if (!input.message || input.message.trim().length < 10) {
      return { success: false, error: "Message must be at least 10 characters" };
    }

    const [result] = await adminDb
      .insert(platformAnnouncements)
      .values({
        message: input.message.trim(),
        type: input.type,
        starts_at: input.startsAt,
        ends_at: input.endsAt ?? null,
        target_roles: input.targetRoles ?? null,
        created_by_admin_email: admin.email,
        updated_by_admin_email: admin.email,
      })
      .returning();

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.CREATE_ANNOUNCEMENT,
      route: "/platform-admin/announcements",
      metadata: { announcementId: result.id, type: input.type },
    });

    // Revalidate to refresh UI
    revalidatePath("/platform-admin/announcements");

    return {
      success: true,
      data: {
        id: result.id,
        message: result.message,
        type: result.type as "info" | "warning" | "critical",
        startsAt: result.starts_at,
        endsAt: result.ends_at,
        targetRoles: result.target_roles,
        isActive: result.is_active,
        createdAt: result.created_at,
        createdByAdminEmail: result.created_by_admin_email,
        updatedAt: result.updated_at,
        updatedByAdminEmail: result.updated_by_admin_email,
      },
    };
  } catch (error) {
    console.error("createAnnouncement error:", error);
    return { success: false, error: "Failed to create announcement" };
  }
}

export async function updateAnnouncement(
  id: string,
  input: UpdateAnnouncementInput
): Promise<ActionResult<PlatformAnnouncement>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Validate message if provided
    if (input.message !== undefined && input.message.trim().length < 10) {
      return { success: false, error: "Message must be at least 10 characters" };
    }

    const updateValues: Record<string, unknown> = {
      updated_at: new Date(),
      updated_by_admin_email: admin.email,
    };

    if (input.message !== undefined) updateValues.message = input.message.trim();
    if (input.type !== undefined) updateValues.type = input.type;
    if (input.startsAt !== undefined) updateValues.starts_at = input.startsAt;
    if (input.endsAt !== undefined) updateValues.ends_at = input.endsAt;
    if (input.targetRoles !== undefined) updateValues.target_roles = input.targetRoles;
    if (input.isActive !== undefined) updateValues.is_active = input.isActive;

    const [result] = await adminDb
      .update(platformAnnouncements)
      .set(updateValues)
      .where(eq(platformAnnouncements.id, id))
      .returning();

    if (!result) {
      return { success: false, error: "Announcement not found" };
    }

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.UPDATE_ANNOUNCEMENT,
      route: `/platform-admin/announcements/${id}`,
      metadata: { announcementId: id, changes: Object.keys(input) },
    });

    // Revalidate to refresh UI
    revalidatePath("/platform-admin/announcements");

    return {
      success: true,
      data: {
        id: result.id,
        message: result.message,
        type: result.type as "info" | "warning" | "critical",
        startsAt: result.starts_at,
        endsAt: result.ends_at,
        targetRoles: result.target_roles,
        isActive: result.is_active,
        createdAt: result.created_at,
        createdByAdminEmail: result.created_by_admin_email,
        updatedAt: result.updated_at,
        updatedByAdminEmail: result.updated_by_admin_email,
      },
    };
  } catch (error) {
    console.error("updateAnnouncement error:", error);
    return { success: false, error: "Failed to update announcement" };
  }
}

export async function deactivateAnnouncement(
  id: string
): Promise<ActionResult<void>> {
  return updateAnnouncement(id, { isActive: false }).then((result) =>
    result.success ? { success: true, data: undefined } : result
  );
}
```

### Critical: Banner Component

```typescript
// src/components/announcement-banner.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import { AlertTriangle, AlertCircle, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { marked } from "marked";
import DOMPurify from "dompurify";
import type { ActiveAnnouncement } from "@/modules/platform-admin/types";

const DISMISSED_KEY = "dismissed_announcements";

// Configure marked for inline rendering (no <p> tags)
marked.use({ breaks: true, gfm: true });

interface AnnouncementBannerProps {
  announcements: ActiveAnnouncement[];
}

export function AnnouncementBanner({ announcements }: AnnouncementBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Load dismissed announcements from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISSED_KEY);
      if (stored) {
        setDismissedIds(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  const handleDismiss = (id: string) => {
    const newDismissed = new Set([...dismissedIds, id]);
    setDismissedIds(newDismissed);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify([...newDismissed]));
    } catch {
      // Ignore localStorage errors
    }
  };

  // Filter out dismissed announcements
  const visibleAnnouncements = announcements.filter(
    (a) => !dismissedIds.has(a.id)
  );

  if (visibleAnnouncements.length === 0) return null;

  const getStyles = (type: string) => {
    switch (type) {
      case "critical":
        return "bg-red-600 text-white";
      case "warning":
        return "bg-amber-500 text-black";
      case "info":
      default:
        return "bg-blue-600 text-white";
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "critical":
        return <AlertTriangle className="h-5 w-5 flex-shrink-0" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 flex-shrink-0" />;
      case "info":
      default:
        return <Info className="h-5 w-5 flex-shrink-0" />;
    }
  };

  // Parse and sanitize markdown for each announcement
  const parsedAnnouncements = useMemo(() => {
    return visibleAnnouncements.map((a) => ({
      ...a,
      htmlContent: DOMPurify.sanitize(marked.parseInline(a.message) as string),
    }));
  }, [visibleAnnouncements]);

  return (
    <div className="announcement-banners z-40">
      {parsedAnnouncements.map((announcement) => (
        <div
          key={announcement.id}
          className={`flex items-center justify-between px-4 py-2 ${getStyles(announcement.type)}`}
        >
          <div className="flex items-center gap-2">
            {getIcon(announcement.type)}
            <span
              className="text-sm font-medium [&_a]:underline [&_strong]:font-bold [&_em]:italic"
              dangerouslySetInnerHTML={{ __html: announcement.htmlContent }}
            />
          </div>
          {/* Critical announcements cannot be dismissed */}
          {announcement.type !== "critical" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDismiss(announcement.id)}
              className="h-6 w-6 p-0 hover:bg-black/10"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
```

### Critical: Banner Server Wrapper

```typescript
// src/components/announcement-banner-wrapper.tsx

import { getActiveAnnouncements } from "@/modules/platform-admin/announcements";
import { AnnouncementBanner } from "./announcement-banner";
import { auth } from "@clerk/nextjs/server";
import { adminDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

interface AnnouncementBannerWrapperProps {
  /** User role for filtering targeted announcements */
  userRole?: string;
}

export async function AnnouncementBannerWrapper({
  userRole,
}: AnnouncementBannerWrapperProps) {
  // Get active announcements filtered by role
  const announcements = await getActiveAnnouncements(userRole);

  if (announcements.length === 0) return null;

  return <AnnouncementBanner announcements={announcements} />;
}
```

### Layout Integration

```typescript
// In src/app/(dashboard)/layout.tsx - ADD after ImpersonationBannerWrapper:

import { AnnouncementBannerWrapper } from "@/components/announcement-banner-wrapper";

// Inside the layout component, after impersonation banner:
<AnnouncementBannerWrapper userRole={user?.role} />

// In src/app/(portal)/layout.tsx - ADD at top:
import { AnnouncementBannerWrapper } from "@/components/announcement-banner-wrapper";

// Portal users are always "author" role:
<AnnouncementBannerWrapper userRole="author" />
```

### Project Structure Notes

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/db/schema/platform-announcements.ts` | Database schema for announcements |
| `src/modules/platform-admin/announcements.ts` | Query functions |
| `src/modules/platform-admin/components/announcement-form.tsx` | Reusable form component (client) |
| `src/app/(platform-admin)/platform-admin/announcements/page.tsx` | List view |
| `src/app/(platform-admin)/platform-admin/announcements/new/page.tsx` | Create page (wraps form) |
| `src/app/(platform-admin)/platform-admin/announcements/[id]/page.tsx` | Edit page (wraps form) |
| `src/components/announcement-banner.tsx` | Banner client component |
| `src/components/announcement-banner-wrapper.tsx` | Banner server wrapper |
| `tests/unit/platform-announcements.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/db/schema/index.ts` | Export platformAnnouncements |
| `src/modules/platform-admin/types.ts` | Add announcement types |
| `src/modules/platform-admin/actions.ts` | Add CRUD actions |
| `src/lib/platform-audit.ts` | Add audit constants |
| `src/app/(dashboard)/layout.tsx` | Add AnnouncementBannerWrapper |
| `src/app/(portal)/layout.tsx` | Add AnnouncementBannerWrapper |
| `src/app/(platform-admin)/platform-admin/page.tsx` | Update navigation |

### Dependencies

**New npm packages required:**
- `marked` - Markdown parsing for announcement messages
- `dompurify` + `@types/dompurify` - XSS sanitization for markdown HTML

```bash
pnpm add marked dompurify @types/dompurify
```

**Existing packages used:**
- Uses existing `adminDb` from `@/db`
- Uses existing shadcn/ui components (Card, Button, Input, Select, Textarea)
- Uses lucide-react icons (Megaphone, AlertTriangle, AlertCircle, Info, X)
- Uses React Hook Form + Zod for form validation (existing pattern)

### Banner Z-Index Stacking

The announcement banner should appear BELOW the impersonation banner but ABOVE normal content:
- Impersonation banner: z-50 (highest)
- Announcement banner: z-40
- Normal content: z-0

### localStorage Schema

```typescript
// localStorage key: "dismissed_announcements"
// Value: JSON array of announcement IDs
// Example: ["uuid-1", "uuid-2", "uuid-3"]
```

### Security Considerations

1. **Platform Admin Only:** All CRUD operations require platform admin authentication
2. **Audit Logged:** All changes logged for compliance
3. **No Tenant Context:** Uses adminDb - announcements are platform-wide
4. **XSS Prevention:** Markdown should be sanitized before rendering (use DOMPurify or similar)
5. **Client-Side Dismiss:** localStorage-based dismissal doesn't affect server state

### Relationship to Story 13.7 (System Health)

Both stories add new features to platform admin. System Health added `/platform-admin/system` route. This story adds `/platform-admin/announcements` routes. Both follow the same patterns:
- Server actions with platform admin auth
- Audit logging for all operations
- Navigation updates to landing page

### References

- [Source: docs/epics.md#Story-13.8]
- [Source: src/modules/platform-admin/types.ts] - Existing type patterns
- [Source: src/modules/platform-admin/actions.ts] - Existing action patterns
- [Source: src/lib/platform-audit.ts] - Audit logging patterns
- [Source: src/components/impersonation-banner.tsx] - Banner component pattern
- [Source: src/components/impersonation-banner-wrapper.tsx] - Server wrapper pattern
- [Source: docs/architecture.md] - Tech stack and patterns

---

## Dev Agent Record

### Context Reference

- Story 13.7 (System Health and Job Monitoring) - In Review
- Story 13.6 (Tenant Impersonation) - DONE
- Story 13.5 (Platform Analytics Dashboard) - DONE
- Story 13.1 (Platform Administrator Authentication) - DONE

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled during implementation)

### File List

(To be filled during implementation)
