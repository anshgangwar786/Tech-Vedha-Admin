import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS as P } from "@/app/lib/constants/permissions";
import type { CurrentUser } from "./getCurrentUser";

const { getCurrentUserMock } = vi.hoisted(() => ({ getCurrentUserMock: vi.fn() }));
vi.mock("./getCurrentUser", () => ({ getCurrentUser: getCurrentUserMock }));

import { hasPermission, requirePermission, requireUser } from "./authorization";

const user: CurrentUser = {
  id: "u1",
  username: "alice",
  role: "editor",
  roleId: null,
  roleKey: "editor",
  roleName: "Editor",
  permissions: [P.CONTENT_EDIT, P.MEDIA_MANAGE],
  isSuperAdmin: false,
};
const req = new NextRequest("https://admin.example.com/api/x");

beforeEach(() => {
  getCurrentUserMock.mockReset();
});

describe("hasPermission", () => {
  it("should be true when the user holds the permission", () => {
    expect(hasPermission(user, P.CONTENT_EDIT)).toBe(true);
  });

  it("should be true when the user holds any of a list", () => {
    expect(hasPermission(user, [P.USERS_MANAGE, P.MEDIA_MANAGE])).toBe(true);
  });

  it("should be false when the user holds none", () => {
    expect(hasPermission(user, [P.USERS_MANAGE, P.ROLES_MANAGE])).toBe(false);
  });

  it("should be false for an empty list", () => {
    expect(hasPermission(user, [])).toBe(false);
  });

  it.each([null, undefined])("should be false when the user is %s", (u) => {
    expect(hasPermission(u, P.CONTENT_EDIT)).toBe(false);
  });
});

describe("requirePermission", () => {
  it("should return the user when they hold the permission", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    await expect(requirePermission(req, P.CONTENT_EDIT)).resolves.toBe(user);
  });

  it("should return 403 when the user lacks the permission", async () => {
    getCurrentUserMock.mockResolvedValue(user);

    const result = await requirePermission(req, P.USERS_MANAGE);

    expect(result).toBeInstanceOf(NextResponse);
    expect((result as NextResponse).status).toBe(403);
    expect(await (result as NextResponse).json()).toMatchObject({ success: false, message: expect.stringMatching(/Access denied/) });
  });

  it("should accept any one of a list by default", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    await expect(requirePermission(req, [P.USERS_MANAGE, P.CONTENT_EDIT])).resolves.toBe(user);
  });

  it("should require every permission with { all: true }", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    const result = await requirePermission(req, [P.USERS_MANAGE, P.CONTENT_EDIT], { all: true });
    expect((result as NextResponse).status).toBe(403);
  });

  it("should pass with { all: true } when every permission is held", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    await expect(requirePermission(req, [P.MEDIA_MANAGE, P.CONTENT_EDIT], { all: true })).resolves.toBe(user);
  });

  it("should deny an empty list when any is required", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    expect(((await requirePermission(req, [])) as NextResponse).status).toBe(403);
  });

  it("should pass through the 401 response from authentication", async () => {
    const unauthorized = NextResponse.json({}, { status: 401 });
    getCurrentUserMock.mockResolvedValue(unauthorized);
    await expect(requirePermission(req, P.CONTENT_EDIT)).resolves.toBe(unauthorized);
  });

  it("should propagate an unexpected rejection", async () => {
    getCurrentUserMock.mockImplementation(async () => { throw new Error("boom"); });
    await expect(requirePermission(req, P.CONTENT_EDIT)).rejects.toThrow("boom");
  });
});

describe("requireUser", () => {
  it("should return whatever authentication returns", async () => {
    getCurrentUserMock.mockResolvedValue(user);
    await expect(requireUser(req)).resolves.toBe(user);
  });
});
