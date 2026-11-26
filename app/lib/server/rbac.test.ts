import { beforeEach, describe, expect, it, vi } from "vitest";
import { ALL_PERMISSIONS, PERMISSIONS as P, systemRoleDef } from "@/app/lib/constants/permissions";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    adminRole: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/app/lib/config/db", () => ({ default: prismaMock, prisma: prismaMock }));

import {
  canAssignRole,
  canReceiveWorkFrom,
  findRole,
  loadSystemRoleMap,
  resolveRequestedRole,
  resolveUserAccess,
  rolePermissions,
  userRoleView,
  type AccessActor,
  type RoleRow,
} from "./rbac";

const superAdmin: AccessActor = { id: "u-super", isSuperAdmin: true, permissions: ALL_PERMISSIONS };
const admin: AccessActor = {
  id: "u-admin",
  isSuperAdmin: false,
  permissions: [...systemRoleDef("admin")!.permissions],
};

beforeEach(() => {
  prismaMock.adminRole.findUnique.mockReset();
  prismaMock.adminRole.findMany.mockReset();
});

describe("rolePermissions", () => {
  it("should grant every permission to the superadmin key regardless of stored list", () => {
    expect(rolePermissions({ key: "superadmin", permissions: [] })).toEqual([...ALL_PERMISSIONS]);
  });

  it("should sanitize stored permissions for other roles", () => {
    expect(rolePermissions({ key: "custom", permissions: [P.ROLES_MANAGE, P.LEADS_VIEW, "junk"] })).toEqual([P.LEADS_VIEW]);
  });

  it("should return no permissions when the stored JSON is malformed", () => {
    expect(rolePermissions({ key: "custom", permissions: "not-an-array" })).toEqual([]);
  });
});

describe("canAssignRole", () => {
  it("should never allow handing out the Super Admin role, even by the Super Admin", () => {
    expect(canAssignRole(superAdmin, { key: "superadmin", permissions: [] })).toBe(false);
  });

  it("should allow the Super Admin to assign any other role", () => {
    expect(canAssignRole(superAdmin, { key: "custom", permissions: [P.USERS_MANAGE, P.ROLES_MANAGE] })).toBe(true);
  });

  it("should block a non-super actor from assigning a role that can manage users", () => {
    expect(canAssignRole(admin, { key: "admin", permissions: [P.USERS_MANAGE] })).toBe(false);
  });

  it("should block a non-super actor from assigning a role that can manage roles", () => {
    const actor = { ...admin, permissions: [...admin.permissions, P.ROLES_MANAGE] };
    expect(canAssignRole(actor, { key: "x", permissions: [P.ROLES_MANAGE] })).toBe(false);
  });

  it("should block assigning a role holding a permission the actor lacks (escalation)", () => {
    expect(canAssignRole(admin, { key: "publisher", permissions: [P.PAGES_PUBLISH] })).toBe(false);
  });

  it("should allow assigning a role whose permissions are a subset of the actor's", () => {
    expect(canAssignRole(admin, { key: "editor", permissions: [P.CONTENT_EDIT, P.MEDIA_MANAGE] })).toBe(true);
  });

  it("should allow assigning a role with no permissions", () => {
    expect(canAssignRole(admin, { key: "empty", permissions: [] })).toBe(true);
  });
});

describe("canReceiveWorkFrom", () => {
  it("should allow a candidate holding every permission of the source", () => {
    expect(
      canReceiveWorkFrom({ permissions: [P.CONTENT_EDIT] }, { permissions: [P.CONTENT_EDIT, P.MEDIA_MANAGE], isSuperAdmin: false }),
    ).toBe(true);
  });

  it("should reject a candidate missing any of the source's permissions", () => {
    expect(
      canReceiveWorkFrom({ permissions: [P.CONTENT_EDIT, P.SEO_MANAGE] }, { permissions: [P.CONTENT_EDIT], isSuperAdmin: false }),
    ).toBe(false);
  });

  it("should always allow the Super Admin", () => {
    expect(canReceiveWorkFrom({ permissions: [...ALL_PERMISSIONS] }, { permissions: [], isSuperAdmin: true })).toBe(true);
  });
});

