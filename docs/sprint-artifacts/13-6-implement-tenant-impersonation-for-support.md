# Story 13.6: Implement Tenant Impersonation for Support

Status: complete

## Quick Implementation Path

1. Extend `TenantUser` type to include `clerk_user_id` and update `getTenantUsers()` query
2. Add `StartImpersonationInput` and `ImpersonationStatus` types to `types.ts`
3. Create `src/modules/platform-admin/impersonation.ts` with Clerk actor token logic
4. Add server actions: `startImpersonation()`, `getImpersonationStatus()`
5. Add `IMPERSONATION_ACTION` audit constant (START/END already exist)
6. Create `ImpersonationBanner` client component with sign-out button
7. Update `TenantUsersTable` to add "Impersonate" button per user row (only if `clerk_user_id` exists)
8. Create `ImpersonationConfirmDialog` with reason input and client redirect
9. Add banner to BOTH `(dashboard)/layout.tsx` AND root layout with conditional rendering
10. Write comprehensive unit tests with Clerk API mocking

---

## Story

As a **platform administrator**,
I want to **impersonate a tenant user for support purposes**,
so that **I can see exactly what customers see and debug issues**.

## Acceptance Criteria

1. **Given** I am viewing a tenant's user list in platform admin **When** I click "Impersonate" on a user **Then** I am logged in as that user and see their view

2. A clear banner indicates I am in impersonation mode

3. I can click "End Impersonation" to return to platform admin (via Clerk sign-out)

4. All actions taken while impersonating are logged with my platform admin identity

5. Impersonation events are logged: who impersonated whom, when, duration

6. Impersonation requires confirmation dialog with reason field

7. Cannot impersonate users in suspended tenants

8. Cannot impersonate users without a Clerk account (clerk_user_id is null)

**Prerequisites:** Story 13.3 (Tenant Detail View - DONE)

---

## Tasks / Subtasks

### Backend Tasks (Server-Side)

- [x] **Task 1: Extend TenantUser Type and Query** (AC: 1, 8)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Add `clerk_user_id: string | null` to `TenantUser` interface
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Update `getTenantUsers()` to select `clerk_user_id` field
  - [x] CRITICAL: Actor tokens require Clerk user ID, not database ID

- [x] **Task 2: Add Impersonation Types** (AC: 1-5)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Add `StartImpersonationInput` interface (userId, reason)
  - [x] Add `ImpersonationStatus` interface for checking current session

- [x] **Task 3: Create Impersonation Service** (AC: 1, 3-5)
  - [x] Create `src/modules/platform-admin/impersonation.ts`
  - [x] Implement `createActorToken()` - calls Clerk Backend API
  - [x] Add expiration time constant (default 30 minutes)
  - [x] CRITICAL: Use `CLERK_SECRET_KEY` env var for Backend API calls
  - [x] NOTE: Token revocation not needed - use Clerk signOut instead

- [x] **Task 4: Add Server Actions for Impersonation** (AC: 1, 4-7)
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `startImpersonation(input: StartImpersonationInput)`:
    - Validate platform admin authentication
    - Validate reason (min 10 characters)
    - Verify target user exists via database ID lookup
    - **CRITICAL:** Check `clerk_user_id` is not null
    - **CRITICAL:** Check tenant is not suspended
    - Create actor token via Clerk Backend API using `clerk_user_id`
    - Log START_IMPERSONATION audit event with reason
    - Return sign-in URL from actor token response
  - [x] Implement `getImpersonationStatus()`:
    - Check if current session has `actor` claim via `auth()`
    - Return actor details if impersonated, null otherwise

- [x] **Task 5: Add Audit Constant** (AC: 4, 5)
  - [x] Edit `src/lib/platform-audit.ts`
  - [x] Add `IMPERSONATION_ACTION: "impersonation_action"` for tracking actions during impersonation
  - [x] NOTE: START_IMPERSONATION and END_IMPERSONATION already exist!

### Frontend Tasks (Client-Side)

- [x] **Task 6: Create Impersonation Banner Component** (AC: 2, 3)
  - [x] Create `src/components/impersonation-banner.tsx`
  - [x] Show bright amber/yellow banner at top of page
  - [x] Display: "Impersonating [user email] | [tenant name]"
  - [x] Add "End Impersonation" button using Clerk's `useClerk().signOut()`
  - [x] Make banner fixed position (always visible when scrolling)
  - [x] Add visual warning icon
  - [x] Redirect to `/platform-admin` after sign-out

