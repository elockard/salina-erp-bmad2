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
import { auditLogs } from "./audit-logs";
import { authors } from "./authors";
import { contactRoles, contacts } from "./contacts";
import { contracts, contractTiers } from "./contracts";
import { invoiceLineItems, invoices, payments } from "./invoices";
import { isbnPrefixes } from "./isbn-prefixes";
import { isbns } from "./isbns";
import { returns } from "./returns";
import { sales } from "./sales";
import { statements } from "./statements";
import { tenants } from "./tenants";
import { titleAuthors } from "./title-authors";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Tenant relations
 * One tenant has many users, authors, titles, isbns, isbnPrefixes, sales, returns, contracts, statements, audit logs, contacts, invoices, and payments
 * Story 8.1: Added invoices and payments relations
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
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
