/**
 * Drizzle ORM Relations
 *
 * Defines relationships between tables for relational query mode.
 * Required for db.query.*.findFirst/findMany with { with: {...} } options.
 *
 * Story 2.3: Added authorsRelations for portal_user_id link
 * Story 2.4: Added titlesRelations for author and tenant links
 * Story 2.6: Added isbnsRelations for ISBN pool management
 * Story 3.1: Added salesRelations for sales transaction ledger
 * Story 4.1: Added contractsRelations and contractTiersRelations for royalty contracts
 * Story 5.1: Added statementsRelations for royalty statements
 * Story 6.5: Added auditLogsRelations for compliance audit logging
 */

import { relations } from "drizzle-orm";
import { apiKeys } from "./api-keys";
import { auditLogs } from "./audit-logs";
import { authorNotificationPreferences } from "./author-notification-preferences";
import { authors } from "./authors";
import { contactRoles, contacts } from "./contacts";
import { contracts, contractTiers } from "./contracts";
import { csvExports } from "./csv-exports";
import { csvImports } from "./csv-imports";
import { invoiceLineItems, invoices, payments } from "./invoices";
import { isbnPrefixes } from "./isbn-prefixes";
import { isbns } from "./isbns";
import { manuscriptSubmissions } from "./manuscript-submissions";
import { marketingAssets } from "./marketing-assets";
import { notificationPreferences } from "./notification-preferences";
import { notifications } from "./notifications";
import { onboardingProgress } from "./onboarding";
import { productionProjects } from "./production-projects";
import { productionTasks } from "./production-tasks";
import { proofFiles } from "./proof-files";
import { rateLimitOverrides } from "./rate-limit-overrides";
import { returns } from "./returns";
import { sales } from "./sales";
import { statements } from "./statements";
import { tenants } from "./tenants";
import { titleAuthors } from "./title-authors";
import { titles } from "./titles";
import { users } from "./users";
import { webhookDeliveries } from "./webhook-deliveries";
import { webhookSubscriptions } from "./webhook-subscriptions";

/**
 * Tenant relations
 * One tenant has many users, authors, titles, isbns, isbnPrefixes, sales, returns, contracts, statements, audit logs, contacts, invoices, and payments
 * Story 8.1: Added invoices and payments relations
 * Story 20.1: Added onboardingProgress relation (one-to-one)
 */
export const tenantsRelations = relations(tenants, ({ one, many }) => ({
  users: many(users),
  authors: many(authors),
  titles: many(titles),
  isbns: many(isbns),
  isbnPrefixes: many(isbnPrefixes),
  sales: many(sales),
  returns: many(returns),
  contracts: many(contracts),
  statements: many(statements),
  auditLogs: many(auditLogs),
  contacts: many(contacts),
  invoices: many(invoices),
  payments: many(payments),
  apiKeys: many(apiKeys),
  webhookSubscriptions: many(webhookSubscriptions),
  /**
   * Notifications - one tenant has many notifications
   * Story 20.2: Build Notifications Center
   */
  notifications: many(notifications),
  /**
   * Production Projects - one tenant has many production projects
   * Story 18.1: Create Production Projects
   */
  productionProjects: many(productionProjects),
  /**
   * Onboarding progress - one-to-one relationship
   * Story 20.1: Build Onboarding Wizard
   */
  onboardingProgress: one(onboardingProgress, {
    fields: [tenants.id],
    references: [onboardingProgress.tenant_id],
  }),
}));

/**
 * User relations
 * Each user belongs to one tenant
 * Each user may be linked to one author (for portal users)
 * Each user may have created many sales records
 * Each user may have created or reviewed many returns
 * Each user may have generated many statements
 * Each user may have many audit log entries
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenant_id],
    references: [tenants.id],
  }),
  createdSales: many(sales),
  createdReturns: many(returns, { relationName: "createdByUser" }),
  reviewedReturns: many(returns, { relationName: "reviewedByUser" }),
  generatedStatements: many(statements),
  auditLogs: many(auditLogs),
  /**
   * Notifications - each user may have many notifications targeted to them
   * Story 20.2: Build Notifications Center
   */
  notifications: many(notifications),
  /**
   * Notification Preferences - each user can configure their notification preferences
   * Story 20.3: Configure Notification Preferences
   */
  notificationPreferences: many(notificationPreferences),
}));