- [x] **Task 7: Create Impersonation Confirmation Dialog** (AC: 6)
  - [x] Create `src/modules/platform-admin/components/impersonation-confirm-dialog.tsx`
  - [x] Use shadcn/ui Dialog component (already at `src/components/ui/dialog.tsx`)
  - [x] Include reason textarea (required, min 10 chars)
  - [x] Show user email and tenant being impersonated
  - [x] Warning text about audit logging
  - [x] Cancel and Confirm buttons
  - [x] On success: redirect via `window.location.href = signInUrl`
  - [x] Handle loading state during API call

- [x] **Task 8: Update Tenant Users Table** (AC: 1, 6, 8)
  - [x] Edit `src/modules/platform-admin/components/tenant-users-table.tsx`
  - [x] Add "Impersonate" button to each user row (use shadcn Button with ghost variant)
  - [x] **CRITICAL:** Only show button if `user.clerk_user_id` is not null
  - [x] Show tooltip "User has no Clerk account" for users with null clerk_user_id
  - [x] Wire button to open ImpersonationConfirmDialog
  - [x] Pass user ID, email, and clerk_user_id to dialog
  - [x] Disable ALL impersonate buttons while any action is in progress

### Integration Tasks

- [x] **Task 9: Add Banner to Layouts** (AC: 2)
  - [x] Create `src/components/impersonation-banner-wrapper.tsx` (RSC wrapper)
  - [x] Call `getImpersonationStatus()` server-side
  - [x] Conditionally render `ImpersonationBanner` if impersonating
  - [x] Edit `src/app/(dashboard)/layout.tsx` - add wrapper at top of main content
  - [x] Edit `src/app/(portal)/layout.tsx` - add wrapper for author portal
  - [x] Banner should NOT appear on sign-in/sign-up pages

### Testing

- [x] **Task 10: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-impersonation.test.ts`
  - [x] Test startImpersonation validation (reason required, min length)
  - [x] Test startImpersonation requires platform admin auth
  - [x] Test startImpersonation rejects null clerk_user_id
  - [x] Test startImpersonation rejects suspended tenant users
  - [x] Test startImpersonation creates audit log
  - [x] Test getImpersonationStatus returns correct actor info
  - [x] Test actor token creation with mocked fetch (see mocking pattern below)

---

## Dev Notes

### Critical: Clerk Actor Token API

**This feature requires Clerk's paid plan for production!** Actor tokens are free in development mode.

**Clerk Backend API Endpoint:**
```typescript
// POST https://api.clerk.com/v1/actor_tokens
// Headers: Authorization: Bearer sk_live_xxx (CLERK_SECRET_KEY)

interface CreateActorTokenRequest {
  user_id: string;           // Subject's CLERK user ID (not database ID!)
  expires_in_seconds: number; // Max 3600 (1 hour)
  actor: {
    sub: string;             // Actor's Clerk user ID (platform admin)
  };
}

interface ActorTokenResponse {
  id: string;
  url: string;               // Sign-in URL to consume token
  user_id: string;
  actor: { sub: string };
  status: "pending" | "accepted" | "revoked";
}
```

### Critical: TenantUser Type Extension

The existing `TenantUser` type and `getTenantUsers()` query do NOT include `clerk_user_id`. You MUST extend them:

```typescript
// src/modules/platform-admin/types.ts - MODIFY TenantUser:
export interface TenantUser {
  id: string;
  email: string;
  role: "owner" | "admin" | "editor" | "finance" | "author";
  is_active: boolean;
  created_at: Date;
  clerk_user_id: string | null;  // ADD THIS - required for impersonation
}

// src/modules/platform-admin/queries.ts - MODIFY getTenantUsers():
export async function getTenantUsers(tenantId: string): Promise<TenantUser[]> {
  const result = await adminDb
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      is_active: users.is_active,
      created_at: users.created_at,
      clerk_user_id: users.clerk_user_id,  // ADD THIS
    })
    .from(users)
    .where(eq(users.tenant_id, tenantId))
    .orderBy(asc(users.email));

  return result as TenantUser[];
}
```

### Critical: Suspended Tenant Check

Before creating actor token, verify target user's tenant is not suspended:

```typescript
// In startImpersonation():
const tenant = await adminDb.query.tenants.findFirst({
  where: eq(tenants.id, targetUser.tenant_id),
});
if (tenant?.status === "suspended") {
  return { success: false, error: "Cannot impersonate users in suspended tenants" };
}
```

### Impersonation Service Implementation

```typescript
// src/modules/platform-admin/impersonation.ts

