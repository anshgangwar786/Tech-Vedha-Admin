import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Guard = typeof import("./otpGuard");
let g: Guard;
const NOW = new Date("2026-03-01T00:00:00Z").getTime();
const WINDOW_MS = 10 * 60 * 1000;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  // The attempt map lives on globalThis so all routes share it; start each test clean.
  delete (globalThis as { __otpAttempts?: unknown }).__otpAttempts;
  vi.resetModules();
  g = await import("./otpGuard");
});
afterEach(() => vi.useRealTimers());

describe("hashOtp", () => {
  it("should return a 64-char hex HMAC, never the plain code", () => {
    const hash = g.hashOtp("a@x.com", "123456");
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain("123456");
  });

  it("should be case-insensitive on the email", () => {
    expect(g.hashOtp("A@X.COM", "123456")).toBe(g.hashOtp("a@x.com", "123456"));
  });

  it("should differ for a different code or email", () => {
    const base = g.hashOtp("a@x.com", "123456");
    expect(g.hashOtp("a@x.com", "123457")).not.toBe(base);
    expect(g.hashOtp("b@x.com", "123456")).not.toBe(base);
  });

  it("should depend on the server secret", () => {
    const base = g.hashOtp("a@x.com", "123456");
    vi.stubEnv("JWT_SECRET", "other-secret");
    expect(g.hashOtp("a@x.com", "123456")).not.toBe(base);
  });
});

describe("reserveOtpAttempt", () => {
  it("should allow exactly MAX_OTP_ATTEMPTS guesses and flag the last one", () => {
    const results = Array.from({ length: g.MAX_OTP_ATTEMPTS }, () => g.reserveOtpAttempt("a@x.com"));

    expect(results.every((r) => r.allowed)).toBe(true);
    expect(results.map((r) => r.last)).toEqual([false, false, false, false, true]);
    expect(g.reserveOtpAttempt("a@x.com")).toEqual({ allowed: false, last: true });
  });

  it("should share the counter across email casing", () => {
    for (let i = 0; i < g.MAX_OTP_ATTEMPTS; i++) g.reserveOtpAttempt(i % 2 ? "A@X.com" : "a@x.COM");
    expect(g.reserveOtpAttempt("a@x.com").allowed).toBe(false);
  });

  it("should keep separate counters per email", () => {
    for (let i = 0; i < g.MAX_OTP_ATTEMPTS; i++) g.reserveOtpAttempt("a@x.com");
    expect(g.reserveOtpAttempt("b@x.com").allowed).toBe(true);
  });

  it("should start a fresh window once the attempt window has passed", () => {
    for (let i = 0; i < g.MAX_OTP_ATTEMPTS; i++) g.reserveOtpAttempt("a@x.com");
    vi.advanceTimersByTime(WINDOW_MS);
    expect(g.reserveOtpAttempt("a@x.com")).toEqual({ allowed: true, last: false });
  });

  it("should stay locked one millisecond before the window ends", () => {
    for (let i = 0; i < g.MAX_OTP_ATTEMPTS; i++) g.reserveOtpAttempt("a@x.com");
    vi.advanceTimersByTime(WINDOW_MS - 1);
    expect(g.reserveOtpAttempt("a@x.com").allowed).toBe(false);
  });
});

describe("resetOtpAttempts", () => {
  it("should clear the counter so a new code gets fresh guesses", () => {
    for (let i = 0; i < g.MAX_OTP_ATTEMPTS; i++) g.reserveOtpAttempt("a@x.com");
    g.resetOtpAttempts("A@x.com");
    expect(g.reserveOtpAttempt("a@x.com").allowed).toBe(true);
  });

  it("should be a no-op for an unknown email", () => {
    expect(() => g.resetOtpAttempts("nobody@x.com")).not.toThrow();
  });
});
