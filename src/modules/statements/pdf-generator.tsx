/**
 * PDF Generator Service
 *
 * Orchestrates PDF statement generation and S3 upload.
 * Uses @react-pdf/renderer to create PDFs and S3 storage utilities for upload.
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 3: Create PDF generator service
 * AC-5.2.6: PDF uploads to S3 with key pattern statements/{tenant_id}/{statement_id}.pdf
 *
 * Related:
 * - src/modules/statements/pdf/statement-pdf.tsx (PDF template)
 * - src/modules/statements/storage.ts (S3 operations)
 * - src/modules/statements/types.ts (StatementWithDetails, PDFGenerationResult)
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { StatementPDF } from "./pdf/statement-pdf";
import { uploadStatementPDF } from "./storage";
import type {
  PDFGenerationResult,
  StatementCalculations,
  StatementPDFData,
  StatementWithDetails,
} from "./types";

/**
 * Transform statement with details into PDF data format
 *
 * @param statement - Statement with all related data
 * @returns Data structure for PDF template
 */
function transformToPDFData(statement: StatementWithDetails): StatementPDFData {
  return {
    statementId: statement.id,
    titleName: statement.title.title,
    author: {
      name: statement.author.name,
      address: statement.author.address,
      email: statement.author.email,
    },
    calculations: statement.calculations as StatementCalculations,
  };
}

/**
 * Generate statement PDF buffer
 *
 * @param statement - Statement with all related data
 * @returns PDF as Buffer
 */
export async function generatePDFBuffer(
  statement: StatementWithDetails,
): Promise<Buffer> {
  const pdfData = transformToPDFData(statement);
  const buffer = await renderToBuffer(<StatementPDF data={pdfData} />);
  return Buffer.from(buffer);
}

/**
 * Generate statement PDF and upload to S3
 *
 * Complete workflow:
 * 1. Transform statement data for PDF template
 * 2. Render PDF to buffer using @react-pdf/renderer
 * 3. Upload to S3 with proper key pattern
 * 4. Return S3 key on success
 *
 * @param statement - Statement with all related data (author, contract, title)
 * @returns Result with success status and S3 key or error
 */
export async function generateStatementPDF(
  statement: StatementWithDetails,
): Promise<PDFGenerationResult> {
  const startTime = Date.now();
  const { id: statementId, tenant_id: tenantId } = statement;

  console.log(`[PDF] Starting generation for statement ${statementId}`);

  try {
    // Generate PDF buffer
    const pdfBuffer = await generatePDFBuffer(statement);
    const generateTime = Date.now() - startTime;
    console.log(
      `[PDF] Generated buffer for ${statementId} (${pdfBuffer.length} bytes, ${generateTime}ms)`,
    );

    // Upload to S3
    const uploadStart = Date.now();
    const s3Key = await uploadStatementPDF(pdfBuffer, tenantId, statementId);
    const uploadTime = Date.now() - uploadStart;
    console.log(
      `[PDF] Uploaded to S3 for ${statementId}: ${s3Key} (${uploadTime}ms)`,
    );

    const totalTime = Date.now() - startTime;
    console.log(
      `[PDF] Completed generation for ${statementId} (total: ${totalTime}ms)`,
    );

    return {
      success: true,
      s3Key,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error(`[PDF] Generation failed for ${statementId}:`, errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}
