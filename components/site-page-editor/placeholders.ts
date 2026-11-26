// Placeholders such as "{n}" or "{title}" are filled in by the website, but they look like code.
// The editors never show them: "{n}" is shown (and typed) as "[step number]", and turned back into "{n}" on save.
// "{count}" is no longer used: headings spell the number out ("Four wings."). Older saved text that still has it
// is shown with the number filled in, so it reads exactly as it does on the website.

export interface Placeholder {
  /** What the admin sees inside the square brackets. */
  label: string;
  /** Plain explanation for the hint under the field. */
  meaning: string;
}

const PLACEHOLDERS: Record<string, Placeholder> = {
  n: { label: "step number", meaning: "the step's number, e.g. 2" },
  total: { label: "number of steps", meaning: "how many steps there are, e.g. 6" },
  number: { label: "step number", meaning: "the step's number, e.g. 02" },
  title: { label: "card title", meaning: "the card's title" },
  name: { label: "brand name", meaning: "your brand name from Site & Menus" },
  year: { label: "this year", meaning: "the current year, e.g. 2026" },
  email: { label: "email address", meaning: "your email address from Site & Menus" },
  field: { label: "box name", meaning: "the name of the box filled in wrong, e.g. Email" },
  max: { label: "letter limit", meaning: "the most letters allowed, e.g. 100" },
  list: { label: "chosen roles", meaning: "the names of the chosen roles, e.g. Mason, Welder" },
};

/** Same placeholder, different meaning, keyed by the field's own name. */
const BY_FIELD: Record<string, Record<string, Placeholder>> = {
  titleTemplate: { title: { label: "page title", meaning: "the page's own title" } },
  stepColumnLabel: { title: { label: "step title", meaning: "the step's title" } },
  summary: { n: { label: "how many", meaning: "how many roles are chosen, e.g. 3" } },
  summaryShort: { n: { label: "how many", meaning: "how many roles are chosen, e.g. 3" } },
};

const TOKEN = /\{([a-zA-Z]+)\}/g;

const placeholderFor = (field: string, token: string): Placeholder | undefined =>
  BY_FIELD[field]?.[token] ?? PLACEHOLDERS[token];

function tokensIn(texts: readonly unknown[]): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (typeof text !== "string") continue;
    for (const [, token] of text.matchAll(TOKEN)) if (token !== "count") found.add(token);
  }
  return [...found].filter((token) => PLACEHOLDERS[token]);
}

export interface FriendlyText {
  /** Stored text → what the admin sees. */
  toView: (text: string) => string;
  /** What the admin typed → stored text. */
  fromView: (text: string) => string;
  /** Plain-words hint, or "" when the field has no placeholders. */
  note: string;
}

/**
 * Plain-words version of a text field.
 * @param field   The field's own name (last part of its path).
 * @param samples Default and current text(s) of the field, to find its placeholders.
 * @param count   The number in words for older text that still says "{count}".
 */
export function friendlyText(field: string, samples: readonly unknown[], count?: string): FriendlyText {
  const tokens = tokensIn(samples);
  const pairs = tokens.map((token) => ({ token, ...placeholderFor(field, token)! }));
  const toView = (text: string) => {
    let out = count === undefined ? text : text.replaceAll("{count}", count);
    for (const p of pairs) out = out.replaceAll(`{${p.token}}`, `[${p.label}]`);
    return out;
  };
  const fromView = (text: string) => {
    let out = text;
    for (const p of pairs) out = out.replaceAll(`[${p.label}]`, `{${p.token}}`);
    return out;
  };
  const note = pairs.length
    ? `The website fills in the words in [square brackets] by itself: ${pairs
        .map((p) => `[${p.label}] becomes ${p.meaning}`)
        .join("; ")}. Type them exactly like that, or delete them.`
    : "";
  return { toView, fromView, note };
}

/** "Four", "Five" … like the website's countWord(). */
export function countWord(count: number): string {
  const words = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];
  return words[count] ?? String(count);
}
