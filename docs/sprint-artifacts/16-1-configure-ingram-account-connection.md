# Story 16.1: Configure Ingram Account Connection

Status: done

## Story

**As a** publisher,
**I want** to connect my Ingram Content Group account,
**So that** I can automate ONIX feed delivery to the largest US book distributor.

## Context

Epic 16 (Ingram Integration) builds on Epic 14's ONIX export system to enable automated feed delivery to Ingram Content Group. This first story establishes the secure connection infrastructure.

Ingram Content Group is the largest book distributor in the US, handling distribution for thousands of publishers. Automated ONIX feeds ensure timely metadata updates and reduce manual work.

### Dependencies
- Epic 14 (ONIX Core) - Complete
- Ingram Content Group publisher account with FTP credentials

### Business Value
- Eliminates manual ONIX file uploads to Ingram
- Enables automated metadata synchronization
- Foundation for order ingestion and inventory sync (Stories 16.2-16.5)

## Acceptance Criteria

### AC1: FTP Credential Configuration
- **Given** I am a publisher admin
- **When** I navigate to Settings > Integrations
- **Then** I see an "Integrations" tab in settings navigation
- **And** I can click into Ingram integration settings
- **And** I can enter FTP credentials:
  - Host (e.g., ftps.ingramcontent.com)
  - Username
  - Password
  - Port (default 990 for FTPS)
- **And** credentials are stored encrypted in the database

### AC2: Connection Testing
- **Given** I have entered FTP credentials
- **When** I click "Test Connection"
- **Then** system attempts FTPS connection
- **And** displays success message with confirmation
- **Or** displays error message with details if connection fails
- **And** connection test has 10-second timeout

### AC3: Credential Validation
- **Given** I am saving Ingram credentials
- **When** I submit the form
- **Then** system validates all required fields are provided
- **And** system tests connection before saving
- **And** only saves if connection test succeeds

### AC4: Secure Storage
- **Given** credentials are saved
- **Then** password is encrypted at rest using AES-256-GCM
- **And** credentials are tenant-isolated (RLS)
- **And** only accessible by owner/admin roles

### AC5: Edit and Disconnect
- **Given** I have Ingram configured
- **When** I access Ingram settings
- **Then** I can edit credentials (password shown as masked)
- **And** I can disconnect/remove the integration
- **And** disconnecting requires confirmation dialog

## Tasks

- [x] Task 1 (AC: 4): Create `channel_credentials` database schema with RLS
- [x] Task 2 (AC: 4): Implement credential encryption utilities in `src/lib/channel-encryption.ts`
- [x] Task 3 (AC: 1): Add "Integrations" tab to settings layout navigation
- [x] Task 4 (AC: 1): Create Integrations landing page and Ingram settings page
- [x] Task 5 (AC: 2, 3): Implement FTPS connection testing with basic-ftp
- [x] Task 6 (AC: 1, 3, 5): Create server actions for credential management
- [x] Task 7 (AC: 1-5): Write comprehensive tests

## Dev Notes

### CRITICAL: Reuse Existing Encryption Pattern

**DO NOT** create new encryption approach. The project has existing encryption at `src/lib/encryption.ts` using AES-256-GCM:

```typescript
// EXISTING PATTERN - study src/lib/encryption.ts
// Uses: crypto.createCipheriv with 'aes-256-gcm'
// Format: base64(IV + encrypted_data + authTag)
// Key from: process.env.TIN_ENCRYPTION_KEY (or similar env var)
```

Create `src/lib/channel-encryption.ts` following the EXACT same pattern but with a new env key:
- Use `CHANNEL_CREDENTIALS_KEY` environment variable
- Same AES-256-GCM algorithm
- Same IV/authTag handling
- Export: `encryptCredentials(jsonString)` and `decryptCredentials(ciphertext)`

### Zod Validation Schema

Create `src/modules/channels/adapters/ingram/schema.ts` following project patterns (see `src/modules/tenant/schema.ts`):

