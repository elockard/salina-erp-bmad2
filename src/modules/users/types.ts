import type { users } from "@/db/schema/users";

export type User = typeof users.$inferSelect;
export type UserRole = "owner" | "admin" | "editor" | "finance" | "author";
