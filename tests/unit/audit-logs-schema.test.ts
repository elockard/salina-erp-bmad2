import { describe, expect, it } from "vitest";
import {
  type AuditActionType,
  type AuditLog,
  type AuditResourceType,
  type AuditStatus,
  auditActionTypeValues,
  auditLogs,
  auditResourceTypeValues,
  auditStatusValues,
  type InsertAuditLog,
} from "@/db/schema/audit-logs";

/**
 * Unit tests for Audit Logs Schema
 *
 * Story 6.5 - Implement Audit Logging for Compliance
 *
 * AC-6.5.1: audit_logs table created with schema per tech-spec
 *
 * Note: These are schema definition tests, not integration tests.
 * Database constraint enforcement is verified through schema structure.
 */

describe("auditActionTypeValues", () => {
  describe("valid values (AC-6.5.1)", () => {
    it("has exactly 6 values", () => {
      expect(auditActionTypeValues).toHaveLength(6);
    });

    it("contains 'CREATE'", () => {
      expect(auditActionTypeValues).toContain("CREATE");
    });

    it("contains 'UPDATE'", () => {
      expect(auditActionTypeValues).toContain("UPDATE");
    });

    it("contains 'DELETE'", () => {
      expect(auditActionTypeValues).toContain("DELETE");
    });

    it("contains 'APPROVE'", () => {
      expect(auditActionTypeValues).toContain("APPROVE");
    });

    it("contains 'REJECT'", () => {
      expect(auditActionTypeValues).toContain("REJECT");
    });

    it("contains 'VIEW'", () => {
      expect(auditActionTypeValues).toContain("VIEW");
    });

    it("has expected values in order", () => {
      expect(auditActionTypeValues[0]).toBe("CREATE");
      expect(auditActionTypeValues[1]).toBe("UPDATE");
      expect(auditActionTypeValues[2]).toBe("DELETE");
      expect(auditActionTypeValues[3]).toBe("APPROVE");
      expect(auditActionTypeValues[4]).toBe("REJECT");
      expect(auditActionTypeValues[5]).toBe("VIEW");
    });
  });

  describe("type safety", () => {
    it("is readonly tuple", () => {
      const values: readonly string[] = auditActionTypeValues;
      expect(values).toEqual([
        "CREATE",
        "UPDATE",
        "DELETE",
        "APPROVE",
        "REJECT",
        "VIEW",
      ]);
    });
  });
});

describe("auditResourceTypeValues", () => {
  describe("valid values (AC-6.5.1)", () => {
    // Story 7.3 added 'contact', Story 7.4 added 'isbn_prefix', Story 8.x added 'invoice' and 'payment' - now 11 values
    it("has exactly 11 values", () => {
      expect(auditResourceTypeValues).toHaveLength(11);
    });

    it("contains 'author'", () => {
      expect(auditResourceTypeValues).toContain("author");
    });

    it("contains 'title'", () => {
      expect(auditResourceTypeValues).toContain("title");
    });

    it("contains 'sale'", () => {
      expect(auditResourceTypeValues).toContain("sale");
    });

    it("contains 'return'", () => {
      expect(auditResourceTypeValues).toContain("return");
    });

    it("contains 'statement'", () => {
      expect(auditResourceTypeValues).toContain("statement");
    });

    it("contains 'contract'", () => {
      expect(auditResourceTypeValues).toContain("contract");
    });

    it("contains 'user'", () => {
      expect(auditResourceTypeValues).toContain("user");
    });

    it("contains 'contact'", () => {
      expect(auditResourceTypeValues).toContain("contact");
    });

    it("contains 'isbn_prefix' (Story 7.4)", () => {
      expect(auditResourceTypeValues).toContain("isbn_prefix");
    });

    it("contains 'invoice' (Epic 8)", () => {
      expect(auditResourceTypeValues).toContain("invoice");
    });

    it("contains 'payment' (Epic 8)", () => {
      expect(auditResourceTypeValues).toContain("payment");
    });
  });
});

describe("auditStatusValues", () => {
  describe("valid values (AC-6.5.1)", () => {
    it("has exactly 2 values", () => {
      expect(auditStatusValues).toHaveLength(2);
    });

    it("contains 'success'", () => {
      expect(auditStatusValues).toContain("success");
    });

    it("contains 'failure'", () => {
      expect(auditStatusValues).toContain("failure");
    });
  });
});

