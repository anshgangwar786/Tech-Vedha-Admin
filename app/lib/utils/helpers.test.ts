// Small pure helpers in app/lib/utils, grouped to keep the suite count manageable.
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { withMongoId, withMongoIds } from "./serialize";
import { intParam } from "./pagination";
import { errorFields } from "./errorFields";
import { isJoinSource } from "./leadSource";
import { getCorsHeaders } from "./corsHeader";
import { jmtServiceTags, jmtSitePageTags, packageTags, postTags, serviceTags } from "./cacheTags";

describe("withMongoId", () => {
  it("should rename id to _id", () => {
    expect(withMongoId({ id: "1", name: "a" })).toEqual({ _id: "1", name: "a" });
  });

  it("should recurse into known relation keys only", () => {
    const row = {
      id: "p",
      author: { id: "u" },
      categories: [{ id: "c1" }, null, "raw"],
      content: { id: "inside-user-json" },
      createdAt: new Date(0),
    };
    expect(withMongoId(row)).toEqual({
      _id: "p",
      author: { _id: "u" },
      categories: [{ _id: "c1" }, null, "raw"],
      content: { id: "inside-user-json" },
      createdAt: new Date(0),
    });
  });

  it("should return null for null/undefined", () => {
    expect(withMongoId(null)).toBeNull();
    expect(withMongoId(undefined)).toBeNull();
  });

  it("should not add _id when the row has none", () => {
    expect(withMongoId({ name: "a" })).toEqual({ name: "a" });
  });

  it("should map lists and treat null lists as empty", () => {
    expect(withMongoIds([{ id: 1 }])).toEqual([{ _id: 1 }]);
    expect(withMongoIds(null)).toEqual([]);
  });
});

describe("intParam", () => {
  it.each([
    ["5", 1, 5],
    ["-3", 1, -3],
    ["7abc", 1, 7],
    ["abc", 1, 1],
    ["", 9, 9],
    [null, 2, 2],
    [undefined, 3, 3],
    ["NaN", 4, 4],
    ["Infinity", 4, 4],
  ])("should parse %j (fallback %i) as %i", (raw, fallback, expected) => {
    expect(intParam(raw, fallback)).toBe(expected);
  });
});

describe("errorFields", () => {
  it("should expose fields of an object", () => {
    expect(errorFields({ code: "P2002" }).code).toBe("P2002");
    expect(errorFields(new TypeError("x")).name).toBe("TypeError");
  });

  it.each([null, undefined, "str", 42])("should return {} for %j", (v) => {
    expect(errorFields(v)).toEqual({});
  });
});

describe("isJoinSource", () => {
  it.each(["Join our crew — Worker application", " JOIN OUR CREW — WORKER APPLICATION ", "Jöin our crew — Worker application"])(
    "should match the reserved source %j as MySQL would",
    (v) => {
      expect(isJoinSource(v)).toBe(true);
    },
  );

  it.each(["Website", "", null, undefined, 1])("should not match %j", (v) => {
    expect(isJoinSource(v)).toBe(false);
  });
});

describe("getCorsHeaders", () => {
  const req = (origin?: string) => new NextRequest("https://admin.example.com/api/x", { headers: origin ? { origin } : {} });

  it.each(["http://localhost", "http://localhost:3002", "http://127.0.0.1:8080"])("should allow local origin %s", (origin) => {
    expect(getCorsHeaders(req(origin))["Access-Control-Allow-Origin"]).toBe(origin);
  });

  it.each(["https://evil.com", "http://localhost.evil.com", "https://localhost:3000", "null"])("should omit Allow-Origin for %s", (origin) => {
    expect(getCorsHeaders(req(origin))).not.toHaveProperty("Access-Control-Allow-Origin");
  });

  it("should always vary on Origin", () => {
    expect(getCorsHeaders(req())).toMatchObject({ Vary: "Origin" });
  });
});

describe("cache tag builders", () => {
  it("should build record tags alongside their list tag", () => {
    expect(serviceTags("masons")).toEqual(["service-list", "service-masons"]);
    expect(postTags("hello")).toEqual(["post-list", "post-hello"]);
  });

  it("should drop empty values", () => {
    expect(packageTags(["home", ""])).toEqual(["package-list", "packages-home"]);
    expect(jmtServiceTags("a", "")).toEqual(["jmt-service-list", "jmt-service-a"]);
    expect(jmtSitePageTags("", "about")).toEqual(["jmt-page-about"]);
  });
});
