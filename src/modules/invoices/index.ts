/**
 * Invoice Module Exports
 *
 * Central export point for invoice module.
 *
 * Story: 8.1 - Create Invoice Database Schema
 */

// Types
export type {
  Invoice,
  InsertInvoice,
  InvoiceLineItem,
  InsertInvoiceLineItem,
  Payment,
  InsertPayment,
  InvoiceAddress,
  InvoiceCalculations,
  LineItemCalculation,
  InvoiceWithLineItems,
  InvoiceWithPayments,
  InvoiceWithDetails,
  InvoiceWithCustomer,
  AgingBucket,
  CustomerAgingSummary,
  InvoiceFilters,
  PaymentFilters,
  InvoiceStatusType,
  PaymentTermsType,
  PaymentMethodType,
  // PDF/Email types (Story 8.6)
  InvoicePDFData,
  PDFGenerationResult,
  InvoiceWithPDFDetails,
} from "./types";

// Schemas
export {
  addressSchema,
  invoiceStatusSchema,
  paymentTermsSchema,
  invoiceLineItemSchema,
  createInvoiceSchema,
  updateInvoiceSchema,
  paymentMethodSchema,
  recordPaymentSchema,
} from "./schema";

export type {
  AddressInput,
  InvoiceLineItemInput,
  CreateInvoiceInput,
  UpdateInvoiceInput,
  RecordPaymentInput,
} from "./schema";

// Actions
export {
  searchCustomersAction,
  generateInvoiceNumber,
  createInvoice,
  updateInvoice,
  voidInvoice,
  recordPayment,
  generateInvoicePDFAction,
  sendInvoiceAction,
  resendInvoiceAction,
} from "./actions";

// PDF and Email (Story 8.6)
export { generateInvoicePDF, generateInvoicePDFBuffer } from "./pdf-generator";
export { sendInvoiceEmail, validateInvoiceForEmail } from "./email-service";
export type { EmailDeliveryResult, SendInvoiceEmailParams } from "./email-service";
export type { InvoiceEmailProps } from "./email-template";
export {
  generateInvoiceS3Key,
  uploadInvoicePDF,
  getInvoiceDownloadUrl,
  invoicePDFExists,
  getInvoicePDFBuffer,
} from "./storage";
