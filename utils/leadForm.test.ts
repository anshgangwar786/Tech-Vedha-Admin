import { describe, expect, it } from "vitest";
import {
  EMAIL_ERRORS,
  LEAD_SOURCE,
  PHONE_ERRORS,
  isValidEmail,
  isValidIndianMobile,
  leadSourceFor,
  normalizeIndianMobile,
  readLeadServices,
  readLeadValues,
  validateEmail,
  validateIndianMobile,
  validateLead,
  validateLeadFields,
  validatePersonName,
} from "./leadForm";
import type { LeadFormValues } from "@/types/homepage";

const form = (entries: [string, string | Blob][]) => {
  const fd = new FormData();
  for (const [k, v] of entries) fd.append(k, v);
  return fd;
};

describe("validateIndianMobile", () => {
  it.each(["9876543210", "98765 43210", "98765-43210", "+91 98765 43210", "91 9876543210", "09876543210", "(98765) 43210", "5000000000"])(
    "should accept %j",
    (input) => {
      expect(validateIndianMobile(input)).toBeNull();
    },
  );

  it.each([
    ["", PHONE_ERRORS.required],
    ["   ", PHONE_ERRORS.required],
    ["98765abc10", PHONE_ERRORS.characters],
    ["++919876543210", PHONE_ERRORS.characters],
    ["98765+43210", PHONE_ERRORS.characters],
    ["987654321", PHONE_ERRORS.length],
    ["98765432101", PHONE_ERRORS.length],
    ["919876543", PHONE_ERRORS.length],
    ["4876543210", PHONE_ERRORS.start],
    ["0000000000", PHONE_ERRORS.start],
    ["+91 4876543210", PHONE_ERRORS.start],
  ])("should reject %j with %j", (input, message) => {
    expect(validateIndianMobile(input)).toBe(message);
  });

  it("should not strip a 91 prefix from a genuine 10-digit number", () => {
    expect(validateIndianMobile("9198765432")).toBeNull();
  });
});