```typescript
import { z } from "zod";

export const ingramCredentialsSchema = z.object({
  host: z
    .string()
    .min(1, "Host is required")
    .max(255, "Host must not exceed 255 characters"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(100, "Username must not exceed 100 characters"),
  password: z
    .string()
    .min(1, "Password is required"),
  port: z
    .number()
    .int()
    .min(1, "Port must be at least 1")
    .max(65535, "Port must be at most 65535")
    .default(990),
});

export type IngramCredentialsInput = z.infer<typeof ingramCredentialsSchema>;
```

### Database Schema

Create `src/db/schema/channel-credentials.ts`:

```typescript
import { pgTable, uuid, text, timestamp, unique } from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const channelCredentials = pgTable(
  "channel_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id),
    channel: text("channel").notNull(), // 'ingram', 'amazon', etc.
    credentials: text("credentials").notNull(), // encrypted JSON blob
    status: text("status").default("active"), // 'active', 'error', 'disconnected'
    lastConnectionTest: timestamp("last_connection_test", { mode: "date" }),
    lastConnectionStatus: text("last_connection_status"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    uniqueTenantChannel: unique().on(table.tenantId, table.channel),
  })
);

// RLS Policy (apply via db:push or migration)
// CREATE POLICY "Tenant isolation" ON channel_credentials
//   USING (tenant_id = current_setting('app.tenant_id')::uuid);
```

**Note:** The `channel_feeds` table (for logging feed activities) will be added in Story 16.2 when implementing automated feeds.

### Settings Navigation Update

Update `src/app/(dashboard)/settings/layout.tsx`:

```typescript
const settingsNav = [
  { href: "/settings", label: "General", exact: true },
  { href: "/settings/users", label: "Users", exact: false },
  { href: "/settings/isbn-import", label: "ISBN Import", exact: false },
  { href: "/settings/isbn-prefixes", label: "ISBN Prefixes", exact: false },
  { href: "/settings/integrations", label: "Integrations", exact: false }, // ADD THIS
];
```

### Module Structure

Per architecture ADR-011 (Channel Adapter Pattern), use `modules/channels/adapters/`:

```
src/modules/channels/
├── adapters/
│   └── ingram/
│       ├── adapter.ts          # Channel adapter implementation
│       ├── actions.ts          # Server actions
│       ├── queries.ts          # Read queries
│       ├── schema.ts           # Zod validation schemas
│       ├── types.ts            # TypeScript interfaces
│       ├── ftp-client.ts       # FTPS connection wrapper
│       └── components/
│           └── ingram-settings-form.tsx
├── components/
│   └── channel-status.tsx      # Shared status indicator
└── index.ts                    # Module exports
```

### Integrations Landing Page

Create `src/app/(dashboard)/settings/integrations/page.tsx`:

```typescript
import { getChannelStatuses } from "@/modules/channels/queries";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function IntegrationsPage() {
  const statuses = await getChannelStatuses();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integrations</h2>
        <p className="text-muted-foreground">
          Connect external distribution channels and services.
        </p>
      </div>

      <div className="grid gap-4">
        <Link href="/settings/integrations/ingram">
          <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Ingram Content Group</CardTitle>
                  <CardDescription>
                    Automated ONIX feed delivery to the largest US book distributor
                  </CardDescription>
                </div>
                <Badge variant={statuses.ingram ? "default" : "secondary"}>
                  {statuses.ingram ? "Connected" : "Not Connected"}
                </Badge>
              </div>
            </CardHeader>
          </Card>
        </Link>

        {/* Future integrations: Amazon, Bowker, Google Books */}
      </div>
    </div>
  );
}
```

### FTPS Implementation

Install `basic-ftp@^5.0.0`:

```bash
pnpm add basic-ftp@^5.0.0
```

Create `src/modules/channels/adapters/ingram/ftp-client.ts`:

