import { PermissionGate } from "@/components/PermissionGate";
import { MANAGE_USERS } from "@/lib/permissions";
import { InviteUserDialog } from "@/modules/users/components/invite-user-dialog";
import { UserList } from "@/modules/users/components/user-list";

export default async function UsersPage() {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Manage team members and their roles
        </p>
        <PermissionGate allowedRoles={MANAGE_USERS}>
          <InviteUserDialog />
        </PermissionGate>
      </div>
      <UserList />
    </div>
  );
}
