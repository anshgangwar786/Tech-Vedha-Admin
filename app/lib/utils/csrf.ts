import type { NextRequest } from "next/server";

// Cross-site request guard for state-changing API calls.
//
// The auth cookie is SameSite=Strict, but that still lets a request through from
// any *same-site* origin (e.g. the public website or the media host on a sibling
// subdomain), and req.json() parses a text/plain body, so such a request needs
// no CORS preflight. This check closes that gap: a browser write must come from
// the dashboard's own origin.
//
// The dashboard calls its API with relative URLs (lib/axiosInstance.ts), so its
// own requests are always same-origin. Requests without browser headers (server
// scripts, curl) carry no ambient cookies from a victim and are not CSRF.

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** True when an unsafe-method request was sent by a browser from another origin. */
export function isCrossSiteWrite(req: NextRequest): boolean {
  if (!UNSAFE_METHODS.has(req.method.toUpperCase())) return false;

  // Set by every current browser and not forgeable from page script.
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite) return fetchSite !== "same-origin" && fetchSite !== "none";

  // Older browsers: compare Origin with the host the browser addressed.
  const origin = req.headers.get("origin");
  if (!origin) return false;
  if (origin === "null") return true;
  let originHost: string;
  try {
    originHost = new URL(origin).host.toLowerCase();
  } catch {
    return true;
  }
  const hosts = [req.headers.get("x-forwarded-host"), req.headers.get("host")]
    .flatMap((value) => (value ?? "").split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return !hosts.includes(originHost);
}
