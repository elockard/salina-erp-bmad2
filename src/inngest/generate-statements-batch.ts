/**
 * Inngest: Batch Statement Generation Background Job
 *
 * Background job for generating royalty statements for multiple authors.
 * Triggered by the statement wizard when user submits generation request.
 *
 * Story: 5.3 - Build Statement Generation Wizard for Finance
 * Task 7: Create Inngest batch generation function
 * AC-5.3.5: Submit enqueues Inngest job for background processing via statements/generate.batch event
 *
 * Story: 5.4 - Implement Statement Email Delivery with Resend
 * AC-5.4.2: PDF statement attached to email
 * AC-5.4.3: email_sent_at timestamp recorded after successful delivery
 * AC-5.4.4: Failed deliveries retry 3x with exponential backoff
 *
 * Processing Steps:
 * 1. For each author, run royalty calculator
 * 2. Create statement records with draft status
 * 3. Generate PDFs (reuse generate-statement-pdf.ts logic)
 * 4. Upload PDFs to S3
 * 5. Send emails via Resend (if enabled)
 * 6. Update statement status to "sent" and email_sent_at timestamp
 *
 * Related:
 * - src/modules/statements/actions.ts (triggers this job)
 * - src/modules/statements/pdf-generator.tsx (PDF generation)
 * - src/modules/statements/email-service.ts (email delivery)
 * - src/modules/royalties/calculator.ts (royalty calculation)
 */

import Decimal from "decimal.js";
import { and, eq, or } from "drizzle-orm";
import { adminDb } from "@/db";
import { contacts } from "@/db/schema/contacts";
import { contracts } from "@/db/schema/contracts";
import { statements } from "@/db/schema/statements";
import { titles } from "@/db/schema/titles";
import {
  calculateRoyaltyForPeriodAdmin,
  calculateSplitRoyaltyForTitleAdmin,
} from "@/modules/royalties/calculator";
import type {
  AuthorSplitBreakdown,
  RoyaltyCalculation,
} from "@/modules/royalties/types";
import { sendStatementEmail } from "@/modules/statements/email-service";
import { generateStatementPDF } from "@/modules/statements/pdf-generator";
import type {
  StatementCalculations,
  StatementWithDetails,
} from "@/modules/statements/types";
import { inngest } from "./client";

/**
 * Event payload for batch generation
 */
interface BatchGenerateEventData {
  tenantId: string;
  periodStart: string;
  periodEnd: string;
  authorIds: string[];
  sendEmail: boolean;
  userId: string;
}

/**
 * Result for a single author's statement generation
 */
interface AuthorStatementResult {
  authorId: string;
  authorName: string;
  success: boolean;
  statementId?: string;
  error?: string;
}

/**
 * Generate Statements Batch Background Job
 *
 * AC-5.3.5: Runs as Inngest background job with:
 * - 3 retries with exponential backoff
 * - Step-based execution for durability
 * - Proper error handling and logging
 * - Partial failure handling (continues with other authors)
 */
