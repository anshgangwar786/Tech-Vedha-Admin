import { beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const { prismaMock, bcryptMock } = vi.hoisted(() => ({
  prismaMock: { user: { findUnique: vi.fn() } },
  bcryptMock: { compare: vi.fn(), hash: vi.fn() },
}));
vi.mock("@/app/lib/config/db", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("bcrypt", () => ({ default: bcryptMock }));

// Fresh module per test: the route caches a dummy hash and the throttle keeps state.
let POST: typeof import("./route").POST;

const dbUser = { id: "u1", email: "alice@x.com", username: "alice", role: "admin", password: "$2b$10$real" };

function login(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest("https://admin.example.com/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

beforeEach(async () => {
  vi.resetModules();
  prismaMock.user.findUnique.mockReset();
  bcryptMock.compare.mockReset();
  bcryptMock.hash.mockReset().mockResolvedValue("$2b$10$dummy");
  vi.spyOn(console, "log").mockImplementation(() => {});
  ({ POST } = await import("./route"));
});

describe("POST /api/auth/login", () => {
  it("should sign in, set session cookies and never return the password", async () => {
    // Arrange
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(true);

    // Act
    const res = await login({ email: "  Alice@X.com ", password: "correct-horse" });

    // Assert
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toEqual({ id: "u1", email: "alice@x.com", username: "alice", role: "admin" });
    expect(JSON.stringify(body)).not.toContain("$2b$");
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { email: "alice@x.com" } });
    const token = res.cookies.get("authToken")!.value;
    expect(jwt.verify(token, "test-jwt-secret")).toMatchObject({ id: "u1", pwv: expect.any(String) });
  });

  it("should look up by username when no email is given", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(true);

    await login({ username: "alice", password: "pw" });

    expect(prismaMock.user.findUnique).toHaveBeenCalledWith({ where: { username: "alice" } });
  });

  it("should return 401 for a wrong password", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(false);

    const res = await login({ email: "alice@x.com", password: "wrong" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Invalid credentials" });
    expect(res.cookies.get("authToken")).toBeUndefined();
  });

  it("should give an unknown account the same 401 and still run bcrypt (no user-enumeration oracle)", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    bcryptMock.compare.mockResolvedValue(false);

    const res = await login({ email: "ghost@x.com", password: "whatever" });

    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ message: "Invalid credentials" });
    expect(bcryptMock.compare).toHaveBeenCalledWith("whatever", "$2b$10$dummy");
  });

  it.each([
    [{ email: "a@x.com" }],
    [{ password: "pw" }],
    [{ email: "a@x.com", password: "" }],
    [{ email: "a@x.com", password: 12345 }],
    [{ email: "a@x.com", password: ["pw"] }],
    [{ email: "", username: "", password: "pw" }],
  ])("should return 400 for incomplete or mistyped body %j", async (body) => {
    const res = await login(body);
    expect(res.status).toBe(400);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 403 for a cross-site login attempt (login CSRF)", async () => {
    const res = await login({ email: "a@x.com", password: "pw" }, { "sec-fetch-site": "cross-site" });
    expect(res.status).toBe(403);
    expect(prismaMock.user.findUnique).not.toHaveBeenCalled();
  });

  it("should return 500 for malformed JSON", async () => {
    const res = await login("{not json");
    expect(res.status).toBe(500);
  });

  it("should rate-limit with 429 and Retry-After after 5 failed attempts", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(false);
    for (let i = 0; i < 5; i++) expect((await login({ email: "alice@x.com", password: "bad" })).status).toBe(401);

    const res = await login({ email: "ALICE@x.com", password: "correct" });

    expect(res.status).toBe(429);
    expect(Number(res.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(prismaMock.user.findUnique).toHaveBeenCalledTimes(5);
  });

  it("should not count a database failure toward the rate limit", async () => {
    prismaMock.user.findUnique.mockRejectedValue(new Error("db down"));
    for (let i = 0; i < 6; i++) expect((await login({ email: "alice@x.com", password: "pw" })).status).toBe(500);

    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(true);
    expect((await login({ email: "alice@x.com", password: "pw" })).status).toBe(200);
  });

  it("should reset the counter after a successful login", async () => {
    prismaMock.user.findUnique.mockResolvedValue(dbUser);
    bcryptMock.compare.mockResolvedValue(false);
    for (let i = 0; i < 4; i++) await login({ email: "alice@x.com", password: "bad" });
    bcryptMock.compare.mockResolvedValue(true);
    expect((await login({ email: "alice@x.com", password: "good" })).status).toBe(200);

    bcryptMock.compare.mockResolvedValue(false);
    for (let i = 0; i < 5; i++) expect((await login({ email: "alice@x.com", password: "bad" })).status).toBe(401);
  });
});
