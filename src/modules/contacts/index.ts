/**
 * Contact Module Index
 *
 * Clean exports for the unified contact system with multi-role support.
 *
 * Story: 7.1 - Create Unified Contact Database Schema
 * Related FRs: FR82-FR87 (Contact Management)
 */

// =============================================================================
// Types
// =============================================================================
export type {
  Contact,
  InsertContact,
  ContactRole,
  InsertContactRole,
  Address,
  PaymentInfo,
  DirectDepositPaymentInfo,
  CheckPaymentInfo,
  WireTransferPaymentInfo,
  SocialLinks,
  AuthorRoleData,
  CustomerRoleData,
  VendorRoleData,
  DistributorRoleData,
  RoleSpecificData,
  ContactWithRoles,
  ContactWithPortalStatus,
  ContactRoleType,
  ContactStatusType,
  ContactFilters,
} from "./types";

// Type guards
export {
  isAuthorRoleData,
  isCustomerRoleData,
  isVendorRoleData,
  isDistributorRoleData,
  isPaymentInfo,
} from "./types";

// =============================================================================
// Validation Schemas
// =============================================================================
export {
  // Enums
  contactStatusEnum,
  contactRoleEnum,
  paymentMethodEnum,
  accountTypeEnum,
  // Address
  addressSchema,
  // Payment info
  directDepositPaymentSchema,
  checkPaymentSchema,
  wireTransferPaymentSchema,
  paymentInfoSchema,
  // Role-specific data
  socialLinksSchema,
  authorRoleDataSchema,
  customerRoleDataSchema,
  vendorRoleDataSchema,
  distributorRoleDataSchema,
  // Contact schemas
  createContactSchema,
  updateContactSchema,
  // Role schemas
  assignContactRoleSchema,
  contactRoleSchema,
} from "./schema";

// Schema input types
export type {
  CreateContactInput,
  UpdateContactInput,
  AssignContactRoleInput,
  ContactRoleInput,
  PaymentInfoInput,
  AddressInput,
} from "./schema";

// =============================================================================
// Actions (Story 7.2)
// =============================================================================
export {
  createContact,
  updateContact,
  deactivateContact,
  reactivateContact,
  assignContactRole,
  removeContactRole,
  updateContactRoleData,
  fetchContacts,
  getContactWithRoles,
} from "./actions";

// =============================================================================
// Queries (Story 7.2)
// =============================================================================
export {
  getContacts,
  getContactById,
  getContactsByRole,
  searchContacts,
  getContactRoles,
  contactHasRole,
  getContactsCount,
  getContactByEmail,
} from "./queries";

// =============================================================================
// Components (Story 7.2)
// =============================================================================
export {
  ContactList,
  ContactForm,
  ContactDetail,
  ContactsSplitView,
} from "./components";