/**
 * Author relations
 * Each author belongs to one tenant
 * Each author may have one portal user account (via portal_user_id)
 * Each author can have many titles, contracts, and statements
 */
export const authorsRelations = relations(authors, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [authors.tenant_id],
    references: [tenants.id],
  }),
  portalUser: one(users, {
    fields: [authors.portal_user_id],
    references: [users.id],
  }),
  titles: many(titles),
  contracts: many(contracts),
  statements: many(statements),
}));

/**
 * Title relations
 * Each title belongs to one tenant and one author
 * Story 2.4: Multi-format title support with author-title relationship
 * Story 2.6: Added assignedIsbns relation for ISBN pool tracking
 * Story 3.1: Added sales relation for sales transaction ledger
 * Story 3.4: Added returns relation for returns tracking
 * Story 4.1: Added contracts relation for royalty contracts
 * Story 7.3: Added contact relation for unified contact system
 * Story 10.1: Added titleAuthors relation for multiple authors per title
 */
export const titlesRelations = relations(titles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [titles.tenant_id],
    references: [tenants.id],
  }),
  /** @deprecated Use contact relation instead */
  author: one(authors, {
    fields: [titles.author_id],
    references: [authors.id],
  }),
  /** @deprecated Use titleAuthors relation for multi-author support (Story 10.1) */
  contact: one(contacts, {
    fields: [titles.contact_id],
    references: [contacts.id],
  }),
  /**
   * Title authors - supports multiple authors per title with ownership percentages
   * Story 10.1: Add Multiple Authors Per Title with Ownership Percentages
   */
  titleAuthors: many(titleAuthors),
  assignedIsbns: many(isbns),
  sales: many(sales),
  returns: many(returns),
  contracts: many(contracts),
  /**
   * Production Projects - titles in production
   * Story 18.1: Create Production Projects
   */
  productionProjects: many(productionProjects),
  /**
   * Marketing Assets - promotional materials for titles
   * Story 21.2: Access Marketing Asset Library
   */
  marketingAssets: many(marketingAssets),
  /**
   * Manuscript Submissions - manuscripts submitted for this title
   * Story 21.3: Upload Manuscript Files
   */
  manuscriptSubmissions: many(manuscriptSubmissions),
}));

/**
 * ISBN relations
 * Each ISBN belongs to one tenant
 * Each ISBN may be assigned to one title (optional)
 * Each ISBN may have been assigned by one user (optional)
 * Each ISBN may belong to one prefix (optional, null for legacy imports)
 * Story 2.6: ISBN pool management relations
 * Story 7.4: Added prefix relation for publisher ISBN prefix system
 */
export const isbnsRelations = relations(isbns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [isbns.tenant_id],
    references: [tenants.id],
  }),
  assignedTitle: one(titles, {
    fields: [isbns.assigned_to_title_id],
    references: [titles.id],
  }),
  assignedByUser: one(users, {
    fields: [isbns.assigned_by_user_id],
    references: [users.id],
  }),
  prefix: one(isbnPrefixes, {
    fields: [isbns.prefix_id],
    references: [isbnPrefixes.id],
  }),
}));

/**
 * ISBN Prefixes relations
 * Each prefix belongs to one tenant
 * Each prefix was created by one user (optional)
 * Each prefix can have many ISBNs generated from it
 * Story 7.4: Publisher ISBN Prefix System
 */
export const isbnPrefixesRelations = relations(
  isbnPrefixes,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [isbnPrefixes.tenant_id],
      references: [tenants.id],
    }),
    createdByUser: one(users, {
      fields: [isbnPrefixes.created_by_user_id],
      references: [users.id],
    }),
    isbns: many(isbns),
  }),
);

/**
 * Sales relations
 * Each sale belongs to one tenant, one title, and one user (creator)
 * Story 3.1: Sales transaction ledger relations
 *
 * APPEND-ONLY: Sales records are immutable - no update relations needed
 */
export const salesRelations = relations(sales, ({ one }) => ({
  tenant: one(tenants, {
    fields: [sales.tenant_id],
    references: [tenants.id],
  }),
  title: one(titles, {
    fields: [sales.title_id],
    references: [titles.id],
  }),
  createdByUser: one(users, {
    fields: [sales.created_by_user_id],
    references: [users.id],
  }),
}));

