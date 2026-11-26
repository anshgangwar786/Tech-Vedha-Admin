// Email / phone / WhatsApp checks for the site page editors (client) and the save API (server), so both
// accept and reject exactly the same values. Which fields are checked is declared per page in its definition
// (`formats`, app/lib/content/site-page-defs/*.ts).
//
// The website links these values as mailto:, tel:+<digits> and wa.me/<digits>, so a phone or WhatsApp number
// needs its country code to work.

import type { PlainObject } from "./mergeContent";

/**
 * - "email" / "phone": required, must be valid.
 * - "whatsapp": may be empty (the website then uses the phone number), else a valid number.
 * - "contact-row": a Contact page row or card, checked by its icon: Envelope = email, Phone = number,
 *   Speech bubble = a number when it looks like one (it may also be text such as "Chat with our team").
 */
export type ContactFormat = "email" | "phone" | "whatsapp" | "contact-row";

const EMAIL_EXAMPLE = "e.g. info@techvedha.tech";
const PHONE_EXAMPLE = "e.g. +91 98765 43210";

const digitsOnly = (value: string) => value.replace(/\D/g, "");

/** Why an email address can't be used, or null when it is fine. */
export function emailError(raw: string): string | null {
  const value = raw.trim();
  if (!value) return `Enter an email address, ${EMAIL_EXAMPLE}`;
  if (value.length > 254) return "This email address is too long.";
  if (/\s/.test(value)) return "Remove the spaces from the email address.";
  const parts = value.split("@");
  if (parts.length !== 2) return `Use exactly one @, ${EMAIL_EXAMPLE}`;
  const [local, domain] = parts;
  if (!local) return "Add the name before the @.";
  if (local.startsWith(".") || local.endsWith(".") || local.includes("..")) return "Check the dots before the @.";
  if (!/^[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(domain) || /(^|\.)-|-(\.|$)/.test(domain)) {
    return `Check the part after the @, ${EMAIL_EXAMPLE}`;
  }
  return null;
}

/** Why a phone / WhatsApp number can't be used, or null when it is fine. */
export function phoneError(raw: string, what = "phone number"): string | null {
  const value = raw.trim();
  if (!value) return `Enter a ${what}, ${PHONE_EXAMPLE}`;
  if (!/^\+?[\d\s().-]+$/.test(value)) return `Use only digits, spaces and an optional + at the start, ${PHONE_EXAMPLE}`;
  const digits = digitsOnly(value).length;
  if (digits <= 10) return `Add the country code before the number, ${PHONE_EXAMPLE}`;
  if (digits > 15) return `Too many digits: a ${what} has at most 15, country code included.`;
  return null;
}

/** Looks like a number rather than text (used for Speech-bubble rows, which may hold either). */
const looksLikeNumber = (value: string) => /^\+?[\d\s().-]+$/.test(value.trim()) && /\d/.test(value);

/** Why `value` doesn't fit `format`, or null when it is fine. `icon` is the row's icon for "contact-row". */
export function formatError(format: ContactFormat, value: string, icon?: unknown): string | null {
  switch (format) {
    case "email":
      return emailError(value);
    case "phone":
      return phoneError(value);
    case "whatsapp":
      return value.trim() ? phoneError(value, "WhatsApp number") : null;
    case "contact-row":
      if (!value.trim()) return null;
      if (icon === "mail") return emailError(value);
      if (icon === "phone") return phoneError(value);
      if (icon === "chat" && looksLikeNumber(value)) return phoneError(value, "WhatsApp number");
      return null;
  }
}

export interface FormatProblem {
  /** Path of the field in the content, e.g. ["brandCard", "quickContacts", 0, "value"]. */
  path: (string | number)[];
  message: string;
}

const isObject = (value: unknown): value is PlainObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Every field matching `pattern` ("a.b[].c"), with its path and its parent object. */
function fieldsAt(content: unknown, pattern: string) {
  const out: { path: (string | number)[]; value: unknown; parent: PlainObject }[] = [];
  const walk = (node: unknown, parts: string[], path: (string | number)[]) => {
    if (!isObject(node)) return;
    const [part, ...rest] = parts;
    const list = part.endsWith("[]");
    const key = list ? part.slice(0, -2) : part;
    const child = node[key];
    if (!rest.length) {
      if (!list) out.push({ path: [...path, key], value: child, parent: node });
      return;
    }
    if (list) {
      if (Array.isArray(child)) child.forEach((item, i) => walk(item, rest, [...path, key, i]));
    } else {
      walk(child, rest, [...path, key]);
    }
  };
  walk(content, pattern.split("."), []);
  return out;
}

/** Problems with the email / phone / WhatsApp fields declared in `formats`, in declaration order. */
export function findFormatProblems(formats: Record<string, ContactFormat> | undefined, content: unknown): FormatProblem[] {
  if (!formats) return [];
  return Object.entries(formats).flatMap(([pattern, format]) =>
    fieldsAt(content, pattern).flatMap(({ path, value, parent }) => {
      const message = formatError(format, typeof value === "string" ? value : "", parent.icon);
      return message ? [{ path, message }] : [];
    }),
  );
}

/** "a.b[].c" pattern of a concrete path (list indexes become "[]"). */
export const patternOfPath = (path: readonly (string | number)[]) =>
  path.reduce<string>((acc, part) => (typeof part === "number" ? `${acc}[]` : acc ? `${acc}.${part}` : part), "");
