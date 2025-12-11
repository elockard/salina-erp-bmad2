/**
 * Form 1099-MISC PDF Template
 *
 * React PDF template for generating IRS Form 1099-MISC.
 * Uses @react-pdf/renderer to create PDF documents following IRS layout.
 *
 * Story: 11.3 - Generate 1099-MISC Forms
 * AC-11.3.5: 1099-MISC PDF format following IRS specifications
 *
 * IRS Form 1099-MISC Structure:
 * - Copy A: For Internal Revenue Service Center (RED ink - cannot be filed electronically)
 * - Copy B: For Recipient
 * - Copy C: For Payer
 *
 * This template generates Copy B (For Recipient) format.
 *
 * Related:
 * - src/modules/form-1099/types.ts (Form1099PDFData)
 * - src/modules/form-1099/generator.ts (renderToBuffer)
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Form1099PDFData } from "../types";

/**
 * PDF Styles
 * Based on IRS Form 1099-MISC layout specifications
 */
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#000000",
    backgroundColor: "#ffffff",
  },
  // Form border
  formBorder: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 10,
  },
  // Header section
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#000000",
    paddingBottom: 8,
  },
  headerLeft: {
    width: "60%",
  },
  headerRight: {
    width: "38%",
    alignItems: "flex-end",
  },
  formTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 2,
  },
  formSubtitle: {
    fontSize: 8,
    color: "#333333",
  },
  taxYear: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#000000",
  },
  copyType: {
    fontSize: 9,
    fontWeight: "bold",
    marginTop: 4,
    padding: 4,
    backgroundColor: "#f0f0f0",
    textAlign: "center",
  },
  // Box styles
  boxRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  box: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    minHeight: 50,
  },
  boxHalf: {
    width: "49%",
  },
  boxThird: {
    width: "32%",
  },
  boxTwoThirds: {
    width: "66%",
  },
  boxFull: {
    width: "100%",
  },
  boxLabel: {
    fontSize: 7,
    color: "#333333",
    marginBottom: 4,
    textTransform: "uppercase",
  },
  boxNumber: {
    fontSize: 7,
    fontWeight: "bold",
    marginBottom: 2,
  },
  boxValue: {
    fontSize: 10,
    fontWeight: "bold",
  },
  boxValueLarge: {
    fontSize: 12,
    fontWeight: "bold",
  },
  boxValueSmall: {
    fontSize: 9,
  },
  // Address box
  addressBox: {
    minHeight: 70,
  },
  addressName: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  addressLine: {
    fontSize: 9,
    marginBottom: 1,
  },
  // TIN display
  tinMasked: {
    fontSize: 10,
    fontFamily: "Courier",
    letterSpacing: 1,
  },
  // Amount row styles
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  amountBox: {
    borderWidth: 1,
    borderColor: "#000000",
    padding: 6,
    width: "23%",
    minHeight: 40,
  },
  // Footer
  footer: {
    marginTop: 15,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#cccccc",
  },
  footerText: {
    fontSize: 7,
    color: "#666666",
    lineHeight: 1.4,
  },
  footerBold: {
    fontWeight: "bold",
  },
  // Instructions
  instructions: {
    marginTop: 10,
    padding: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  instructionsTitle: {
    fontSize: 8,
    fontWeight: "bold",
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 7,
    color: "#333333",
    lineHeight: 1.4,
  },
  // Spacer
  spacer: {
    marginRight: 8,
  },
});

/**
 * Format currency value for 1099 display
 * IRS requires amounts in dollars and cents (no currency symbol on form)
 */
function formatAmount(value: string | number): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return numValue.toFixed(2);
}

/**
 * Format TIN for display (masked format: ***-**-1234 or **-***1234)
 */
function formatMaskedTIN(lastFour: string, type: "ssn" | "ein"): string {
  if (type === "ssn") {
    return `***-**-${lastFour}`;
  }
  return `**-***${lastFour}`;
}

/**
 * Payer Information Box
 * IRS Box: Payer's name, address, and TIN
 */
function PayerBox({ data }: { data: Form1099PDFData }) {
  const { payer } = data;

  return (
    <View style={[styles.box, styles.addressBox, { marginBottom: 8 }]}>
      <Text style={styles.boxLabel}>
        Payer&apos;s name, street address, city or town, state or province,
        country, ZIP or foreign postal code, and telephone no.
      </Text>
      <Text style={styles.addressName}>{payer.name}</Text>
      <Text style={styles.addressLine}>{payer.address_line1}</Text>
      {payer.address_line2 && (
        <Text style={styles.addressLine}>{payer.address_line2}</Text>
      )}
      <Text style={styles.addressLine}>
        {payer.city}, {payer.state} {payer.zip}
      </Text>
    </View>
  );
}

/**
 * TIN Boxes Row
 * Payer's TIN and Recipient's TIN
 */
function TINBoxes({ data }: { data: Form1099PDFData }) {
  const { payer, recipient } = data;

  return (
    <View style={styles.boxRow}>
      <View style={[styles.box, styles.boxHalf, styles.spacer]}>
        <Text style={styles.boxLabel}>Payer&apos;s TIN</Text>
        <Text style={styles.tinMasked}>
          {formatMaskedTIN(payer.ein_last_four, "ein")}
        </Text>
      </View>
      <View style={[styles.box, styles.boxHalf]}>
        <Text style={styles.boxLabel}>Recipient&apos;s TIN</Text>
        <Text style={styles.tinMasked}>
          {formatMaskedTIN(recipient.tin_last_four, recipient.tin_type)}
        </Text>
      </View>
    </View>
  );
}

/**
 * Recipient Information Box
 */