/**
 * Returns relations
 * Each return belongs to one tenant, one title, optionally one original sale,
 * and two users (creator and reviewer)
 * Story 3.4: Returns tracking with approval workflow
 *
 * Approval workflow: pending -> approved/rejected by Finance role
 */
export const returnsRelations = relations(returns, ({ one }) => ({
  tenant: one(tenants, {
    fields: [returns.tenant_id],
    references: [tenants.id],
  }),
  title: one(titles, {
    fields: [returns.title_id],
    references: [titles.id],
  }),
  originalSale: one(sales, {
    fields: [returns.original_sale_id],
    references: [sales.id],
  }),
  createdByUser: one(users, {
    fields: [returns.created_by_user_id],
    references: [users.id],
    relationName: "createdByUser",
  }),
  reviewedByUser: one(users, {
    fields: [returns.reviewed_by_user_id],
    references: [users.id],
    relationName: "reviewedByUser",
  }),
}));

/**
 * Contracts relations
 * Each contract belongs to one tenant, one author, and one title
 * Each contract can have many tiers (tiered royalty rates) and statements
 * Story 4.1: Royalty contract management with tiered rates
 * Story 5.1: Added statements relation
 * Story 7.3: Added contact relation for unified contact system
 */
export const contractsRelations = relations(contracts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contracts.tenant_id],
    references: [tenants.id],
  }),
  /** @deprecated Use contact relation instead */
  author: one(authors, {
    fields: [contracts.author_id],
    references: [authors.id],
  }),
  contact: one(contacts, {
    fields: [contracts.contact_id],
    references: [contacts.id],
  }),
  title: one(titles, {
    fields: [contracts.title_id],
    references: [titles.id],
  }),
  tiers: many(contractTiers),
  statements: many(statements),
}));

/**
 * Contract Tiers relations
 * Each tier belongs to one contract
 * Story 4.1: Tiered royalty rate structure
 */
export const contractTiersRelations = relations(contractTiers, ({ one }) => ({
  contract: one(contracts, {
    fields: [contractTiers.contract_id],
    references: [contracts.id],
  }),
}));

/**
 * Statements relations
 * Each statement belongs to one tenant, one author, one contract, and one user (generator)
 * Story 5.1: Royalty statements with PDF storage
 * Story 7.3: Added contact relation for unified contact system
 */
export const statementsRelations = relations(statements, ({ one }) => ({
  tenant: one(tenants, {
    fields: [statements.tenant_id],
    references: [tenants.id],
  }),
  /** @deprecated Use contact relation instead */
  author: one(authors, {
    fields: [statements.author_id],
    references: [authors.id],
  }),
  contact: one(contacts, {
    fields: [statements.contact_id],
    references: [contacts.id],
  }),
  contract: one(contracts, {
    fields: [statements.contract_id],
    references: [contracts.id],
  }),
  generatedByUser: one(users, {
    fields: [statements.generated_by_user_id],
    references: [users.id],
  }),
}));

/**
 * Audit Logs relations
 * Each audit log entry belongs to one tenant and optionally one user (actor)
 * Story 6.5: Compliance audit logging
 *
 * APPEND-ONLY: Audit logs are immutable - no update or delete operations
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [auditLogs.tenant_id],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [auditLogs.user_id],
    references: [users.id],
  }),
}));

/**
 * Contacts relations
 * Each contact belongs to one tenant
 * Each contact may have one portal user account (via portal_user_id)
 * Each contact may have been created by one user
 * Each contact can have multiple roles
 * Story 7.1: Unified contact management with multi-role support
 * Story 7.3: Added titles, contracts, statements relations
 * Story 10.1: Added titleAuthors relation for co-authored titles
 */
export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenant_id],
    references: [tenants.id],
  }),
  portalUser: one(users, {
    fields: [contacts.portal_user_id],
    references: [users.id],
    relationName: "contactPortalUser",
  }),
  createdByUser: one(users, {
    fields: [contacts.created_by],
    references: [users.id],
    relationName: "contactCreatedBy",
  }),
  roles: many(contactRoles),
  /** @deprecated Use titleAuthors for multi-author support (Story 10.1) */
  titles: many(titles),
  /**
   * Title authors - titles where this contact is an author
   * Story 10.1: Add Multiple Authors Per Title with Ownership Percentages
   */
  titleAuthors: many(titleAuthors),
  contracts: many(contracts),
  statements: many(statements),
  /**
   * Production Tasks - tasks assigned to this contact as vendor
   * Story 18.2: Assign Production Tasks to Vendors
   */
  assignedTasks: many(productionTasks),
  /**
   * Manuscript Submissions - manuscripts submitted by this contact (author)
   * Story 21.3: Upload Manuscript Files
   */
  manuscriptSubmissions: many(manuscriptSubmissions),
  /**
   * Author Notification Preferences - milestone notification settings for this author
   * Story 21.4: Production Milestone Notifications
   */
  notificationPreferences: many(authorNotificationPreferences),
}));

