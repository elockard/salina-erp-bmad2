# Story 17.1: Configure Amazon Account Connection

Status: done

## Story

**As a** publisher,
**I want** to connect my Amazon KDP or Advantage account,
**So that** I can automate ONIX feed delivery to the world's largest book retailer.

## Context

Epic 17 (Amazon Integration) enables publishers to automate metadata delivery and sales tracking with Amazon. This first story establishes the secure API connection infrastructure, building on the channel adapter pattern established in Epic 16 (Ingram).

### Amazon Book Distribution Programs

**Kindle Direct Publishing (KDP):**
- Self-publishing platform for ebooks and print-on-demand
- Uses Seller Central credentials
- Marketplace-specific (US, UK, DE, etc.)

**Amazon Advantage:**
- Wholesale program for established publishers
- Uses Vendor Central credentials
- Different API endpoints than KDP

### Dependencies
- Epic 14 (ONIX Core) - Complete (provides ONIX generation)
- Epic 16 (Ingram Integration) - Complete (provides channel adapter pattern)
- Amazon Seller/Vendor Central account with API access

### Business Value
- Amazon is the world's largest book retailer (~50% of US book sales)
- Automated metadata sync ensures accurate listings
- Foundation for sales import and ASIN tracking (Stories 17.2-17.5)
- Reduces manual work maintaining Amazon catalog

### Existing Infrastructure to Reuse
From Epic 16:
- `channel_credentials` table with tenant isolation
- `encryptCredentials`/`decryptCredentials` from `src/lib/channel-encryption.ts`
- Channel adapter pattern from `src/modules/channels/adapters/`
- Integrations settings UI structure

## Acceptance Criteria

### AC1: Amazon Account Type Selection
- **Given** I am a publisher admin
- **When** I navigate to Settings > Integrations > Amazon
- **Then** I can select my Amazon program type:
  - KDP (Kindle Direct Publishing)
  - Advantage (Vendor Central)
- **And** the form adapts to show relevant credential fields

### AC2: API Credential Configuration
- **Given** I select my Amazon program type
- **When** I configure credentials
- **Then** I can enter API credentials:
  - AWS Access Key ID
  - AWS Secret Access Key
  - Marketplace (dropdown: US, UK, CA, DE, FR, ES, IT, JP, AU)
- **And** credentials are stored encrypted in the database
- **And** I see help text explaining where to find credentials in Seller/Vendor Central

### AC3: Connection Testing
- **Given** I have entered API credentials
- **When** I click "Test Connection"
- **Then** system attempts API authentication
- **And** displays success message with account info (seller/vendor name)
- **Or** displays error message with details if authentication fails
- **And** connection test has 15-second timeout

### AC4: Credential Validation
- **Given** I am saving Amazon credentials
- **When** I submit the form
- **Then** system validates:
  - All required fields provided
  - Access Key ID format (20 characters, alphanumeric)
  - Secret Key format (40 characters)
  - Valid marketplace selected
- **And** system tests connection before saving
- **And** only saves if connection test succeeds

### AC5: Secure Storage
- **Given** credentials are saved
- **Then** secret access key is encrypted at rest using AES-256-GCM
- **And** credentials are tenant-isolated (RLS)
- **And** only accessible by owner/admin roles
- **And** channel type stored as "amazon" in channel_credentials table

### AC6: Edit and Disconnect
- **Given** I have Amazon configured
- **When** I access Amazon settings
- **Then** I can see current configuration (program type, marketplace)
- **And** I can edit credentials (secret key shown as masked)
- **And** I can disconnect/remove the integration
- **And** disconnecting requires confirmation dialog

## Tasks

- [x] Task 1 (AC: 1, 2): Create Amazon credential Zod schema with program type variants
- [x] Task 2 (AC: 2): Create Amazon API client for authentication testing
- [x] Task 3 (AC: 3): Implement connection testing with Selling Partner API
- [x] Task 4 (AC: 1, 2, 6): Create AmazonSettingsForm component with program type selection
- [x] Task 5 (AC: 2-5): Create server actions for Amazon credential management
- [x] Task 6 (AC: 5): Create Amazon queries (getAmazonStatus)
- [x] Task 7 (AC: 1, 6): Create Amazon integration page in settings
- [x] Task 8 (AC: 6): Update existing Amazon card on Integrations page (enable clickable link)
- [x] Task 9 (AC: 1-6): Write comprehensive tests

