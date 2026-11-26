import { describe, expect, it } from "vitest";
import {
  JOIN_DOC_MAX_TOTAL_BYTES,
  WHY_HIRE_MAX_LETTERS,
  countLetters,
  joinDocType,
  limitLetters,
  readJoinDocuments,
  readJoinValues,
  validateJoin,
  validateJoinDocuments,
  withOtherText,
  type JoinFormValues,
} from "./joinForm";

const valid: JoinFormValues = {
  name: "Ravi",
  phone: "9876543210",
  trade: "Mason",
  tradeOther: "",
  experience: "1–3 years",
  location: "Howrah",
  languages: "Bengali, Hindi",
  languageOther: "",
  start: "",
  whyHire: "",
};

describe("countLetters / limitLetters", () => {
  it("should not count spaces or line breaks", () => {
    expect(countLetters("a b\nc\td")).toBe(4);
    expect(countLetters("")).toBe(0);
  });

  it("should cut right after the max-th counted character", () => {
    expect(limitLetters("ab cd ef", 4)).toBe("ab cd");
  });

  it("should return the text unchanged when under the limit", () => {
    expect(limitLetters("abc", 4)).toBe("abc");
    expect(limitLetters("", 4)).toBe("");
  });

  it("should default to WHY_HIRE_MAX_LETTERS", () => {
    expect(countLetters(limitLetters("x ".repeat(100)))).toBe(WHY_HIRE_MAX_LETTERS);
  });
});

describe("readJoinValues", () => {
  it("should keep only known languages in fixed order, once each", () => {
    const fd = new FormData();
    for (const l of ["Hindi", "Klingon", "Bengali", "Hindi"]) fd.append("languages", l);
    expect(readJoinValues(fd).languages).toBe("Bengali, Hindi");
  });

  it("should drop free-text 'other' boxes unless Other was chosen", () => {
    const fd = new FormData();
    fd.set("trade", "Mason");
    fd.set("tradeOther", "Painter");
    fd.set("languageOther", "Odia");
    fd.append("languages", "Hindi");
    const values = readJoinValues(fd);
    expect(values.tradeOther).toBe("");
    expect(values.languageOther).toBe("");
  });

  it("should keep the 'other' text when Other was chosen", () => {
    const fd = new FormData();
    fd.set("trade", "Other");
    fd.set("tradeOther", "Painter");
    fd.append("languages", "Other");
    fd.set("languageOther", "Odia");
    expect(readJoinValues(fd)).toMatchObject({ tradeOther: "Painter", languages: "Other", languageOther: "Odia" });
  });

  it("should cap long input", () => {
    const fd = new FormData();
    fd.set("whyHire", "x".repeat(1000));
    expect(readJoinValues(fd).whyHire).toHaveLength(600);
  });
});

describe("validateJoin", () => {
  it("should accept a valid application", () => {
    expect(validateJoin(valid)).toEqual({});
  });

  it("should reject a trade not in the list", () => {
    expect(validateJoin({ ...valid, trade: "Hacker" }).trade).toBe("Choose your trade.");
  });

  it("should require the other-trade text when Other is chosen", () => {
    expect(validateJoin({ ...valid, trade: "Other", tradeOther: "P" }).tradeOther).toBe("Enter your trade.");
  });

  it("should require at least one language", () => {
    expect(validateJoin({ ...valid, languages: "" }).languages).toBe("Choose at least one language.");
  });

  it("should require the other-language text when Other is chosen", () => {
    expect(validateJoin({ ...valid, languages: "Hindi, Other" }).languageOther).toBe("Enter the language you speak.");
  });

  it("should allow an empty start but reject an unknown one", () => {
    expect(validateJoin({ ...valid, start: "" }).start).toBeUndefined();
    expect(validateJoin({ ...valid, start: "Tomorrow" }).start).toBe("Choose when you can start.");
  });

  it("should cap whyHire by letters, not counting spaces", () => {
    const atLimit = "a ".repeat(WHY_HIRE_MAX_LETTERS);
    expect(validateJoin({ ...valid, whyHire: atLimit }).whyHire).toBeUndefined();
    expect(validateJoin({ ...valid, whyHire: `${atLimit}b` }).whyHire).toMatch(/Keep it to 70 letters/);
  });

  it("should reject a name with digits in any script", () => {
    expect(validateJoin({ ...valid, name: "রবি ৫" }).name).toBe("Name can't contain numbers.");
  });

  it("should report all required-field errors for an empty form", () => {
    const errors = validateJoin({ ...valid, name: "", phone: "", trade: "", experience: "", location: "", languages: "" });
    expect(Object.keys(errors).sort()).toEqual(["experience", "languages", "location", "name", "phone", "trade"]);
  });
});

