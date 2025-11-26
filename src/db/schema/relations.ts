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
 */

import { relations } from "drizzle-orm";
import { authors } from "./authors";
import { isbns } from "./isbns";
import { returns } from "./returns";
import { sales } from "./sales";
import { tenants } from "./tenants";
import { titles } from "./titles";
import { users } from "./users";

/**
 * Tenant relations
 * One tenant has many users, authors, titles, isbns, sales, and returns
 */
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  authors: many(authors),
  titles: many(titles),
  isbns: many(isbns),
  sales: many(sales),
  returns: many(returns),
}));

/**
 * User relations
 * Each user belongs to one tenant
 * Each user may be linked to one author (for portal users)
 * Each user may have created many sales records
 * Each user may have created or reviewed many returns
 */
export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [users.tenant_id],
    references: [tenants.id],
  }),
  createdSales: many(sales),
  createdReturns: many(returns, { relationName: "createdByUser" }),
  reviewedReturns: many(returns, { relationName: "reviewedByUser" }),
}));

/**
 * Author relations
 * Each author belongs to one tenant
 * Each author may have one portal user account (via portal_user_id)
 * Each author can have many titles
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
}));

/**
 * Title relations
 * Each title belongs to one tenant and one author
 * Story 2.4: Multi-format title support with author-title relationship
 * Story 2.6: Added assignedIsbns relation for ISBN pool tracking
 * Story 3.1: Added sales relation for sales transaction ledger
 * Story 3.4: Added returns relation for returns tracking
 */
export const titlesRelations = relations(titles, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [titles.tenant_id],
    references: [tenants.id],
  }),
  author: one(authors, {
    fields: [titles.author_id],
    references: [authors.id],
  }),
  assignedIsbns: many(isbns),
  sales: many(sales),
  returns: many(returns),
}));

/**
 * ISBN relations
 * Each ISBN belongs to one tenant
 * Each ISBN may be assigned to one title (optional)
 * Each ISBN may have been assigned by one user (optional)
 * Story 2.6: ISBN pool management relations
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
}));

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
