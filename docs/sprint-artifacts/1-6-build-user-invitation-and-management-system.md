# Story 1.6: Build User Invitation and Management System

Status: implemented

## Story

As a tenant owner or administrator,
I want to invite team members with specific roles and manage their access,
So that my team can collaborate securely within our publishing company's tenant.

## Acceptance Criteria

1. Owner/Admin can access user management page at `/dashboard/settings/users` route
2. User management page displays table of all users in current tenant with columns: Name, Email, Role, Status (Active/Inactive), Invite Date
3. Table includes "Invite User" button in header, visible only to Owner/Admin roles (uses `PermissionGate` from Story 1.5)
4. "Invite User" button opens modal/dialog with form containing: Email (text input, required), Role (dropdown: owner, admin, editor, finance, author)
5. Form validates email format client-side using Zod schema before submission
6. Form validates role is one of the 5 permitted values: owner, admin, editor, finance, author
7. Server Action `inviteUser(email, role)` checks permission using `requirePermission(MANAGE_USERS)` from Story 1.5
8. If permission denied, Server Action returns `{ success: false, error: "You don't have permission to invite users" }`
9. Server Action validates subdomain availability... wait, that's wrong. Let me fix: Server Action validates email is not already invited to this tenant
10. If email already exists for tenant, return error: "A user with this email already exists in your organization"
11. If validation passes, Server Action sends Clerk invitation email using Clerk API
12. Server Action creates user record in database with fields: tenant_id (from session), email, role, clerk_user_id (set to pending/null until accepted), is_active=false (until invitation accepted)
13. Upon successful invitation, toast notification displays: "Invitation sent to [email]"
14. User table updates to show newly invited user with status "Pending" (is_active=false, no clerk_user_id yet)
15. Invited user receives email from Clerk with registration link containing tenant context
16. When invited user clicks link and completes Clerk registration, webhook updates user record with clerk_user_id and sets is_active=true
17. Owner/Admin can change user role via dropdown in user table row (inline edit)
18. Role change triggers Server Action `updateUserRole(userId, newRole)` with permission check `requirePermission(MANAGE_USERS)`
19. Role change validates: Owner cannot demote themselves to non-owner role (prevents lockout)
20. Role change validates: Tenant must have at least one active Owner at all times
21. Owner/Admin can deactivate user via "Deactivate" button in user table row
22. Deactivate action triggers Server Action `deactivateUser(userId)` with permission check
23. Deactivate action sets `is_active=false` in database, preventing user login
24. Deactivated users shown in table with "Inactive" status badge and "Reactivate" button (replaces "Deactivate")
25. Owner/Admin can reactivate user via "Reactivate" button
26. Reactivate action triggers Server Action `reactivateUser(userId)` setting `is_active=true`
27. All user management Server Actions enforce tenant isolation: queries filter by `tenant_id` from session
28. User table supports pagination (default 20 users per page) using `offset` and `limit` parameters
29. User table supports filtering by role (dropdown filter) and search by email/name (text input)
30. Search/filter operations maintain tenant isolation (only search within current tenant's users)
31. UI prevents Owner from deactivating themselves (button disabled with tooltip: "You cannot deactivate your own account")
32. UI shows role badge with color coding: Owner (purple), Admin (blue), Editor (green), Finance (orange), Author (gray)
33. Responsive design: User table adapts to mobile screens (stack columns or horizontal scroll)
34. Accessibility: All interactive elements keyboard navigable, ARIA labels present, screen reader compatible
35. Error handling: Network errors show retry option, validation errors show inline with field-level messages
36. Loading states: Show skeleton loaders for table while fetching users, disable submit button with spinner during invitation

## Tasks / Subtasks

- [ ] Create user management page route and layout (AC: 1-2)
  - [ ] Create route: `src/app/(dashboard)/settings/users/page.tsx`
  - [ ] Add route to dashboard navigation (only visible to Owner/Admin)
  - [ ] Create page layout with header "User Management" and "Invite User" button
  - [ ] Verify route renders correctly and is protected by Clerk authentication

- [ ] Create user list table component (AC: 2, 28-30, 32-34)
  - [ ] Create `src/modules/users/components/user-list.tsx`
  - [ ] Use TanStack Table for data grid functionality (if available) or create custom table
  - [ ] Define columns: Name, Email, Role (with colored badge), Status (Active/Inactive badge), Actions (role dropdown, deactivate/reactivate button)
  - [ ] Implement role badge component with color coding per AC32
  - [ ] Add pagination controls (Previous, Next, page numbers) per AC28
  - [ ] Add filter dropdown for role (all roles + "All" option)
  - [ ] Add search input for email/name with debounced onChange (300ms)
  - [ ] Implement responsive layout per AC33 (test on mobile viewport)
  - [ ] Add ARIA labels, keyboard navigation, screen reader support per AC34
  - [ ] Test table renders with mock data (5 users, mixed roles/statuses)

- [ ] Create Server Action to fetch users (AC: 2, 27-30)
  - [ ] Create `getUsers()` Server Action in `src/modules/users/actions.ts`
  - [ ] Add permission check: `requirePermission(MANAGE_USERS)` at function start
  - [ ] Accept parameters: page (number, default 1), pageSize (number, default 20), roleFilter (UserRole | "all"), searchQuery (string)
  - [ ] Query database: `db.query.users.findMany()` with WHERE clause for tenant_id (from session)
  - [ ] Apply role filter if not "all": AND role = roleFilter
  - [ ] Apply search filter: AND (email ILIKE %searchQuery% OR name ILIKE %searchQuery%)
  - [ ] Apply pagination: LIMIT pageSize OFFSET (page - 1) * pageSize
  - [ ] Also query total count: `db.select({ count: count() }).from(users).where(eq(users.tenant_id, tenantId))`
  - [ ] Return: `{ success: true, data: { users, total, page, pageSize } }`
  - [ ] Test: (1) authorized user gets users, (2) unauthorized gets 403, (3) tenant isolation enforced

- [ ] Create invite user modal/dialog component (AC: 3-6)
  - [ ] Create `src/modules/users/components/invite-user-dialog.tsx`
  - [ ] Use shadcn/ui Dialog component (if available) or create modal
  - [ ] Create form with React Hook Form + Zod validation
  - [ ] Define Zod schema: `inviteUserSchema = z.object({ email: z.string().email(), role: z.enum(['owner', 'admin', 'editor', 'finance', 'author']) })`
  - [ ] Add email input field with validation error display
  - [ ] Add role dropdown with all 5 roles as options
  - [ ] Add "Cancel" and "Send Invitation" buttons
  - [ ] Disable submit button while form invalid or submitting
  - [ ] Show loading spinner on submit button during invitation
  - [ ] Trigger `inviteUser()` Server Action on form submit
  - [ ] Test form validation: (1) invalid email rejected, (2) invalid role rejected, (3) valid data passes

- [ ] Create invite user Server Action (AC: 7-14)
  - [ ] Create `inviteUser(data: unknown)` Server Action in `src/modules/users/actions.ts`
  - [ ] Add "use server" directive at top of actions file (if not already present)
  - [ ] Validate input with Zod: `const { email, role } = inviteUserSchema.parse(data)`
  - [ ] Check permission: `await requirePermission(MANAGE_USERS)` (returns error if unauthorized per AC8)
  - [ ] Get tenant context: `const tenantId = await getCurrentTenantId()`
  - [ ] Check if user already exists: `db.query.users.findFirst({ where: and(eq(users.tenant_id, tenantId), eq(users.email, email)) })`
  - [ ] If exists, return: `{ success: false, error: "A user with this email already exists in your organization" }` per AC10
  - [ ] Send Clerk invitation: `await clerkClient.invitations.createInvitation({ emailAddress: email, redirectUrl: constructTenantUrl(tenantId) })`
  - [ ] Create user record: `db.insert(users).values({ tenant_id: tenantId, email, role, clerk_user_id: null, is_active: false, created_at: new Date(), updated_at: new Date() })`
  - [ ] Return success: `{ success: true, data: user }`
  - [ ] Handle errors: Clerk API errors, database errors, return user-friendly messages
  - [ ] Test: (1) valid invitation succeeds, (2) duplicate email rejected, (3) Clerk error handled, (4) permission check enforced

- [ ] Integrate Clerk webhook for user registration (AC: 16)
  - [ ] Create webhook endpoint: `src/app/api/webhooks/clerk/route.ts` (may already exist from Story 1.3)
  - [ ] Handle `user.created` event from Clerk
  - [ ] Extract email from webhook payload
  - [ ] Query database for user with matching email and tenant_id
  - [ ] Update user record: `db.update(users).set({ clerk_user_id: clerkUserId, is_active: true, updated_at: new Date() }).where(eq(users.id, userId))`
  - [ ] Return 200 OK response to Clerk
  - [ ] Test webhook: (1) user.created updates DB correctly, (2) unmatched email ignored, (3) malformed payload handled

- [ ] Create update user role Server Action (AC: 17-20)
  - [ ] Create `updateUserRole(userId: string, newRole: UserRole)` Server Action in `src/modules/users/actions.ts`
  - [ ] Check permission: `await requirePermission(MANAGE_USERS)`
  - [ ] Get tenant context and current user: `const tenantId = await getCurrentTenantId()`, `const currentUser = await getCurrentUser()`
  - [ ] Query target user: `db.query.users.findFirst({ where: and(eq(users.id, userId), eq(users.tenant_id, tenantId)) })`
  - [ ] Validate: If target user is currentUser AND currentUser.role === 'owner' AND newRole !== 'owner', return error: "You cannot remove your own owner role" per AC19
  - [ ] Validate: If newRole !== 'owner', count active owners in tenant: `db.select({ count: count() }).from(users).where(and(eq(users.tenant_id, tenantId), eq(users.role, 'owner'), eq(users.is_active, true)))`
  - [ ] If target user is last owner and newRole !== 'owner', return error: "Tenant must have at least one active owner" per AC20
  - [ ] Update user: `db.update(users).set({ role: newRole, updated_at: new Date() }).where(eq(users.id, userId))`
  - [ ] Return: `{ success: true, data: updatedUser }`
  - [ ] Test: (1) authorized role change succeeds, (2) owner lockout prevented, (3) last owner protection enforced

- [ ] Create deactivate/reactivate user Server Actions (AC: 21-26)
  - [ ] Create `deactivateUser(userId: string)` Server Action
  - [ ] Check permission: `await requirePermission(MANAGE_USERS)`
  - [ ] Get tenant context and current user
  - [ ] Validate: Cannot deactivate self (userId !== currentUser.id) per AC31
  - [ ] Validate: If user is owner, check not last active owner (same logic as updateUserRole AC20)
  - [ ] Update user: `db.update(users).set({ is_active: false, updated_at: new Date() }).where(and(eq(users.id, userId), eq(users.tenant_id, tenantId)))`
  - [ ] Return: `{ success: true, data: updatedUser }`
  - [ ] Create `reactivateUser(userId: string)` Server Action (similar structure, sets is_active=true)
  - [ ] Test: (1) deactivate succeeds, (2) self-deactivation blocked, (3) last owner protection enforced, (4) reactivate succeeds

- [ ] Add inline role editor to user table (AC: 17-18)
  - [ ] In UserList component, add role dropdown for each user row
  - [ ] Dropdown shows current user's role as selected value
  - [ ] Dropdown options: all 5 roles
  - [ ] Disable dropdown if current user lacks MANAGE_USERS permission (use `useHasPermission()` hook from Story 1.5)
  - [ ] On role change: trigger `updateUserRole(userId, newRole)` Server Action
  - [ ] Show loading state on dropdown during update
  - [ ] On success: toast notification "Role updated successfully", refresh table
  - [ ] On error: toast error message, revert dropdown to previous value
  - [ ] Test: (1) authorized role change, (2) UI reflects new role, (3) error handling

- [ ] Add deactivate/reactivate buttons to user table (AC: 21-26, 31)
  - [ ] In UserList component, add action button column
  - [ ] If user.is_active === true: show "Deactivate" button
  - [ ] If user.is_active === false: show "Reactivate" button
  - [ ] Disable deactivate button if userId === currentUser.id with tooltip per AC31
  - [ ] On deactivate click: confirm dialog "Are you sure you want to deactivate [user.email]?"
  - [ ] On confirm: trigger `deactivateUser(userId)` Server Action
  - [ ] On success: toast "User deactivated", update table (status badge → Inactive, button → Reactivate)
  - [ ] On error: toast error message
  - [ ] On reactivate click: trigger `reactivateUser(userId)` Server Action
  - [ ] On success: toast "User reactivated", update table (status badge → Active, button → Deactivate)
  - [ ] Test: (1) deactivate flow, (2) reactivate flow, (3) self-deactivation blocked, (4) UI updates

- [ ] Implement loading and error states (AC: 35-36)
  - [ ] User table: Show skeleton loaders while `getUsers()` is loading (use shadcn/ui Skeleton or custom)
  - [ ] Invite form: Disable submit button with spinner during `inviteUser()` execution (use React Hook Form `isSubmitting`)
  - [ ] Role dropdown: Show loading spinner during `updateUserRole()` execution
  - [ ] Deactivate/Reactivate buttons: Disable with spinner during action execution
  - [ ] Network errors: Show toast with retry button calling same action again
  - [ ] Validation errors: Display inline below form fields with red text (React Hook Form error messages)
  - [ ] Test: (1) loading states visible, (2) error states handled gracefully

- [ ] Add toast notifications (AC: 13, role change, deactivate/reactivate success)
  - [ ] Install `sonner` toast library if not already present (shadcn/ui uses sonner)
  - [ ] Wrap app with Toaster provider in layout (if not done in previous story)
  - [ ] Import `toast` from 'sonner' in components
  - [ ] On successful invite: `toast.success('Invitation sent to [email]')` per AC13
  - [ ] On role change success: `toast.success('Role updated successfully')`
  - [ ] On deactivate success: `toast.success('User deactivated')`
  - [ ] On reactivate success: `toast.success('User reactivated')`
  - [ ] On errors: `toast.error(errorMessage)`
  - [ ] Test toast notifications appear correctly for each action

- [ ] Create integration tests for user management Server Actions (AC: 7-14, 17-26)
  - [ ] Create `tests/integration/user-management.test.ts`
  - [ ] Test `inviteUser()`: (1) authorized succeeds, (2) unauthorized 403, (3) duplicate email rejected, (4) Clerk API mocked
  - [ ] Test `updateUserRole()`: (1) authorized succeeds, (2) owner lockout prevented, (3) last owner protection
  - [ ] Test `deactivateUser()`: (1) authorized succeeds, (2) self-deactivation blocked, (3) last owner protection
  - [ ] Test `reactivateUser()`: (1) authorized succeeds
  - [ ] Mock Clerk API calls, database queries, session context
  - [ ] Verify tests pass: npm run test:integration

- [ ] Create E2E tests for user management UI (AC: 1-36)
  - [ ] Create `tests/e2e/user-management.spec.ts`
  - [ ] Test 1: Owner can access user management page, sees all users
  - [ ] Test 2: Editor cannot access user management page (403 or redirect)
  - [ ] Test 3: Owner can invite user, user appears in table with "Pending" status
  - [ ] Test 4: Duplicate email invitation shows error
  - [ ] Test 5: Owner can change user role, UI updates correctly
  - [ ] Test 6: Owner cannot demote themselves, error shown
  - [ ] Test 7: Owner can deactivate user, status changes to "Inactive"
  - [ ] Test 8: Owner cannot deactivate themselves, button disabled
  - [ ] Test 9: Owner can reactivate user, status changes to "Active"
  - [ ] Test 10: Search by email filters results correctly
  - [ ] Test 11: Filter by role shows only users with that role
  - [ ] Test 12: Pagination works (Next/Previous buttons)
  - [ ] Seed test database with multiple users, roles, statuses
  - [ ] Verify tests pass: npm run test:e2e

- [ ] Update navigation to include user management link (AC: 1)
  - [ ] Open dashboard navigation component (created in Story 1.4 or earlier)
  - [ ] Add link to `/dashboard/settings/users` with label "User Management"
  - [ ] Wrap link in `<PermissionGate allowedRoles={MANAGE_USERS}>` from Story 1.5
  - [ ] Test: (1) Owner sees link, (2) Editor does not see link

- [ ] Final validation and manual testing (AC: all)
  - [ ] Build passes: npm run build
  - [ ] Lint passes: npm run lint
  - [ ] Unit tests pass: npm run test:unit (if any created)
  - [ ] Integration tests pass: npm run test:integration
  - [ ] E2E tests pass: npm run test:e2e
  - [ ] Manual test: Invite user flow end-to-end (send invite, user accepts, appears active in table)
  - [ ] Manual test: Role change, deactivate, reactivate flows
  - [ ] Manual test: Search, filter, pagination
  - [ ] Manual test: Mobile responsiveness (Chrome DevTools mobile view)
  - [ ] Manual test: Keyboard navigation, screen reader (macOS VoiceOver or NVDA)
  - [ ] Verify all ACs met

## Dev Notes

This story implements the user invitation and management system, completing FR3 (invite users), FR4 (assign roles), FR6 (deactivate users) from the PRD. It builds on the RBAC system from Story 1.5 by applying the `MANAGE_USERS` permission to protect all user management operations.

### Relevant Architecture Patterns and Constraints

**User Management Architecture (Per Architecture.md and Epic 1 Tech Spec):**

The user management system follows the established patterns from previous stories:

1. **Permission-Protected Server Actions** (Story 1.5 Pattern)
   - All Server Actions begin with: `await requirePermission(MANAGE_USERS)`
   - Returns standardized error: `{ success: false, error: "You don't have permission..." }`
   - Audit logging for permission denials (automatic via requirePermission)

2. **Tenant Isolation** (Story 1.2-1.3 Pattern)
   - All database queries include: `WHERE tenant_id = ?` (from session)
   - Users can only manage users within their own tenant
   - Clerk invitations include tenant context in redirect URL

3. **Clerk Integration** (Story 1.3 Pattern)
   - Use `clerkClient.invitations.createInvitation()` for email invites
   - Webhook endpoint handles `user.created` event to link Clerk user to database user
   - Invited users register via Clerk flow, then become active in database

4. **Business Logic Validations** (New for this story)
   - Owner lockout prevention: Owners cannot demote themselves to non-owner
   - Last owner protection: Tenant must always have at least one active owner
   - Self-deactivation prevention: Users cannot deactivate their own account

**Server Actions Pattern:**

```typescript
// src/modules/users/actions.ts
"use server"

import { requirePermission } from '@/lib/auth'
import { MANAGE_USERS } from '@/lib/permissions'
import { getCurrentTenantId, getCurrentUser } from '@/lib/auth'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq, and, count } from 'drizzle-orm'
import { clerkClient } from '@clerk/nextjs/server'
import type { ActionResult, UserRole } from '@/lib/types'

/**
 * Invite a new user to the current tenant
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function inviteUser(data: unknown): Promise<ActionResult<User>> {
  try {
    // Validate input
    const { email, role } = inviteUserSchema.parse(data)

    // Check permission
    await requirePermission(MANAGE_USERS)

    // Get tenant context
    const tenantId = await getCurrentTenantId()

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: and(
        eq(users.tenant_id, tenantId),
        eq(users.email, email)
      )
    })

    if (existingUser) {
      return {
        success: false,
        error: "A user with this email already exists in your organization"
      }
    }

    // Send Clerk invitation
    const tenantSubdomain = await getTenantSubdomain(tenantId)
    const redirectUrl = `https://${tenantSubdomain}.salina-erp.com/dashboard`

    await clerkClient.invitations.createInvitation({
      emailAddress: email,
      redirectUrl: redirectUrl,
      publicMetadata: { tenant_id: tenantId, role: role }
    })

    // Create pending user record
    const [newUser] = await db.insert(users).values({
      tenant_id: tenantId,
      email: email,
      role: role,
      clerk_user_id: null, // Set by webhook when user accepts
      is_active: false, // Activated by webhook
      created_at: new Date(),
      updated_at: new Date()
    }).returning()

    return { success: true, data: newUser }

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: "You don't have permission to invite users"
      }
    }

    console.error('inviteUser error:', error)
    return {
      success: false,
      error: 'Failed to send invitation. Please try again.'
    }
  }
}