function RecipientBox({ data }: { data: Form1099PDFData }) {
  const { recipient } = data;

  return (
    <View style={[styles.box, styles.addressBox, { marginBottom: 8 }]}>
      <Text style={styles.boxLabel}>
        Recipient&apos;s name, street address, city or town, state or province,
        country, and ZIP or foreign postal code
      </Text>
      <Text style={styles.addressName}>{recipient.name}</Text>
      <Text style={styles.addressLine}>{recipient.address_line1}</Text>
      {recipient.address_line2 && (
        <Text style={styles.addressLine}>{recipient.address_line2}</Text>
      )}
      <Text style={styles.addressLine}>
        {recipient.city}, {recipient.state} {recipient.zip}
      </Text>
    </View>
  );
}

/**
 * Account Number Row
 */
function AccountNumberRow({ data }: { data: Form1099PDFData }) {
  return (
    <View style={styles.boxRow}>
      <View style={[styles.box, styles.boxTwoThirds, styles.spacer]}>
        <Text style={styles.boxLabel}>Account number (see instructions)</Text>
        <Text style={styles.boxValueSmall}>{data.recipient.id}</Text>
      </View>
      <View style={[styles.box, styles.boxThird]}>
        <Text style={styles.boxLabel}>2nd TIN not.</Text>
        <Text style={styles.boxValue}></Text>
      </View>
    </View>
  );
}

/**
 * Amount Boxes Row
 * Box 7: Nonemployee Compensation (main box for author royalties)
 */
function AmountBoxes({ data }: { data: Form1099PDFData }) {
  return (
    <>
      {/* First row of boxes */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>1</Text>
          <Text style={styles.boxLabel}>Rents</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>2</Text>
          <Text style={styles.boxLabel}>Royalties</Text>
          <Text style={styles.boxValueLarge}>{formatAmount(data.amount)}</Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>3</Text>
          <Text style={styles.boxLabel}>Other income</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>4</Text>
          <Text style={styles.boxLabel}>Federal income tax withheld</Text>
          <Text style={styles.boxValue}></Text>
        </View>
      </View>

      {/* Second row of boxes */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>5</Text>
          <Text style={styles.boxLabel}>Fishing boat proceeds</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>6</Text>
          <Text style={styles.boxLabel}>Medical and health care payments</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>7</Text>
          <Text style={styles.boxLabel}>
            Payer made direct sales totaling $5,000 or more
          </Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>8</Text>
          <Text style={styles.boxLabel}>
            Substitute payments in lieu of dividends
          </Text>
          <Text style={styles.boxValue}></Text>
        </View>
      </View>

      {/* Third row of boxes */}
      <View style={styles.amountRow}>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>9</Text>
          <Text style={styles.boxLabel}>Crop insurance proceeds</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>10</Text>
          <Text style={styles.boxLabel}>
            Gross proceeds paid to an attorney
          </Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>11</Text>
          <Text style={styles.boxLabel}>Fish purchased for resale</Text>
          <Text style={styles.boxValue}></Text>
        </View>
        <View style={styles.amountBox}>
          <Text style={styles.boxNumber}>12</Text>
          <Text style={styles.boxLabel}>Section 409A deferrals</Text>
          <Text style={styles.boxValue}></Text>
        </View>
      </View>
    </>
  );
}

/**
 * Form Header
 */
function FormHeader({ data }: { data: Form1099PDFData }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={styles.formTitle}>Form 1099-MISC</Text>
        <Text style={styles.formSubtitle}>Miscellaneous Information</Text>
        <Text style={styles.formSubtitle}>
          Department of the Treasury - Internal Revenue Service
        </Text>
      </View>
      <View style={styles.headerRight}>
        <Text style={styles.taxYear}>{data.tax_year}</Text>
        <Text style={styles.copyType}>Copy B - For Recipient</Text>
      </View>
    </View>
  );
}

/**
 * Recipient Instructions
 */
function RecipientInstructions() {
  return (
    <View style={styles.instructions}>
      <Text style={styles.instructionsTitle}>Instructions for Recipient</Text>
      <Text style={styles.instructionsText}>
        This is important tax information and is being furnished to the IRS. If
        you are required to file a return, a negligence penalty or other
        sanction may be imposed on you if this income is taxable and the IRS
        determines that it has not been reported.
      </Text>
      <Text style={[styles.instructionsText, { marginTop: 4 }]}>
        <Text style={styles.footerBold}>Box 2 - Royalties: </Text>
        Shows royalties paid to you from book publishing or similar activities.
        Report this amount on Schedule E (Form 1040).
      </Text>
    </View>
  );
}

/**
 * Footer with generation info
 */
function Footer({ data }: { data: Form1099PDFData }) {
  const generatedAt = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        Form 1099-MISC (Rev. 1-2024) | Generated: {generatedAt} | Form ID:{" "}
        {data.form_id}
      </Text>
      <Text style={[styles.footerText, { marginTop: 4 }]}>
        <Text style={styles.footerBold}>Note: </Text>
        This is an informational copy for the recipient. Copy A (filed with IRS)
        must be printed on official IRS-approved paper with red ink.
      </Text>
    </View>
  );
}

/**
 * Main Form 1099-MISC PDF Document
 *
 * Generates Copy B (For Recipient) of IRS Form 1099-MISC.
 * Box 2 (Royalties) is populated with the author's earnings.
 */
export function Form1099PDF({ data }: { data: Form1099PDFData }) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.formBorder}>
          <FormHeader data={data} />
          <PayerBox data={data} />
          <TINBoxes data={data} />
          <RecipientBox data={data} />
          <AccountNumberRow data={data} />
          <AmountBoxes data={data} />
        </View>
        <RecipientInstructions />
        <Footer data={data} />
      </Page>
    </Document>
  );
}

export default Form1099PDF;