/**
 * Contact Roles relations
 * Each contact role belongs to one contact
 * Each role assignment may have been made by one user
 * Story 7.1: Multi-role support for contacts
 *
 * Note: Tenant isolation is inherited via CASCADE from contacts table
 */
export const contactRolesRelations = relations(contactRoles, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactRoles.contact_id],
    references: [contacts.id],
  }),
  assignedByUser: one(users, {
    fields: [contactRoles.assigned_by],
    references: [users.id],
  }),
}));

/**
 * Author Notification Preferences relations
 * Each preference record belongs to one tenant and one contact
 * Story 21.4: Production Milestone Notifications
 */
export const authorNotificationPreferencesRelations = relations(
  authorNotificationPreferences,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [authorNotificationPreferences.tenantId],
      references: [tenants.id],
    }),
    contact: one(contacts, {
      fields: [authorNotificationPreferences.contactId],
      references: [contacts.id],
    }),
  }),
);

/**
 * Invoices relations
 * Each invoice belongs to one tenant and one customer (contact)
 * Each invoice can have many line items and payments
 * Each invoice may have been created by one user
 * Story 8.1: Invoice database schema
 */
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [invoices.tenant_id],
    references: [tenants.id],
  }),
  customer: one(contacts, {
    fields: [invoices.customer_id],
    references: [contacts.id],
  }),
  lineItems: many(invoiceLineItems),
  payments: many(payments),
  createdByUser: one(users, {
    fields: [invoices.created_by],
    references: [users.id],
  }),
}));

/**
 * Invoice Line Items relations
 * Each line item belongs to one invoice
 * Each line item may be associated with one title (optional)
 * Story 8.1: Invoice database schema
 *
 * Note: Tenant isolation is inherited via CASCADE from invoices table
 */
export const invoiceLineItemsRelations = relations(
  invoiceLineItems,
  ({ one }) => ({
    invoice: one(invoices, {
      fields: [invoiceLineItems.invoice_id],
      references: [invoices.id],
    }),
    title: one(titles, {
      fields: [invoiceLineItems.title_id],
      references: [titles.id],
    }),
  }),
);

/**
 * Payments relations
 * Each payment belongs to one tenant and one invoice
 * Each payment may have been created by one user
 * Story 8.1: Invoice database schema
 *
 * APPEND-ONLY: Payments are immutable - no update or delete operations
 */
export const paymentsRelations = relations(payments, ({ one }) => ({
  tenant: one(tenants, {
    fields: [payments.tenant_id],
    references: [tenants.id],
  }),
  invoice: one(invoices, {
    fields: [payments.invoice_id],
    references: [invoices.id],
  }),
  createdByUser: one(users, {
    fields: [payments.created_by],
    references: [users.id],
  }),
}));

/**
 * Title Authors relations
 * Each title-author entry belongs to one title and one contact
 * Each entry may have been created by one user (for audit trail)
 * Story 10.1: Add Multiple Authors Per Title with Ownership Percentages
 *
 * Business Rules:
 * - Junction table for many-to-many relationship between titles and contacts
 * - Tenant isolation inherited via FK to titles (which has RLS)
 * - Each entry tracks ownership_percentage for royalty splitting
 * - is_primary flag designates primary author for display purposes
 */
export const titleAuthorsRelations = relations(titleAuthors, ({ one }) => ({
  title: one(titles, {
    fields: [titleAuthors.title_id],
    references: [titles.id],
  }),
  contact: one(contacts, {
    fields: [titleAuthors.contact_id],
    references: [contacts.id],
  }),
  createdByUser: one(users, {
    fields: [titleAuthors.created_by],
    references: [users.id],
  }),
}));

/**
 * API Keys relations
 * Each API key belongs to one tenant
 * Story 15.1: OAuth2 API Authentication with API keys
 */
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  tenant: one(tenants, {
    fields: [apiKeys.tenantId],
    references: [tenants.id],
  }),
}));