describe("resolveUserAccess", () => {
  it("should use the user's assigned role without querying the database", async () => {
    // Arrange
    const role: RoleRow = { id: "r1", key: "custom", name: "Custom", permissions: [P.LEADS_VIEW] };

    // Act
    const access = await resolveUserAccess({ role: "editor", roleId: "r1", adminRole: role });

    // Assert
    expect(access).toEqual({
      role: "editor",
      roleId: "r1",
      roleKey: "custom",
      roleName: "Custom",
      permissions: [P.LEADS_VIEW],
      isSuperAdmin: false,
    });
    expect(prismaMock.adminRole.findUnique).not.toHaveBeenCalled();
  });

  it("should fall back to the stored system role matching the legacy enum when no role is assigned", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue({ id: "sys-admin", key: "admin", name: "Admin (edited)", permissions: [P.LEADS_VIEW] });

    const access = await resolveUserAccess({ role: "admin", roleId: null });

    expect(prismaMock.adminRole.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { key: "admin" } }));
    expect(access.roleName).toBe("Admin (edited)");
    expect(access.permissions).toEqual([P.LEADS_VIEW]);
    expect(access.roleId).toBeNull();
  });

  it("should use the built-in definition when system roles are not seeded", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue(null);

    const access = await resolveUserAccess({ role: "contributor" });

    expect(access.roleKey).toBe("editor");
    expect(access.permissions).toEqual([...systemRoleDef("editor")!.permissions]);
  });

  it("should use the preloaded system-role map instead of querying", async () => {
    const map = new Map<string, RoleRow>([["superadmin", { id: "s", key: "superadmin", name: "Super Admin", permissions: [] }]]);

    const access = await resolveUserAccess({ role: "superadmin" }, map);

    expect(prismaMock.adminRole.findUnique).not.toHaveBeenCalled();
    expect(access.isSuperAdmin).toBe(true);
    expect(access.permissions).toEqual([...ALL_PERMISSIONS]);
  });

  it("should propagate a database failure", async () => {
    prismaMock.adminRole.findUnique.mockRejectedValue(new Error("db down"));
    await expect(resolveUserAccess({ role: "admin" })).rejects.toThrow("db down");
  });
});

describe("findRole", () => {
  it("should return null when the role does not exist", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue(null);
    await expect(findRole("missing")).resolves.toBeNull();
  });

  it("should return the role with sanitized effective permissions", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue({
      id: "r", key: "c", name: "C", description: null, isSystem: false, permissions: [P.MEDIA_MANAGE, "nope"],
    });
    await expect(findRole("r")).resolves.toMatchObject({ id: "r", permissions: [P.MEDIA_MANAGE] });
  });
});

describe("loadSystemRoleMap", () => {
  it("should key system roles by their key", async () => {
    prismaMock.adminRole.findMany.mockResolvedValue([{ id: "1", key: "admin", name: "Admin", permissions: [] }]);
    const map = await loadSystemRoleMap();
    expect(map.get("admin")?.id).toBe("1");
    expect(prismaMock.adminRole.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isSystem: true } }));
  });
});

describe("resolveRequestedRole", () => {
  it("should resolve a roleId to the stored role with its legacy value", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue({
      id: "r9", key: "custom", name: "Ops", description: "", isSystem: false, permissions: [P.USERS_MANAGE],
    });
    await expect(resolveRequestedRole({ roleId: "r9" })).resolves.toEqual({
      id: "r9", key: "custom", name: "Ops", permissions: [P.USERS_MANAGE], legacy: "admin",
    });
  });

  it("should return null when the roleId does not exist", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue(null);
    await expect(resolveRequestedRole({ roleId: "ghost" })).resolves.toBeNull();
  });

  it("should resolve a legacy role string when roles are unseeded", async () => {
    prismaMock.adminRole.findUnique.mockResolvedValue(null);
    const role = await resolveRequestedRole({ role: "contributor" });
    expect(role).toMatchObject({ id: null, key: "editor", legacy: "editor" });
  });

  it.each([{}, { roleId: "" }, { roleId: 5 }, { role: "owner" }, { role: ["admin"] }, { role: null }])(
    "should return null for an unusable request %j",
    async (input) => {
      await expect(resolveRequestedRole(input)).resolves.toBeNull();
    },
  );
});

describe("userRoleView", () => {
  const editorRole: RoleRow = { id: "e", key: "editor", name: "Editor", permissions: [P.CONTENT_EDIT] };

  it("should not let an actor manage their own account", async () => {
    const view = await userRoleView({ id: superAdmin.id, role: "editor", adminRole: editorRole }, superAdmin);
    expect(view.canManage).toBe(false);
  });

  it("should let the Super Admin manage another editor", async () => {
    const view = await userRoleView({ id: "other", role: "editor", adminRole: editorRole }, superAdmin);
    expect(view).toEqual({ role: "editor", roleId: "e", roleKey: "editor", roleName: "Editor", canManage: true });
  });

  it("should not let an admin manage the Super Admin", async () => {
    const superRole: RoleRow = { id: "s", key: "superadmin", name: "Super Admin", permissions: [] };
    const view = await userRoleView({ id: "boss", role: "superadmin", adminRole: superRole }, admin);
    expect(view.canManage).toBe(false);
  });
});
