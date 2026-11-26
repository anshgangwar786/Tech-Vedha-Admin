import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { SESSION_GRACE_MS, SESSION_MAX_AGE_MS, SESSION_TOKEN_TTL_MS } from "@/app/lib/constants/session";
import { issueSession, passwordVersion, tokenMatchesPassword, tokenSessionStart } from "./session";

const NOW = new Date("2026-01-15T10:00:00Z").getTime();
const user = { id: "u1", username: "alice", role: "admin", password: "$2b$10$hash-one" };

describe("passwordVersion", () => {
  it("should produce a stable 16-char hex fingerprint", () => {
    expect(passwordVersion("abc")).toMatch(/^[0-9a-f]{16}$/);
    expect(passwordVersion("abc")).toBe(passwordVersion("abc"));
  });

  it("should change when the hash changes", () => {
    expect(passwordVersion("hash-a")).not.toBe(passwordVersion("hash-b"));
  });
});

describe("tokenMatchesPassword", () => {
  it("should accept a token carrying the current fingerprint", () => {
    expect(tokenMatchesPassword({ pwv: passwordVersion(user.password) }, user.password)).toBe(true);
  });

  it("should reject a token issued before a password change", () => {
    expect(tokenMatchesPassword({ pwv: passwordVersion("old-hash") }, user.password)).toBe(false);
  });

  it.each([undefined, null, 123, ""])("should reject a pwv of %j", (pwv) => {
    expect(tokenMatchesPassword({ pwv }, user.password)).toBe(false);
  });
});

describe("tokenSessionStart", () => {
  it("should use sessionStart when it is a number", () => {
    expect(tokenSessionStart({ sessionStart: 1234, iat: 99 })).toBe(1234);
  });

  it("should fall back to iat in milliseconds", () => {
    expect(tokenSessionStart({ sessionStart: "1234", iat: 10 })).toBe(10_000);
  });

  it("should fall back to 0 when nothing is present", () => {
    expect(tokenSessionStart({})).toBe(0);
  });
});

describe("issueSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("should set an httpOnly strict auth cookie with the full TTL for a new session", () => {
    // Arrange
    const res = NextResponse.json({});

    // Act
    const expiresAt = issueSession(res, user, NOW);

    // Assert
    const ttlSeconds = Math.floor(SESSION_TOKEN_TTL_MS / 1000);
    expect(expiresAt).toBe(NOW + ttlSeconds * 1000);
    const cookie = res.cookies.get("authToken")!;
    expect(cookie).toMatchObject({ httpOnly: true, sameSite: "strict", maxAge: ttlSeconds, path: "/" });
    expect(res.cookies.get("loggedIn")).toMatchObject({ value: "true", maxAge: ttlSeconds });
    expect(res.cookies.get("loggedIn")?.httpOnly).toBeFalsy();
  });

  it("should sign a token carrying identity, session start and password fingerprint", () => {
    const res = NextResponse.json({});
    issueSession(res, user, NOW - 5000);

    const decoded = jwt.verify(res.cookies.get("authToken")!.value, "test-jwt-secret") as Record<string, unknown>;
    expect(decoded).toMatchObject({
      id: "u1",
      username: "alice",
      role: "admin",
      sessionStart: NOW - 5000,
      pwv: passwordVersion(user.password),
    });
    expect(decoded).not.toHaveProperty("password");
  });

  it("should outlive the client's idle deadline by the grace period on a fresh session", () => {
    // Regression: the max-age cap used to clip the token to exactly the idle timeout, so an
    // idle user hit a silent 401 instead of the client's warning dialog.
    const res = NextResponse.json({});
    issueSession(res, user, NOW);
    expect(res.cookies.get("authToken")!.maxAge! * 1000).toBe(SESSION_MAX_AGE_MS + SESSION_GRACE_MS);
  });

  it("should cap the TTL at the absolute session age limit plus grace", () => {
    const res = NextResponse.json({});
    const sessionStart = NOW - (SESSION_MAX_AGE_MS - 30_000); // 30s left

    const expiresAt = issueSession(res, user, sessionStart);

    const ttlSeconds = 30 + SESSION_GRACE_MS / 1000;
    expect(res.cookies.get("authToken")!.maxAge).toBe(ttlSeconds);
    expect(expiresAt).toBe(NOW + ttlSeconds * 1000);
  });

  it("should publish the absolute session end in a readable cookie for the client timer", () => {
    const res = NextResponse.json({});
    const sessionStart = NOW - 60_000;

    issueSession(res, user, sessionStart);

    const cookie = res.cookies.get("sessionEndsAt")!;
    expect(cookie.value).toBe(String(sessionStart + SESSION_MAX_AGE_MS));
    expect(cookie.httpOnly).toBeFalsy();
    expect(cookie).toMatchObject({ sameSite: "strict", path: "/", maxAge: res.cookies.get("authToken")!.maxAge });
  });

  it("should issue a 1-second token when the session is already past its cap", () => {
    const res = NextResponse.json({});
    issueSession(res, user, NOW - SESSION_MAX_AGE_MS * 2);
    expect(res.cookies.get("authToken")!.maxAge).toBe(1);
  });

  it("should mark cookies secure only in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const res = NextResponse.json({});
    issueSession(res, user, NOW);
    expect(res.cookies.get("authToken")!.secure).toBe(true);
  });
});