/**
 * Update a user's role
 * Permission: MANAGE_USERS (owner, admin)
 * Validation: Cannot demote self, must maintain at least one owner
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole
): Promise<ActionResult<User>> {
  try {
    // Check permission
    await requirePermission(MANAGE_USERS)

    // Get context
    const tenantId = await getCurrentTenantId()
    const currentUser = await getCurrentUser()

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.tenant_id, tenantId)
      )
    })

    if (!targetUser) {
      return { success: false, error: "User not found" }
    }

    // Validate: Owner cannot demote themselves
    if (
      targetUser.id === currentUser?.id &&
      currentUser.role === 'owner' &&
      newRole !== 'owner'
    ) {
      return {
        success: false,
        error: "You cannot remove your own owner role"
      }
    }

    // Validate: Must maintain at least one owner
    if (newRole !== 'owner' && targetUser.role === 'owner') {
      const [ownerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            eq(users.role, 'owner'),
            eq(users.is_active, true)
          )
        )

      if (ownerCount.count <= 1) {
        return {
          success: false,
          error: "Tenant must have at least one active owner"
        }
      }
    }

    // Update role
    const [updatedUser] = await db
      .update(users)
      .set({
        role: newRole,
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning()

    return { success: true, data: updatedUser }

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: "You don't have permission to update user roles"
      }
    }

    console.error('updateUserRole error:', error)
    return {
      success: false,
      error: 'Failed to update user role'
    }
  }
}

/**
 * Deactivate a user
 * Permission: MANAGE_USERS (owner, admin)
 * Validation: Cannot deactivate self, must maintain at least one owner
 */
