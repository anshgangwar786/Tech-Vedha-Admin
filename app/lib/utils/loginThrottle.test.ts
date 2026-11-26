import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The throttle keeps module-level maps, so every test imports a fresh copy.
type Throttle = typeof import("./loginThrottle");
let t: Throttle;

const NOW = new Date("2026-03-01T00:00:00Z").getTime();
const WINDOW_MS = 15 * 60 * 1000;

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetModules();
  t = await import("./loginThrottle");
});
afterEach(() => vi.useRealTimers());

const fail = (id: string, ip = "1.1.1.1") => t.beginLoginAttempt(id, ip);
const isBlocked = (r: ReturnType<Throttle["beginLoginAttempt"]>): r is { retryAfter: number } => "retryAfter" in r;

describe("loginIdentifier", () => {
  it("should normalise email case and whitespace into an e: bucket", () => {
    expect(t.loginIdentifier("  Alice@X.com ", undefined)).toBe("e:alice@x.com");
  });

  it("should fall back to a u: bucket for username", () => {
    expect(t.loginIdentifier("", "Bob")).toBe("u:bob");
  });

  it("should keep email and username buckets apart for the same text", () => {
    expect(t.loginIdentifier("same", undefined)).not.toBe(t.loginIdentifier(undefined, "same"));
  });

  it("should cap the key at 256 characters", () => {
    expect(t.loginIdentifier("a".repeat(1000), undefined)).toHaveLength(256);
  });

  it("should not crash on non-string input", () => {
    expect(t.loginIdentifier(undefined, undefined)).toBe("u:undefined");
    expect(t.loginIdentifier(12345, undefined)).toBe("e:12345");
  });
});

describe("beginLoginAttempt", () => {
  it("should allow 5 attempts per identifier and block the 6th with Retry-After", () => {
    // Arrange
    for (let i = 0; i < 5; i++) expect(isBlocked(fail("e:a@x.com", `10.0.0.${i}`))).toBe(false);

    // Act
    const sixth = fail("e:a@x.com", "10.0.0.99");

    // Assert
    expect(sixth).toEqual({ retryAfter: WINDOW_MS / 1000 });
  });

  it("should not record a blocked attempt (window does not keep sliding)", () => {
    for (let i = 0; i < 5; i++) fail("e:a@x.com");
    vi.advanceTimersByTime(WINDOW_MS - 1000);
    fail("e:a@x.com"); // blocked, must not extend the lockout

    vi.advanceTimersByTime(1000);
    expect(isBlocked(fail("e:a@x.com"))).toBe(false);
  });

  it("should report the seconds until the oldest failure expires", () => {
    fail("e:a@x.com");
    vi.advanceTimersByTime(60_000);
    for (let i = 0; i < 4; i++) fail("e:a@x.com");
    expect(fail("e:a@x.com")).toEqual({ retryAfter: WINDOW_MS / 1000 - 60 });
  });

  it("should block an IP after 20 failures across different accounts", () => {
    for (let i = 0; i < 20; i++) expect(isBlocked(fail(`e:user${i}@x.com`, "6.6.6.6"))).toBe(false);
    expect(isBlocked(fail("e:fresh@x.com", "6.6.6.6"))).toBe(true);
    expect(isBlocked(fail("e:fresh@x.com", "7.7.7.7"))).toBe(false);
  });

  it("should never count the shared 'unknown' IP bucket", () => {
    for (let i = 0; i < 50; i++) expect(isBlocked(fail(`e:u${i}@x.com`, "unknown"))).toBe(false);
  });

  it("should return the attempt record when allowed", () => {
    expect(fail("e:a@x.com", "1.2.3.4")).toEqual({ identifier: "e:a@x.com", ip: "1.2.3.4", at: NOW });
  });
});

describe("loginSucceeded", () => {
  it("should clear the identifier counter", () => {
    for (let i = 0; i < 4; i++) fail("e:a@x.com");
    const ok = fail("e:a@x.com");
    if (isBlocked(ok)) throw new Error("unexpected block");

    t.loginSucceeded(ok);

    for (let i = 0; i < 5; i++) expect(isBlocked(fail("e:a@x.com"))).toBe(false);
  });

  it("should un-count only this attempt for the IP", () => {
    for (let i = 0; i < 19; i++) fail(`e:u${i}@x.com`, "9.9.9.9");
    vi.advanceTimersByTime(1);
    const last = fail("e:good@x.com", "9.9.9.9");
    if (isBlocked(last)) throw new Error("unexpected block");

    t.loginSucceeded(last);

    expect(isBlocked(fail("e:another@x.com", "9.9.9.9"))).toBe(false); // 20th slot freed
    expect(isBlocked(fail("e:yet@x.com", "9.9.9.9"))).toBe(true);
  });
});

describe("releaseLoginAttempt", () => {
  it("should not hold a server error against the client", () => {
    for (let i = 0; i < 4; i++) fail("e:a@x.com");
    vi.advanceTimersByTime(1);
    const attempt = fail("e:a@x.com");
    if (isBlocked(attempt)) throw new Error("unexpected block");

    t.releaseLoginAttempt(attempt);

    expect(isBlocked(fail("e:a@x.com"))).toBe(false);
    expect(isBlocked(fail("e:a@x.com"))).toBe(true);
  });
});
