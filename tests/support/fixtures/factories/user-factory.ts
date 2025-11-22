/**
 * User Factory
 *
 * Creates test users with role-based permissions
 * Roles: Owner, Admin, Editor, Finance, Author
 */

import { faker } from '@faker-js/faker';
import { TenantFactory, type Tenant } from './tenant-factory';

export type UserRole = 'owner' | 'admin' | 'editor' | 'finance' | 'author';

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: UserRole;
  clerk_user_id: string;
  is_active: boolean;
}

export class UserFactory {
  private createdUsers: string[] = [];

  constructor(private tenantFactory: TenantFactory) {}

  /**
   * Create test user with specified role
   *
   * @param role - User role (owner, admin, editor, finance, author)
   * @param tenant - Tenant object (auto-created if not provided)
   * @param overrides - Override default user properties
   * @returns Created user object
   */
  async createUser(
    role: UserRole,
    tenant?: Tenant,
    overrides: Partial<User> = {}
  ): Promise<User> {
    // Auto-create tenant if not provided
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    const user: Omit<User, 'id' | 'clerk_user_id'> = {
      tenant_id: tenant.id,
      email: overrides.email || faker.internet.email(),
      role,
      is_active: overrides.is_active ?? true,
    };

    // API call to create user (Clerk integration handled server-side)
    const response = await fetch(`${process.env.API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      throw new Error(`Failed to create user: ${response.statusText}`);
    }

    const created: User = await response.json();
    this.createdUsers.push(created.id);

    return created;
  }

  /**
   * Create staff user (non-author roles)
   * Convenience method for creating Owner/Admin/Editor/Finance users
   */
  async createStaffUser(
    role: Exclude<UserRole, 'author'>,
    tenant?: Tenant
  ): Promise<User> {
    return this.createUser(role, tenant);
  }

  /**
   * Create author user (external portal access)
   */
  async createAuthorUser(tenant?: Tenant, email?: string): Promise<User> {
    return this.createUser('author', tenant, { email });
  }

  /**
   * Create full staff team for a tenant
   * Useful for testing role-based access control
   */
  async createStaffTeam(tenant?: Tenant): Promise<{
    owner: User;
    admin: User;
    editor: User;
    finance: User;
  }> {
    if (!tenant) {
      tenant = await this.tenantFactory.createTenant();
    }

    return {
      owner: await this.createUser('owner', tenant),
      admin: await this.createUser('admin', tenant),
      editor: await this.createUser('editor', tenant),
      finance: await this.createUser('finance', tenant),
    };
  }

  /**
   * Cleanup: Delete all created users
   */
  async cleanup() {
    for (const userId of this.createdUsers) {
      try {
        await fetch(`${process.env.API_URL}/users/${userId}`, {
          method: 'DELETE',
        });
      } catch (error) {
        console.error(`Failed to cleanup user ${userId}:`, error);
      }
    }
    this.createdUsers = [];
  }
}
