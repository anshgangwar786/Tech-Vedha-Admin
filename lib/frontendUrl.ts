// Where the Tech-Vedha-frontend website lives. Used by "View live" / "Preview" links
// (browser) and by cache revalidation (server).
//
// Order:
//   1. The configured env value, unless it points at localhost while the admin
//      itself is deployed (a common mistake: copying the local .env to Vercel).
//   2. Deployed admin → the deployed website. Local dev → http://localhost:3002.


/**
 * Fallback on a deployed admin when FRONTEND_URL is unset or points at localhost.
 * Never "": an empty origin turns "Preview" / "View live" into links on the admin itself.
 * When the site moves to its own domain (Hostinger), set FRONTEND_URL there; this stays a fallback.
 */
export const DEPLOYED_FRONTEND_URL = "https://tech-vedha-frontend.vercel.app";
const LOCAL_FRONTEND_URL = "http://localhost:3002";

/** Trims whitespace, surrounding quotes and trailing slashes from an env value. */
export const cleanOrigin = (v: string | null | undefined) =>
  (v ?? "").trim().replace(/^['"]|['"]$/g, "").trim().replace(/\/+$/, "");

export const isLocalUrl = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(:|\/|$)/i.test(url);

/** True when this admin is running somewhere other than a developer's machine. */
export function isDeployed(): boolean {
  if (typeof window !== "undefined") return !isLocalUrl(window.location.origin);
  // Not NODE_ENV: a local `npm run build && npm start` is "production" too but must keep localhost.
  // Elsewhere (Hostinger) FRONTEND_URL is set to the real domain, so no guess is needed.
  return Boolean(process.env.VERCEL);
}

/** Configured URL if usable here, otherwise the right default for this environment. */
export function resolveFrontendUrl(value: string | null | undefined): string {
  const url = cleanOrigin(value);
  const deployed = isDeployed();
  if (url && !(deployed && isLocalUrl(url))) return url;
  return deployed ? DEPLOYED_FRONTEND_URL : LOCAL_FRONTEND_URL;
}

/**
 * Public URL of the website, for links opened in the browser.
 * NEXT_PUBLIC_* must be referenced literally so Next inlines it at build time.
 */
export const FRONTEND_URL = resolveFrontendUrl(process.env.NEXT_PUBLIC_FRONTEND_URL);

/**
 * "View live" link: leaves preview first, because Preview's Draft Mode cookie
 * applies to the whole browser and would otherwise show the unsaved draft here too.
 */
export const liveSiteUrl = (path = "/") =>
  `${FRONTEND_URL}/api/preview?exit=1&path=${encodeURIComponent(path)}`;
