import { PermissionGate } from "@/components/PermissionGate";
import { MANAGE_USERS } from "@/lib/permissions";
import { InviteUserDialog } from "@/modules/users/components/invite-user-dialog";
import { UserList } from "@/modules/users/components/user-list";

export default async function UsersPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">
            Manage team members and their roles
          </p>
        </div>
        <PermissionGate allowedRoles={MANAGE_USERS}>
          <InviteUserDialog />
        </PermissionGate>
      </div>
      <UserList />
    </div>
  );
}
