import type { NextConfig } from "next";

// The website's URL. FRONTEND_URL is the only one you need to set: locally it is
// http://localhost:3002 (.env), on Vercel the website's https://….vercel.app URL
// (Project → Settings → Environment Variables). NEXT_PUBLIC_FRONTEND_URL and
// PRODUCTION_URL default to it; set them only to point somewhere different.
const envValue = (name: string) => (process.env[name] ?? "").trim().replace(/^['"]|['"]$/g, "").trim();
// On Vercel a localhost value (pasted from a local .env) counts as unset, so it can't be baked in.
const isLocalhost = (v: string) => /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(v);
const unusable = (name: string) => !envValue(name) || (Boolean(process.env.VERCEL) && isLocalhost(envValue(name)));
const FRONTEND_DEFAULTS = Object.fromEntries(
  ["NEXT_PUBLIC_FRONTEND_URL", "PRODUCTION_URL"]
    .filter((name) => unusable(name) && envValue("FRONTEND_URL") && !unusable("FRONTEND_URL"))
    .map((name) => [name, envValue("FRONTEND_URL")]),
);
// Also overwrite process.env so Next's own NEXT_PUBLIC_* inlining sees the corrected value.
Object.assign(process.env, FRONTEND_DEFAULTS);

// Check a Vercel *production* build's settings. Previews/local unaffected.
//  • Secrets the admin cannot run without → fail the build.
//  • Frontend URL → only warn. Without it "View live" / "Preview" links and
//    cache refreshes do nothing on the deployed admin
//    (NEXT_PUBLIC_* values are inlined at build time — redeploy after setting).
if (process.env.VERCEL_ENV === "production") {
  const isBad = (name: string, allowLocalhost = false) => {
    const value = process.env[name] ?? "";
    return !value.trim() || (!allowLocalhost && /localhost|127\.0\.0\.1/.test(value));
  };

  const missingSecrets = ["DATABASE_URL", "JWT_SECRET", "REVALIDATE_SECRET"].filter((name) =>
    isBad(name, name === "DATABASE_URL"),
  );
  if (missingSecrets.length > 0) {
    throw new Error(`[next.config] Production build is missing or has localhost values for: ${missingSecrets.join(", ")}`);
  }

  if (isBad("FRONTEND_URL")) {
    console.warn(
      `[next.config] WARNING: FRONTEND_URL missing or set to localhost. "View live" links and frontend ` +
        `cache refreshes will not work until it points at the website's Vercel URL.`,
    );
  }
}

const SECURITY_HEADERS = [
  // Belt-and-braces with app/robots.ts: the admin is never indexed, any deployment.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
  { key: "X-Frame-Options", value: "DENY" },
  // Framing/base/plugin lockdown. A script-src policy needs per-request nonces
  // (proxy.ts) and is tracked separately so it can't break the editor at launch.
  {
    key: "Content-Security-Policy",
    value: "frame-ancestors 'none'; base-uri 'self'; object-src 'none'; form-action 'self'",
  },
];

const nextConfig: NextConfig = {
  // Hostinger's container reports the host machine's full CPU count (63), so
  // Next tries to spawn 63 build workers and hits the container's thread limit
  // ("OS can't spawn worker thread: Resource temporarily unavailable").
  // Pin it to the cores the plan actually provides.
  experimental: {
    cpus: 2,
  },
  env: FRONTEND_DEFAULTS,
  poweredByHeader: false,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
