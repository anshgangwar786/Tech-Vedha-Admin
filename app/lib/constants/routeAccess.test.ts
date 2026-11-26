import { describe, expect, it } from "vitest";
import { PERMISSIONS as P } from "./permissions";
import { requiredPermissionFor } from "./routeAccess";

describe("requiredPermissionFor", () => {
  it("should return the permission for an exact route", () => {
    expect(requiredPermissionFor("/dashboard/users")).toBe(P.USERS_MANAGE);
  });

  it("should prefer an exact entry over a dynamic one", () => {
    expect(requiredPermissionFor("/dashboard/services/create-service")).toBe(P.SERVICES_MANAGE);
  });

  it("should match a dynamic segment", () => {
    expect(requiredPermissionFor("/dashboard/site-pages/about")).toBe(P.CONTENT_EDIT);
    expect(requiredPermissionFor("/dashboard/blog/category/abc123")).toBe(P.POSTS_MANAGE);
  });

  it("should ignore trailing slashes", () => {
    expect(requiredPermissionFor("/dashboard/roles///")).toBe(P.ROLES_MANAGE);
  });

  it("should return a list when any of several permissions opens the page", () => {
    expect(requiredPermissionFor("/dashboard/seo")).toEqual([P.SEO_MANAGE, P.SEO_SCRIPTS]);
  });

  it.each(["/dashboard", "/dashboard/profile", "/", "", "/dashboard/unknown-page"])(
    "should return null for open route %j",
    (path) => {
      expect(requiredPermissionFor(path)).toBeNull();
    },
  );

  it("should not let a deeper path inherit a parent's dynamic rule", () => {
    expect(requiredPermissionFor("/dashboard/site-pages/about/extra")).toBeNull();
  });

  it("should be case-sensitive (no accidental match on a different casing)", () => {
    expect(requiredPermissionFor("/dashboard/USERS")).toBeNull();
  });
});