```typescript
import { Client } from "basic-ftp";

export interface IngramCredentials {
  host: string;
  username: string;
  password: string;
  port: number; // default 990
}

export async function testIngramConnection(
  credentials: IngramCredentials
): Promise<{ success: boolean; message: string }> {
  const client = new Client();
  client.ftp.timeout = 10000; // 10 second timeout

  try {
    await client.access({
      host: credentials.host,
      user: credentials.username,
      password: credentials.password,
      port: credentials.port,
      secure: true, // FTPS
      secureOptions: { rejectUnauthorized: true },
    });

    // Try to list inbound directory to verify access
    await client.list("/inbound/");

    return { success: true, message: "Connection successful" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Connection failed"
    };
  } finally {
    client.close();
  }
}
```

### Form Component with React Hook Form + Zod

Create `src/modules/channels/adapters/ingram/components/ingram-settings-form.tsx`:

```typescript
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ingramCredentialsSchema, type IngramCredentialsInput } from "../schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface IngramSettingsFormProps {
  initialStatus: {
    connected: boolean;
    lastTest?: Date;
    lastStatus?: string;
  } | null;
}

export function IngramSettingsForm({ initialStatus }: IngramSettingsFormProps) {
  const form = useForm<IngramCredentialsInput>({
    resolver: zodResolver(ingramCredentialsSchema),
    defaultValues: {
      host: "ftps.ingramcontent.com",
      port: 990,
      username: "",
      password: "",
    },
  });

  // ... rest of form implementation
}
```

### Server Actions Pattern

Follow existing action patterns in the codebase:

```typescript
// src/modules/channels/adapters/ingram/actions.ts
"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { channelCredentials } from "@/db/schema/channel-credentials";
import { eq, and } from "drizzle-orm";
import { encryptCredentials, decryptCredentials } from "@/lib/channel-encryption";
import { testIngramConnection } from "./ftp-client";
import { ingramCredentialsSchema } from "./schema";
import { revalidatePath } from "next/cache";

// IMPORTANT: Check user role - only owner/admin can manage integrations
// Pattern from src/modules/tenant/actions.ts

export async function saveIngramCredentials(formData: FormData) {
  // 1. Auth check
  // 2. Role check (owner/admin only)
  // 3. Parse and validate with Zod schema
  // 4. Test connection BEFORE saving
  // 5. Encrypt credentials
  // 6. Upsert to database
  // 7. Revalidate path
}
```

### UI Components

Use existing shadcn/ui components - DO NOT install new UI libraries:
- `Card`, `CardHeader`, `CardContent` for settings container
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl` for form
- `Input` for text fields (type="password" for password)
- `Button` for actions
- `Alert` for connection status messages
- `AlertDialog` for disconnect confirmation
- `Badge` for connection status indicator

### Page Structure

```typescript
// src/app/(dashboard)/settings/integrations/ingram/page.tsx

import { getIngramStatus } from "@/modules/channels/adapters/ingram/queries";
import { IngramSettingsForm } from "@/modules/channels/adapters/ingram/components/ingram-settings-form";

