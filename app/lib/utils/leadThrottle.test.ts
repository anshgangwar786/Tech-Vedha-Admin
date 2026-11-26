import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({ prismaMock: { lead: { count: vi.fn() } } }));
vi.mock("@/app/lib/config/db", () => ({ default: prismaMock, prisma: prismaMock }));
vi.mock("next/cache", () => ({ revalidateTag: vi.fn() }));

type Throttle = typeof import("./leadThrottle");
let t: Throttle;
const NOW = new Date("2026-03-01T00:00:00Z").getTime();
const WINDOW_MS = 10 * 60 * 1000;

const req = (headers: Record<string, string> = {}) => new NextRequest("https://admin.example.com/api/lead", { headers });

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.resetModules();
  prismaMock.lead.count.mockReset();
  t = await import("./leadThrottle");
});
afterEach(() => vi.useRealTimers());

describe("requestIp", () => {
  it("should prefer the platform's x-vercel-forwarded-for", () => {
    expect(t.requestIp(req({ "x-vercel-forwarded-for": "9.9.9.9", "x-forwarded-for": "1.1.1.1" }))).toBe("9.9.9.9");
  });

  it("should use the leftmost x-forwarded-for value, trimmed", () => {
    expect(t.requestIp(req({ "x-forwarded-for": " 1.1.1.1 , 2.2.2.2" }))).toBe("1.1.1.1");
  });

  it("should fall back to x-real-ip", () => {
    expect(t.requestIp(req({ "x-real-ip": "3.3.3.3" }))).toBe("3.3.3.3");
  });

  it("should return 'unknown' without proxy headers", () => {
    expect(t.requestIp(req())).toBe("unknown");
  });

  it("should fall through an empty x-forwarded-for", () => {
    expect(t.requestIp(req({ "x-forwarded-for": "", "x-real-ip": "4.4.4.4" }))).toBe("4.4.4.4");
  });
});

describe("ipOverLimit", () => {
  it("should allow 5 hits then block the 6th", () => {
    const results = Array.from({ length: 6 }, () => t.ipOverLimit("1.1.1.1"));
    expect(results).toEqual([false, false, false, false, false, true]);
  });

  it("should track IPs independently", () => {
    for (let i = 0; i < 5; i++) t.ipOverLimit("1.1.1.1");
    expect(t.ipOverLimit("2.2.2.2")).toBe(false);
  });

  it("should release the IP once the window passes", () => {
    for (let i = 0; i < 6; i++) t.ipOverLimit("1.1.1.1");
    vi.advanceTimersByTime(WINDOW_MS);
    expect(t.ipOverLimit("1.1.1.1")).toBe(false);
  });
});

describe("identityOverLimit", () => {
  it("should return false without querying when both email and phone are blank", async () => {
    await expect(t.identityOverLimit("  ", "")).resolves.toBe(false);
    expect(prismaMock.lead.count).not.toHaveBeenCalled();
  });

  it("should query recent leads by normalised email and phone", async () => {
    prismaMock.lead.count.mockResolvedValue(0);

    await t.identityOverLimit(" A@X.com ", " +91 9876543210 ");

    expect(prismaMock.lead.count).toHaveBeenCalledWith({
      where: {
        createdAt: { gte: new Date(NOW - WINDOW_MS) },
        OR: [{ email: "a@x.com" }, { phoneNo: "+91 9876543210" }],
      },
    });
  });

  it("should only match on phone when email is empty (Contact/Join leads)", async () => {
    prismaMock.lead.count.mockResolvedValue(0);
    await t.identityOverLimit("", "9876543210");
    expect(prismaMock.lead.count.mock.calls[0][0].where.OR).toEqual([{ phoneNo: "9876543210" }]);
  });

  it.each([
    [2, false],
    [3, true],
    [10, true],
  ])("should return %s leads → over limit = %s", async (count, expected) => {
    prismaMock.lead.count.mockResolvedValue(count);
    await expect(t.identityOverLimit("a@x.com", "")).resolves.toBe(expected);
  });

  it("should propagate a database error", async () => {
    prismaMock.lead.count.mockRejectedValue(new Error("db down"));
    await expect(t.identityOverLimit("a@x.com", "")).rejects.toThrow("db down");
  });
});

describe("hasSharedSecret", () => {
  it("should accept the configured secret", () => {
    expect(t.hasSharedSecret(req({ "x-revalidate-secret": "test-shared-secret" }))).toBe(true);
  });

  it("should accept the secret wrapped in quotes or whitespace", () => {
    expect(t.hasSharedSecret(req({ "x-revalidate-secret": ' "test-shared-secret" ' }))).toBe(true);
  });

  it.each([["wrong-secret"], ["test-shared-secret-extra"], [""]])("should reject %j", (value) => {
    expect(t.hasSharedSecret(req({ "x-revalidate-secret": value }))).toBe(false);
  });

  it("should reject a request with no secret header", () => {
    expect(t.hasSharedSecret(req())).toBe(false);
  });

  it("should fail closed when the server secret is not configured", () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(t.hasSharedSecret(req({ "x-revalidate-secret": "" }))).toBe(false);
  });
});