export async function deactivateUser(userId: string): Promise<ActionResult<User>> {
  try {
    await requirePermission(MANAGE_USERS)

    const tenantId = await getCurrentTenantId()
    const currentUser = await getCurrentUser()

    // Validate: Cannot deactivate self
    if (userId === currentUser?.id) {
      return {
        success: false,
        error: "You cannot deactivate your own account"
      }
    }

    // Get target user
    const targetUser = await db.query.users.findFirst({
      where: and(
        eq(users.id, userId),
        eq(users.tenant_id, tenantId)
      )
    })

    if (!targetUser) {
      return { success: false, error: "User not found" }
    }

    // Validate: If owner, must have another active owner
    if (targetUser.role === 'owner') {
      const [ownerCount] = await db
        .select({ count: count() })
        .from(users)
        .where(
          and(
            eq(users.tenant_id, tenantId),
            eq(users.role, 'owner'),
            eq(users.is_active, true)
          )
        )

      if (ownerCount.count <= 1) {
        return {
          success: false,
          error: "Cannot deactivate the last active owner"
        }
      }
    }

    // Deactivate
    const [updatedUser] = await db
      .update(users)
      .set({
        is_active: false,
        updated_at: new Date()
      })
      .where(eq(users.id, userId))
      .returning()

    return { success: true, data: updatedUser }

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: "You don't have permission to deactivate users"
      }
    }

    console.error('deactivateUser error:', error)
    return {
      success: false,
      error: 'Failed to deactivate user'
    }
  }
}