const CLERK_API_URL = "https://api.clerk.com/v1";
const IMPERSONATION_EXPIRY_SECONDS = 1800; // 30 minutes

export async function createActorToken(
  subjectClerkId: string,  // CLERK user ID of user being impersonated
  actorClerkId: string     // CLERK user ID of platform admin
): Promise<{ url: string; tokenId: string } | null> {
  const response = await fetch(`${CLERK_API_URL}/actor_tokens`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_id: subjectClerkId,
      expires_in_seconds: IMPERSONATION_EXPIRY_SECONDS,
      actor: { sub: actorClerkId },
    }),
  });

  if (!response.ok) {
    console.error("Failed to create actor token:", await response.text());
    return null;
  }

  const data = await response.json();
  return { url: data.url, tokenId: data.id };
}
```

### Detecting Impersonation in Auth

```typescript
// Using Clerk's auth() helper
import { auth } from "@clerk/nextjs/server";

export async function getImpersonationStatus(): Promise<ImpersonationStatus> {
  const { actor, userId } = await auth();

  if (actor && actor.sub) {
    // Optionally fetch user details for display
    const impersonatedUser = await adminDb.query.users.findFirst({
      where: eq(users.clerk_user_id, userId),
    });
    const tenant = impersonatedUser?.tenant_id
      ? await adminDb.query.tenants.findFirst({
          where: eq(tenants.id, impersonatedUser.tenant_id),
        })
      : null;

    return {
      isImpersonating: true,
      impersonatedUserId: impersonatedUser?.id,
      impersonatedEmail: impersonatedUser?.email,
      impersonatorClerkId: actor.sub,
      tenantName: tenant?.name,
    };
  }

  return { isImpersonating: false };
}
```

### Server Action - startImpersonation

```typescript
// src/modules/platform-admin/actions.ts - ADD:

export async function startImpersonation(
  input: StartImpersonationInput
): Promise<ActionResult<{ signInUrl: string }>> {
  try {
    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    if (!input.userId) {
      return { success: false, error: "User ID is required" };
    }
    if (!input.reason || input.reason.trim().length < 10) {
      return { success: false, error: "Reason must be at least 10 characters" };
    }

    // Lookup by DATABASE ID, get clerk_user_id
    const targetUser = await adminDb.query.users.findFirst({
      where: eq(users.id, input.userId),
    });
    if (!targetUser) {
      return { success: false, error: "User not found" };
    }

    // CRITICAL: Check clerk_user_id exists
    if (!targetUser.clerk_user_id) {
      return { success: false, error: "User has no Clerk account - cannot impersonate" };
    }

    // CRITICAL: Check tenant not suspended
    const tenant = await adminDb.query.tenants.findFirst({
      where: eq(tenants.id, targetUser.tenant_id),
    });
    if (tenant?.status === "suspended") {
      return { success: false, error: "Cannot impersonate users in suspended tenants" };
    }

    // Create actor token using CLERK IDs
    const result = await createActorToken(targetUser.clerk_user_id, admin.clerkId);
    if (!result) {
      return { success: false, error: "Failed to create impersonation session" };
    }

    // Log audit event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.START_IMPERSONATION,
      route: "/platform-admin/impersonate",
      metadata: {
        targetUserId: input.userId,
        targetClerkId: targetUser.clerk_user_id,
        targetTenantId: targetUser.tenant_id,
        targetEmail: targetUser.email,
        reason: input.reason.trim(),
        tokenId: result.tokenId,
      },
    });

    return { success: true, data: { signInUrl: result.url } };
  } catch (error) {
    console.error("startImpersonation error:", error);
    return { success: false, error: "Failed to start impersonation" };
  }
}
```

### Impersonation Banner Component

```typescript
// src/components/impersonation-banner.tsx
"use client";

import { AlertTriangle } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";

interface ImpersonationBannerProps {
  impersonatedEmail: string;
  tenantName: string;
}

export function ImpersonationBanner({
  impersonatedEmail,
  tenantName,
}: ImpersonationBannerProps) {
  const { signOut } = useClerk();
  const [isPending, startTransition] = useTransition();

  const handleEndImpersonation = () => {
    startTransition(async () => {
      // Sign out ends the impersonation session
      // Clerk handles session cleanup automatically
      await signOut({ redirectUrl: "/platform-admin" });
    });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-amber-500 px-4 py-2 text-black">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5" />
        <span className="font-medium">
          Impersonating {impersonatedEmail} | {tenantName}
        </span>
      </div>
      <Button
        variant="destructive"
        size="sm"
        onClick={handleEndImpersonation}
        disabled={isPending}
      >
        {isPending ? "Ending..." : "End Impersonation"}
      </Button>
    </div>
  );
}
```

### Banner Wrapper (RSC)

```typescript
// src/components/impersonation-banner-wrapper.tsx
import { getImpersonationStatus } from "@/modules/platform-admin/actions";
import { ImpersonationBanner } from "./impersonation-banner";

