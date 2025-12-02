/**
 * @react-pdf/renderer Setup Verification Test
 *
 * Story: 5.2 - Implement PDF Statement Generation
 * Task 1.3: Create basic test to verify PDF generation works
 *
 * This test verifies that @react-pdf/renderer is properly installed
 * and can generate PDF buffers in the test environment.
 */

import {
  Document,
  Page,
  renderToBuffer,
  Text,
  View,
} from "@react-pdf/renderer";
import { describe, expect, it } from "vitest";

/**
 * Simple test PDF document component
 */
const TestDocument = () => (
  <Document>
    <Page size="A4">
      <View>
        <Text>Test PDF Generation</Text>
      </View>
    </Page>
  </Document>
);

describe("@react-pdf/renderer setup", () => {
  it("should be importable", () => {
    expect(Document).toBeDefined();
    expect(Page).toBeDefined();
    expect(Text).toBeDefined();
    expect(View).toBeDefined();
    expect(renderToBuffer).toBeDefined();
  });

  it("should generate a valid PDF buffer", async () => {
    const buffer = await renderToBuffer(<TestDocument />);

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);

    // PDF files start with %PDF-
    const pdfHeader = buffer.subarray(0, 5).toString();
    expect(pdfHeader).toBe("%PDF-");
  });
});
