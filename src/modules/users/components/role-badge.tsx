import { Badge } from "@/components/ui/badge";
import type { UserRole } from "../types";

interface RoleBadgeProps {
  role: UserRole;
}

export function RoleBadge({ role }: RoleBadgeProps) {
  const variantMap: Record<UserRole, string> = {
    owner: "bg-purple-100 text-purple-800 border-purple-200",
    admin: "bg-blue-100 text-blue-800 border-blue-200",
    editor: "bg-green-100 text-green-800 border-green-200",
    finance: "bg-orange-100 text-orange-800 border-orange-200",
    author: "bg-gray-100 text-gray-800 border-gray-200",
  };

  return (
    <Badge className={variantMap[role]} variant="outline">
      {role}
    </Badge>
  );
}
