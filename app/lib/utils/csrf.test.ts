import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { isCrossSiteWrite } from "./csrf";

const req = (method: string, headers: Record<string, string> = {}) =>
  new NextRequest("https://admin.example.com/api/x", { method, headers });

describe("isCrossSiteWrite", () => {
  it.each(["GET", "HEAD", "OPTIONS"])("should never block safe method %s", (method) => {
    expect(isCrossSiteWrite(req(method, { "sec-fetch-site": "cross-site" }))).toBe(false);
  });

  describe("with Sec-Fetch-Site", () => {
    it.each([
      ["same-origin", false],
      ["none", false],
      ["same-site", true],
      ["cross-site", true],
    ])("should treat %s as cross-site=%s", (site, expected) => {
      expect(isCrossSiteWrite(req("POST", { "sec-fetch-site": site }))).toBe(expected);
    });

    it("should trust Sec-Fetch-Site over a matching Origin", () => {
      const r = req("DELETE", { "sec-fetch-site": "same-site", origin: "https://admin.example.com", host: "admin.example.com" });
      expect(isCrossSiteWrite(r)).toBe(true);
    });
  });

  describe("without Sec-Fetch-Site (older browsers)", () => {
    it("should allow requests with no Origin (server-to-server, curl)", () => {
      expect(isCrossSiteWrite(req("POST"))).toBe(false);
    });

    it("should block an opaque 'null' origin", () => {
      expect(isCrossSiteWrite(req("POST", { origin: "null" }))).toBe(true);
    });

    it("should block an unparseable origin", () => {
      expect(isCrossSiteWrite(req("PUT", { origin: "::not a url::" }))).toBe(true);
    });

    it("should allow an origin that matches the Host header case-insensitively", () => {
      expect(isCrossSiteWrite(req("PATCH", { origin: "https://ADMIN.example.com", host: "admin.example.com" }))).toBe(false);
    });

    it("should allow an origin matching any X-Forwarded-Host entry", () => {
      const r = req("POST", { origin: "https://admin.example.com", host: "internal:3000", "x-forwarded-host": "cdn.example.com, admin.example.com" });
      expect(isCrossSiteWrite(r)).toBe(false);
    });

    it("should block a sibling subdomain origin", () => {
      expect(isCrossSiteWrite(req("POST", { origin: "https://www.example.com", host: "admin.example.com" }))).toBe(true);
    });

    it("should block a different port on the same hostname", () => {
      expect(isCrossSiteWrite(req("POST", { origin: "https://admin.example.com:8443", host: "admin.example.com" }))).toBe(true);
    });
  });
});
