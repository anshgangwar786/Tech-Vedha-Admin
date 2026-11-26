import { describe, expect, it } from "vitest";
import { emailError, findFormatProblems, formatError, phoneError } from "./contactFormats";

describe("emailError", () => {
  it.each(["info@techvedha.tech", "a.b+c@mail.co.in", " hello@x.io "])("accepts %s", (v) => expect(emailError(v)).toBeNull());
  it.each(["", "info", "a@b", "a@@b.com", "a b@c.com", ".a@b.com", "a..b@c.com", "a@-b.com", "a@b.c", "@b.com"])(
    "rejects %j",
    (v) => expect(emailError(v)).not.toBeNull(),
  );
});

describe("phoneError", () => {
  it.each(["+91 98765 43210", "919876543210", "+1 (415) 555-0123", "+44 20 7946 0958"])("accepts %s", (v) =>
    expect(phoneError(v)).toBeNull(),
  );
  it.each(["", "98765 43210", "+91 98765 abc10", "12345", "91+9876543210", "+1234567890123456"])("rejects %j", (v) =>
    expect(phoneError(v)).not.toBeNull(),
  );
});

describe("formatError", () => {
  it("lets WhatsApp be empty", () => expect(formatError("whatsapp", "")).toBeNull());
  it("checks Contact rows by icon", () => {
    expect(formatError("contact-row", "nope", "mail")).not.toBeNull();
    expect(formatError("contact-row", "Chat with our team", "chat")).toBeNull();
    expect(formatError("contact-row", "98765", "chat")).not.toBeNull();
    expect(formatError("contact-row", "", "phone")).toBeNull();
  });
});

describe("findFormatProblems", () => {
  it("finds fields in lists with their paths", () => {
    const content = { email: "bad", rows: [{ icon: "phone", value: "+91 98765 43210" }, { icon: "phone", value: "123" }] };
    const problems = findFormatProblems({ email: "email", "rows[].value": "contact-row" }, content);
    expect(problems.map((p) => p.path)).toEqual([["email"], ["rows", 1, "value"]]);
  });
});
