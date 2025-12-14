# Story 13.4: Implement Tenant Suspension and Reactivation

Status: done

## Story

As a **platform administrator**,
I want to **suspend and reactivate tenant access**,
so that **I can handle non-payment, abuse, or customer requests**.

## Acceptance Criteria

1. **Given** I am viewing a tenant in platform admin **When** I click "Suspend Tenant" **Then** I must provide a suspension reason

2. The tenant status changes to "suspended"

3. All users of that tenant are immediately blocked from accessing the application

4. Suspended tenant users see an "Account Suspended" message when trying to log in

5. The suspension is logged with timestamp and admin who performed it

6. I can reactivate a suspended tenant

7. Reactivation restores normal access for all tenant users

8. Reactivation is logged with timestamp and admin

9. Suspension/reactivation events trigger notification to tenant owner (email)

## Tasks / Subtasks

- [x] **Task 1: Add Database Columns to Tenants Table** (AC: 2, 5, 8)
  - [x] Edit `src/db/schema/tenants.ts`
  - [x] Add `status: text("status").notNull().default("active")` column
  - [x] Add `suspended_at: timestamp("suspended_at", { withTimezone: true })` column
  - [x] Add `suspended_reason: text("suspended_reason")` column
  - [x] Add `suspended_by_admin_email: text("suspended_by_admin_email")` column
  - [x] Run `npm run db:generate` to generate migration
  - [x] Run `npm run db:push` to apply migration

- [x] **Task 2: Update Types for Tenant Suspension** (AC: 1-9)
  - [x] Edit `src/modules/platform-admin/types.ts`
  - [x] Update `TenantWithUserCount` status to include actual status from DB
  - [x] Add `SuspendTenantInput` interface with `reason: string`
  - [x] Add `TenantSuspensionInfo` interface with suspension details
  - [x] Update `TenantDetail` to include suspension fields

- [x] **Task 3: Create Suspension Server Actions** (AC: 1, 2, 5, 6, 7, 8, 9)
  - [x] Edit `src/modules/platform-admin/actions.ts`
  - [x] Implement `suspendTenant(id: string, reason: string): Promise<ActionResult<void>>`
  - [x] Validate UUID format, check platform admin auth
  - [x] Verify tenant exists and is not already suspended
  - [x] **CRITICAL:** Add safety check - cannot suspend your own platform admin tenant
  - [x] Update tenant: status='suspended', suspended_at=now(), suspended_reason, suspended_by_admin_email
  - [x] Log SUSPEND_TENANT to platform audit
  - [x] Send suspension notification email to tenant owner
  - [x] Implement `reactivateTenant(id: string): Promise<ActionResult<void>>`
  - [x] Validate UUID, check auth, verify tenant is suspended
  - [x] Update tenant: status='active', clear suspended_at/reason/by fields
  - [x] Log REACTIVATE_TENANT to platform audit
  - [x] Send reactivation notification email to tenant owner

- [x] **Task 4: Create Tenant Owner Email Query** (AC: 9)
  - [x] Edit `src/modules/platform-admin/queries.ts`
  - [x] Implement `getTenantOwnerEmail(tenantId: string): Promise<string | null>`
  - [x] Query users table for user with role='owner' and tenant_id
  - [x] Return owner's email or null if not found

- [x] **Task 5: Create Suspension Email Templates** (AC: 9)
  - [x] Create `src/modules/platform-admin/emails/tenant-suspended.tsx`
  - [x] React Email template for suspension notification
  - [x] Include: tenant name, reason, suspended date, contact support info
  - [x] Create `src/modules/platform-admin/emails/tenant-reactivated.tsx`
  - [x] React Email template for reactivation notification
  - [x] Include: tenant name, reactivation date, login link

- [x] **Task 6: Create Email Service Functions** (AC: 9)
  - [x] Create `src/modules/platform-admin/email-service.ts`
  - [x] Implement `sendTenantSuspendedEmail(params)` function (fire-and-forget, errors logged not thrown)
  - [x] Implement `sendTenantReactivatedEmail(params)` function (fire-and-forget, errors logged not thrown)
  - [x] Use Resend via `@/lib/email` pattern
  - [x] **NOTE:** Email failures should NOT fail the main suspend/reactivate action