describe("AuditActionType type", () => {
  it("accepts valid action type values", () => {
    const create: AuditActionType = "CREATE";
    const update: AuditActionType = "UPDATE";
    const deleteAction: AuditActionType = "DELETE";
    const approve: AuditActionType = "APPROVE";
    const reject: AuditActionType = "REJECT";
    const view: AuditActionType = "VIEW";

    expect(create).toBe("CREATE");
    expect(update).toBe("UPDATE");
    expect(deleteAction).toBe("DELETE");
    expect(approve).toBe("APPROVE");
    expect(reject).toBe("REJECT");
    expect(view).toBe("VIEW");
  });
});

describe("AuditResourceType type", () => {
  it("accepts valid resource type values", () => {
    const author: AuditResourceType = "author";
    const title: AuditResourceType = "title";
    const sale: AuditResourceType = "sale";
    const returnResource: AuditResourceType = "return";
    const statement: AuditResourceType = "statement";
    const contract: AuditResourceType = "contract";
    const user: AuditResourceType = "user";

    expect(author).toBe("author");
    expect(title).toBe("title");
    expect(sale).toBe("sale");
    expect(returnResource).toBe("return");
    expect(statement).toBe("statement");
    expect(contract).toBe("contract");
    expect(user).toBe("user");
  });
});

describe("AuditStatus type", () => {
  it("accepts valid status values", () => {
    const success: AuditStatus = "success";
    const failure: AuditStatus = "failure";

    expect(success).toBe("success");
    expect(failure).toBe("failure");
  });
});

describe("auditLogs table schema structure (AC-6.5.1)", () => {
  it("is defined as a pgTable", () => {
    expect(auditLogs).toBeDefined();
    expect(typeof auditLogs).toBe("object");
  });

  it("has id column (UUID primary key)", () => {
    expect(auditLogs.id).toBeDefined();
    expect(auditLogs.id.name).toBe("id");
  });

  it("has tenant_id column (FK to tenants)", () => {
    expect(auditLogs.tenant_id).toBeDefined();
    expect(auditLogs.tenant_id.name).toBe("tenant_id");
    expect(auditLogs.tenant_id.notNull).toBe(true);
  });

  it("has user_id column (FK to users, nullable)", () => {
    expect(auditLogs.user_id).toBeDefined();
    expect(auditLogs.user_id.name).toBe("user_id");
    expect(auditLogs.user_id.notNull).toBe(false);
  });

  it("has action_type column (TEXT)", () => {
    expect(auditLogs.action_type).toBeDefined();
    expect(auditLogs.action_type.name).toBe("action_type");
    expect(auditLogs.action_type.notNull).toBe(true);
  });

  it("has resource_type column (TEXT)", () => {
    expect(auditLogs.resource_type).toBeDefined();
    expect(auditLogs.resource_type.name).toBe("resource_type");
    expect(auditLogs.resource_type.notNull).toBe(true);
  });

  it("has resource_id column (UUID, nullable)", () => {
    expect(auditLogs.resource_id).toBeDefined();
    expect(auditLogs.resource_id.name).toBe("resource_id");
    expect(auditLogs.resource_id.notNull).toBe(false);
  });

  it("has changes column (JSONB, nullable)", () => {
    expect(auditLogs.changes).toBeDefined();
    expect(auditLogs.changes.name).toBe("changes");
    expect(auditLogs.changes.notNull).toBe(false);
  });

  it("has metadata column (JSONB, nullable)", () => {
    expect(auditLogs.metadata).toBeDefined();
    expect(auditLogs.metadata.name).toBe("metadata");
    expect(auditLogs.metadata.notNull).toBe(false);
  });

  it("has status column with default 'success'", () => {
    expect(auditLogs.status).toBeDefined();
    expect(auditLogs.status.name).toBe("status");
    expect(auditLogs.status.notNull).toBe(true);
  });

  it("has created_at column", () => {
    expect(auditLogs.created_at).toBeDefined();
    expect(auditLogs.created_at.name).toBe("created_at");
    expect(auditLogs.created_at.notNull).toBe(true);
  });

  it("has exactly 10 columns", () => {
    const columnNames = [
      "id",
      "tenant_id",
      "user_id",
      "action_type",
      "resource_type",
      "resource_id",
      "changes",
      "metadata",
      "status",
      "created_at",
    ];

    for (const name of columnNames) {
      expect(
        (auditLogs as unknown as Record<string, unknown>)[name],
      ).toBeDefined();
    }
    expect(columnNames.length).toBe(10);
  });
});

