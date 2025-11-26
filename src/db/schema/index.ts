export * from "./authors";
export * from "./isbns";
export * from "./relations";
export * from "./returns";
export * from "./sales";
export * from "./tenants";
export * from "./titles";
export * from "./users";

import type { authors } from "./authors";
import type { isbns } from "./isbns";
import type { returns } from "./returns";
import type { sales } from "./sales";
import type { tenants } from "./tenants";
import type { titles } from "./titles";
import type { users } from "./users";

export type Tenant = typeof tenants.$inferSelect;
export type User = typeof users.$inferSelect;
export type Author = typeof authors.$inferSelect;
export type Title = typeof titles.$inferSelect;
export type ISBN = typeof isbns.$inferSelect;
export type Sale = typeof sales.$inferSelect;
export type Return = typeof returns.$inferSelect;
export type UserRole = "owner" | "admin" | "editor" | "finance" | "author";