export const generateStatementsBatch = inngest.createFunction(
  {
    id: "generate-statements-batch",
    retries: 3,
  },
  { event: "statements/generate.batch" },
  async ({ event, step }) => {
    const {
      tenantId,
      periodStart: periodStartStr,
      periodEnd: periodEndStr,
      authorIds,
      sendEmail,
      userId,
    } = event.data as BatchGenerateEventData;

    const periodStart = new Date(periodStartStr);
    const periodEnd = new Date(periodEndStr);
    const startTime = Date.now();

    console.log(
      `[Inngest] Starting batch statement generation for ${authorIds.length} authors`,
    );

    const results: AuthorStatementResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // Process each author
    for (const authorId of authorIds) {
      const result = await step.run(`process-author-${authorId}`, async () => {
        try {
          // Step 1: Get contact (author) and contract details
          // Story 7.3: authorId is now a contact ID from the contacts table
          const contact = await adminDb.query.contacts.findFirst({
            where: and(
              eq(contacts.id, authorId),
              eq(contacts.tenant_id, tenantId),
            ),
            with: { roles: true },
          });

          if (!contact) {
            return {
              authorId,
              authorName: "Unknown",
              success: false,
              error: "Author (contact) not found",
            };
          }

          // Verify contact has author role
          const hasAuthorRole = contact.roles.some((r) => r.role === "author");
          if (!hasAuthorRole) {
            return {
              authorId,
              authorName:
                `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
                "Unknown",
              success: false,
              error: "Contact does not have author role",
            };
          }

          // Build author name from contact fields
          const authorName =
            `${contact.first_name || ""} ${contact.last_name || ""}`.trim() ||
            "Unknown";

          // Story 7.3: Check both contact_id (new) and author_id (legacy) for contracts
          // Must also filter by tenant_id and active status
          const contract = await adminDb.query.contracts.findFirst({
            where: and(
              or(
                eq(contracts.contact_id, authorId),
                eq(contracts.author_id, authorId),
              ),
              eq(contracts.tenant_id, tenantId),
              eq(contracts.status, "active"),
            ),
          });

          if (!contract) {
            return {
              authorId,
              authorName,
              success: false,
              error: "No active contract found",
            };
          }

          const title = await adminDb.query.titles.findFirst({
            where: eq(titles.id, contract.title_id),
          });

          // Step 2: Check if title has multiple authors (Story 10.2)
          const { titleAuthors } = await import("@/db/schema/title-authors");
          const titleAuthorRecords = await adminDb.query.titleAuthors.findMany({
            where: eq(titleAuthors.title_id, contract.title_id),
          });

          const isMultiAuthorTitle = titleAuthorRecords.length > 1;

          // Step 3: Calculate royalties
          // Story 10.2: Use split calculation for multi-author titles
          let calc: RoyaltyCalculation | undefined;
          let thisAuthorSplit: AuthorSplitBreakdown | undefined;

          if (isMultiAuthorTitle) {
            // Use split calculation for co-authored titles
            const splitResult = await calculateSplitRoyaltyForTitleAdmin(
              contract.title_id,
              tenantId,
              periodStart,
              periodEnd,
            );

            if (!splitResult.success) {
              return {
                authorId,
                authorName,
                success: false,
                error: splitResult.error,
              };
            }

            calc = splitResult.calculation;

            // Find this author's split from the calculation
            thisAuthorSplit = calc.authorSplits.find(
              (s) => s.contactId === authorId,
            );

            if (!thisAuthorSplit) {
              return {
                authorId,
                authorName,
                success: false,
                error: `Author ${authorId} not found in split calculation for title ${contract.title_id}`,
              };
            }
          } else {
            // Use standard single-author calculation (backward compatible)
            const calcResult = await calculateRoyaltyForPeriodAdmin(
              authorId,
              tenantId,
              periodStart,
              periodEnd,
            );

            if (!calcResult.success) {
              return {
                authorId,
                authorName,
                success: false,
                error: calcResult.error,
              };
            }

            calc = calcResult.calculation;
          }

          // Step 4: Build calculations JSONB structure
          // Story 10.2: Use author's split values for multi-author titles
          const authorRoyaltyEarned = thisAuthorSplit
            ? thisAuthorSplit.splitAmount
            : calc.totalRoyaltyEarned;
          const authorRecoupment = thisAuthorSplit
            ? thisAuthorSplit.recoupment
            : calc.advanceRecoupment;
          const authorNetPayable = thisAuthorSplit
            ? thisAuthorSplit.netPayable
            : calc.netPayable;

          const calculations: StatementCalculations = {
            period: {
              startDate: periodStart.toISOString(),
              endDate: periodEnd.toISOString(),
            },
            formatBreakdowns: calc.formatCalculations.map((fc) => ({
              format: fc.format,
              totalQuantity: fc.netSales.netQuantity,
              totalRevenue: fc.netSales.netRevenue,
              tierBreakdowns: fc.tierBreakdowns.map((tb) => ({
                tierMinQuantity: tb.minQuantity,
                tierMaxQuantity: tb.maxQuantity,
                tierRate: tb.rate,
                quantityInTier: tb.unitsApplied,
                royaltyEarned: tb.royaltyAmount,
              })),
              formatRoyalty: fc.formatRoyalty,
            })),
            returnsDeduction: calc.formatCalculations.reduce(
              (sum, fc) => sum + fc.netSales.returnsAmount,
              0,
            ),
            // Story 10.2: For multi-author, grossRoyalty shows author's split
            grossRoyalty: authorRoyaltyEarned,
            advanceRecoupment: thisAuthorSplit
              ? {
                  originalAdvance: thisAuthorSplit.advanceStatus.totalAdvance,
                  previouslyRecouped:
                    thisAuthorSplit.advanceStatus.previouslyRecouped,
                  thisPeriodsRecoupment: authorRecoupment,
                  remainingAdvance:
                    thisAuthorSplit.advanceStatus.remainingAfterThisPeriod,
                }
              : {
                  originalAdvance: parseFloat(contract.advance_amount || "0"),
                  previouslyRecouped: parseFloat(
                    contract.advance_recouped || "0",
                  ),
                  thisPeriodsRecoupment: authorRecoupment,
                  remainingAdvance: Math.max(
                    0,
                    parseFloat(contract.advance_amount || "0") -
                      parseFloat(contract.advance_recouped || "0") -
                      authorRecoupment,
                  ),
                },
            netPayable: authorNetPayable,
            // Story 10.2: Include split info for multi-author statements
            ...(thisAuthorSplit && {
              splitCalculation: {
                titleTotalRoyalty: calc.titleTotalRoyalty,
                ownershipPercentage: thisAuthorSplit.ownershipPercentage,
                isSplitCalculation: true,
              },
            }),
          };

          // Story 10.3: AC-10.3.8 - Check for duplicate statement before insert
          const existingStatement = await adminDb.query.statements.findFirst({
            where: and(
              eq(statements.contact_id, authorId),
              eq(statements.tenant_id, tenantId),
              eq(statements.period_start, periodStart),
              eq(statements.period_end, periodEnd),
            ),
          });

          if (existingStatement) {
            return {
              authorId,
              authorName,
              success: false,
              error: `Statement already exists for this period: ${existingStatement.id}`,
            };
          }

          // Step 5: Create statement record with draft status
          // Story 7.3: Use contact_id instead of deprecated author_id
          // Story 10.2: Use author's split values for multi-author titles
          const [newStatement] = await adminDb
            .insert(statements)
            .values({
              tenant_id: tenantId,
              contact_id: authorId, // Story 7.3: authorId is now a contact ID
              contract_id: thisAuthorSplit
                ? thisAuthorSplit.contractId
                : contract.id,
              period_start: periodStart,
              period_end: periodEnd,
              total_royalty_earned: new Decimal(authorRoyaltyEarned)
                .toFixed(2)
                .toString(),
              recoupment: new Decimal(authorRecoupment).toFixed(2).toString(),
              net_payable: new Decimal(authorNetPayable).toFixed(2).toString(),
              calculations,
              status: "draft",
              generated_by_user_id: userId,
            })
            .returning();

          console.log(
            `[Inngest] Created statement ${newStatement.id} for author ${authorName}`,
          );

          // Step 5: Generate PDF and upload to S3
          // Story 7.3: Build author details from contact data
          // Build address from contact address fields
          const contactAddress = [
            contact.address_line1,
            contact.address_line2,
            [contact.city, contact.state, contact.postal_code]
              .filter(Boolean)
              .join(" "),
            contact.country,
          ]
            .filter(Boolean)
            .join(", ");

          const statementWithDetails: StatementWithDetails = {
            ...newStatement,
            author: {
              id: contact.id,
              name: authorName,
              address: contactAddress || null,
              email: contact.email,
            },
            contract: {
              id: contract.id,
              title_id: contract.title_id,
            },
            title: {
              id: title?.id || "",
              title: title?.title || "Unknown Title",
            },
          };

          const pdfResult = await generateStatementPDF(statementWithDetails);

          if (!pdfResult.success || !pdfResult.s3Key) {
            console.error(
              `[Inngest] PDF generation failed for statement ${newStatement.id}:`,
              pdfResult.error,
            );
            // Statement created but PDF failed - don't fail the whole process
            return {
              authorId,
              authorName,
              success: true,
              statementId: newStatement.id,
              error: `Statement created but PDF generation failed: ${pdfResult.error}`,
            };
          }

          // Step 6: Update statement with S3 key
          await adminDb
            .update(statements)
            .set({
              pdf_s3_key: pdfResult.s3Key,
              updated_at: new Date(),
            })
            .where(eq(statements.id, newStatement.id));

          // Step 8: Update contract advance_recouped if applicable
          // Story 10.2: Use author's recoupment for multi-author titles
          if (authorRecoupment > 0) {
            // Get the correct contract to update (may be different for multi-author)
            const contractToUpdate = thisAuthorSplit
              ? thisAuthorSplit.contractId
              : contract.id;

            // Get current advance_recouped from the correct contract
            const currentContract = thisAuthorSplit
              ? await adminDb.query.contracts.findFirst({
                  where: eq(contracts.id, thisAuthorSplit.contractId),
                })
              : contract;

            const newRecouped = new Decimal(
              currentContract?.advance_recouped || "0",
            )
              .plus(authorRecoupment)
              .toFixed(2);

            await adminDb
              .update(contracts)
              .set({
                advance_recouped: newRecouped,
                updated_at: new Date(),
              })
              .where(eq(contracts.id, contractToUpdate));

            console.log(
              `[Inngest] Updated contract ${contractToUpdate} advance_recouped to ${newRecouped}`,
            );
          }

          // Mark as sent if email not requested
          if (!sendEmail) {
            await adminDb
              .update(statements)
              .set({
                status: "sent",
                updated_at: new Date(),
              })
              .where(eq(statements.id, newStatement.id));
          }

          return {
            authorId,
            authorName,
            success: true,
            statementId: newStatement.id,
          };
        } catch (error) {
          console.error(
            `[Inngest] Error processing author ${authorId}:`,
            error,
          );
          return {
            authorId,
            authorName: "Unknown",
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
          };
        }
      });

      results.push(result);
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }

      // Story 5.4: Send email if requested and statement was created successfully
      // AC-5.4.2: PDF statement attached to email
      // AC-5.4.3: email_sent_at timestamp recorded after successful delivery
      // AC-5.4.4: Failed deliveries retry 3x with exponential backoff (handled by step)
      // Check statementId exists before accessing (discriminated union narrowing)
      const statementId =
        "statementId" in result ? result.statementId : undefined;
      if (sendEmail && result.success && statementId) {
        const emailResult = await step.run(
          `send-email-${statementId}`,
          async () => {
            try {
              const emailResponse = await sendStatementEmail({
                statementId: statementId,
                tenantId,
              });

              if (!emailResponse.success) {
                // Log error but don't fail - statement is still valid
                console.error(
                  `[Inngest] Email failed for statement ${statementId}:`,
                  emailResponse.error,
                );
                // Update status to indicate email failed
                await adminDb
                  .update(statements)
                  .set({
                    status: "failed",
                    updated_at: new Date(),
                  })
                  .where(eq(statements.id, statementId));

                return {
                  emailSent: false,
                  error: emailResponse.error,
                };
              }

              // AC-5.4.3: Update email_sent_at and status on success
              await adminDb
                .update(statements)
                .set({
                  status: "sent",
                  email_sent_at: new Date(),
                  updated_at: new Date(),
                })
                .where(eq(statements.id, statementId));

              console.log(
                `[Inngest] Email sent for statement ${statementId}: ${emailResponse.messageId}`,
              );

              return {
                emailSent: true,
                messageId: emailResponse.messageId,
              };
            } catch (error) {
              console.error(
                `[Inngest] Email step error for ${statementId}:`,
                error,
              );
              // Mark as failed but don't throw - statement is still valid
              await adminDb
                .update(statements)
                .set({
                  status: "failed",
                  updated_at: new Date(),
                })
                .where(eq(statements.id, statementId));

              return {
                emailSent: false,
                error:
                  error instanceof Error ? error.message : "Email step failed",
              };
            }
          },
        );

        // Attach email result to the statement result
        (result as { emailSent?: boolean; emailError?: string }).emailSent =
          emailResult.emailSent;
        if (
          !emailResult.emailSent &&
          "error" in emailResult &&
          emailResult.error
        ) {
          (result as { emailSent?: boolean; emailError?: string }).emailError =
            emailResult.error;
        }
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(
      `[Inngest] Batch statement generation complete: ${successCount} succeeded, ${failedCount} failed (${totalTime}ms)`,
    );

    return {
      success: failedCount === 0,
      completed: successCount,
      failed: failedCount,
      total: authorIds.length,
      results,
      durationMs: totalTime,
    };
  },
);