- [x] **Task 7: Update Middleware for Tenant Status Check** (AC: 3, 4)
  - [x] Edit `src/proxy.ts`
  - [x] After successful tenant lookup, check `tenant.status`
  - [x] If status === 'suspended', redirect to `/tenant-suspended` page
  - [x] Do NOT block platform-admin routes (they bypass tenant context)

- [x] **Task 8: Create Tenant Suspended Page** (AC: 4)
  - [x] Create `src/app/tenant-suspended/page.tsx`
  - [x] Display "Account Suspended" message
  - [x] Include: contact support message, link to contact page
  - [x] Use dark slate theme (`bg-slate-900`, `text-white`) consistent with platform-admin area
  - [x] **NOTE:** Update `tenant-not-found/page.tsx` to match dark theme for consistency

- [x] **Task 9: Create Suspend Tenant Dialog Component** (AC: 1)
  - [x] Create `src/modules/platform-admin/components/suspend-tenant-dialog.tsx`
  - [x] AlertDialog with reason input field (required, min 10 chars)
  - [x] Destructive action styling (red button)
  - [x] Show tenant name in confirmation message
  - [x] Loading state during submission

- [x] **Task 10: Create Reactivate Tenant Dialog Component** (AC: 6)
  - [x] Create `src/modules/platform-admin/components/reactivate-tenant-dialog.tsx`
  - [x] AlertDialog confirmation for reactivation
  - [x] Show tenant name and time suspended
  - [x] Success action styling (green button)

- [x] **Task 11: Add Suspension Actions to Tenant Info Card** (AC: 1, 6)
  - [x] Edit `src/modules/platform-admin/components/tenant-info-card.tsx`
  - [x] Add "Suspend Tenant" button (shown when status='active')
  - [x] Add "Reactivate Tenant" button (shown when status='suspended')
  - [x] Display suspension info when suspended (reason, date, by whom, duration)
  - [x] Add helper: `formatSuspensionDuration(suspendedAt: Date)` - calculates "X days" or "X hours"
  - [x] Wire up to SuspendTenantDialog and ReactivateTenantDialog

- [x] **Task 12: Update Tenant List to Show Real Status** (AC: 2)
  - [x] Edit `src/modules/platform-admin/queries.ts` - `getTenants()`
  - [x] Select actual `status` column from tenants table
  - [x] Remove hardcoded `status: "active" as const`
  - [x] Edit `src/modules/platform-admin/components/tenant-list.tsx`
  - [x] Ensure suspended tenants show red status badge

- [x] **Task 13: Update Tenant Detail to Show Suspension Info** (AC: 2, 5)
  - [x] Edit `src/modules/platform-admin/queries.ts` - `getTenantById()`
  - [x] Include suspended_at, suspended_reason, suspended_by_admin_email in select
  - [x] Edit `src/modules/platform-admin/actions.ts` - `getTenantDetail()`
  - [x] Include suspension fields in TenantDetail response

- [x] **Task 14: Write Unit Tests** (All ACs)
  - [x] Create `tests/unit/platform-admin-suspension.test.ts`
  - [x] Test: `suspendTenant()` - validates input, updates status, logs event
  - [x] Test: `suspendTenant()` - rejects suspending already suspended tenant
  - [x] Test: `suspendTenant()` - safety check prevents self-suspension (platform admin tenant)
  - [x] Test: `suspendTenant()` - succeeds even when no tenant owner exists (email skipped gracefully)
  - [x] Test: `reactivateTenant()` - updates status, clears fields, logs event
  - [x] Test: `reactivateTenant()` - rejects reactivating active tenant
  - [x] Test: `getTenantOwnerEmail()` - returns owner email / null
  - [x] Test: Email service errors don't fail suspend/reactivate actions
  - [x] Test: Middleware redirects suspended tenant users to /tenant-suspended
  - [x] Test: Email templates render correctly

## Dev Notes

### Critical: Database Migration Required

Add the following columns to the `tenants` table:

```typescript
// src/db/schema/tenants.ts - ADD to tenants table:
status: text("status").notNull().default("active"), // "active" | "suspended"
suspended_at: timestamp("suspended_at", { withTimezone: true }),
suspended_reason: text("suspended_reason"),
suspended_by_admin_email: text("suspended_by_admin_email"),
```

After editing, run:
```bash
npm run db:generate
npm run db:migrate
```

### Critical: Middleware Status Check

Add tenant status check in `src/proxy.ts` after tenant lookup:

```typescript
// After line 117 (tenant lookup):
if (!tenant) {
  return NextResponse.redirect(new URL("/tenant-not-found", req.url));
}

// ADD: Check tenant suspension status
if (tenant.status === "suspended") {
  return NextResponse.redirect(new URL("/tenant-suspended", req.url));
}
```

**IMPORTANT:** This check must be AFTER the platform admin bypass (line 32-35) since platform admins don't use tenant context.

### Critical: Safety Check for Self-Suspension

Prevent platform admins from suspending their own tenant:

```typescript
// In suspendTenant action:
const admin = await getCurrentPlatformAdmin();

// Get admin's tenant (if they have one)
const adminUser = await adminDb.query.users.findFirst({
  where: eq(users.clerk_user_id, admin.clerkId),
});

if (adminUser?.tenant_id === id) {
  return { success: false, error: "Cannot suspend your own tenant" };
}
```

### Type Definitions

```typescript
// src/modules/platform-admin/types.ts - ADD:

export interface SuspendTenantInput {
  reason: string; // Min 10 chars
}

export interface TenantSuspensionInfo {
  status: "active" | "suspended";
  suspended_at: Date | null;
  suspended_reason: string | null;
  suspended_by_admin_email: string | null;
}

// UPDATE TenantDetail to include:
export interface TenantDetail extends TenantWithUserCount {
  // ... existing fields ...
  suspended_at: Date | null;
  suspended_reason: string | null;
  suspended_by_admin_email: string | null;
}
```

### Server Actions

```typescript
// src/modules/platform-admin/actions.ts - ADD:

export async function suspendTenant(
  id: string,
  reason: string,
): Promise<ActionResult<void>> {
  try {
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: "Suspension reason must be at least 10 characters" };
    }

    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    // Safety check: prevent self-suspension
    const adminUser = await adminDb.query.users.findFirst({
      where: eq(users.clerk_user_id, admin.clerkId),
    });
    if (adminUser?.tenant_id === id) {
      return { success: false, error: "Cannot suspend your own tenant" };
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    if (tenant.status === "suspended") {
      return { success: false, error: "Tenant is already suspended" };
    }

    // Update tenant status
    await adminDb
      .update(tenants)
      .set({
        status: "suspended",
        suspended_at: new Date(),
        suspended_reason: reason.trim(),
        suspended_by_admin_email: admin.email,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, id));

    // Log platform admin event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.SUSPEND_TENANT,
      route: `/platform-admin/tenants/${id}`,
      metadata: { tenantId: id, tenantName: tenant.name, reason: reason.trim() },
    });

    // Send notification email to tenant owner
    const ownerEmail = await getTenantOwnerEmail(id);
    if (ownerEmail) {
      sendTenantSuspendedEmail({
        to: ownerEmail,
        tenantName: tenant.name,
        reason: reason.trim(),
        suspendedAt: new Date(),
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("suspendTenant error:", error);
    return { success: false, error: "Failed to suspend tenant" };
  }
}

export async function reactivateTenant(id: string): Promise<ActionResult<void>> {
  try {
    if (!isValidUUID(id)) {
      return { success: false, error: "Invalid tenant ID format" };
    }

    const admin = await getCurrentPlatformAdmin();
    if (!admin) {
      return { success: false, error: "Unauthorized: Platform admin access required" };
    }

    const tenant = await getTenantById(id);
    if (!tenant) {
      return { success: false, error: "Tenant not found" };
    }

    if (tenant.status !== "suspended") {
      return { success: false, error: "Tenant is not suspended" };
    }

    // Update tenant status
    await adminDb
      .update(tenants)
      .set({
        status: "active",
        suspended_at: null,
        suspended_reason: null,
        suspended_by_admin_email: null,
        updated_at: new Date(),
      })
      .where(eq(tenants.id, id));

    // Log platform admin event
    logPlatformAdminEvent({
      adminEmail: admin.email,
      adminClerkId: admin.clerkId,
      action: PLATFORM_ADMIN_ACTIONS.REACTIVATE_TENANT,
      route: `/platform-admin/tenants/${id}`,
      metadata: { tenantId: id, tenantName: tenant.name },
    });

    // Send notification email to tenant owner
    const ownerEmail = await getTenantOwnerEmail(id);
    if (ownerEmail) {
      sendTenantReactivatedEmail({
        to: ownerEmail,
        tenantName: tenant.name,
        reactivatedAt: new Date(),
      });
    }

    return { success: true, data: undefined };
  } catch (error) {
    console.error("reactivateTenant error:", error);
    return { success: false, error: "Failed to reactivate tenant" };
  }
}
```

