import { describe, expect, it } from "vitest";
import {
  ALL_PERMISSIONS,
  GRANTABLE_PERMISSIONS,
  PERMISSIONS,
  SYSTEM_ROLE_KEYS,
  isPermission,
  legacyRoleFor,
  legacyRoleToSystemKey,
  sanitizeGrantable,
  systemRoleDef,
} from "./permissions";

describe("isPermission", () => {
  it("should accept every catalogued permission key", () => {
    for (const p of ALL_PERMISSIONS) expect(isPermission(p)).toBe(true);
  });

  it.each([undefined, null, 42, NaN, {}, [], "", "users.MANAGE", "users.manage "])(
    "should reject %j when it is not an exact known key",
    (value) => {
      expect(isPermission(value)).toBe(false);
    },
  );
});

describe("sanitizeGrantable", () => {
  it("should keep only known grantable keys in catalog order without duplicates", () => {
    // Arrange
    const input = [PERMISSIONS.LEADS_VIEW, PERMISSIONS.CONTENT_EDIT, PERMISSIONS.LEADS_VIEW, "bogus.perm", 7];

    // Act
    const result = sanitizeGrantable(input);

    // Assert
    expect(result).toEqual([PERMISSIONS.CONTENT_EDIT, PERMISSIONS.LEADS_VIEW]);
  });

  it("should strip roles.manage because only the Super Admin may hold it", () => {
    expect(sanitizeGrantable([PERMISSIONS.ROLES_MANAGE, PERMISSIONS.MEDIA_MANAGE])).toEqual([PERMISSIONS.MEDIA_MANAGE]);
  });

  it.each([null, undefined, "content.edit", { 0: "content.edit" }, 1])(
    "should return an empty list when the stored value %j is not an array",
    (value) => {
      expect(sanitizeGrantable(value)).toEqual([]);
    },
  );

  it("should return an empty list for an empty array", () => {
    expect(sanitizeGrantable([])).toEqual([]);
  });
});

describe("catalog invariants", () => {
  it("should not make roles.manage grantable", () => {
    expect(GRANTABLE_PERMISSIONS).not.toContain(PERMISSIONS.ROLES_MANAGE);
    expect(ALL_PERMISSIONS).toContain(PERMISSIONS.ROLES_MANAGE);
  });

  it("should give the Admin system role neither roles.manage nor pages.publish", () => {
    const admin = systemRoleDef(SYSTEM_ROLE_KEYS.ADMIN)!;
    expect(admin.permissions).not.toContain(PERMISSIONS.ROLES_MANAGE);
    expect(admin.permissions).not.toContain(PERMISSIONS.PAGES_PUBLISH);
    expect(admin.permissions).toContain(PERMISSIONS.USERS_MANAGE);
  });

  it("should give the Super Admin system role every permission", () => {
    expect(systemRoleDef(SYSTEM_ROLE_KEYS.SUPERADMIN)!.permissions).toEqual(ALL_PERMISSIONS);
  });
});

describe("systemRoleDef", () => {
  it("should return undefined when the key is unknown, null or undefined", () => {
    expect(systemRoleDef("custom-role")).toBeUndefined();
    expect(systemRoleDef(null)).toBeUndefined();
    expect(systemRoleDef(undefined)).toBeUndefined();
  });
});

describe("legacyRoleToSystemKey", () => {
  it.each([
    ["superadmin", "superadmin"],
    ["admin", "admin"],
    ["editor", "editor"],
    ["contributor", "editor"],
    ["", "editor"],
    [null, "editor"],
    [undefined, "editor"],
    ["SUPERADMIN", "editor"],
  ])("should map legacy role %j to system key %j", (legacy, expected) => {
    expect(legacyRoleToSystemKey(legacy)).toBe(expected);
  });
});

describe("legacyRoleFor", () => {
  it("should use the system role's legacy value when the key is a system role", () => {
    expect(legacyRoleFor("leads", [])).toBe("editor");
    expect(legacyRoleFor("superadmin", [])).toBe("superadmin");
  });

  it("should map a custom role with users.manage to admin", () => {
    expect(legacyRoleFor("custom", [PERMISSIONS.USERS_MANAGE])).toBe("admin");
  });

  it("should map a custom role without users.manage to editor", () => {
    expect(legacyRoleFor("custom", [PERMISSIONS.CONTENT_EDIT])).toBe("editor");
    expect(legacyRoleFor("custom", [])).toBe("editor");
  });
});
