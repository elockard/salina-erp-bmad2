/**
 * Inngest: Generate Statement PDF Background Job
 *
 * Background job for generating and uploading PDF statements to S3.
 * Triggered by server actions when users request statement PDF generation.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 5: Create Inngest background job
 * AC-5.2.7: Generation runs as Inngest background job with proper error handling and retry logic
 *
 * Related:
 * - src/modules/statements/pdf-generator.ts (generateStatementPDF)
 * - src/modules/statements/actions.ts (triggers this job)
 * - docs/architecture.md (Background Jobs pattern)
 */

import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { statements } from "@/db/schema/statements";
import { webhookEvents } from "@/modules/api/webhooks/dispatcher";
import { generateStatementPDF } from "@/modules/statements/pdf-generator";
import type { StatementWithDetails } from "@/modules/statements/types";
import { inngest } from "./client";

/**
 * Event payload for PDF generation
 */
interface PDFGenerateEventData {
  statementId: string;
  tenantId: string;
}

/**
 * Load statement with all required relations for PDF generation
 *
 * @param statementId - Statement UUID to load
 * @returns Statement with author, contract, and title data
 * @throws Error if statement not found
 */
async function loadStatementWithDetails(
  statementId: string,
): Promise<StatementWithDetails> {
  // Story 7.3: Load both author (legacy) and contact (new) relations
  const result = await adminDb.query.statements.findFirst({
    where: eq(statements.id, statementId),
    with: {
      author: true,
      contact: true,
      contract: {
        with: {
          title: true,
        },
      },
    },
  });

  if (!result) {
    throw new Error(`Statement not found: ${statementId}`);
  }

  // Story 7.3: Build author info from contact (new) or author (legacy)
  let authorInfo: {
    id: string;
    name: string;
    address: string | null;
    email: string | null;
  };

  if (result.contact) {
    // New statement with contact relation
    const firstName = result.contact.first_name || "";
    const lastName = result.contact.last_name || "";
    const contactAddress = [
      result.contact.address_line1,
      result.contact.address_line2,
      [result.contact.city, result.contact.state, result.contact.postal_code]
        .filter(Boolean)
        .join(" "),
      result.contact.country,
    ]
      .filter(Boolean)
      .join(", ");

    authorInfo = {
      id: result.contact.id,
      name: `${firstName} ${lastName}`.trim() || "Unknown",
      address: contactAddress || null,
      email: result.contact.email,
    };
  } else if (result.author) {
    // Legacy statement with author relation
    authorInfo = {
      id: result.author.id,
      name: result.author.name,
      address: result.author.address,
      email: result.author.email,
    };
  } else {
    throw new Error(
      `Statement ${statementId} has no author or contact relation`,
    );
  }

  // Transform to StatementWithDetails shape
  return {
    ...result,
    author: authorInfo,
    contract: {
      id: result.contract.id,
      title_id: result.contract.title_id,
    },
    title: {
      id: result.contract.title.id,
      title: result.contract.title.title,
    },
  } as StatementWithDetails;
}

/**
 * Update statement with S3 key after successful PDF upload
 *
 * @param statementId - Statement UUID to update
 * @param s3Key - S3 object key where PDF was uploaded
 */
async function updateStatementPdfKey(
  statementId: string,
  s3Key: string,
): Promise<void> {
  await adminDb
    .update(statements)
    .set({
      pdf_s3_key: s3Key,
      updated_at: new Date(),
    })
    .where(eq(statements.id, statementId));
}

/**
 * Generate Statement PDF Background Job
 *
 * AC-5.2.7: Runs as Inngest background job with:
 * - 3 retries with exponential backoff
 * - Step-based execution for durability
 * - Proper error handling and logging
 *
 * Steps:
 * 1. Load statement with all relations
 * 2. Generate PDF and upload to S3
 * 3. Update statement record with S3 key
 */
export const generateStatementPdf = inngest.createFunction(
  {
    id: "generate-statement-pdf",
    retries: 3, // AC-5.2.7: retry logic
  },
  { event: "statements/pdf.generate" },
  async ({ event, step }) => {
    const { statementId, tenantId } = event.data as PDFGenerateEventData;
    const startTime = Date.now();

    console.log(
      `[Inngest] Starting PDF generation for statement ${statementId}`,
    );

    // Step 1: Load statement data
    const statement = await step.run("load-statement", async () => {
      console.log(`[Inngest] Loading statement ${statementId}`);
      return loadStatementWithDetails(statementId);
    });

    // Step 2: Generate PDF and upload to S3
    // Note: Inngest serializes step results to JSON, converting Dates to strings.
    // We need to rehydrate the dates before passing to generateStatementPDF.
    const statementWithDates: StatementWithDetails = {
      ...statement,
      created_at: new Date(statement.created_at),
      updated_at: new Date(statement.updated_at),
      period_start: new Date(statement.period_start),
      period_end: new Date(statement.period_end),
      email_sent_at: statement.email_sent_at
        ? new Date(statement.email_sent_at)
        : null,
    };

    const result = await step.run("generate-and-upload-pdf", async () => {
      console.log(`[Inngest] Generating PDF for statement ${statementId}`);
      return generateStatementPDF(statementWithDates);
    });

    if (!result.success || !result.s3Key) {
      console.error(
        `[Inngest] PDF generation failed for statement ${statementId}:`,
        result.error,
      );
      throw new Error(result.error ?? "PDF generation failed");
    }

    // Capture s3Key after guard to avoid non-null assertion
    const s3Key = result.s3Key;

    // Step 3: Update statement record with S3 key
    await step.run("update-statement", async () => {
      console.log(
        `[Inngest] Updating statement ${statementId} with S3 key: ${s3Key}`,
      );
      await updateStatementPdfKey(statementId, s3Key);
    });

    const totalTime = Date.now() - startTime;
    console.log(
      `[Inngest] Completed PDF generation for statement ${statementId} (${totalTime}ms)`,
    );

    // Fire-and-forget webhook dispatch (Story 15.5)
    // Note: Inngest serializes dates as strings, so convert period fields
    webhookEvents
      .statementGenerated(tenantId, {
        id: statementId,
        authorId: statementWithDates.author.id,
        periodStart: statementWithDates.period_start.toISOString().slice(0, 10),
        periodEnd: statementWithDates.period_end.toISOString().slice(0, 10),
      })
      .catch(() => {}); // Ignore errors

    return {
      success: true,
      s3Key: result.s3Key,
      statementId,
      tenantId,
      durationMs: totalTime,
    };
  },
);
