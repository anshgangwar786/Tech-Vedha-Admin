import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import { PERMISSIONS as P } from "@/app/lib/constants/permissions";
import { passwordVersion } from "./session";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: { findUnique: vi.fn() },
    adminRole: { findUnique: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock("@/app/lib/config/db", () => ({ default: prismaMock, prisma: prismaMock }));

import { getCurrentUser } from "./getCurrentUser";

const SECRET = "test-jwt-secret";
const HASH = "$2b$10$stored-hash";
const dbUser = {
  id: "u1",
  username: "alice",
  role: "editor",
  roleId: "r1",
  password: HASH,
  adminRole: { id: "r1", key: "custom", name: "Content", permissions: [P.CONTENT_EDIT] },
};

const sign = (payload: object, opts: jwt.SignOptions = {}, secret = SECRET) =>
  jwt.sign({ id: "u1", username: "alice", role: "editor", ...payload }, secret, opts);

function request(token?: string, init: { method?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { ...init.headers };
  if (token) headers.cookie = `authToken=${token}`;
  return new NextRequest("https://admin.example.com/api/thing", { method: init.method ?? "GET", headers });
}

async function expectError(result: unknown, status: number, message: RegExp) {
  expect(result).toBeInstanceOf(NextResponse);
  const res = result as NextResponse;
  expect(res.status).toBe(status);
  expect((await res.json()).message).toMatch(message);
}

beforeEach(() => {
  prismaMock.user.findUnique.mockReset();
  prismaMock.adminRole.findUnique.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("getCurrentUser", () => {
  it("should return the user with permissions loaded from the database when the token is valid", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    const token = sign({ pwv: passwordVersion(HASH) });

    // Act
    const result = await getCurrentUser(request(token));

    // Assert
    expect(result).toEqual({
      id: "u1",
      username: "alice",
      role: "editor",
      roleId: "r1",
      roleKey: "custom",
      roleName: "Content",
      permissions: [P.CONTENT_EDIT],
      isSuperAdmin: false,
    });
    expect(result).not.toHaveProperty("password");
  });

  it("should ignore a role claim in the token and use the database role", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    const token = sign({ role: "superadmin", pwv: passwordVersion(HASH) });

    const result = await getCurrentUser(request(token));

    expect(result).toMatchObject({ isSuperAdmin: false, permissions: [P.CONTENT_EDIT] });
  });

  it("should return 401 when there is no auth cookie", async () => {
    await expectError(await getCurrentUser(request()), 401, /Unauthorized/);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 403 for a cross-site write before touching the token", async () => {
    const r = request(sign({ pwv: passwordVersion(HASH) }), { method: "POST", headers: { "sec-fetch-site": "cross-site" } });
    await expectError(await getCurrentUser(r), 403, /Cross-site/);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 401 when the token is signed with a different secret", async () => {
    await expectError(await getCurrentUser(request(sign({}, {}, "attacker-secret"))), 401, /Invalid or expired/);
  });

  it("should return 401 when the token is expired", async () => {
    const token = sign({ pwv: passwordVersion(HASH), exp: Math.floor(Date.now() / 1000) - 60 });
    await expectError(await getCurrentUser(request(token)), 401, /Invalid or expired/);
  });

  it("should reject an unsigned alg=none token", async () => {
    const token = jwt.sign({ id: "u1", pwv: passwordVersion(HASH) }, "", { algorithm: "none" });
    await expectError(await getCurrentUser(request(token)), 401, /Invalid or expired/);
  });

  it("should return 401 for a malformed token string", async () => {
    await expectError(await getCurrentUser(request("not.a.jwt")), 401, /Invalid or expired/);
  });

  it("should return 401 when the user no longer exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expectError(await getCurrentUser(request(sign({ pwv: passwordVersion(HASH) }))), 401, /User not found/);
  });

  it("should return 401 when the password changed after the token was issued", async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...dbUser, password: "$2b$10$new-hash" });
    await expectError(await getCurrentUser(request(sign({ pwv: passwordVersion(HASH) }))), 401, /User not found/);
  });

  it("should return 401 when the token predates password versioning (no pwv)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    await expectError(await getCurrentUser(request(sign({}))), 401, /User not found/);
  });

  it("should return a generic 401 and log when the database fails", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("connection reset"));
    await expectError(await getCurrentUser(request(sign({ pwv: passwordVersion(HASH) }))), 401, /Authentication failed/);
    expect(console.error).toHaveBeenCalled();
  });
});
