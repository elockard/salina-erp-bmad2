import type { UserRole } from "@/modules/users/types";

export interface DashboardStats {
  role: UserRole;
  stats: Record<string, number | string>;
}