export default async function IngramSettingsPage() {
  const status = await getIngramStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Ingram Integration</h2>
        <p className="text-muted-foreground">
          Connect your Ingram Content Group account for automated ONIX feed delivery.
        </p>
      </div>

      <IngramSettingsForm initialStatus={status} />
    </div>
  );
}
```

### Security Requirements

1. **Never log credentials** - not even in debug mode
2. **Encrypt before storage** - use channel-encryption.ts
3. **Decrypt only when needed** - for connection test or actual FTP use
4. **Mask password in UI** - show `••••••••` for existing password
5. **Role-based access** - owner/admin only
6. **RLS enforcement** - tenant isolation at database level
7. **Audit logging** - Log credential save/update/disconnect events (use existing audit pattern if available, or add to Story 16.2 scope)

### Environment Variables

Add to `.env.example`:
```
# Channel Credentials Encryption
# Generate with: openssl rand -hex 32
CHANNEL_CREDENTIALS_KEY=
```

### Project Structure Notes

- Settings pages: `src/app/(dashboard)/settings/`
- Channel adapters: `src/modules/channels/adapters/{channel}/` (per ADR-011)
- Schema location: `src/db/schema/channel-credentials.ts`
- Export from: `src/db/schema/index.ts`

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/architecture.md - ADR-011: Channel Adapter Pattern for Distribution]
- [Source: docs/epics.md - Story 16.1: Configure Ingram Account Connection]
- [Source: src/lib/encryption.ts - Existing AES-256-GCM encryption pattern]
- [Source: src/modules/tenant/schema.ts - Zod schema pattern]
- [Source: src/modules/onix/ - Module structure pattern]
- [Source: docs/sprint-artifacts/epic-14-retro-2025-12-13.md - Epic 14 learnings]

## Test Scenarios

### Unit Tests (`tests/unit/channel-encryption.test.ts`)
- Credential encryption/decryption roundtrip
- Missing CHANNEL_CREDENTIALS_KEY throws error
- Invalid key length throws error

### Unit Tests (`tests/unit/ingram-schema.test.ts`)
- Valid credentials pass validation
- Missing host fails validation
- Invalid port (0, negative, >65535) fails validation
- Empty password fails validation

### Unit Tests (`tests/unit/ingram-actions.test.ts`)
- Save credentials requires owner/admin role
- Save fails if connection test fails
- Credentials are encrypted before storage
- Disconnect removes credentials from database

### Integration Tests (mocked FTP)
- Full save credentials flow
- Test connection success scenario
- Test connection failure scenario (invalid credentials)
- Test connection timeout scenario
- Edit existing credentials
- Disconnect integration

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations
- [ ] See Integrations landing page with Ingram card
- [ ] Click into Ingram integration
- [ ] Enter test credentials
- [ ] Test Connection button works
- [ ] Success/error messages display correctly
- [ ] Save credentials (only after successful test)
- [ ] Password masked on edit
- [ ] Disconnect with confirmation
- [ ] Non-admin users cannot access integration settings

## Dev Agent Record

### Context Reference

This story establishes the channel credentials infrastructure that will be reused for:
- Story 16.2-16.5 (remaining Ingram features)
- Epic 17 (Amazon Integration)
- Future channel integrations (Bowker, Google Books)

### Agent Model Used

{{agent_model_name_version}}

### Completion Notes List

- Install `basic-ftp@^5.0.0`: `pnpm add basic-ftp@^5.0.0`
- Ingram uses FTPS (FTP over TLS) on port 990 by default
- The `/inbound/` directory is where ONIX feeds are uploaded
- Connection test should verify directory listing works
- `channel_feeds` table for feed logging will be added in Story 16.2

### File List

New files:
- `src/db/schema/channel-credentials.ts`
- `src/lib/channel-encryption.ts`
- `src/modules/channels/adapters/ingram/actions.ts`
- `src/modules/channels/adapters/ingram/queries.ts`
- `src/modules/channels/adapters/ingram/schema.ts`
- `src/modules/channels/adapters/ingram/types.ts`
- `src/modules/channels/adapters/ingram/ftp-client.ts`
- `src/modules/channels/adapters/ingram/components/ingram-settings-form.tsx`
- `src/modules/channels/queries.ts` (shared channel queries)
- `src/modules/channels/index.ts`
- `src/app/(dashboard)/settings/integrations/page.tsx`
- `src/app/(dashboard)/settings/integrations/ingram/page.tsx`
- `tests/unit/channel-credentials-schema.test.ts`
- `tests/unit/channel-encryption.test.ts`
- `tests/unit/ingram-adapter.test.ts`
- `tests/unit/ingram-actions.test.ts`

Modified files:
- `src/db/schema/index.ts` - Export channelCredentials
- `src/app/(dashboard)/settings/layout.tsx` - Add Integrations nav item
- `.env.example` - Add CHANNEL_CREDENTIALS_KEY
- `package.json` - Add basic-ftp@^5.0.0 dependency
