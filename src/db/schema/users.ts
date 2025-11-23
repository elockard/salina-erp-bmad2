import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenant_id: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    clerk_user_id: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    role: text("role", {
      enum: ["owner", "admin", "editor", "finance", "author"],
    }).notNull(),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("users_tenant_id_idx").on(table.tenant_id),
    index("users_email_idx").on(table.email),
  ],
);