/**
 * Reactivate a user
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function reactivateUser(userId: string): Promise<ActionResult<User>> {
  try {
    await requirePermission(MANAGE_USERS)

    const tenantId = await getCurrentTenantId()

    const [updatedUser] = await db
      .update(users)
      .set({
        is_active: true,
        updated_at: new Date()
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.tenant_id, tenantId)
        )
      )
      .returning()

    if (!updatedUser) {
      return { success: false, error: "User not found" }
    }

    return { success: true, data: updatedUser }

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: "You don't have permission to reactivate users"
      }
    }

    console.error('reactivateUser error:', error)
    return {
      success: false,
      error: 'Failed to reactivate user'
    }
  }
}

/**
 * Get all users for current tenant with pagination, filtering, search
 * Permission: MANAGE_USERS (owner, admin)
 */
export async function getUsers(options?: {
  page?: number
  pageSize?: number
  roleFilter?: UserRole | 'all'
  searchQuery?: string
}): Promise<ActionResult<{ users: User[]; total: number; page: number; pageSize: number }>> {
  try {
    await requirePermission(MANAGE_USERS)

    const tenantId = await getCurrentTenantId()
    const page = options?.page || 1
    const pageSize = options?.pageSize || 20
    const roleFilter = options?.roleFilter || 'all'
    const searchQuery = options?.searchQuery || ''

    // Build WHERE clause
    let whereClause = eq(users.tenant_id, tenantId)

    if (roleFilter !== 'all') {
      whereClause = and(whereClause, eq(users.role, roleFilter))
    }

    if (searchQuery) {
      whereClause = and(
        whereClause,
        or(
          ilike(users.email, `%${searchQuery}%`),
          ilike(users.name, `%${searchQuery}%`)
        )
      )
    }

    // Query users with pagination
    const userList = await db.query.users.findMany({
      where: whereClause,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      orderBy: desc(users.created_at)
    })

    // Query total count
    const [totalResult] = await db
      .select({ count: count() })
      .from(users)
      .where(whereClause)

    return {
      success: true,
      data: {
        users: userList,
        total: totalResult.count,
        page,
        pageSize
      }
    }

  } catch (error) {
    if (error.message === 'UNAUTHORIZED') {
      return {
        success: false,
        error: "You don't have permission to view users"
      }
    }

    console.error('getUsers error:', error)
    return {
      success: false,
      error: 'Failed to load users'
    }
  }
}
```

**Clerk Webhook Integration:**

```typescript
// src/app/api/webhooks/clerk/route.ts
import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { db } from '@/db'
import { users } from '@/db/schema/users'
import { eq, and } from 'drizzle-orm'