export async function ImpersonationBannerWrapper() {
  const status = await getImpersonationStatus();

  if (!status.isImpersonating) {
    return null;
  }

  return (
    <ImpersonationBanner
      impersonatedEmail={status.impersonatedEmail || "Unknown"}
      tenantName={status.tenantName || "Unknown Tenant"}
    />
  );
}
```

### Client-Side Redirect in Dialog

```typescript
// In ImpersonationConfirmDialog after successful action:
const handleConfirm = async () => {
  setIsLoading(true);
  const result = await startImpersonation({ userId, reason });

  if (result.success) {
    // Redirect to Clerk's actor token sign-in URL
    // This will sign out current session and sign in as impersonated user
    window.location.href = result.data.signInUrl;
  } else {
    toast.error(result.error);
    setIsLoading(false);
  }
};
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

/**
 * Input for starting user impersonation
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 1, 6)
 */
export interface StartImpersonationInput {
  userId: string;  // Database user ID (looked up to get clerk_user_id)
  reason: string;  // Required, min 10 chars
}

/**
 * Impersonation session status
 * Story 13.6: Implement Tenant Impersonation for Support (AC: 2)
 */
export interface ImpersonationStatus {
  isImpersonating: boolean;
  impersonatedUserId?: string;
  impersonatedEmail?: string;
  impersonatorClerkId?: string;
  tenantName?: string;
}
```

### Test Mocking Pattern for Clerk API

```typescript
// tests/unit/platform-impersonation.test.ts
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch for Clerk API
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock platform-admin auth
vi.mock("@/lib/platform-admin", () => ({
  getCurrentPlatformAdmin: vi.fn(),
}));

// Mock platform-audit
vi.mock("@/lib/platform-audit", () => ({
  logPlatformAdminEvent: vi.fn(),
  PLATFORM_ADMIN_ACTIONS: {
    START_IMPERSONATION: "start_impersonation",
  },
}));

// Mock adminDb
vi.mock("@/db", () => ({
  adminDb: {
    query: {
      users: { findFirst: vi.fn() },
      tenants: { findFirst: vi.fn() },
    },
  },
}));

describe("Platform Impersonation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createActorToken", () => {
    it("calls Clerk API with correct parameters", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "act_123",
          url: "https://clerk.com/sign-in?token=xxx",
        }),
      });

      const { createActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );
      const result = await createActorToken("user_subject", "user_actor");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.clerk.com/v1/actor_tokens",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      );
      expect(result).toEqual({
        url: "https://clerk.com/sign-in?token=xxx",
        tokenId: "act_123",
      });
    });

    it("returns null on API error", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Unauthorized",
      });

      const { createActorToken } = await import(
        "@/modules/platform-admin/impersonation"
      );
      const result = await createActorToken("user_subject", "user_actor");

      expect(result).toBeNull();
    });
  });

  describe("startImpersonation", () => {
    it("rejects users with null clerk_user_id", async () => {
      // Setup mocks for user without clerk_user_id
      // ... test implementation
    });

    it("rejects users in suspended tenants", async () => {
      // Setup mocks for suspended tenant
      // ... test implementation
    });
  });
});
```

### Project Structure Notes

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/modules/platform-admin/impersonation.ts` | Clerk actor token API wrapper |
| `src/components/impersonation-banner.tsx` | Client component with sign-out |
| `src/components/impersonation-banner-wrapper.tsx` | RSC wrapper for status check |
| `src/modules/platform-admin/components/impersonation-confirm-dialog.tsx` | Confirmation with reason |
| `tests/unit/platform-impersonation.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/modules/platform-admin/types.ts` | Add `clerk_user_id` to TenantUser, add impersonation types |
| `src/modules/platform-admin/queries.ts` | Update `getTenantUsers()` to select `clerk_user_id` |
| `src/modules/platform-admin/actions.ts` | Add `startImpersonation()`, `getImpersonationStatus()` |
| `src/lib/platform-audit.ts` | Add `IMPERSONATION_ACTION` constant |
| `src/modules/platform-admin/components/tenant-users-table.tsx` | Add impersonate button (conditional on clerk_user_id) |
| `src/app/(dashboard)/layout.tsx` | Add ImpersonationBannerWrapper |
| `src/app/layout.tsx` | Add ImpersonationBannerWrapper (conditional) |

