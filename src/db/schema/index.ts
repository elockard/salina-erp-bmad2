export * from "./tenants";
export * from "./users";

import type { tenants } from "./tenants";
import type { users } from "./users";

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type UserRole = "owner" | "admin" | "editor" | "finance" | "author";
