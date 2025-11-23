import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  subdomain: text("subdomain").notNull().unique(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  fiscal_year_start: date("fiscal_year_start"),
  default_currency: text("default_currency").notNull().default("USD"),
  statement_frequency: text("statement_frequency")
    .notNull()
    .default("quarterly"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});
