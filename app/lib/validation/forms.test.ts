import { describe, expect, it } from "vitest";
import {
  SLUG_MAX,
  firstError,
  toSlug,
  validateHexColor,
  validateOptionalUrl,
  validatePassword,
  validateRequiredText,
  validateSlug,
  validateUsername,
} from "./forms";

describe("validateUsername", () => {
  it.each(["abc", "a".repeat(30), "  alice  ", "user_name.1"])("should accept %j", (v) => {
    expect(validateUsername(v)).toBeNull();
  });

  it.each([
    [undefined, "Username is required."],
    [123, "Username is required."],
    ["   ", "Username is required."],
    ["ab", "Username must be 3–30 characters."],
    ["a".repeat(31), "Username must be 3–30 characters."],
    ["al ice", "Username can't contain spaces."],
  ])("should reject %j", (v, message) => {
    expect(validateUsername(v)).toBe(message);
  });
});

describe("validatePassword", () => {
  it("should accept 8 to 72 bytes", () => {
    expect(validatePassword("12345678")).toBeNull();
    expect(validatePassword("x".repeat(72))).toBeNull();
  });

  it.each([
    [undefined, "Password is required."],
    ["", "Password is required."],
    [12345678, "Password is required."],
    ["1234567", "Password must be at least 8 characters."],
    ["x".repeat(73), "Password must be at most 72 characters."],
  ])("should reject %j", (v, message) => {
    expect(validatePassword(v)).toBe(message);
  });

  it("should measure the bcrypt limit in UTF-8 bytes, not characters", () => {
    // 25 × "€" = 25 chars but 75 bytes: bcrypt would silently truncate it.
    expect(validatePassword("€".repeat(25))).toBe("Password must be at most 72 characters.");
  });

  it("should not trim the password", () => {
    expect(validatePassword("        ")).toBeNull();
  });
});

describe("validateSlug", () => {
  it.each(["a", "my-first-post", "post-2026"])("should accept %j", (v) => {
    expect(validateSlug(v)).toBeNull();
  });

  it.each(["My-Post", "my--post", "-post", "post-", "my_post", "my post", "पोस्ट"])("should reject %j", (v) => {
    expect(validateSlug(v)).toMatch(/lowercase letters/);
  });

  it("should enforce the length cap", () => {
    expect(validateSlug("a".repeat(SLUG_MAX))).toBeNull();
    expect(validateSlug("a".repeat(SLUG_MAX + 1))).toBe(`Slug must be at most ${SLUG_MAX} characters.`);
    expect(validateSlug("abcd", 3)).toBe("Slug must be at most 3 characters.");
  });

  it("should require a value", () => {
    expect(validateSlug(null)).toBe("Slug is required.");
  });
});

describe("toSlug", () => {
  it.each([
    ["Hello, World!", "hello-world"],
    ["  Café Déjà Vu  ", "cafe-deja-vu"],
    ["---a---b---", "a-b"],
    ["!!!", ""],
    ["", ""],
  ])("should turn %j into %j", (input, expected) => {
    expect(toSlug(input)).toBe(expected);
  });

  it("should produce a slug that passes validateSlug", () => {
    expect(validateSlug(toSlug("Some Weird -- Title (2026)"))).toBeNull();
  });

  it("should not leave a trailing hyphen after truncation", () => {
    expect(toSlug("abc def", 4)).toBe("abc");
  });
});

describe("validateHexColor", () => {
  it.each(["", "  ", undefined, "#17d", "#1570D6"])("should accept %j", (v) => {
    expect(validateHexColor(v)).toBeNull();
  });

  it.each(["1570d6", "#12", "#12345", "#ggg", "red", "#1570d6ff"])("should reject %j", (v) => {
    expect(validateHexColor(v)).toBe("Use a hex colour like #1570d6.");
  });
});

describe("validateOptionalUrl", () => {
  it.each(["", "/about", "/a/b?c=d", "https://x.com/i.jpg", "http://x.com"])("should accept %j", (v) => {
    expect(validateOptionalUrl(v)).toBeNull();
  });

  it("should reject a site path containing spaces", () => {
    expect(validateOptionalUrl("/a b")).toBe("Remove the spaces.");
  });

  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://x.com", "mailto:a@b.co"])("should reject non-http scheme %j", (v) => {
    expect(validateOptionalUrl(v)).toBe("Use an http(s) link.");
  });

  it.each(["//evil.com/x", "not a url", "x.com"])("should reject protocol-relative or bare %j", (v) => {
    expect(validateOptionalUrl(v)).toMatch(/Enter a full link/);
  });
});

describe("validateRequiredText", () => {
  it("should apply label, min and max", () => {
    expect(validateRequiredText("", "Title", 10)).toBe("Title is required.");
    expect(validateRequiredText("ab", "Title", 10, 3)).toBe("Title must be at least 3 characters.");
    expect(validateRequiredText("x".repeat(11), "Title", 10)).toBe("Title must be at most 10 characters.");
    expect(validateRequiredText(" ok ", "Title", 2)).toBeNull();
  });
});

describe("firstError", () => {
  it("should return the first non-null message", () => {
    expect(firstError(null, "a", "b")).toBe("a");
  });

  it("should return null when every check passes or none are given", () => {
    expect(firstError(null, null)).toBeNull();
    expect(firstError()).toBeNull();
  });
});