export async function POST(req: Request) {
  // Verify webhook signature
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('CLERK_WEBHOOK_SECRET is not set')
  }

  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const payload = await req.json()
  const body = JSON.stringify(payload)

  const wh = new Webhook(WEBHOOK_SECRET)

  let evt

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as any
  } catch (err) {
    console.error('Webhook verification failed:', err)
    return new Response('Invalid signature', { status: 400 })
  }

  // Handle user.created event
  if (evt.type === 'user.created') {
    const { id: clerkUserId, email_addresses, public_metadata } = evt.data

    const email = email_addresses[0]?.email_address
    const tenantId = public_metadata?.tenant_id

    if (!email || !tenantId) {
      console.warn('Webhook missing email or tenant_id:', evt.data)
      return new Response('OK', { status: 200 })
    }

    // Find pending user record and activate
    const [updatedUser] = await db
      .update(users)
      .set({
        clerk_user_id: clerkUserId,
        is_active: true,
        updated_at: new Date()
      })
      .where(
        and(
          eq(users.tenant_id, tenantId),
          eq(users.email, email)
        )
      )
      .returning()

    if (updatedUser) {
      console.log('User activated:', updatedUser.id, email)
    } else {
      console.warn('No matching user found for activation:', email, tenantId)
    }
  }

  return new Response('OK', { status: 200 })
}
```

### Learnings from Previous Story

**From Story 1.5 (RBAC System):**
- **Permission Infrastructure Exists:** `requirePermission(MANAGE_USERS)` from src/lib/auth.ts:93-112
- **Permission Constants Defined:** `MANAGE_USERS: ['owner', 'admin']` from src/lib/permissions.ts:10
- **useHasPermission Hook Available:** Client-side permission checks via src/lib/hooks/useHasPermission.ts
- **PermissionGate Component Created:** Conditional rendering wrapper in src/components/PermissionGate.tsx
- **Test Infrastructure Ready:** Vitest configured, unit/integration test patterns established

**Key Integration Points:**
1. **Permission Checks:** Use `requirePermission(MANAGE_USERS)` at start of every Server Action
2. **UI Visibility:** Use `<PermissionGate allowedRoles={MANAGE_USERS}>` to hide invite button from non-admins
3. **Client Checks:** Use `useHasPermission(MANAGE_USERS)` to disable inline editors for unauthorized users
4. **Error Format:** Return `{ success: false, error: "..." }` per ActionResult<T> pattern

**Reusable Patterns from Previous Stories:**
- **getCurrentUser()** (Story 1.5): Get current authenticated user with role
- **getCurrentTenantId()** (Story 1.3): Get tenant context from session/headers
- **ActionResult<T>** (Story 1.4): Standardized Server Action response format
- **Clerk Integration** (Story 1.3): `clerkClient` for API operations, webhook for events
- **Database Queries** (Story 1.2): Drizzle ORM patterns with tenant isolation

**Files to Reference:**
- src/lib/auth.ts (getCurrentUser, requirePermission, hasPermission)
- src/lib/permissions.ts (MANAGE_USERS constant)
- src/lib/hooks/useHasPermission.ts (client-side permission check)
- src/components/PermissionGate.tsx (permission-based UI wrapper)
- src/db/schema/users.ts (User table schema)

**New Files Created (Story 1.5):**
- src/lib/permissions.ts
- src/lib/hooks/useHasPermission.ts
- src/components/PermissionGate.tsx
- tests/unit/auth.test.ts
- tests/integration/permissions.test.ts
- tests/e2e/rbac.spec.ts

### Project Structure Notes

**New Directories/Files for Story 1.6:**

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── settings/
│   │       └── users/
│   │           └── page.tsx                    # User management page (AC1)
│   └── api/
│       └── webhooks/
│           └── clerk/
│               └── route.ts                    # Clerk webhook (may exist, extend for user.created)
├── modules/
│   └── users/
│       ├── components/
│       │   ├── user-list.tsx                  # User table with pagination/search/filter (AC2, 28-30)
│       │   ├── invite-user-dialog.tsx         # Invite user modal (AC3-6)
│       │   ├── role-badge.tsx                 # Role badge with color coding (AC32)
│       │   └── user-actions.tsx               # Deactivate/reactivate buttons (AC21-26)
│       ├── actions.ts                         # Server Actions (inviteUser, updateUserRole, etc.)
│       └── schema.ts                          # Zod schemas (inviteUserSchema)
└── tests/
    ├── integration/
    │   └── user-management.test.ts            # Integration tests for Server Actions
    └── e2e/
        └── user-management.spec.ts            # E2E tests for UI flows
```

