/**
 * Contact Module Index
 *
 * Clean exports for the unified contact system with multi-role support.
 *
 * Story: 7.1 - Create Unified Contact Database Schema
 * Related FRs: FR82-FR87 (Contact Management)
 */

// =============================================================================
// Actions (Story 7.2)
// =============================================================================
export {
  assignContactRole,
  clearContactTaxInfo,
  createContact,
  deactivateContact,
  fetchContacts,
  getContactWithRoles,
  reactivateContact,
  removeContactRole,
  updateContact,
  updateContactRoleData,
  // Tax info actions (Story 11.1)
  updateContactTaxInfo,
  updateContactTaxInfoPartial,
} from "./actions";
// =============================================================================
// Components (Story 7.2)
// =============================================================================
export {
  ContactDetail,
  ContactForm,
  ContactList,
  ContactsSplitView,
} from "./components";
// Tax status type (Story 11.1)
export type { ContactTaxStatus } from "./queries";
// =============================================================================
// Queries (Story 7.2)
// =============================================================================
export {
  contactHasRole,
  getAuthorsMissingTINCount,
  // Tax queries (Story 11.1)
  getAuthorsWithMissingTIN,
  getContactByEmail,
  getContactById,
  getContactRoles,
  getContacts,
  getContactsByRole,
  getContactsCount,
  getContactsMissingW9Count,
  getContactsWithMissingW9,
  getContactTaxStatus,
  searchContacts,
} from "./queries";

// Schema input types
export type {
  AddressInput,
  AssignContactRoleInput,
  ContactRoleInput,
  CreateContactInput,
  PaymentInfoInput,
  // Tax info types (Story 11.1)
  TaxInfoInput,
  TinTypeInput,
  UpdateContactInput,
  UpdateTaxInfoInput,
} from "./schema";
// =============================================================================
// Validation Schemas
// =============================================================================
export {
  accountTypeEnum,
  // Address
  addressSchema,
  // Role schemas
  assignContactRoleSchema,
  authorRoleDataSchema,
  checkPaymentSchema,
  contactRoleEnum,
  contactRoleSchema,
  // Enums
  contactStatusEnum,
  // Contact schemas
  createContactSchema,
  customerRoleDataSchema,
  // Payment info
  directDepositPaymentSchema,
  distributorRoleDataSchema,
  paymentInfoSchema,
  paymentMethodEnum,
  // Role-specific data
  socialLinksSchema,
  taxInfoSchema,
  // Tax info schemas (Story 11.1)
  tinTypeEnum,
  updateContactSchema,
  updateTaxInfoSchema,
  vendorRoleDataSchema,
  wireTransferPaymentSchema,
} from "./schema";
// =============================================================================
// Types
// =============================================================================
export type {
  Address,
  AuthorRoleData,
  CheckPaymentInfo,
  Contact,
  ContactFilters,
  ContactRole,
  ContactRoleType,
  ContactStatusType,
  ContactWithPortalStatus,
  ContactWithRoles,
  CustomerRoleData,
  DirectDepositPaymentInfo,
  DistributorRoleData,
  InsertContact,
  InsertContactRole,
  PaymentInfo,
  RoleSpecificData,
  SocialLinks,
  VendorRoleData,
  WireTransferPaymentInfo,
} from "./types";
// Type guards
export {
  isAuthorRoleData,
  isCustomerRoleData,
  isDistributorRoleData,
  isPaymentInfo,
  isVendorRoleData,
} from "./types";