describe("normalizeIndianMobile", () => {
  it.each([
    ["98765 43210", "+91 9876543210"],
    ["+91-98765-43210", "+91 9876543210"],
    ["09876543210", "+91 9876543210"],
  ])("should store %j as %j", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it("should return null for an invalid number", () => {
    expect(normalizeIndianMobile("12345")).toBeNull();
  });
});

describe("validateEmail", () => {
  it.each(["a@b.co", "first.last+tag@sub.example.com", "ünïcode@example.in", "A@EXAMPLE.COM", "  padded@example.com  "])(
    "should accept %j",
    (input) => {
      expect(validateEmail(input)).toBeNull();
    },
  );

  it.each([
    ["", EMAIL_ERRORS.required],
    ["a b@x.com", EMAIL_ERRORS.spaces],
    ["ax.com", EMAIL_ERRORS.at],
    ["a@@x.com", EMAIL_ERRORS.at],
    ["@x.com", EMAIL_ERRORS.local],
    [".a@x.com", EMAIL_ERRORS.dots],
    ["a.@x.com", EMAIL_ERRORS.dots],
    ["a..b@x.com", EMAIL_ERRORS.dots],
    ["a@", EMAIL_ERRORS.domain],
    ["a@localhost", EMAIL_ERRORS.domain],
    ["a@x.c", EMAIL_ERRORS.domain],
    ["a@-x.com", EMAIL_ERRORS.domain],
    ["a@x.123", EMAIL_ERRORS.domain],
    [`${"a".repeat(65)}@x.com`, EMAIL_ERRORS.tooLong],
    [`a@${"b".repeat(186)}.com`, EMAIL_ERRORS.tooLong],
  ])("should reject %j with %j", (input, message) => {
    expect(validateEmail(input)).toBe(message);
  });

  it("should accept an email exactly 191 characters long", () => {
    const email = `a@${"b".repeat(60)}.${"c".repeat(61)}.${"d".repeat(63)}.in`;
    expect(email).toHaveLength(191);
    expect(validateEmail(email)).toBeNull();
  });
});

describe("validatePersonName", () => {
  it.each(["Jo", "Ravi Kumar", "O'Brien", "Anne-Marie", "J. R. Smith", "রবি", "रवि कुमार"])("should accept %j", (name) => {
    expect(validatePersonName(name)).toBeNull();
  });

  it.each([
    ["", "Name is required."],
    ["J", "Enter at least 2 characters."],
    ["x".repeat(101), "Name is too long."],
    ["Agent 47", "Name can't contain numbers."],
    ["রবি ৫", "Name can't contain numbers."],
    ["रवि ५", "Name can't contain numbers."],
    ["-Ravi", "Use letters only."],
    ["Ravi <script>", "Use letters only."],
    ["Ravi@Kumar", "Use letters only."],
  ])("should reject %j with %j", (name, message) => {
    expect(validatePersonName(name)).toBe(message);
  });
});

describe("validateLeadFields", () => {
  const valid = { name: "Ravi", email: "r@x.com", phoneNo: "9876543210" };

  it("should return no errors for valid input", () => {
    expect(validateLeadFields(valid)).toEqual({});
  });

  it("should treat non-string values as empty", () => {
    expect(validateLeadFields({ name: 42, email: null, phoneNo: ["9876543210"] })).toEqual({
      name: "Name is required.",
      email: EMAIL_ERRORS.required,
      phoneNo: PHONE_ERRORS.required,
    });
  });

  it("should skip absent fields in partial mode but still check present ones", () => {
    expect(validateLeadFields({ email: "bad" }, true)).toEqual({ email: EMAIL_ERRORS.at });
    expect(validateLeadFields({}, true)).toEqual({});
  });

  it("should still check an explicit empty string in partial mode", () => {
    expect(validateLeadFields({ name: "" }, true)).toEqual({ name: "Name is required." });
  });
});

describe("boolean wrappers", () => {
  it("should mirror the validators", () => {
    expect(isValidIndianMobile("9876543210")).toBe(true);
    expect(isValidIndianMobile("123")).toBe(false);
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
  });
});

describe("leadSourceFor", () => {
  it("should label the homepage paths as Homepage", () => {
    expect(leadSourceFor("/", "Anything")).toBe("Request workers — Homepage (/)");
    expect(leadSourceFor("/bn/", "x")).toBe("Request workers — Homepage (/bn/)");
  });

  it("should use the title without the site suffix on other pages", () => {
    expect(leadSourceFor("/services/masons", "Masons | Joy Maa Tara")).toBe("Request workers — Masons (/services/masons)");
  });

  it("should fall back to 'Page' when the title is empty", () => {
    expect(leadSourceFor("/x", "")).toBe("Request workers — Page (/x)");
  });

  it.each([undefined, null, 5, "", "services", "https://evil.com/"])("should fall back to LEAD_SOURCE for path %j", (path) => {
    expect(leadSourceFor(path, "t")).toBe(LEAD_SOURCE);
  });

  it("should strip control characters and stay under the 191-char column", () => {
    const result = leadSourceFor(`/${"p".repeat(200)}`, `Title\u0000\nInjected${"t".repeat(200)}`);
    expect(result).not.toMatch(/[\u0000-\u001f]/);
    expect(result.length).toBeLessThanOrEqual(191);
  });
});

describe("readLeadServices", () => {
  it("should clean, de-duplicate and keep order", () => {
    const fd = form([["services", " Mason "], ["services", "Welder"], ["services", "Mason"], ["services", ""], ["services", "A\u0000B"]]);
    expect(readLeadServices(fd)).toEqual(["Mason", "Welder", "A B"]);
  });

  it("should ignore file entries and cap at 40 names of 80 chars", () => {
    const entries: [string, string | Blob][] = [["services", new Blob(["x"])]];
    for (let i = 0; i < 50; i++) entries.push(["services", `${i}`.padEnd(100, "x")]);
    const result = readLeadServices(form(entries));
    expect(result).toHaveLength(40);
    expect(result.every((s) => s.length === 80)).toBe(true);
  });

  it("should return an empty list when none are sent", () => {
    expect(readLeadServices(new FormData())).toEqual([]);
  });
});

describe("readLeadValues", () => {
  it("should trim, cap lengths and default missing or file fields to empty", () => {
    const fd = form([["name", "  Ravi  "], ["phone", "9".repeat(50)], ["email", new Blob(["x"])]]);
    const values = readLeadValues(fd);
    expect(values.name).toBe("Ravi");
    expect(values.phone).toHaveLength(20);
    expect(values.email).toBe("");
    expect(values.siteLocation).toBe("");
  });
});

describe("validateLead", () => {
  const valid: LeadFormValues = {
    companyName: "Acme",
    name: "Ravi",
    phone: "9876543210",
    email: "r@x.com",
    siteLocation: "Kolkata",
    headcount: "10",
    startDate: "2026-02-28",
  };

  it("should accept a complete valid lead", () => {
    expect(validateLead(valid)).toEqual({});
  });

  it("should allow an empty start date", () => {
    expect(validateLead({ ...valid, startDate: "" })).toEqual({});
  });

  it.each([
    ["0", "Enter 1 to 5000."],
    ["-1", "Enter 1 to 5000."],
    ["5001", "Enter 1 to 5000."],
    ["2.5", "Enter 1 to 5000."],
    ["abc", "Enter 1 to 5000."],
    ["1e3", "Enter 1 to 5000."],
    ["0x10", "Enter 1 to 5000."],
    ["", "Enter how many workers."],
  ])("should reject headcount %j", (headcount, message) => {
    expect(validateLead({ ...valid, headcount }).headcount).toBe(message);
  });

  it.each(["1", "5000", "007"])("should accept boundary headcount %j", (headcount) => {
    expect(validateLead({ ...valid, headcount }).headcount).toBeUndefined();
  });

  it.each(["2026-02-30", "2025-02-29", "2026-13-01", "28/02/2026", "2026-2-1"])("should reject impossible date %j", (startDate) => {
    expect(validateLead({ ...valid, startDate }).startDate).toBe("Choose a valid date.");
  });

  it("should accept a leap day", () => {
    expect(validateLead({ ...valid, startDate: "2028-02-29" }).startDate).toBeUndefined();
  });

  it("should report every invalid field at once", () => {
    const errors = validateLead({ ...valid, name: "R", phone: "", email: "", siteLocation: "K", headcount: "" });
    expect(Object.keys(errors).sort()).toEqual(["email", "headcount", "name", "phone", "siteLocation"]);
  });
});
