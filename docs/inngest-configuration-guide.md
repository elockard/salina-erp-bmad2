# Inngest Configuration Guide for Salina ERP

**Purpose:** Background job processing for PDF generation and email delivery
**Created:** 2025-11-30
**Epic:** 5 - Royalty Statements & Author Portal

---

## 1. What Inngest Handles

| Job Type | Trigger | Description |
|----------|---------|-------------|
| PDF Generation | Statement created | Generate PDF from calculation data via Puppeteer |
| Email Delivery | PDF ready | Send statement email via Resend |
| Batch Statements | Finance action | Generate statements for multiple authors |

---

## 2. Account Setup

### Create Inngest Account

1. Go to [https://www.inngest.com/](https://www.inngest.com/)
2. Sign up with GitHub or email
3. Create a new app: `salina-erp`

### Get API Keys

From the Inngest dashboard:

1. Go to **Settings** → **Keys**
2. Copy the **Event Key** (for sending events)
3. Copy the **Signing Key** (for verifying webhook requests)

---

## 3. Package Installation

```bash
npm install inngest
```

---

## 4. Environment Variables

Add to `.env`:

```bash
# Inngest Configuration
INNGEST_EVENT_KEY=your_event_key_here
INNGEST_SIGNING_KEY=your_signing_key_here

# For local development (optional - enables Inngest Dev Server UI)
INNGEST_DEV=true
```

**For Production (Fly.io):**

```bash
fly secrets set INNGEST_EVENT_KEY=your_event_key_here
fly secrets set INNGEST_SIGNING_KEY=your_signing_key_here
```

---

## 5. Project Structure

```
src/
├── inngest/
│   ├── client.ts              # Inngest client initialization
│   ├── functions/
│   │   ├── generate-statement-pdf.ts
│   │   ├── send-statement-email.ts
│   │   └── batch-generate-statements.ts
│   └── index.ts               # Export all functions
└── app/
    └── api/
        └── inngest/
            └── route.ts       # Inngest webhook endpoint
```

---

## 6. Client Setup

Create `src/inngest/client.ts`:

```typescript
import { Inngest } from "inngest";

// Create Inngest client
export const inngest = new Inngest({
  id: "salina-erp",
  // Event schemas for type safety (optional but recommended)
  schemas: new EventSchemas().fromRecord<{
    "statement/generate.requested": {
      data: {
        statementId: string;
        tenantId: string;
        authorId: string;
        contractId: string;
        periodStart: string;
        periodEnd: string;
        calculationData: object;
      };
    };
    "statement/pdf.generated": {
      data: {
        statementId: string;
        tenantId: string;
        authorId: string;
        s3Key: string;
      };
    };
    "statement/batch.requested": {
      data: {
        tenantId: string;
        authorIds: string[];
        periodStart: string;
        periodEnd: string;
        requestedBy: string;
      };
    };
  }>(),
});
```

---

## 7. Function Definitions

### Generate Statement PDF

Create `src/inngest/functions/generate-statement-pdf.ts`:

```typescript
import { inngest } from "../client";
import { generatePDF } from "@/modules/statements/pdf-generator";
import { uploadStatement } from "@/lib/s3";
import { db } from "@/db";
import { statements } from "@/db/schema";
import { eq } from "drizzle-orm";

export const generateStatementPDF = inngest.createFunction(
  {
    id: "generate-statement-pdf",
    // Retry configuration
    retries: 3,
    // Concurrency limit (Puppeteer is memory-intensive)
    concurrency: {
      limit: 2,
    },
  },
  { event: "statement/generate.requested" },
  async ({ event, step }) => {
    const { statementId, tenantId, calculationData } = event.data;

    // Step 1: Generate PDF
    const pdfBuffer = await step.run("generate-pdf", async () => {
      return await generatePDF(calculationData);
    });

    // Step 2: Upload to S3
    const s3Key = await step.run("upload-to-s3", async () => {
      return await uploadStatement(tenantId, statementId, pdfBuffer);
    });

    // Step 3: Update database with S3 key
    await step.run("update-database", async () => {
      await db
        .update(statements)
        .set({ pdf_s3_key: s3Key, updated_at: new Date() })
        .where(eq(statements.id, statementId));
    });

    // Step 4: Trigger email sending
    await step.sendEvent("trigger-email", {
      name: "statement/pdf.generated",
      data: {
        statementId,
        tenantId,
        authorId: event.data.authorId,
        s3Key,
      },
    });

    return { success: true, s3Key };
  }
);
```

### Send Statement Email

Create `src/inngest/functions/send-statement-email.ts`:

```typescript
import { inngest } from "../client";
import { getStatementDownloadUrl } from "@/lib/s3";
import { sendStatementEmail } from "@/lib/email";
import { db } from "@/db";
import { statements, authors } from "@/db/schema";
import { eq } from "drizzle-orm";

export const sendStatementEmailFn = inngest.createFunction(
  {
    id: "send-statement-email",
    retries: 3,
  },
  { event: "statement/pdf.generated" },
  async ({ event, step }) => {
    const { statementId, authorId, s3Key } = event.data;

    // Step 1: Get author email
    const author = await step.run("get-author", async () => {
      return await db.query.authors.findFirst({
        where: eq(authors.id, authorId),
      });
    });

    if (!author?.email) {
      return { success: false, error: "Author email not found" };
    }

    // Step 2: Generate signed download URL
    const downloadUrl = await step.run("generate-url", async () => {
      return await getStatementDownloadUrl(s3Key);
    });

    // Step 3: Send email via Resend
    await step.run("send-email", async () => {
      await sendStatementEmail({
        to: author.email,
        authorName: author.name,
        downloadUrl,
        statementId,
      });
    });

    // Step 4: Update database with email sent timestamp
    await step.run("update-email-sent", async () => {
      await db
        .update(statements)
        .set({ email_sent_at: new Date(), updated_at: new Date() })
        .where(eq(statements.id, statementId));
    });

    return { success: true, sentTo: author.email };
  }
);
```

### Batch Generate Statements

Create `src/inngest/functions/batch-generate-statements.ts`:

```typescript
import { inngest } from "../client";
import { calculateRoyaltyForPeriod } from "@/modules/royalties";
import { db } from "@/db";
import { statements } from "@/db/schema";

export const batchGenerateStatements = inngest.createFunction(
  {
    id: "batch-generate-statements",
    retries: 1,
  },
  { event: "statement/batch.requested" },
  async ({ event, step }) => {
    const { tenantId, authorIds, periodStart, periodEnd, requestedBy } = event.data;

    const results: { authorId: string; status: string; statementId?: string }[] = [];

    // Fan out: create statement generation jobs for each author
    for (const authorId of authorIds) {
      const result = await step.run(`process-author-${authorId}`, async () => {
        try {
          // Calculate royalties
          const calculation = await calculateRoyaltyForPeriod(
            authorId,
            tenantId,
            new Date(periodStart),
            new Date(periodEnd)
          );

          if (!calculation.success) {
            return { authorId, status: "skipped", reason: calculation.error };
          }

          // Create statement record
          const [statement] = await db
            .insert(statements)
            .values({
              tenant_id: tenantId,
              author_id: authorId,
              contract_id: calculation.data.contractId,
              period_start: new Date(periodStart),
              period_end: new Date(periodEnd),
              total_royalty_earned: calculation.data.totalRoyaltyEarned.toString(),
              recoupment: calculation.data.advanceRecoupment.toString(),
              net_payable: calculation.data.netPayable.toString(),
              calculations: calculation.data,
              generated_by_user_id: requestedBy,
            })
            .returning();

          return { authorId, status: "created", statementId: statement.id };
        } catch (error) {
          return { authorId, status: "error", reason: String(error) };
        }
      });

      results.push(result);

      // Trigger PDF generation for successful statements
      if (result.status === "created" && result.statementId) {
        await step.sendEvent(`trigger-pdf-${authorId}`, {
          name: "statement/generate.requested",
          data: {
            statementId: result.statementId,
            tenantId,
            authorId,
            contractId: "", // Filled from calculation
            periodStart,
            periodEnd,
            calculationData: {}, // Filled from calculation
          },
        });
      }
    }

    return {
      success: true,
      totalAuthors: authorIds.length,
      created: results.filter((r) => r.status === "created").length,
      skipped: results.filter((r) => r.status === "skipped").length,
      errors: results.filter((r) => r.status === "error").length,
      results,
    };
  }
);
```

---

## 8. Export Functions

Create `src/inngest/index.ts`:

```typescript
export { inngest } from "./client";
export { generateStatementPDF } from "./functions/generate-statement-pdf";
export { sendStatementEmailFn } from "./functions/send-statement-email";
export { batchGenerateStatements } from "./functions/batch-generate-statements";

// Combine all functions for the serve handler
import { generateStatementPDF } from "./functions/generate-statement-pdf";
import { sendStatementEmailFn } from "./functions/send-statement-email";
import { batchGenerateStatements } from "./functions/batch-generate-statements";

export const functions = [
  generateStatementPDF,
  sendStatementEmailFn,
  batchGenerateStatements,
];
```

---

## 9. API Route (Webhook Endpoint)

Create `src/app/api/inngest/route.ts`:

```typescript
import { serve } from "inngest/next";
import { inngest, functions } from "@/inngest";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions,
});
```

---

## 10. Triggering Jobs from Application

### From Server Actions

```typescript
"use server";

import { inngest } from "@/inngest";

export async function generateStatementAction(
  authorId: string,
  periodStart: Date,
  periodEnd: Date
) {
  // ... create statement record ...

  // Trigger background PDF generation
  await inngest.send({
    name: "statement/generate.requested",
    data: {
      statementId: statement.id,
      tenantId: user.tenant_id,
      authorId,
      contractId: contract.id,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      calculationData: calculation.data,
    },
  });

  return { success: true, statementId: statement.id };
}
```

### Batch Generation from Wizard

```typescript
export async function batchGenerateStatementsAction(
  authorIds: string[],
  periodStart: Date,
  periodEnd: Date
) {
  const user = await getCurrentUser();

  await inngest.send({
    name: "statement/batch.requested",
    data: {
      tenantId: user.tenant_id,
      authorIds,
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      requestedBy: user.id,
    },
  });

  return { success: true, message: `Processing ${authorIds.length} statements` };
}
```

---

## 11. Local Development

### Option A: Inngest Dev Server (Recommended)

```bash
# Terminal 1: Run your Next.js app
npm run dev

# Terminal 2: Run Inngest Dev Server
npx inngest-cli@latest dev
```

The Dev Server provides:
- Local event processing
- UI at http://localhost:8288
- Function debugging
- Event history

### Option B: Cloud Development

Set `INNGEST_DEV=false` and use your production keys. Events will be processed in the cloud.

---

## 12. Fly.io Deployment

### Webhook URL Configuration

After deploying to Fly.io, configure the webhook URL in Inngest dashboard:

1. Go to Inngest Dashboard → Your App → **Syncs**
2. Add production URL: `https://your-app.fly.dev/api/inngest`
3. Inngest will automatically discover your functions

### fly.toml Configuration

Ensure your `fly.toml` allows the Inngest endpoint:

```toml
[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 1

# Ensure adequate memory for Puppeteer
[[vm]]
  memory = "1gb"
  cpu_kind = "shared"
  cpus = 1
```

**Note:** Puppeteer requires at least 1GB RAM. Adjust `memory` if PDF generation fails.

---

## 13. Monitoring & Debugging

### Inngest Dashboard

- **Events**: View all sent events
- **Functions**: See function executions, retries, failures
- **Logs**: Detailed logs for each step
- **Metrics**: Throughput, latency, error rates

### Adding Logging

```typescript
export const generateStatementPDF = inngest.createFunction(
  { id: "generate-statement-pdf" },
  { event: "statement/generate.requested" },
  async ({ event, step, logger }) => {
    logger.info("Starting PDF generation", { statementId: event.data.statementId });

    // ... steps ...

    logger.info("PDF generation complete", { s3Key });
  }
);
```

---

## 14. Error Handling & Retries

### Default Retry Behavior

- **Retries**: 3 attempts by default
- **Backoff**: Exponential (1s, 2s, 4s)
- **Timeout**: 10 minutes per function

### Custom Retry Configuration

```typescript
inngest.createFunction(
  {
    id: "generate-statement-pdf",
    retries: 5,
    // Custom backoff
    backoff: {
      type: "exponential",
      delay: "5s",
      maxDelay: "1h",
    },
    // Timeout
    timeouts: {
      finish: "15m", // Max function duration
    },
  },
  // ...
);
```

### Handling Failures

```typescript
// In your function
async ({ event, step }) => {
  try {
    // ... processing ...
  } catch (error) {
    // Log error for debugging
    console.error("PDF generation failed:", error);

    // Optionally send failure notification
    await step.sendEvent("notify-failure", {
      name: "statement/generation.failed",
      data: {
        statementId: event.data.statementId,
        error: String(error),
      },
    });

    // Re-throw to trigger retry
    throw error;
  }
}
```

---

## 15. Verification Checklist

After setup, verify:

- [ ] Inngest account created
- [ ] Event Key and Signing Key obtained
- [ ] Environment variables set (local and Fly.io)
- [ ] `inngest` package installed
- [ ] Client configured in `src/inngest/client.ts`
- [ ] Functions created in `src/inngest/functions/`
- [ ] API route created at `src/app/api/inngest/route.ts`
- [ ] Local Dev Server runs (`npx inngest-cli@latest dev`)
- [ ] Test event triggers function successfully
- [ ] Production webhook URL configured in Inngest dashboard
- [ ] Fly.io deployment has adequate memory (1GB+)

---

## 16. Cost Estimate

Inngest pricing (as of 2024):

| Tier | Events/Month | Cost |
|------|--------------|------|
| Free | 25,000 | $0 |
| Pro | 100,000+ | $50/mo base |

For a small-to-medium publisher (~100 authors, quarterly):
- ~400 statement events/year
- ~400 email events/year
- **Well within free tier**

---

## Questions?

- [Inngest Documentation](https://www.inngest.com/docs)
- [Inngest Discord](https://www.inngest.com/discord)
- [Next.js Integration Guide](https://www.inngest.com/docs/frameworks/nextjs)