### Dependencies

- **Clerk paid plan** required for production (free in development)
- No new npm packages needed - uses fetch for Clerk API

### Security Considerations

1. **Audit Everything:** All impersonation start events logged with full context
2. **Reason Required:** Platform admin must provide reason (min 10 chars) for compliance/GDPR
3. **Time Limited:** Actor tokens expire after 30 minutes
4. **Visible:** Bright amber banner clearly shows impersonation is active
5. **Platform Admin Only:** Only users in PLATFORM_ADMIN_EMAILS whitelist can impersonate
6. **Suspended Check:** Cannot impersonate users in suspended tenants
7. **Clerk Account Required:** Cannot impersonate users without clerk_user_id

### Why Sign-Out Instead of Token Revocation

The story uses Clerk's `signOut()` instead of explicit token revocation because:
1. Actor token ID is not accessible after the redirect/sign-in completes
2. Clerk's signOut cleanly terminates the session
3. Simpler implementation with same security outcome
4. User is redirected back to platform admin after sign-out

### References

- [Source: docs/epics.md#Story-13.6]
- [Source: src/modules/platform-admin/types.ts] - TenantUser type (needs clerk_user_id)
- [Source: src/modules/platform-admin/queries.ts] - getTenantUsers query (needs clerk_user_id)
- [Source: src/modules/platform-admin/actions.ts] - Existing action patterns
- [Source: src/lib/platform-admin.ts] - Platform admin auth helpers
- [Source: src/lib/platform-audit.ts] - START/END_IMPERSONATION already defined
- [Source: src/db/schema/users.ts] - clerk_user_id can be null for portal users
- [Source: src/app/(dashboard)/layout.tsx] - Dashboard layout for banner placement
- [Clerk Docs: User Impersonation](https://clerk.com/docs/guides/users/impersonation)
- [Clerk Docs: Actor Tokens API](https://clerk.com/docs/reference/backend-api/tag/actor-tokens)

---

## Dev Agent Record

### Context Reference

- Story 13.3 (Tenant Detail View) - DONE
- Story 13.4 (Tenant Suspension) - DONE

### Agent Model Used

claude-opus-4-5-20251101

### Debug Log References

- All 176 platform admin tests pass (173 existing + 3 new for endImpersonation)
- 34 impersonation tests total
- Build compiles successfully

### Completion Notes List

1. Extended TenantUser type with clerk_user_id field
2. Updated getTenantUsers query to select clerk_user_id
3. Added StartImpersonationInput and ImpersonationStatus types
4. Created impersonation service with Clerk actor token API integration
5. Implemented startImpersonation server action with full validation
6. Implemented getImpersonationStatus using Clerk auth() actor claim
7. Added IMPERSONATION_ACTION audit constant
8. Created ImpersonationBanner client component with amber warning style
9. Created ImpersonationBannerWrapper RSC for server-side status check
10. Created ImpersonationConfirmDialog with reason input and warning
11. Updated TenantUsersTable with Impersonate button (disabled for users without Clerk ID)
12. Added banner to dashboard and portal layouts
13. Wrote 34 comprehensive unit tests covering all acceptance criteria

### Code Review Fixes Applied

1. **[MEDIUM] Banner layout padding** - Added spacer div (h-10) in ImpersonationBannerWrapper to prevent content from being hidden behind fixed banner
2. **[MEDIUM] END_IMPERSONATION audit log** - Added endImpersonation() server action that logs END_IMPERSONATION event before signOut for duration tracking (AC: 5)
3. **[LOW] TypeScript strict null check** - Added `as string` type assertion for actor.sub in getImpersonationStatus

### File List

**Created:**
- src/modules/platform-admin/impersonation.ts
- src/components/impersonation-banner.tsx
- src/components/impersonation-banner-wrapper.tsx
- src/modules/platform-admin/components/impersonation-confirm-dialog.tsx
- tests/unit/platform-impersonation.test.ts

**Modified:**
- src/modules/platform-admin/types.ts
- src/modules/platform-admin/queries.ts
- src/modules/platform-admin/actions.ts
- src/lib/platform-audit.ts
- src/modules/platform-admin/components/tenant-users-table.tsx
- src/app/(dashboard)/layout.tsx
- src/app/(portal)/layout.tsx
- src/app/(platform-admin)/platform-admin/tenants/[id]/page.tsx
- docs/sprint-artifacts/sprint-status.yaml