**Modified Files:**
- Dashboard navigation component (add "User Management" link with PermissionGate)
- src/app/api/webhooks/clerk/route.ts (add user.created handler if not exists)

**Dependencies:**
- **Existing:** @clerk/nextjs, drizzle-orm, @neondatabase/serverless, react-hook-form, zod, sonner (toast)
- **May Need:** TanStack Table (@tanstack/react-table) if not already installed for data grid
- **shadcn/ui Components:** Dialog, Button, Input, Select, Table, Badge, Skeleton, Tooltip

**Integration Points:**
- **Story 1.5:** RBAC system (requirePermission, MANAGE_USERS, PermissionGate, useHasPermission)
- **Story 1.3:** Clerk authentication (clerkClient, webhook, session)
- **Story 1.2:** Database schema (users table, tenant_id isolation)
- **Story 1.4:** Server Actions pattern (ActionResult<T>, "use server", error handling)

**No Conflicts Detected:**
This story extends existing user management infrastructure without modifying core authentication or permission systems. It consumes the RBAC patterns established in Story 1.5 and applies them to the user management UI.

### References

- [Source: docs/epics.md#Story-1.6-Build-User-Invitation-and-Management-System]
- [Source: docs/architecture.md#User-Management]
- [Source: docs/architecture.md#Clerk-Integration]
- [Source: docs/architecture.md#Server-Actions-Pattern]
- [Source: docs/prd.md#FR3-Invite-Users]
- [Source: docs/prd.md#FR4-Assign-Roles]
- [Source: docs/prd.md#FR6-Deactivate-Users]
- [Source: docs/sprint-artifacts/tech-spec-epic-1.md#User-Invitation-Flow]
- [Source: docs/sprint-artifacts/1-5-implement-role-based-access-control-rbac-system.md]

## Dev Agent Record

### Context Reference

<!-- Path(s) to story context XML will be added here by context workflow -->

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