/**
 * Rate Limit Overrides relations
 * Each rate limit override belongs to one tenant
 * Story 15.3: Configurable Per-Tenant Rate Limits
 */
export const rateLimitOverridesRelations = relations(
  rateLimitOverrides,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [rateLimitOverrides.tenantId],
      references: [tenants.id],
    }),
  }),
);

/**
 * Webhook Subscriptions relations
 * Each webhook subscription belongs to one tenant
 * Each subscription can have many deliveries
 * Story 15.4: Webhook subscription management
 * Story 15.5: Added deliveries relation
 */
export const webhookSubscriptionsRelations = relations(
  webhookSubscriptions,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [webhookSubscriptions.tenantId],
      references: [tenants.id],
    }),
    deliveries: many(webhookDeliveries),
  }),
);

/**
 * Webhook Deliveries relations
 * Each delivery belongs to one subscription
 * Story 15.5: Webhook delivery audit trail
 *
 * APPEND-ONLY: Delivery records are immutable for audit trail integrity.
 */
export const webhookDeliveriesRelations = relations(
  webhookDeliveries,
  ({ one }) => ({
    subscription: one(webhookSubscriptions, {
      fields: [webhookDeliveries.subscriptionId],
      references: [webhookSubscriptions.id],
    }),
  }),
);

/**
 * CSV Exports relations
 * Each export belongs to one tenant and optionally one user (requester)
 * Story 19.3: Export Catalog to CSV
 *
 * Tracks async export jobs with S3 presigned URLs for download.
 */
export const csvExportsRelations = relations(csvExports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [csvExports.tenant_id],
    references: [tenants.id],
  }),
  requestedByUser: one(users, {
    fields: [csvExports.requested_by],
    references: [users.id],
  }),
}));

/**
 * CSV Imports relations
 * Each import belongs to one tenant and optionally one user (importer)
 * Story 19.1: Import Catalog via CSV
 *
 * Tracks import history with validation results.
 */
export const csvImportsRelations = relations(csvImports, ({ one }) => ({
  tenant: one(tenants, {
    fields: [csvImports.tenant_id],
    references: [tenants.id],
  }),
  importedByUser: one(users, {
    fields: [csvImports.imported_by],
    references: [users.id],
  }),
}));

/**
 * Onboarding Progress relations
 * Each onboarding progress record belongs to one tenant
 * Story 20.1: Build Onboarding Wizard
 *
 * Tracks wizard state including current step, completed steps, and status.
 * One-to-one relationship with tenant (each tenant has exactly one progress record).
 */
export const onboardingProgressRelations = relations(
  onboardingProgress,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [onboardingProgress.tenant_id],
      references: [tenants.id],
    }),
  }),
);

/**
 * Notifications relations
 * Each notification belongs to one tenant and optionally one user (target)
 * Story 20.2: Build Notifications Center
 *
 * Supports both tenant-wide notifications (userId = null) and user-specific notifications.
 * Read tracking via readAt timestamp.
 */
export const notificationsRelations = relations(notifications, ({ one }) => ({
  tenant: one(tenants, {
    fields: [notifications.tenantId],
    references: [tenants.id],
  }),
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

/**
 * Notification Preferences relations
 * Each preference belongs to one tenant and one user
 * Story 20.3: Configure Notification Preferences
 *
 * Stores per-user preferences for each notification type.
 * Controls both in-app and email notification delivery.
 */
export const notificationPreferencesRelations = relations(
  notificationPreferences,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [notificationPreferences.tenantId],
      references: [tenants.id],
    }),
    user: one(users, {
      fields: [notificationPreferences.userId],
      references: [users.id],
    }),
  }),
);

/**
 * Production Projects relations
 * Each production project belongs to one tenant and one title
 * Each project may have been created/updated by users
 * Each project can have many tasks
 * Story 18.1: Create Production Projects
 * Story 18.2: Added tasks relation
 *
 * Soft delete pattern: Query with isNull(deletedAt) filter
 */