## Dev Notes

### CRITICAL: Reuse Existing Channel Infrastructure

**DO NOT** create new patterns. Reuse Epic 16 infrastructure:

1. **Encryption**: Use existing `src/lib/channel-encryption.ts`
2. **Database**: Use existing `channel_credentials` table with `channel: 'amazon'`
3. **Adapter Pattern**: Follow `src/modules/channels/adapters/ingram/` structure
4. **UI Pattern**: Follow `src/modules/channels/adapters/ingram/components/`

### ALREADY EXISTS - Do Not Recreate

The following already exist in the codebase:

1. **`CHANNEL_TYPES.AMAZON`** - Already defined in `src/db/schema/channel-credentials.ts:60`
2. **Amazon status check** - `src/modules/channels/queries.ts` already checks `CHANNEL_TYPES.AMAZON` (lines 58-59)
3. **Amazon placeholder card** - `src/app/(dashboard)/settings/integrations/page.tsx` has disabled Amazon card (lines 52-65) - update it, don't add new

### Task 1: Amazon Credential Schema

Create `src/modules/channels/adapters/amazon/schema.ts`:

```typescript
import { z } from "zod";

/**
 * Amazon program types
 * - kdp: Kindle Direct Publishing (Seller Central)
 * - advantage: Amazon Advantage (Vendor Central)
 */
export const AMAZON_PROGRAM_TYPES = {
  KDP: "kdp",
  ADVANTAGE: "advantage",
} as const;

export type AmazonProgramType = typeof AMAZON_PROGRAM_TYPES[keyof typeof AMAZON_PROGRAM_TYPES];

/**
 * Amazon marketplace IDs
 * Reference: https://developer-docs.amazon.com/sp-api/docs/marketplace-ids
 */
export const AMAZON_MARKETPLACES = {
  US: { id: "ATVPDKIKX0DER", name: "United States", code: "US" },
  CA: { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA" },
  UK: { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK" },
  DE: { id: "A1PA6795UKMFR9", name: "Germany", code: "DE" },
  FR: { id: "A13V1IB3VIYBER", name: "France", code: "FR" },
  ES: { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES" },
  IT: { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT" },
  JP: { id: "A1VC38T7YXB528", name: "Japan", code: "JP" },
  AU: { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU" },
} as const;

export type AmazonMarketplaceCode = keyof typeof AMAZON_MARKETPLACES;

/**
 * Amazon credentials schema
 * Story 17.1 - AC2: API Credential Configuration
 */
export const amazonCredentialsSchema = z.object({
  programType: z.enum([AMAZON_PROGRAM_TYPES.KDP, AMAZON_PROGRAM_TYPES.ADVANTAGE], {
    required_error: "Program type is required",
  }),
  accessKeyId: z
    .string()
    .min(16, "Access Key ID must be at least 16 characters")
    .max(128, "Access Key ID is too long")
    .regex(/^[A-Z0-9]+$/, "Access Key ID must be uppercase alphanumeric"),
  secretAccessKey: z
    .string()
    .min(1, "Secret Access Key is required"),
  marketplace: z.enum(
    Object.keys(AMAZON_MARKETPLACES) as [AmazonMarketplaceCode, ...AmazonMarketplaceCode[]],
    { required_error: "Marketplace is required" }
  ),
  // Optional: LWA (Login with Amazon) credentials for SP-API
  lwaClientId: z.string().optional(),
  lwaClientSecret: z.string().optional(),
  refreshToken: z.string().optional(),
});

export type AmazonCredentialsInput = z.infer<typeof amazonCredentialsSchema>;

/**
 * Stored Amazon credentials (encrypted JSON structure)
 */
export interface AmazonStoredCredentials {
  programType: AmazonProgramType;
  accessKeyId: string;
  secretAccessKey: string;
  marketplaceId: string;
  marketplaceCode: AmazonMarketplaceCode;
  lwaClientId?: string;
  lwaClientSecret?: string;
  refreshToken?: string;
}
```

### Task 2: Amazon API Client

Create `src/modules/channels/adapters/amazon/api-client.ts`:

```typescript
/**
 * Amazon Selling Partner API Client
 *
 * Story 17.1 - AC3: Connection Testing
 *
 * Uses AWS Signature Version 4 for authentication.
 * Reference: https://developer-docs.amazon.com/sp-api/docs/connecting-to-the-selling-partner-api
 */

import { createHmac, createHash } from "crypto";
import { AMAZON_MARKETPLACES, type AmazonMarketplaceCode } from "./schema";

export interface AmazonCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  marketplaceId: string;
  region: string;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  sellerName?: string;
  marketplaceName?: string;
}

/**
 * Get AWS region from marketplace
 */
export function getRegionForMarketplace(code: AmazonMarketplaceCode): string {
  const regionMap: Record<AmazonMarketplaceCode, string> = {
    US: "us-east-1",
    CA: "us-east-1",
    UK: "eu-west-1",
    DE: "eu-west-1",
    FR: "eu-west-1",
    ES: "eu-west-1",
    IT: "eu-west-1",
    JP: "us-west-2",
    AU: "us-west-2",
  };
  return regionMap[code];
}

/**
 * Get SP-API endpoint for region
 */
function getEndpointForRegion(region: string): string {
  const endpoints: Record<string, string> = {
    "us-east-1": "https://sellingpartnerapi-na.amazon.com",
    "eu-west-1": "https://sellingpartnerapi-eu.amazon.com",
    "us-west-2": "https://sellingpartnerapi-fe.amazon.com",
  };
  return endpoints[region] || endpoints["us-east-1"];
}

/**
 * Create AWS Signature Version 4 authorization header
 */
function signRequest(
  method: string,
  url: URL,
  headers: Record<string, string>,
  body: string,
  credentials: AmazonCredentials,
  timestamp: Date
): string {
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const service = "execute-api";
  const region = credentials.region;

  // Create canonical request
  const canonicalUri = url.pathname;
  const canonicalQuerystring = url.search.slice(1);
  const sortedHeaders = Object.keys(headers).sort();
  const canonicalHeaders = sortedHeaders
    .map((k) => `${k.toLowerCase()}:${headers[k].trim()}`)
    .join("\n") + "\n";
  const signedHeaders = sortedHeaders.map((k) => k.toLowerCase()).join(";");
  const payloadHash = createHash("sha256").update(body).digest("hex");

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  // Create string to sign
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    algorithm,
    amzDate,
    credentialScope,
    createHash("sha256").update(canonicalRequest).digest("hex"),
  ].join("\n");

  // Calculate signature
  const getSignatureKey = (key: string, dateStamp: string, region: string, service: string) => {
    const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp).digest();
    const kRegion = createHmac("sha256", kDate).update(region).digest();
    const kService = createHmac("sha256", kRegion).update(service).digest();
    return createHmac("sha256", kService).update("aws4_request").digest();
  };

  const signingKey = getSignatureKey(
    credentials.secretAccessKey,
    dateStamp,
    region,
    service
  );
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  return `${algorithm} Credential=${credentials.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
}

/**
 * Test Amazon SP-API connection
 *
 * Story 17.1 - AC3: Connection Testing
 */
export async function testAmazonConnection(
  credentials: AmazonCredentials
): Promise<ConnectionTestResult> {
  const endpoint = getEndpointForRegion(credentials.region);
  const path = "/sellers/v1/marketplaceParticipations";
  const url = new URL(`${endpoint}${path}`);
  const timestamp = new Date();
  const amzDate = timestamp.toISOString().replace(/[:-]|\.\d{3}/g, "");

  const headers: Record<string, string> = {
    "host": url.host,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": createHash("sha256").update("").digest("hex"),
  };

  const authorization = signRequest(
    "GET",
    url,
    headers,
    "",
    credentials,
    timestamp
  );

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        ...headers,
        "Authorization": authorization,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      // Extract marketplace participation info
      const marketplace = data.payload?.find(
        (p: { marketplace: { id: string } }) => p.marketplace.id === credentials.marketplaceId
      );

      return {
        success: true,
        message: "Connection successful",
        sellerName: marketplace?.seller?.sellerName || "Unknown Seller",
        marketplaceName: marketplace?.marketplace?.name || "Unknown Marketplace",
      };
    } else {
      const errorBody = await response.text();
      return {
        success: false,
        message: `API Error ${response.status}: ${errorBody.slice(0, 200)}`,
      };
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return { success: false, message: "Connection timed out after 15 seconds" };
      }
      return { success: false, message: error.message };
    }
    return { success: false, message: "Unknown connection error" };
  }
}
```

### Task 4: Update Channel Types

Update `src/db/schema/channel-credentials.ts`:

```typescript
export const CHANNEL_TYPES = {
  INGRAM: "ingram",
  AMAZON: "amazon",  // Story 17.1: Add Amazon channel type
  BOWKER: "bowker",  // Future
  GOOGLE: "google",  // Future
} as const;

