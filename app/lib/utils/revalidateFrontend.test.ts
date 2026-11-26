import { beforeEach, describe, expect, it, vi } from "vitest";

const { revalidateTagMock } = vi.hoisted(() => ({ revalidateTagMock: vi.fn() }));
vi.mock("next/cache", () => ({ revalidateTag: revalidateTagMock }));

import { normalizeSecret, notifyFrontends, productionUrl, revalidateFrontendTags, statusForResults } from "./revalidateFrontend";

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  revalidateTagMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("PRODUCTION_URL", "https://main.example.com/");
  vi.stubEnv("FRONTEND_URL", '"https://jmt.example.com"');
  vi.spyOn(console, "log").mockImplementation(() => {});
});

const ok = (status = 200) => ({ ok: status < 400, status }) as Response;

describe("normalizeSecret", () => {
  it.each([
    ['  "abc"  ', "abc"],
    ["'abc'", "abc"],
    ["abc", "abc"],
    [null, ""],
    [undefined, ""],
  ])("should normalise %j to %j", (input, expected) => {
    expect(normalizeSecret(input)).toBe(expected);
  });
});

describe("productionUrl", () => {
  it("should strip trailing slashes", () => {
    expect(productionUrl()).toBe("https://main.example.com");
  });

  it("should be empty for a localhost value on a deployed admin", () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("PRODUCTION_URL", "http://localhost:3002");
    expect(productionUrl()).toBe("");
  });
});

describe("notifyFrontends", () => {
  it("should POST the tags with the shared secret to both sites in parallel", async () => {
    fetchMock.mockResolvedValue(ok());

    const results = await notifyFrontends(["homepage"]);

    expect(results).toEqual([
      { site: "main", ok: true, status: 200 },
      { site: "jmt", ok: true, status: 200 },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://main.example.com/api/revalidate",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ tags: ["homepage"] }),
        headers: expect.objectContaining({ "x-revalidate-secret": "test-shared-secret" }),
      }),
    );
    expect(fetchMock).toHaveBeenCalledWith("https://jmt.example.com/api/revalidate", expect.anything());
  });

  it("should notify once when both URLs point at the same origin", async () => {
    vi.stubEnv("FRONTEND_URL", "https://main.example.com");
    fetchMock.mockResolvedValue(ok());

    const results = await notifyFrontends(["x"]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results).toEqual([{ site: "main", ok: true, status: 200 }]);
  });

  it.each([
    [401, "secret mismatch"],
    [400, "rejected the tags"],
    [503, "HTTP 503"],
  ])("should report HTTP %i as %j without throwing", async (status, message) => {
    fetchMock.mockResolvedValue(ok(status));
    const [main] = await notifyFrontends(["x"]);
    expect(main).toEqual({ site: "main", ok: false, status, message });
  });

  it("should report a timeout distinctly from an unreachable host", async () => {
    const timeout = Object.assign(new Error("t"), { name: "TimeoutError" });
    fetchMock.mockRejectedValueOnce(timeout).mockRejectedValueOnce(new TypeError("fetch failed"));

    const [main, jmt] = await notifyFrontends(["x"]);

    expect(main).toEqual({ site: "main", ok: false, message: "timed out", timedOut: true });
    expect(jmt).toEqual({ site: "jmt", ok: false, message: "unreachable", timedOut: false });
  });
});

describe("revalidateFrontendTags", () => {
  it("should expire tags locally before notifying the frontends", async () => {
    fetchMock.mockResolvedValue(ok());

    await revalidateFrontendTags(["a", "b"]);

    expect(revalidateTagMock).toHaveBeenNthCalledWith(1, "a", { expire: 0 });
    expect(revalidateTagMock).toHaveBeenNthCalledWith(2, "b", { expire: 0 });
    expect(revalidateTagMock.mock.invocationCallOrder[1]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
  });

  it("should still notify the frontends when local revalidation throws", async () => {
    revalidateTagMock.mockImplementation(() => {
      throw new Error("outside request scope");
    });
    fetchMock.mockResolvedValue(ok());

    await expect(revalidateFrontendTags(["a"])).resolves.toHaveLength(2);
  });
});

describe("statusForResults", () => {
  it("should be 200 when every site succeeded (or there were none)", () => {
    expect(statusForResults([{ site: "main", ok: true }])).toBe(200);
    expect(statusForResults([])).toBe(200);
  });

  it("should be 504 when every failure was a timeout", () => {
    expect(statusForResults([{ site: "main", ok: true }, { site: "jmt", ok: false, timedOut: true }])).toBe(504);
  });

  it("should be 502 when any failure was not a timeout", () => {
    expect(
      statusForResults([
        { site: "main", ok: false, timedOut: true },
        { site: "jmt", ok: false, status: 401 },
      ]),
    ).toBe(502);
  });
});
