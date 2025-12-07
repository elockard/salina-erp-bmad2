/**
 * Inngest: ISBN Prefix Generation Background Job
 *
 * Background job for generating large ISBN blocks (>1000).
 * Triggered when user registers a prefix with block_size > 1000.
 *
 * Story: 7.4 - Implement Publisher ISBN Prefix System
 * Task 3: Create Inngest Job
 * AC-7.4.6: Large Block Async Generation
 *
 * Processing Steps:
 * 1. Set prefix status to "generating"
 * 2. Generate ISBNs in batches of 1000
 * 3. Update progress every 10,000 ISBNs
 * 4. Update prefix status to "completed" on success
 * 5. Update prefix status to "failed" with error on failure
 *
 * Related:
 * - src/modules/isbn-prefixes/actions.ts (triggers this job)
 * - src/modules/isbn-prefixes/utils.ts (ISBN generation)
 */

import { eq } from "drizzle-orm";
import { adminDb } from "@/db";
import { isbnPrefixes } from "@/db/schema/isbn-prefixes";
import { isbns, type NewISBN } from "@/db/schema/isbns";
import { generateIsbn13 } from "@/modules/isbn-prefixes/utils";
import { inngest } from "./client";

/**
 * Batch size for ISBN inserts
 * Prevents transaction timeout for large batches
 */
const INSERT_BATCH_SIZE = 1000;

/**
 * Progress logging interval
 * Log progress every N ISBNs
 */
const PROGRESS_LOG_INTERVAL = 10000;

/**
 * Event payload for ISBN prefix generation
 * Story 7.6: Removed type field - ISBNs are unified without type distinction
 */
interface PrefixGenerateEventData {
  prefixId: string;
  tenantId: string;
  prefix: string;
  blockSize: number;
}

/**
 * Generate ISBN Prefix Background Job
 *
 * AC-7.4.6: Runs as Inngest background job with:
 * - 3 retries with exponential backoff
 * - Step-based execution for durability
 * - Proper error handling and status updates
 * - Progress logging every 10,000 ISBNs
 */
export const generateIsbnPrefixes = inngest.createFunction(
  {
    id: "generate-isbn-prefixes",
    retries: 3,
  },
  { event: "isbn-prefix/generate" },
  async ({ event, step }) => {
    // Story 7.6: Removed type field - ISBNs are unified without type distinction
    const { prefixId, tenantId, prefix, blockSize } =
      event.data as PrefixGenerateEventData;

    const startTime = Date.now();

    console.log(
      `[Inngest] Starting ISBN generation for prefix ${prefix}: ${blockSize} ISBNs`,
    );

    // Verify prefix exists and is in pending/generating state
    await step.run("verify-prefix", async () => {
      const result = await adminDb.query.isbnPrefixes.findFirst({
        where: eq(isbnPrefixes.id, prefixId),
      });

      if (!result) {
        throw new Error(`Prefix ${prefixId} not found`);
      }

      if (
        result.generation_status !== "pending" &&
        result.generation_status !== "generating"
      ) {
        throw new Error(
          `Prefix ${prefixId} has invalid status: ${result.generation_status}`,
        );
      }

      return result;
    });

    // Calculate total batches
    const totalBatches = Math.ceil(blockSize / INSERT_BATCH_SIZE);
    let totalInserted = 0;

    try {
      // Process in batches
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const batchStart = batchIndex * INSERT_BATCH_SIZE;
        const batchEnd = Math.min(batchStart + INSERT_BATCH_SIZE, blockSize);
        const batchSize = batchEnd - batchStart;

        await step.run(`batch-${batchIndex}`, async () => {
          const now = new Date();
          const isbnRecords: NewISBN[] = [];

          // Generate ISBNs for this batch
          // Story 7.6: Removed type field - ISBNs are unified
          for (let i = batchStart; i < batchEnd; i++) {
            try {
              const isbn13 = generateIsbn13(prefix, i);
              isbnRecords.push({
                tenant_id: tenantId,
                isbn_13: isbn13,
                status: "available",
                prefix_id: prefixId,
                created_at: now,
                updated_at: now,
              });
            } catch (genError) {
              console.error(
                `[Inngest] Error generating ISBN at index ${i}:`,
                genError,
              );
              throw genError;
            }
          }

          // Insert batch
          await adminDb.insert(isbns).values(isbnRecords);

          return { inserted: batchSize };
        });

        totalInserted += batchSize;

        // Log progress at intervals
        if (
          totalInserted % PROGRESS_LOG_INTERVAL === 0 ||
          totalInserted === blockSize
        ) {
          const progress = Math.round((totalInserted / blockSize) * 100);
          console.log(
            `[Inngest] Prefix ${prefix}: ${totalInserted}/${blockSize} ISBNs generated (${progress}%)`,
          );

          // Update available_count periodically for UI progress display
          await step.run(`update-progress-${batchIndex}`, async () => {
            await adminDb
              .update(isbnPrefixes)
              .set({
                available_count: totalInserted,
                updated_at: new Date(),
              })
              .where(eq(isbnPrefixes.id, prefixId));
          });
        }
      }

      // Final status update
      await step.run("complete-generation", async () => {
        await adminDb
          .update(isbnPrefixes)
          .set({
            generation_status: "completed",
            available_count: blockSize,
            updated_at: new Date(),
          })
          .where(eq(isbnPrefixes.id, prefixId));
      });

      const totalTime = Date.now() - startTime;

      console.log(
        `[Inngest] ISBN generation complete for prefix ${prefix}: ${totalInserted} ISBNs in ${totalTime}ms`,
      );

      return {
        success: true,
        prefixId,
        prefix,
        isbnsGenerated: totalInserted,
        durationMs: totalTime,
      };
    } catch (error) {
      // Mark as failed
      await step.run("mark-failed", async () => {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Unknown error during generation";

        await adminDb
          .update(isbnPrefixes)
          .set({
            generation_status: "failed",
            generation_error: errorMessage,
            available_count: totalInserted, // Keep count of what was generated
            updated_at: new Date(),
          })
          .where(eq(isbnPrefixes.id, prefixId));
      });

      console.error(
        `[Inngest] ISBN generation failed for prefix ${prefix} after ${totalInserted} ISBNs:`,
        error,
      );

      // Re-throw to trigger retry
      throw error;
    }
  },
);
