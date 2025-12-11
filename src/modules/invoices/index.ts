/**
 * Invoice Module Exports
 *
 * Central export point for invoice module.
 *
 * Story: 8.1 - Create Invoice Database Schema
 */

// Actions
export {
  createInvoice,
  generateInvoiceNumber,
  generateInvoicePDFAction,
  recordPayment,
  resendInvoiceAction,
  searchCustomersAction,
  sendInvoiceAction,
  updateInvoice,
  voidInvoice,
} from "./actions";
export type {
  EmailDeliveryResult,
  SendInvoiceEmailParams,
} from "./email-service";
export { sendInvoiceEmail, validateInvoiceForEmail } from "./email-service";
export type { InvoiceEmailProps } from "./email-template";

// PDF and Email (Story 8.6)
export { generateInvoicePDF, generateInvoicePDFBuffer } from "./pdf-generator";
export type {
  AddressInput,
  CreateInvoiceInput,
  InvoiceLineItemInput,
  RecordPaymentInput,
  UpdateInvoiceInput,
} from "./schema";
// Schemas
export {
  addressSchema,
  createInvoiceSchema,
  invoiceLineItemSchema,
  invoiceStatusSchema,
  paymentMethodSchema,
  paymentTermsSchema,
  recordPaymentSchema,
  updateInvoiceSchema,
} from "./schema";
export {
  generateInvoiceS3Key,
  getInvoiceDownloadUrl,
  getInvoicePDFBuffer,
  invoicePDFExists,
  uploadInvoicePDF,
} from "./storage";
// Types
export type {
  AgingBucket,
  CustomerAgingSummary,
  InsertInvoice,
  InsertInvoiceLineItem,
  InsertPayment,
  Invoice,
  InvoiceAddress,
  InvoiceCalculations,
  InvoiceFilters,
  InvoiceLineItem,
  // PDF/Email types (Story 8.6)
  InvoicePDFData,
  InvoiceStatusType,
  InvoiceWithCustomer,
  InvoiceWithDetails,
  InvoiceWithLineItems,
  InvoiceWithPayments,
  InvoiceWithPDFDetails,
  LineItemCalculation,
  Payment,
  PaymentFilters,
  PaymentMethodType,
  PaymentTermsType,
  PDFGenerationResult,
} from "./types";