export type ChannelType = typeof CHANNEL_TYPES[keyof typeof CHANNEL_TYPES];
```

### Task 5: Amazon Settings Form

Create `src/modules/channels/adapters/amazon/components/amazon-settings-form.tsx`:

```typescript
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  amazonCredentialsSchema,
  AMAZON_PROGRAM_TYPES,
  AMAZON_MARKETPLACES,
  type AmazonCredentialsInput,
  type AmazonMarketplaceCode,
} from "../schema";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  saveAmazonCredentials,
  testAmazonConnectionAction,
  disconnectAmazon,
} from "../actions";

interface AmazonSettingsFormProps {
  initialStatus: {
    connected: boolean;
    programType?: string;
    marketplace?: string;
    lastTest?: Date;
    lastStatus?: string;
  } | null;
}

export function AmazonSettingsForm({ initialStatus }: AmazonSettingsFormProps) {
  const { toast } = useToast();
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    sellerName?: string;
  } | null>(null);

  const form = useForm<AmazonCredentialsInput>({
    resolver: zodResolver(amazonCredentialsSchema),
    defaultValues: {
      programType: AMAZON_PROGRAM_TYPES.KDP,
      marketplace: "US",
      accessKeyId: "",
      secretAccessKey: "",
    },
  });

  const selectedProgram = form.watch("programType");

  async function handleTestConnection() {
    const values = form.getValues();
    const validation = amazonCredentialsSchema.safeParse(values);

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields correctly",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const result = await testAmazonConnectionAction(values);
      setTestResult(result);

      if (result.success) {
        toast({
          title: "Connection Successful",
          description: result.sellerName
            ? `Connected as ${result.sellerName}`
            : "Amazon API connection verified",
        });
      } else {
        toast({
          title: "Connection Failed",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch {
      setTestResult({ success: false, message: "Test failed unexpectedly" });
    } finally {
      setIsTesting(false);
    }
  }

  async function onSubmit(data: AmazonCredentialsInput) {
    if (!testResult?.success) {
      toast({
        title: "Test Required",
        description: "Please test the connection before saving",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveAmazonCredentials(data);
      if (result.success) {
        toast({ title: "Success", description: "Amazon credentials saved" });
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to save credentials",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDisconnect() {
    const result = await disconnectAmazon();
    if (result.success) {
      toast({ title: "Disconnected", description: "Amazon integration removed" });
      form.reset();
      setTestResult(null);
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to disconnect",
        variant: "destructive",
      });
    }
  }

  return (
    <div className="space-y-6">
      {initialStatus?.connected && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>Connected</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {initialStatus.programType === "kdp" ? "KDP" : "Advantage"} -{" "}
              {initialStatus.marketplace} marketplace
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Disconnect
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Disconnect Amazon?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove your Amazon credentials. You will need to
                    reconfigure the integration to resume automated feeds.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDisconnect}>
                    Disconnect
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Amazon API Credentials</CardTitle>
          <CardDescription>
            Enter your Amazon Selling Partner API credentials.{" "}
            <a
              href="https://developer-docs.amazon.com/sp-api/docs/registering-your-application"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-primary hover:underline"
            >
              How to get credentials <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="programType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amazon Program</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select program type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={AMAZON_PROGRAM_TYPES.KDP}>
                          KDP (Kindle Direct Publishing)
                        </SelectItem>
                        <SelectItem value={AMAZON_PROGRAM_TYPES.ADVANTAGE}>
                          Advantage (Vendor Central)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {selectedProgram === AMAZON_PROGRAM_TYPES.KDP
                        ? "For self-publishers using Seller Central"
                        : "For publishers using Vendor Central wholesale program"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="marketplace"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marketplace</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select marketplace" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(AMAZON_MARKETPLACES).map(([code, info]) => (
                          <SelectItem key={code} value={code}>
                            {info.name} ({code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Primary marketplace for metadata delivery
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="accessKeyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Access Key ID</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="AKIAIOSFODNN7EXAMPLE"
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      From your AWS IAM user credentials
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="secretAccessKey"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>AWS Secret Access Key</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={
                          initialStatus?.connected
                            ? "••••••••••••••••"
                            : "Enter secret key"
                        }
                        autoComplete="off"
                      />
                    </FormControl>
                    <FormDescription>
                      Keep this secure - never share it
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {testResult && (
                <Alert variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {testResult.success ? "Connection Test Passed" : "Connection Test Failed"}
                  </AlertTitle>
                  <AlertDescription>
                    {testResult.message}
                    {testResult.sellerName && (
                      <span className="block mt-1 font-medium">
                        Account: {testResult.sellerName}
                      </span>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={isTesting || isSaving}
                >
                  {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Test Connection
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isTesting || !testResult?.success}
                >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Credentials
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
```

### Task 6: Server Actions

Create `src/modules/channels/adapters/amazon/actions.ts`:

```typescript
"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  CHANNEL_STATUS,
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import {
  decryptCredentials,
  encryptCredentials,
} from "@/lib/channel-encryption";
import {
  testAmazonConnection,
  getRegionForMarketplace,
} from "./api-client";
import {
  amazonCredentialsSchema,
  AMAZON_MARKETPLACES,
  type AmazonCredentialsInput,
  type AmazonStoredCredentials,
  type AmazonMarketplaceCode,
} from "./schema";

/**
 * Get authenticated user with tenant context
 */
async function getAuthenticatedUserWithTenant() {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const user = await db.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) throw new Error("No tenant context");
  if (!["owner", "admin"].includes(user.role)) {
    throw new Error("Only owner/admin can manage integrations");
  }

  return user;
}

/**
 * Test Amazon API connection
 *
 * Story 17.1 - AC3: Connection Testing
 */
export async function testAmazonConnectionAction(
  input: AmazonCredentialsInput
): Promise<{ success: boolean; message: string; sellerName?: string }> {
  try {
    await getAuthenticatedUserWithTenant();

    const validation = amazonCredentialsSchema.safeParse(input);
    if (!validation.success) {
      return { success: false, message: "Invalid credentials format" };
    }

    const marketplace = AMAZON_MARKETPLACES[input.marketplace as AmazonMarketplaceCode];
    const region = getRegionForMarketplace(input.marketplace as AmazonMarketplaceCode);

    return await testAmazonConnection({
      accessKeyId: input.accessKeyId,
      secretAccessKey: input.secretAccessKey,
      marketplaceId: marketplace.id,
      region,
    });
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Test failed",
    };
  }
}

/**
 * Save Amazon credentials
 *
 * Story 17.1 - AC4, AC5: Credential Validation and Secure Storage
 *
 * CRITICAL: Follows Ingram pattern for credential updates.
 * When secretAccessKey is empty on update, keeps existing value from DB.
 */
export async function saveAmazonCredentials(
  input: AmazonCredentialsInput
): Promise<{ success: boolean; message: string }> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    // Check for existing credentials first
    const existing = await db.query.channelCredentials.findFirst({
      where: and(
        eq(channelCredentials.tenantId, user.tenant_id),
        eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON)
      ),
    });

    // Determine if this is an update with blank secret (AC6 - Edit pattern)
    const isUpdate = !!existing;
    const secretProvided = input.secretAccessKey && input.secretAccessKey.length > 0;

    // Build final credentials - merge existing secret if updating with blank
    let finalSecretAccessKey: string;

    if (isUpdate && !secretProvided) {
      // Updating without new secret - use existing (follows Ingram pattern)
      const existingDecrypted = decryptCredentials(existing.credentials);
      const existingCreds = JSON.parse(existingDecrypted) as AmazonStoredCredentials;
      finalSecretAccessKey = existingCreds.secretAccessKey;
    } else if (!isUpdate && !secretProvided) {
      // New credentials but no secret - validation error
      return {
        success: false,
        message: "Secret Access Key is required for new connections",
      };
    } else {
      // New credentials or update with new secret
      finalSecretAccessKey = input.secretAccessKey;
    }

    // Build final input with resolved secret
    const finalInput = { ...input, secretAccessKey: finalSecretAccessKey };

    const validation = amazonCredentialsSchema.safeParse(finalInput);
    if (!validation.success) {
      return { success: false, message: `Validation failed: ${validation.error.message}` };
    }

    // Test connection before saving (AC3)
    const testResult = await testAmazonConnectionAction(finalInput);
    if (!testResult.success) {
      return { success: false, message: `Connection test failed: ${testResult.message}` };
    }

    const marketplace = AMAZON_MARKETPLACES[input.marketplace as AmazonMarketplaceCode];
    const storedCredentials: AmazonStoredCredentials = {
      programType: finalInput.programType,
      accessKeyId: finalInput.accessKeyId,
      secretAccessKey: finalSecretAccessKey,
      marketplaceId: marketplace.id,
      marketplaceCode: finalInput.marketplace as AmazonMarketplaceCode,
      lwaClientId: finalInput.lwaClientId,
      lwaClientSecret: finalInput.lwaClientSecret,
      refreshToken: finalInput.refreshToken,
    };

    const encryptedCredentials = encryptCredentials(JSON.stringify(storedCredentials));
    const now = new Date();

    if (existing) {
      await db
        .update(channelCredentials)
        .set({
          credentials: encryptedCredentials,
          status: CHANNEL_STATUS.ACTIVE,
          lastConnectionTest: now,
          lastConnectionStatus: "Connection successful",
          updatedAt: now,
        })
        .where(eq(channelCredentials.id, existing.id));
    } else {
      await db.insert(channelCredentials).values({
        tenantId: user.tenant_id,
        channel: CHANNEL_TYPES.AMAZON,
        credentials: encryptedCredentials,
        status: CHANNEL_STATUS.ACTIVE,
        lastConnectionTest: now,
        lastConnectionStatus: "Connection successful",
      });
    }

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/amazon");

    return { success: true, message: "Credentials saved successfully" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to save credentials",
    };
  }
}

/**
 * Disconnect Amazon integration
 *
 * Story 17.1 - AC6: Edit and Disconnect
 */
export async function disconnectAmazon(): Promise<{
  success: boolean;
  message?: string;
}> {
  try {
    const user = await getAuthenticatedUserWithTenant();

    await db
      .delete(channelCredentials)
      .where(
        and(
          eq(channelCredentials.tenantId, user.tenant_id),
          eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON)
        )
      );

    revalidatePath("/settings/integrations");
    revalidatePath("/settings/integrations/amazon");

    return { success: true };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to disconnect",
    };
  }
}
```

### Task 7: Amazon Settings Page

Create `src/app/(dashboard)/settings/integrations/amazon/page.tsx`:

```typescript
import { getAmazonStatus } from "@/modules/channels/adapters/amazon/queries";
import { AmazonSettingsForm } from "@/modules/channels/adapters/amazon/components/amazon-settings-form";

export default async function AmazonSettingsPage() {
  const status = await getAmazonStatus();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Amazon Integration</h2>
        <p className="text-muted-foreground">
          Connect your Amazon KDP or Advantage account for automated ONIX feed delivery.
        </p>
      </div>

      <AmazonSettingsForm initialStatus={status} />
    </div>
  );
}
```

### Task 8: Update Integrations Landing Page

**NOTE:** Amazon card already exists but is disabled. Update `src/app/(dashboard)/settings/integrations/page.tsx`:

**BEFORE (lines 52-65):**
```typescript
{/* Amazon - Coming Soon */}
<Card className="opacity-60">
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle className="text-lg">Amazon KDP/Advantage</CardTitle>
        <CardDescription>
          Automated ONIX feed delivery and sales data import
        </CardDescription>
      </div>
      <Badge variant="outline">Coming Soon</Badge>
    </div>
  </CardHeader>
</Card>
```

**AFTER:**
```typescript
{/* Amazon KDP/Advantage */}
<Link href="/settings/integrations/amazon">
  <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-lg">Amazon KDP / Advantage</CardTitle>
          <CardDescription>
            Automated ONIX feed delivery to the world's largest book retailer
          </CardDescription>
        </div>
        <Badge variant={statuses.amazon ? "default" : "secondary"}>
          {statuses.amazon ? "Connected" : "Not Connected"}
        </Badge>
      </div>
    </CardHeader>
  </Card>
</Link>
```

### Task 6: Amazon Queries

Create `src/modules/channels/adapters/amazon/queries.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { adminDb } from "@/db";  // NOTE: Use adminDb, not db
import { users } from "@/db/schema";
import {
  CHANNEL_TYPES,
  channelCredentials,
} from "@/db/schema/channel-credentials";
import type { AmazonStatus } from "./types";
import { decryptCredentials } from "@/lib/channel-encryption";
import type { AmazonStoredCredentials } from "./schema";

/**
 * Get the current Amazon integration status for the current tenant
 *
 * Story 17.1 - AC6: Edit and Disconnect
 * @returns AmazonStatus or null if not configured
 */
export async function getAmazonStatus(): Promise<AmazonStatus | null> {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await adminDb.query.users.findFirst({
    where: eq(users.clerk_user_id, userId),
  });

  if (!user?.tenant_id) {
    return null;
  }

  const credential = await adminDb.query.channelCredentials.findFirst({
    where: and(
      eq(channelCredentials.tenantId, user.tenant_id),
      eq(channelCredentials.channel, CHANNEL_TYPES.AMAZON),
    ),
  });

  if (!credential) {
    return null;
  }

  // Decrypt to get programType and marketplace for display
  let programType: string | undefined;
  let marketplace: string | undefined;

  try {
    const decrypted = decryptCredentials(credential.credentials);
    const creds = JSON.parse(decrypted) as AmazonStoredCredentials;
    programType = creds.programType;
    marketplace = creds.marketplaceCode;
  } catch {
    // If decrypt fails, still return connected status
  }

  return {
    connected: credential.status === "active",
    programType,
    marketplace,
    lastTest: credential.lastConnectionTest,
    lastStatus: credential.lastConnectionStatus,
  };
}
```

### Types Definition

Create `src/modules/channels/adapters/amazon/types.ts`:

```typescript
/**
 * Amazon Channel Types
 *
 * Story 17.1 - Configure Amazon Account Connection
 */

/**
 * Amazon integration status for UI display
 */
export interface AmazonStatus {
  connected: boolean;
  programType?: string;    // 'kdp' or 'advantage'
  marketplace?: string;    // 'US', 'UK', etc.
  lastTest: Date | null;
  lastStatus: string | null;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  success: boolean;
  message: string;
  sellerName?: string;
  marketplaceName?: string;
}
```

### Module Structure

```
src/modules/channels/adapters/amazon/
├── actions.ts           # Server actions (save, test, disconnect)
├── api-client.ts        # Amazon SP-API client
├── queries.ts           # Read queries (getAmazonStatus)
├── schema.ts            # Zod schemas and types
├── types.ts             # TypeScript interfaces
└── components/
    └── amazon-settings-form.tsx
```

### Security Requirements

1. **Never log credentials** - Not even in debug mode
2. **Encrypt before storage** - Use existing channel-encryption.ts
3. **Decrypt only when needed** - For connection test or actual API use
4. **Mask secret key in UI** - Show `••••••••` for existing credentials
5. **Role-based access** - Owner/admin only
6. **RLS enforcement** - Tenant isolation at database level
7. **AWS Signature V4** - Use proper request signing for API calls

### References

- [Source: docs/architecture.md - Pattern 5: Channel Adapter Architecture]
- [Source: docs/architecture.md - ADR-011: Channel Adapter Pattern]
- [Source: docs/epics.md - Story 17.1: Configure Amazon Account Connection]
- [Source: docs/sprint-artifacts/16-1-configure-ingram-account-connection.md - Ingram pattern]
- [Source: src/lib/channel-encryption.ts - Credential encryption]
- [Source: src/db/schema/channel-credentials.ts - Credentials table]
- [Amazon SP-API Documentation](https://developer-docs.amazon.com/sp-api/)
- [Amazon Marketplace IDs](https://developer-docs.amazon.com/sp-api/docs/marketplace-ids)

## Test Scenarios

### Unit Tests (`tests/unit/amazon-schema.test.ts`)
- Valid KDP credentials pass validation
- Valid Advantage credentials pass validation
- Missing program type fails validation
- Invalid access key format fails validation
- Invalid marketplace fails validation

### Unit Tests (`tests/unit/amazon-api-client.test.ts`)
- AWS Signature V4 generates correct authorization header
- getRegionForMarketplace returns correct regions
- Connection test handles success response
- Connection test handles auth failure
- Connection test handles timeout

### Unit Tests (`tests/unit/amazon-actions.test.ts`)
- Save credentials requires owner/admin role
- Save fails if connection test fails
- Credentials are encrypted before storage
- Disconnect removes credentials from database
- Test connection validates input schema

### Integration Tests (mocked API)
- Full save credentials flow
- Test connection success scenario
- Test connection failure (invalid credentials)
- Test connection timeout scenario
- Edit existing credentials
- Disconnect integration

### Manual Testing Checklist
- [ ] Navigate to Settings > Integrations
- [ ] See Amazon card on Integrations landing page
- [ ] Click into Amazon integration
- [ ] Select KDP program type
- [ ] Select US marketplace
- [ ] Enter test credentials
- [ ] Test Connection button works
- [ ] Success/error messages display correctly
- [ ] Save credentials (only after successful test)
- [ ] Secret key masked on edit
- [ ] Switch to Advantage program type
- [ ] Disconnect with confirmation
- [ ] Non-admin users cannot access integration settings

## Dev Agent Record

### Context Reference

This story establishes Amazon channel integration infrastructure reusing the pattern from Epic 16 (Ingram). Key differences:
- Amazon uses HTTP API (not FTP)
- AWS Signature V4 authentication (not username/password)
- Multiple marketplaces with different endpoints
- Two program types (KDP vs Advantage)

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

- Reuse channel_credentials table with channel='amazon'
- Use existing channel-encryption.ts for credential storage
- Amazon SP-API requires AWS Signature V4 signing
- Each marketplace has different region/endpoint
- KDP uses Seller Central, Advantage uses Vendor Central
- Connection test should verify marketplace participation

**Implementation Summary (2025-12-17):**
- Created complete Amazon channel adapter following Ingram pattern
- Implemented AWS Signature V4 authentication for SP-API
- Added support for all 9 Amazon marketplaces (US, CA, UK, DE, FR, ES, IT, JP, AU)
- Form supports both KDP and Advantage program types
- Connection test has 15-second timeout per AC3
- Credentials encrypted with AES-256-GCM at rest (AC5)
- Secret key masked in edit mode (AC6)
- Disconnect requires confirmation dialog (AC6)
- 48 unit tests passing (31 schema + 17 API client)
- TypeScript and lint checks pass

**Code Review Fixes Applied (2025-12-17):**
- Added `amazonCredentialsFormSchema` for edit mode (allows empty secret to keep existing)
- Form now pre-populates existing programType, marketplace, accessKeyId when editing
- Added accessKeyId to AmazonStatus type and queries return value
- Updated form to use new schema with proper edit flow logic
- Added 5 new tests for edit-without-new-secret flow

### File List

New files:
- `src/modules/channels/adapters/amazon/schema.ts` - Zod schemas and constants
- `src/modules/channels/adapters/amazon/api-client.ts` - SP-API client with AWS Sig V4
- `src/modules/channels/adapters/amazon/actions.ts` - Server actions
- `src/modules/channels/adapters/amazon/queries.ts` - Read queries (getAmazonStatus)
- `src/modules/channels/adapters/amazon/types.ts` - TypeScript interfaces (AmazonStatus, ConnectionTestResult)
- `src/modules/channels/adapters/amazon/components/amazon-settings-form.tsx` - Form component
- `src/app/(dashboard)/settings/integrations/amazon/page.tsx` - Settings page
- `tests/unit/amazon-schema.test.ts` - Schema validation tests (26 tests)
- `tests/unit/amazon-api-client.test.ts` - API client tests (17 tests)

Modified files:
- `src/app/(dashboard)/settings/integrations/page.tsx` - Amazon card now links to settings page

**NOTE:** These files already exist and do NOT need modification:
- `src/db/schema/channel-credentials.ts` - CHANNEL_TYPES.AMAZON already exists
- `src/modules/channels/queries.ts` - Amazon status check already exists