### Query for Tenant Owner Email

```typescript
// src/modules/platform-admin/queries.ts - ADD:

export async function getTenantOwnerEmail(tenantId: string): Promise<string | null> {
  const owner = await adminDb.query.users.findFirst({
    where: and(
      eq(users.tenant_id, tenantId),
      eq(users.role, "owner"),
    ),
  });
  return owner?.email ?? null;
}
```

### Tenant Suspended Page

```typescript
// src/app/tenant-suspended/page.tsx
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Account Suspended | Salina ERP",
};

export default function TenantSuspendedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-red-500" />
        <h1 className="mt-6 text-3xl font-bold text-white">Account Suspended</h1>
        <p className="mt-4 max-w-md text-slate-400">
          Your organization's account has been suspended. If you believe this is an error,
          please contact our support team.
        </p>
        <div className="mt-8">
          <Button asChild>
            <Link href="/contact">Contact Support</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
```

### Update Tenant Not Found Page (for consistency)

```typescript
// src/app/tenant-not-found/page.tsx - UPDATE to dark theme
import { AlertCircle } from "lucide-react";

export const metadata = {
  title: "Tenant Not Found | Salina ERP",
};

export default function TenantNotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4">
      <div className="text-center">
        <AlertCircle className="mx-auto h-16 w-16 text-amber-500" />
        <h1 className="mt-6 text-3xl font-bold text-white">Tenant Not Found</h1>
        <p className="mt-4 max-w-md text-slate-400">
          The subdomain you're trying to access doesn't exist.
        </p>
      </div>
    </div>
  );
}
```

### Suspension Duration Helper

```typescript
// Add to src/modules/platform-admin/components/tenant-info-card.tsx

/**
 * Format suspension duration for display
 * Returns "X days" or "X hours" depending on duration
 */
function formatSuspensionDuration(suspendedAt: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(suspendedAt).getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays >= 1) {
    return `${diffDays} day${diffDays === 1 ? "" : "s"}`;
  }
  return `${diffHours} hour${diffHours === 1 ? "" : "s"}`;
}

// Usage in component:
{tenant.status === "suspended" && tenant.suspended_at && (
  <div className="mt-4 rounded-lg border border-red-800 bg-red-900/20 p-4">
    <h4 className="text-sm font-medium text-red-400">Suspension Details</h4>
    <div className="mt-2 space-y-1 text-sm text-slate-300">
      <p>Suspended for: {formatSuspensionDuration(tenant.suspended_at)}</p>
      <p>Reason: {tenant.suspended_reason}</p>
      <p>By: {tenant.suspended_by_admin_email}</p>
    </div>
  </div>
)}
```

### Email Service Implementation

