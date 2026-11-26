import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEPLOYED_FRONTEND_URL, cleanOrigin, isDeployed, isLocalUrl, resolveFrontendUrl } from "./frontendUrl";

beforeEach(() => {
  vi.stubEnv("VERCEL", "");
});

describe("cleanOrigin", () => {
  it.each([
    [' "https://x.com/" ', "https://x.com"],
    ["'https://x.com///'", "https://x.com"],
    [null, ""],
  ])("should clean %j to %j", (input, expected) => {
    expect(cleanOrigin(input)).toBe(expected);
  });
});

describe("isLocalUrl", () => {
  it.each(["http://localhost", "http://localhost:3002", "https://127.0.0.1/x", "http://0.0.0.0:80", "HTTP://LOCALHOST"])("should detect %s", (url) => {
    expect(isLocalUrl(url)).toBe(true);
  });

  it.each(["https://localhost.example.com", "https://example.com", "localhost:3000", ""])("should not flag %j", (url) => {
    expect(isLocalUrl(url)).toBe(false);
  });
});

describe("resolveFrontendUrl", () => {
  it("should use a configured URL locally", () => {
    expect(resolveFrontendUrl("https://site.com/")).toBe("https://site.com");
  });

  it("should default to localhost:3002 when unset locally", () => {
    expect(isDeployed()).toBe(false);
    expect(resolveFrontendUrl(undefined)).toBe("http://localhost:3002");
  });

  it("should ignore a localhost value on a deployed admin", () => {
    vi.stubEnv("VERCEL", "1");
    expect(resolveFrontendUrl("http://localhost:3002")).toBe(DEPLOYED_FRONTEND_URL);
  });

  it("should never return an empty origin when deployed and unset", () => {
    vi.stubEnv("VERCEL", "1");
    expect(resolveFrontendUrl("  ")).toBe(DEPLOYED_FRONTEND_URL);
  });
});
