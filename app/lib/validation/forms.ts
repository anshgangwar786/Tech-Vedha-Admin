// Shared validation rules for the dashboard forms and the API routes behind them.
// Pure functions with no server imports, so the browser and the server check exactly the same thing.
// Each returns null when the value is valid, otherwise one short, user-facing message.

export { validateEmail } from "@/utils/leadForm";

// ── Accounts ─────────────────────────────────────────────────────────────────

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 30;
export const PASSWORD_MIN = 8;
/** bcrypt ignores everything after 72 bytes, so longer passwords would give a false sense of strength. */
export const PASSWORD_MAX = 72;

export function validateUsername(input: unknown): string | null {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "Username is required.";
  if (value.length < USERNAME_MIN || value.length > USERNAME_MAX) {
    return `Username must be ${USERNAME_MIN}–${USERNAME_MAX} characters.`;
  }
  if (/\s/.test(value)) return "Username can't contain spaces.";
  return null;
}

export function validatePassword(input: unknown): string | null {
  if (typeof input !== "string" || !input) return "Password is required.";
  if (input.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters.`;
  if (new TextEncoder().encode(input).length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters.`;
  return null;
}

// ── Slugs, colours, URLs ─────────────────────────────────────────────────────

/** Lowercase letters and digits in words joined by single hyphens: "my-first-post". */
export const SLUG_PATTERN = "[a-z0-9]+(-[a-z0-9]+)*";
const SLUG_RE = new RegExp(`^${SLUG_PATTERN}$`);
/** Unique string columns are VARCHAR(191) in MySQL. */
export const SLUG_MAX = 191;

export function validateSlug(input: unknown, max = SLUG_MAX): string | null {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return "Slug is required.";
  if (value.length > max) return `Slug must be at most ${max} characters.`;
  if (!SLUG_RE.test(value)) return "Use lowercase letters, numbers and single hyphens (e.g. my-post).";
  return null;
}

/** Turns any text into a valid slug ("Hello, World!" → "hello-world"). */
export function toSlug(input: string, max = SLUG_MAX): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/, "");
}

/** "#1570d6" or "#17d"; empty is allowed (no colour). */
export function validateHexColor(input: unknown): string | null {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return null;
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? null : "Use a hex colour like #1570d6.";
}

/** An http(s) link or a site path starting with "/"; empty is allowed. */
export function validateOptionalUrl(input: unknown): string | null {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return /\s/.test(value) ? "Remove the spaces." : null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? null : "Use an http(s) link.";
  } catch {
    return "Enter a full link, like https://example.com/image.jpg";
  }
}

/** Required text with a length range. */
export function validateRequiredText(input: unknown, label: string, max: number, min = 1): string | null {
  const value = typeof input === "string" ? input.trim() : "";
  if (!value) return `${label} is required.`;
  if (value.length < min) return `${label} must be at least ${min} characters.`;
  if (value.length > max) return `${label} must be at most ${max} characters.`;
  return null;
}

/** First message from a list of checks, or null when all pass. */
export const firstError = (...errors: (string | null)[]) => errors.find(Boolean) ?? null;