describe("withOtherText", () => {
  it("should replace the bare Other choice with its text", () => {
    expect(withOtherText("Hindi, Other", "Odia")).toBe("Hindi, Other: Odia");
  });

  it("should leave the choice alone when there is no text", () => {
    expect(withOtherText("Other", "")).toBe("Other");
  });
});

describe("joinDocType", () => {
  it.each([
    [{ name: "cv.pdf", type: "application/pdf" }, "application/pdf"],
    [{ name: "cv.DOCX", type: "" }, "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    [{ name: "photo.jpeg", type: "application/octet-stream" }, "image/jpeg"],
  ])("should allow %j", (file, expected) => {
    expect(joinDocType(file)).toBe(expected);
  });

  it.each([
    { name: "evil.exe", type: "application/x-msdownload" },
    { name: "evil.pdf", type: "text/html" },
    { name: "noext", type: "" },
    { name: "x.svg", type: "image/svg+xml" },
    { name: "x.pdf", type: "toString" },
  ])("should reject %j", (file) => {
    expect(joinDocType(file)).toBeNull();
  });

  // Regression: inherited Object members ("constructor", "__proto__") used to resolve as a type,
  // and matchesMagicBytes() then waved the bytes through in app/api/lead/join/route.ts.
  it.each([
    { name: "payload.constructor", type: "" },
    { name: "payload.__proto__", type: "application/octet-stream" },
    { name: "payload.hasownproperty", type: "" },
    { name: "payload.tostring", type: "" },
  ])("should reject prototype-key extension %j", (file) => {
    expect(joinDocType(file)).toBeNull();
    expect(validateJoinDocuments([{ ...file, size: 10 }])).toMatch(/PDF, JPG, PNG or Word/);
  });
});

describe("validateJoinDocuments", () => {
  const pdf = (size: number) => ({ name: "a.pdf", type: "application/pdf", size });

  it("should accept no files", () => {
    expect(validateJoinDocuments([])).toBeUndefined();
  });

  it("should accept up to 3 files at exactly the size cap", () => {
    expect(validateJoinDocuments([pdf(JOIN_DOC_MAX_TOTAL_BYTES - 2), pdf(1), pdf(1)])).toBeUndefined();
  });

  it("should reject more than 3 files", () => {
    expect(validateJoinDocuments([pdf(1), pdf(1), pdf(1), pdf(1)])).toBe("Upload up to 3 files.");
  });

  it("should reject a disallowed type", () => {
    expect(validateJoinDocuments([{ name: "x.exe", type: "application/x-msdownload", size: 1 }])).toMatch(/PDF, JPG, PNG or Word/);
  });

  it("should reject a total one byte over the cap", () => {
    expect(validateJoinDocuments([pdf(JOIN_DOC_MAX_TOTAL_BYTES + 1)])).toBe("Files are too large together (max 4 MB).");
  });
});

describe("readJoinDocuments", () => {
  it("should keep only non-empty files", () => {
    const fd = new FormData();
    fd.append("documents", new File(["data"], "cv.pdf"));
    fd.append("documents", new File([], "empty.pdf"));
    fd.append("documents", "not-a-file");
    expect(readJoinDocuments(fd).map((f) => f.name)).toEqual(["cv.pdf"]);
  });
});
