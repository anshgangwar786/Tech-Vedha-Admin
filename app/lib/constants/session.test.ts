import { describe, expect, it } from "vitest";
import {
  SESSION_GRACE_MS,
  SESSION_IDLE_TIMEOUT_MS,
  SESSION_MAX_AGE_MS,
  SESSION_REFRESH_INTERVAL_MS,
  SESSION_TOKEN_TTL_MS,
  readSessionEnd,
  sessionDeadline,
} from "./session";

describe("session timing invariants", () => {
  it("should let the server token outlive the client's idle deadline", () => {
    expect(SESSION_TOKEN_TTL_MS).toBeGreaterThan(SESSION_IDLE_TIMEOUT_MS);
  });

  it("should give a grace period covering the refresh throttle", () => {
    expect(SESSION_GRACE_MS).toBeGreaterThan(SESSION_REFRESH_INTERVAL_MS);
  });
});

describe("readSessionEnd", () => {
  it("should read the cookie among others", () => {
    expect(readSessionEnd("loggedIn=true; sessionEndsAt=1700000000000; theme=dark")).toBe(1700000000000);
    expect(readSessionEnd("sessionEndsAt=42")).toBe(42);
  });

  it.each([
    "",
    "loggedIn=true",
    "sessionEndsAt=",
    "sessionEndsAt=abc",
    "sessionEndsAt=-5",
    "sessionEndsAt=0",
    "sessionEndsAt=12abc",
    "xsessionEndsAt=123",
    "sessionEndsAt=99999999999999999999",
  ])("should return null for %j", (cookie) => {
    expect(readSessionEnd(cookie)).toBeNull();
  });
});

describe("sessionDeadline", () => {
  const last = 1_000_000;

  it("should use the idle deadline when the session end is unknown (cookie predates this fix)", () => {
    expect(sessionDeadline(last, null)).toEqual({ at: last + SESSION_IDLE_TIMEOUT_MS, reason: "idle" });
  });

  it("should use the absolute end when it comes before the idle deadline", () => {
    // Logged in at t, active until t+1h, then idle: the server cap (t+12h) is reached first.
    const sessionEndsAt = last + SESSION_IDLE_TIMEOUT_MS - 60 * 60 * 1000;
    expect(sessionDeadline(last, sessionEndsAt)).toEqual({ at: sessionEndsAt, reason: "max-age" });
  });

  it("should use the idle deadline when it comes first", () => {
    expect(sessionDeadline(last, last + SESSION_MAX_AGE_MS + 1)).toEqual({ at: last + SESSION_IDLE_TIMEOUT_MS, reason: "idle" });
  });

  it("should prefer the idle wording on an exact tie", () => {
    expect(sessionDeadline(last, last + SESSION_IDLE_TIMEOUT_MS).reason).toBe("idle");
  });
});