```typescript
// src/modules/platform-admin/email-service.ts
import { sendEmail, getDefaultFromEmail } from "@/lib/email";
import { render } from "@react-email/render";
import { TenantSuspendedEmail } from "./emails/tenant-suspended";
import { TenantReactivatedEmail } from "./emails/tenant-reactivated";

interface SendTenantSuspendedEmailParams {
  to: string;
  tenantName: string;
  reason: string;
  suspendedAt: Date;
}

interface SendTenantReactivatedEmailParams {
  to: string;
  tenantName: string;
  reactivatedAt: Date;
}

/**
 * Send tenant suspension notification email
 * FIRE AND FORGET - errors are logged but don't throw
 */
export async function sendTenantSuspendedEmail(
  params: SendTenantSuspendedEmailParams,
): Promise<void> {
  try {
    const html = await render(
      TenantSuspendedEmail({
        tenantName: params.tenantName,
        reason: params.reason,
        suspendedAt: params.suspendedAt,
      }),
    );

    await sendEmail({
      from: getDefaultFromEmail(),
      to: params.to,
      subject: `Account Suspended - ${params.tenantName}`,
      html,
    });
  } catch (error) {
    // Log but don't throw - email failure shouldn't fail the main action
    console.error("[PlatformAdmin] Failed to send suspension email:", error);
  }
}

/**
 * Send tenant reactivation notification email
 * FIRE AND FORGET - errors are logged but don't throw
 */
export async function sendTenantReactivatedEmail(
  params: SendTenantReactivatedEmailParams,
): Promise<void> {
  try {
    const html = await render(
      TenantReactivatedEmail({
        tenantName: params.tenantName,
        reactivatedAt: params.reactivatedAt,
      }),
    );

    await sendEmail({
      from: getDefaultFromEmail(),
      to: params.to,
      subject: `Account Reactivated - ${params.tenantName}`,
      html,
    });
  } catch (error) {
    // Log but don't throw - email failure shouldn't fail the main action
    console.error("[PlatformAdmin] Failed to send reactivation email:", error);
  }
}
```

### Email Templates

```typescript
// src/modules/platform-admin/emails/tenant-suspended.tsx
import { Html, Head, Body, Container, Text, Hr, Link } from "@react-email/components";

interface TenantSuspendedEmailProps {
  tenantName: string;
  reason: string;
  suspendedAt: Date;
}

export function TenantSuspendedEmail({ tenantName, reason, suspendedAt }: TenantSuspendedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f5" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#dc2626" }}>
            Account Suspended
          </Text>
          <Text>
            The account for <strong>{tenantName}</strong> has been suspended as of{" "}
            {suspendedAt.toLocaleDateString()}.
          </Text>
          <Text style={{ fontWeight: "bold" }}>Reason:</Text>
          <Text style={{ backgroundColor: "#fef2f2", padding: "12px", borderRadius: "4px" }}>
            {reason}
          </Text>
          <Hr />
          <Text>
            If you believe this is an error or need assistance, please{" "}
            <Link href="https://salina-erp.com/contact">contact our support team</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

```typescript
// src/modules/platform-admin/emails/tenant-reactivated.tsx
import { Html, Head, Body, Button, Container, Text, Hr, Link } from "@react-email/components";

interface TenantReactivatedEmailProps {
  tenantName: string;
  reactivatedAt: Date;
}

export function TenantReactivatedEmail({ tenantName, reactivatedAt }: TenantReactivatedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: "sans-serif", backgroundColor: "#f4f4f5" }}>
        <Container style={{ maxWidth: "600px", margin: "0 auto", padding: "20px" }}>
          <Text style={{ fontSize: "24px", fontWeight: "bold", color: "#059669" }}>
            Account Reactivated
          </Text>
          <Text>
            Great news! The account for <strong>{tenantName}</strong> has been reactivated as of{" "}
            {reactivatedAt.toLocaleDateString()}.
          </Text>
          <Text>
            You and your team can now log in and access all features.
          </Text>
          <Button
            href="https://salina-erp.com/sign-in"
            style={{
              backgroundColor: "#059669",
              color: "#fff",
              padding: "12px 24px",
              borderRadius: "4px",
              textDecoration: "none",
              display: "inline-block",
              marginTop: "16px",
            }}
          >
            Log In Now
          </Button>
          <Hr style={{ marginTop: "24px" }} />
          <Text style={{ color: "#6b7280", fontSize: "14px" }}>
            If you have questions, please{" "}
            <Link href="https://salina-erp.com/contact">contact our support team</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
```

### Suspend Tenant Dialog

```typescript
// src/modules/platform-admin/components/suspend-tenant-dialog.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { suspendTenant } from "../actions";

