/**
 * Generate Sample Statement PDF
 *
 * Run with: npx tsx scripts/generate-sample-pdf.tsx
 */

import { writeFileSync } from "node:fs";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatementPDF } from "../src/modules/statements/pdf/statement-pdf";
import type { StatementPDFData } from "../src/modules/statements/types";

const sampleData: StatementPDFData = {
  statementId: "sample-stmt-001",
  titleName: "The Great American Novel",
  author: {
    name: "Jane Doe",
    address: "123 Author Lane\nPublishing City, ST 12345",
    email: "jane.doe@author.com",
  },
  calculations: {
    period: {
      startDate: "2024-10-01",
      endDate: "2024-12-31",
    },
    formatBreakdowns: [
      {
        format: "physical",
        totalQuantity: 1250,
        totalRevenue: 31250,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: 1000,
            tierRate: 0.08,
            quantityInTier: 1000,
            royaltyEarned: 2000,
          },
          {
            tierMinQuantity: 1001,
            tierMaxQuantity: null,
            tierRate: 0.1,
            quantityInTier: 250,
            royaltyEarned: 625,
          },
        ],
        formatRoyalty: 2625,
      },
      {
        format: "ebook",
        totalQuantity: 3200,
        totalRevenue: 22400,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: null,
            tierRate: 0.25,
            quantityInTier: 3200,
            royaltyEarned: 5600,
          },
        ],
        formatRoyalty: 5600,
      },
      {
        format: "audiobook",
        totalQuantity: 480,
        totalRevenue: 9600,
        tierBreakdowns: [
          {
            tierMinQuantity: 0,
            tierMaxQuantity: null,
            tierRate: 0.2,
            quantityInTier: 480,
            royaltyEarned: 1920,
          },
        ],
        formatRoyalty: 1920,
      },
    ],
    returnsDeduction: 245.5,
    grossRoyalty: 10145,
    advanceRecoupment: {
      originalAdvance: 15000,
      previouslyRecouped: 8500,
      thisPeriodsRecoupment: 5899.5,
      remainingAdvance: 600,
    },
    netPayable: 4000,
  },
};

async function main() {
  console.log("Generating sample statement PDF...");

  const buffer = await renderToBuffer(<StatementPDF data={sampleData} />);
  const outputPath = "scripts/sample-statement.pdf";

  writeFileSync(outputPath, buffer);
  console.log(`PDF generated: ${outputPath}`);
  console.log(`File size: ${buffer.length.toLocaleString()} bytes`);
}

main().catch(console.error);