export const productionProjectsRelations = relations(
  productionProjects,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [productionProjects.tenantId],
      references: [tenants.id],
    }),
    title: one(titles, {
      fields: [productionProjects.titleId],
      references: [titles.id],
    }),
    createdByUser: one(users, {
      fields: [productionProjects.createdBy],
      references: [users.id],
      relationName: "productionProjectCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [productionProjects.updatedBy],
      references: [users.id],
      relationName: "productionProjectUpdatedBy",
    }),
    /**
     * Production Tasks - tasks within this project
     * Story 18.2: Assign Production Tasks to Vendors
     */
    tasks: many(productionTasks),
    /**
     * Proof Files - proof versions for this project
     * Story 18.4: Upload and Manage Proof Files
     */
    proofFiles: many(proofFiles),
  }),
);

/**
 * Production Tasks relations
 * Each task belongs to one tenant, one project, and optionally one vendor contact
 * Each task may have been created/updated by users
 * Story 18.2: Assign Production Tasks to Vendors
 *
 * Soft delete pattern: Query with isNull(deletedAt) filter
 */
export const productionTasksRelations = relations(
  productionTasks,
  ({ one }) => ({
    tenant: one(tenants, {
      fields: [productionTasks.tenantId],
      references: [tenants.id],
    }),
    project: one(productionProjects, {
      fields: [productionTasks.projectId],
      references: [productionProjects.id],
    }),
    vendor: one(contacts, {
      fields: [productionTasks.vendorId],
      references: [contacts.id],
    }),
    createdByUser: one(users, {
      fields: [productionTasks.createdBy],
      references: [users.id],
      relationName: "productionTaskCreatedBy",
    }),
    updatedByUser: one(users, {
      fields: [productionTasks.updatedBy],
      references: [users.id],
      relationName: "productionTaskUpdatedBy",
    }),
  }),
);

/**
 * Proof Files relations
 * Each proof file belongs to one tenant, one project, and one user (uploader)
 * Story 18.4: Upload and Manage Proof Files
 *
 * Soft delete pattern: Query with isNull(deletedAt) filter
 * S3 files are NOT deleted for compliance (retained in storage)
 */
export const proofFilesRelations = relations(proofFiles, ({ one }) => ({
  tenant: one(tenants, {
    fields: [proofFiles.tenantId],
    references: [tenants.id],
  }),
  project: one(productionProjects, {
    fields: [proofFiles.projectId],
    references: [productionProjects.id],
  }),
  uploadedByUser: one(users, {
    fields: [proofFiles.uploadedBy],
    references: [users.id],
    relationName: "proofFileUploadedBy",
  }),
  deletedByUser: one(users, {
    fields: [proofFiles.deletedBy],
    references: [users.id],
    relationName: "proofFileDeletedBy",
  }),
}));

/**
 * Marketing Assets relations
 * Each asset belongs to one title
 * Each asset may have been uploaded/deleted by users
 * Story 21.2: Access Marketing Asset Library
 *
 * Soft delete pattern: Query with isNull(deleted_at) filter
 * S3 files are NOT deleted for compliance (retained in storage)
 */
export const marketingAssetsRelations = relations(
  marketingAssets,
  ({ one }) => ({
    title: one(titles, {
      fields: [marketingAssets.title_id],
      references: [titles.id],
    }),
    uploadedByUser: one(users, {
      fields: [marketingAssets.uploaded_by],
      references: [users.id],
      relationName: "marketingAssetUploadedBy",
    }),
    deletedByUser: one(users, {
      fields: [marketingAssets.deleted_by],
      references: [users.id],
      relationName: "marketingAssetDeletedBy",
    }),
  }),
);

/**
 * Manuscript Submissions relations
 * Each submission belongs to one contact (author) and optionally one title
 * Each submission may have been reviewed by one user
 * Each submission may be linked to one production project
 * Story 21.3: Upload Manuscript Files
 *
 * Tenant isolation inherited via contact_id → contacts (which has RLS)
 */
export const manuscriptSubmissionsRelations = relations(
  manuscriptSubmissions,
  ({ one }) => ({
    contact: one(contacts, {
      fields: [manuscriptSubmissions.contact_id],
      references: [contacts.id],
    }),
    title: one(titles, {
      fields: [manuscriptSubmissions.title_id],
      references: [titles.id],
    }),
    reviewedByUser: one(users, {
      fields: [manuscriptSubmissions.reviewed_by],
      references: [users.id],
    }),
    productionProject: one(productionProjects, {
      fields: [manuscriptSubmissions.production_project_id],
      references: [productionProjects.id],
    }),
  }),
);