interface SuspendTenantDialogProps {
  tenantId: string;
  tenantName: string;
}

export function SuspendTenantDialog({ tenantId, tenantName }: SuspendTenantDialogProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  async function handleSuspend() {
    if (reason.trim().length < 10) {
      toast.error("Reason must be at least 10 characters");
      return;
    }

    setIsLoading(true);
    const result = await suspendTenant(tenantId, reason);
    setIsLoading(false);

    if (result.success) {
      toast.success(`${tenantName} has been suspended`);
      setOpen(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <AlertTriangle className="mr-2 h-4 w-4" />
          Suspend Tenant
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="border-slate-700 bg-slate-800">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">Suspend {tenantName}?</AlertDialogTitle>
          <AlertDialogDescription className="text-slate-400">
            This will immediately block all users of this tenant from accessing the application.
            They will see an "Account Suspended" message.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="my-4">
          <Label htmlFor="reason" className="text-slate-300">Suspension Reason</Label>
          <Textarea
            id="reason"
            placeholder="Enter reason for suspension (min 10 characters)..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2 border-slate-600 bg-slate-700 text-white"
            rows={3}
          />
          <p className="mt-1 text-xs text-slate-500">{reason.length}/10 characters minimum</p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-slate-600 bg-slate-700 text-white hover:bg-slate-600">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSuspend}
            disabled={isLoading || reason.trim().length < 10}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Suspend Tenant
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
```

### Project Structure Notes

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/app/tenant-suspended/page.tsx` | Suspended account error page (dark slate theme) |
| `src/modules/platform-admin/emails/tenant-suspended.tsx` | Suspension notification email |
| `src/modules/platform-admin/emails/tenant-reactivated.tsx` | Reactivation notification email |
| `src/modules/platform-admin/email-service.ts` | Email sending functions (fire-and-forget pattern) |
| `src/modules/platform-admin/components/suspend-tenant-dialog.tsx` | Suspension dialog |
| `src/modules/platform-admin/components/reactivate-tenant-dialog.tsx` | Reactivation dialog |
| `tests/unit/platform-admin-suspension.test.ts` | Unit tests |

**Files to Modify:**
| File | Change |
|------|--------|
| `src/db/schema/tenants.ts` | Add status, suspended_at, suspended_reason, suspended_by_admin_email columns |
| `src/modules/platform-admin/types.ts` | Add SuspendTenantInput, TenantSuspensionInfo, update TenantDetail |
| `src/modules/platform-admin/queries.ts` | Update getTenants, getTenantById; add getTenantOwnerEmail |
| `src/modules/platform-admin/actions.ts` | Add suspendTenant, reactivateTenant actions; import email service |
| `src/modules/platform-admin/components/tenant-info-card.tsx` | Add suspend/reactivate buttons, display suspension info with duration |
| `src/modules/platform-admin/components/tenant-list.tsx` | Use real status from DB |
| `src/proxy.ts` | Add tenant status check, redirect suspended to /tenant-suspended |
| `src/app/tenant-not-found/page.tsx` | Update to dark slate theme for consistency |

### References

- [Source: docs/epics.md#Story-13.4]
- [Source: docs/architecture.md#Multi-Tenant-Row-Level-Security]
- [Source: src/db/schema/tenants.ts] - Current tenant schema
- [Source: src/proxy.ts] - Middleware tenant routing
- [Source: src/modules/platform-admin/actions.ts] - Existing action patterns
- [Source: src/modules/platform-admin/queries.ts] - Existing query patterns
- [Source: src/modules/platform-admin/components/tenant-info-card.tsx] - UI component to extend
- [Source: src/lib/email.ts] - Email sending pattern
- [Source: src/lib/platform-audit.ts] - Audit logging (SUSPEND_TENANT, REACTIVATE_TENANT already defined)

### What This Story Does NOT Include

- Automatic suspension (e.g., for non-payment) - future enhancement
- Suspension duration / auto-reactivation - future enhancement
- Partial suspension (allow read-only access) - future enhancement
- Bulk suspension operations - future enhancement
- Suspension warnings / grace periods - future enhancement

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
