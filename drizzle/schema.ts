import { pgTable, unique, uuid, text, date, timestamp, index, foreignKey, boolean, check, integer, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const tenants = pgTable("tenants", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	subdomain: text().notNull(),
	name: text().notNull(),
	timezone: text().default('America/New_York').notNull(),
	fiscalYearStart: date("fiscal_year_start"),
	defaultCurrency: text("default_currency").default('USD').notNull(),
	statementFrequency: text("statement_frequency").default('quarterly').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("tenants_subdomain_unique").on(table.subdomain),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	clerkUserId: text("clerk_user_id"),
	email: text().notNull(),
	role: text().notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("users_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("users_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "users_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	unique("users_clerk_user_id_unique").on(table.clerkUserId),
]);

export const sales = pgTable("sales", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	titleId: uuid("title_id").notNull(),
	format: text().notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	saleDate: date("sale_date").notNull(),
	channel: text().notNull(),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sales_channel_idx").using("btree", table.channel.asc().nullsLast().op("text_ops")),
	index("sales_format_idx").using("btree", table.format.asc().nullsLast().op("text_ops")),
	index("sales_sale_date_idx").using("btree", table.saleDate.asc().nullsLast().op("date_ops")),
	index("sales_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("sales_tenant_sale_date_idx").using("btree", table.tenantId.asc().nullsLast().op("date_ops"), table.saleDate.asc().nullsLast().op("uuid_ops")),
	index("sales_title_id_idx").using("btree", table.titleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "sales_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.titleId],
			foreignColumns: [titles.id],
			name: "sales_title_id_titles_id_fk"
		}),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "sales_created_by_user_id_users_id_fk"
		}),
	check("sales_quantity_positive", sql`quantity > 0`),
	check("sales_unit_price_positive", sql`unit_price > (0)::numeric`),
	check("sales_total_amount_positive", sql`total_amount > (0)::numeric`),
]);

export const authors = pgTable("authors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	address: text(),
	taxId: text("tax_id"),
	paymentMethod: text("payment_method"),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	portalUserId: uuid("portal_user_id"),
}, (table) => [
	index("authors_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("authors_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("authors_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("authors_tenant_id_is_active_idx").using("btree", table.tenantId.asc().nullsLast().op("bool_ops"), table.isActive.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "authors_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.portalUserId],
			foreignColumns: [users.id],
			name: "authors_portal_user_id_users_id_fk"
		}),
	unique("authors_portal_user_id_unique").on(table.portalUserId),
]);

export const titles = pgTable("titles", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	authorId: uuid("author_id").notNull(),
	title: text().notNull(),
	subtitle: text(),
	genre: text(),
	wordCount: integer("word_count"),
	publicationStatus: text("publication_status").default('draft').notNull(),
	isbn: text(),
	eisbn: text(),
	publicationDate: date("publication_date"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("titles_author_id_idx").using("btree", table.authorId.asc().nullsLast().op("uuid_ops")),
	index("titles_publication_status_idx").using("btree", table.publicationStatus.asc().nullsLast().op("text_ops")),
	index("titles_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "titles_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.authorId],
			foreignColumns: [authors.id],
			name: "titles_author_id_authors_id_fk"
		}),
	unique("titles_isbn_unique").on(table.isbn),
	unique("titles_eisbn_unique").on(table.eisbn),
]);

export const isbns = pgTable("isbns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	isbn13: text("isbn_13").notNull(),
	type: text().notNull(),
	status: text().default('available').notNull(),
	assignedToTitleId: uuid("assigned_to_title_id"),
	assignedAt: timestamp("assigned_at", { withTimezone: true, mode: 'string' }),
	assignedByUserId: uuid("assigned_by_user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("isbns_assigned_to_title_id_idx").using("btree", table.assignedToTitleId.asc().nullsLast().op("uuid_ops")),
	index("isbns_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("isbns_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("isbns_type_idx").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "isbns_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.assignedToTitleId],
			foreignColumns: [titles.id],
			name: "isbns_assigned_to_title_id_titles_id_fk"
		}),
	foreignKey({
			columns: [table.assignedByUserId],
			foreignColumns: [users.id],
			name: "isbns_assigned_by_user_id_users_id_fk"
		}),
	unique("isbns_isbn_13_unique").on(table.isbn13),
]);

export const returns = pgTable("returns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	tenantId: uuid("tenant_id").notNull(),
	titleId: uuid("title_id").notNull(),
	originalSaleId: uuid("original_sale_id"),
	format: text().notNull(),
	quantity: integer().notNull(),
	unitPrice: numeric("unit_price", { precision: 10, scale:  2 }).notNull(),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }).notNull(),
	returnDate: date("return_date").notNull(),
	reason: text(),
	status: text().default('pending').notNull(),
	reviewedByUserId: uuid("reviewed_by_user_id"),
	reviewedAt: timestamp("reviewed_at", { withTimezone: true, mode: 'string' }),
	createdByUserId: uuid("created_by_user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	internalNote: text("internal_note"),
}, (table) => [
	index("returns_return_date_idx").using("btree", table.returnDate.asc().nullsLast().op("date_ops")),
	index("returns_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("returns_tenant_id_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops")),
	index("returns_tenant_return_date_idx").using("btree", table.tenantId.asc().nullsLast().op("uuid_ops"), table.returnDate.asc().nullsLast().op("uuid_ops")),
	index("returns_tenant_status_idx").using("btree", table.tenantId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("uuid_ops")),
	index("returns_title_id_idx").using("btree", table.titleId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.tenantId],
			foreignColumns: [tenants.id],
			name: "returns_tenant_id_tenants_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.titleId],
			foreignColumns: [titles.id],
			name: "returns_title_id_titles_id_fk"
		}).onDelete("restrict"),
	foreignKey({
			columns: [table.originalSaleId],
			foreignColumns: [sales.id],
			name: "returns_original_sale_id_sales_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.reviewedByUserId],
			foreignColumns: [users.id],
			name: "returns_reviewed_by_user_id_users_id_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.createdByUserId],
			foreignColumns: [users.id],
			name: "returns_created_by_user_id_users_id_fk"
		}).onDelete("restrict"),
	check("returns_quantity_positive", sql`quantity > 0`),
	check("returns_unit_price_positive", sql`unit_price > (0)::numeric`),
	check("returns_total_amount_positive", sql`total_amount > (0)::numeric`),
]);
