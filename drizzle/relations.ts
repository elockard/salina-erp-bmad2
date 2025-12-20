import { relations } from "drizzle-orm/relations";
import { tenants, users, sales, titles, authors, isbns, returns } from "./schema";

export const usersRelations = relations(users, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [users.tenantId],
		references: [tenants.id]
	}),
	sales: many(sales),
	authors: many(authors),
	isbns: many(isbns),
	returns_reviewedByUserId: many(returns, {
		relationName: "returns_reviewedByUserId_users_id"
	}),
	returns_createdByUserId: many(returns, {
		relationName: "returns_createdByUserId_users_id"
	}),
}));

export const tenantsRelations = relations(tenants, ({many}) => ({
	users: many(users),
	sales: many(sales),
	authors: many(authors),
	titles: many(titles),
	isbns: many(isbns),
	returns: many(returns),
}));

export const salesRelations = relations(sales, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [sales.tenantId],
		references: [tenants.id]
	}),
	title: one(titles, {
		fields: [sales.titleId],
		references: [titles.id]
	}),
	user: one(users, {
		fields: [sales.createdByUserId],
		references: [users.id]
	}),
	returns: many(returns),
}));

export const titlesRelations = relations(titles, ({one, many}) => ({
	sales: many(sales),
	tenant: one(tenants, {
		fields: [titles.tenantId],
		references: [tenants.id]
	}),
	author: one(authors, {
		fields: [titles.authorId],
		references: [authors.id]
	}),
	isbns: many(isbns),
	returns: many(returns),
}));

export const authorsRelations = relations(authors, ({one, many}) => ({
	tenant: one(tenants, {
		fields: [authors.tenantId],
		references: [tenants.id]
	}),
	user: one(users, {
		fields: [authors.portalUserId],
		references: [users.id]
	}),
	titles: many(titles),
}));

export const isbnsRelations = relations(isbns, ({one}) => ({
	tenant: one(tenants, {
		fields: [isbns.tenantId],
		references: [tenants.id]
	}),
	title: one(titles, {
		fields: [isbns.assignedToTitleId],
		references: [titles.id]
	}),
	user: one(users, {
		fields: [isbns.assignedByUserId],
		references: [users.id]
	}),
}));

export const returnsRelations = relations(returns, ({one}) => ({
	tenant: one(tenants, {
		fields: [returns.tenantId],
		references: [tenants.id]
	}),
	title: one(titles, {
		fields: [returns.titleId],
		references: [titles.id]
	}),
	sale: one(sales, {
		fields: [returns.originalSaleId],
		references: [sales.id]
	}),
	user_reviewedByUserId: one(users, {
		fields: [returns.reviewedByUserId],
		references: [users.id],
		relationName: "returns_reviewedByUserId_users_id"
	}),
	user_createdByUserId: one(users, {
		fields: [returns.createdByUserId],
		references: [users.id],
		relationName: "returns_createdByUserId_users_id"
	}),
}));