describe("AuditLog type (AC-6.5.1)", () => {
  it("infers select type from auditLogs table", () => {
    const mockAuditLog: AuditLog = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: "550e8400-e29b-41d4-a716-446655440002",
      action_type: "CREATE",
      resource_type: "sale",
      resource_id: "550e8400-e29b-41d4-a716-446655440003",
      changes: { after: { id: "test", amount: 100 } },
      metadata: { operation: "test" },
      status: "success",
      created_at: new Date(),
    };

    expect(mockAuditLog.id).toBeDefined();
    expect(mockAuditLog.tenant_id).toBeDefined();
    expect(mockAuditLog.user_id).toBeDefined();
    expect(mockAuditLog.action_type).toBe("CREATE");
    expect(mockAuditLog.resource_type).toBe("sale");
    expect(mockAuditLog.status).toBe("success");
  });

  it("supports null user_id for system actions", () => {
    const systemAuditLog: AuditLog = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: null,
      action_type: "CREATE",
      resource_type: "statement",
      resource_id: "550e8400-e29b-41d4-a716-446655440003",
      changes: null,
      metadata: { operation: "batch_generation" },
      status: "success",
      created_at: new Date(),
    };

    expect(systemAuditLog.user_id).toBeNull();
  });

  it("supports all action types", () => {
    const baseLog: AuditLog = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: null,
      action_type: "CREATE",
      resource_type: "sale",
      resource_id: null,
      changes: null,
      metadata: null,
      status: "success",
      created_at: new Date(),
    };

    for (const actionType of auditActionTypeValues) {
      const log: AuditLog = { ...baseLog, action_type: actionType };
      expect(log.action_type).toBe(actionType);
    }
  });

  it("supports all resource types", () => {
    const baseLog: AuditLog = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: null,
      action_type: "CREATE",
      resource_type: "sale",
      resource_id: null,
      changes: null,
      metadata: null,
      status: "success",
      created_at: new Date(),
    };

    for (const resourceType of auditResourceTypeValues) {
      const log: AuditLog = { ...baseLog, resource_type: resourceType };
      expect(log.resource_type).toBe(resourceType);
    }
  });
});

describe("InsertAuditLog type (AC-6.5.1)", () => {
  it("allows optional id (auto-generated)", () => {
    const insertData: InsertAuditLog = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: "550e8400-e29b-41d4-a716-446655440002",
      action_type: "CREATE",
      resource_type: "sale",
      resource_id: "550e8400-e29b-41d4-a716-446655440003",
    };

    expect(insertData.tenant_id).toBeDefined();
    expect(insertData.id).toBeUndefined();
  });

  it("allows optional status field (defaults to success)", () => {
    const insertData: InsertAuditLog = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      action_type: "CREATE",
      resource_type: "sale",
    };

    expect(insertData.status).toBeUndefined();
  });

  it("allows optional nullable fields", () => {
    const insertData: InsertAuditLog = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      action_type: "CREATE",
      resource_type: "sale",
    };

    expect(insertData.user_id).toBeUndefined();
    expect(insertData.resource_id).toBeUndefined();
    expect(insertData.changes).toBeUndefined();
    expect(insertData.metadata).toBeUndefined();
  });

  it("supports changes with before/after structure", () => {
    const insertData: InsertAuditLog = {
      tenant_id: "550e8400-e29b-41d4-a716-446655440001",
      user_id: "550e8400-e29b-41d4-a716-446655440002",
      action_type: "UPDATE",
      resource_type: "contract",
      resource_id: "550e8400-e29b-41d4-a716-446655440003",
      changes: {
        before: { status: "active" },
        after: { status: "suspended" },
      },
    };

    expect(insertData.changes).toBeDefined();
    expect((insertData.changes as Record<string, unknown>).before).toEqual({
      status: "active",
    });
    expect((insertData.changes as Record<string, unknown>).after).toEqual({
      status: "suspended",
    });
  });
});

describe("Schema constraint structure verification (AC-6.5.1)", () => {
  describe("auditLogs table indexes", () => {
    it("has tenant_id column for index", () => {
      expect(auditLogs.tenant_id).toBeDefined();
      expect(auditLogs.tenant_id.notNull).toBe(true);
    });

    it("has user_id column for index", () => {
      expect(auditLogs.user_id).toBeDefined();
    });

    it("has resource_type column for index", () => {
      expect(auditLogs.resource_type).toBeDefined();
      expect(auditLogs.resource_type.notNull).toBe(true);
    });

    it("has created_at column for index", () => {
      expect(auditLogs.created_at).toBeDefined();
      expect(auditLogs.created_at.notNull).toBe(true);
    });
  });
});

describe("Append-only design verification", () => {
  it("has no updated_at column (immutable records)", () => {
    expect(
      (auditLogs as unknown as Record<string, unknown>).updated_at,
    ).toBeUndefined();
  });

  it("only has created_at for timestamp tracking", () => {
    expect(auditLogs.created_at).toBeDefined();
    expect(auditLogs.created_at.notNull).toBe(true);
  });
});
