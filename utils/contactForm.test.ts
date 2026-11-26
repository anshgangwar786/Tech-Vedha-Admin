import { describe, expect, it } from "vitest";
import { CONTACT_SERVICES, EMPTY_CONTACT_VALUES, readContactValues, validateContact, type ContactFormValues } from "./contactForm";

const valid: ContactFormValues = {
  service: "Site labour supply",
  serviceOther: "",
  name: "Ravi",
  companyName: "Acme",
  phone: "+91 98765 43210",
  siteLocation: "Kolkata",
  headcount: "25",
  startDate: "2026-04-01",
  note: "",
};

describe("validateContact", () => {
  it("should accept a valid enquiry", () => {
    expect(validateContact(valid)).toEqual({});
  });

  it("should reject a service outside the list", () => {
    expect(validateContact({ ...valid, service: "Hacking" }).service).toBe("Choose what you need.");
  });

  it("should require a description when 'Others' is chosen", () => {
    expect(validateContact({ ...valid, service: "Others", serviceOther: "" }).serviceOther).toBe("Tell us what you need.");
    expect(validateContact({ ...valid, service: "Others", serviceOther: "Cranes" })).toEqual({});
  });

  it("should require start date (unlike the homepage form)", () => {
    expect(validateContact({ ...valid, startDate: "" }).startDate).toBe("Choose a start date.");
  });

  it("should reject an impossible start date", () => {
    expect(validateContact({ ...valid, startDate: "2026-02-31" }).startDate).toBe("Choose a valid date.");
  });

  it("should require a company name", () => {
    expect(validateContact({ ...valid, companyName: "A" }).companyName).toBe("Enter your company name.");
  });

  it.each(["0", "5001", "abc", "2.5", "-3"])("should reject headcount %j", (headcount) => {
    expect(validateContact({ ...valid, headcount }).headcount).toBe("Enter 1 to 5000.");
  });

  // Regression: Number() accepts exponent/hex forms, which used to pass and be stored verbatim.
  it.each(["1e3", "0x10", "+5", "5.0"])("should reject non-decimal headcount %j", (headcount) => {
    expect(validateContact({ ...valid, headcount }).headcount).toBe("Enter 1 to 5000.");
  });

  it("should report every required field for the empty form", () => {
    const errors = validateContact(EMPTY_CONTACT_VALUES);
    expect(Object.keys(errors).sort()).toEqual(["companyName", "headcount", "name", "phone", "siteLocation", "startDate"]);
  });
});

describe("readContactValues", () => {
  it("should trim and cap each field", () => {
    const fd = new FormData();
    fd.set("service", ` ${CONTACT_SERVICES[1]} `);
    fd.set("note", "n".repeat(2000));
    const values = readContactValues(fd);
    expect(values.service).toBe(CONTACT_SERVICES[1]);
    expect(values.note).toHaveLength(1000);
  });

  it("should leave service empty (invalid) when it is missing, not silently default", () => {
    const values = readContactValues(new FormData());
    expect(values.service).toBe("");
    expect(validateContact(values).service).toBe("Choose what you need.");
  });
});
