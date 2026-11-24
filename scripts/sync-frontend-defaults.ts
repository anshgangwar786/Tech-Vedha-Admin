// Regenerates data/siteContentDefaults.json — the bundled copy of every Tech Vedha site page — from
// Tech-Vedha-frontend/lib/content/registry.ts, so the admin's editors and validation always match the frontend.
//
// Run after changing anything in Tech-Vedha-frontend/data or lib/site.ts:
//   npm run sync:defaults            (expects the frontend at ../Tech-Vedha-frontend)
//   FRONTEND_DIR=/path/to/frontend npm run sync:defaults
//
// Icons and other React components are code, not content: they are left out (and the frontend keeps its own).

import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";

const adminDir = path.resolve(__dirname, "..");
const frontendDir = path.resolve(process.env.FRONTEND_DIR || path.join(adminDir, "..", "Tech-Vedha-frontend"));
const registry = path.join(frontendDir, "lib/content/registry.ts");
const out = path.join(adminDir, "data/siteContentDefaults.json");

if (!existsSync(registry)) {
  console.error(`Frontend registry not found at ${registry}. Set FRONTEND_DIR.`);
  process.exit(1);
}

// Evaluated inside the frontend folder so its "@/..." paths and packages resolve. Env placeholders are cleared so the
// defaults never capture a developer's local values.
const program = `
  import { CONTENT_DEFAULTS } from ${JSON.stringify(registry)};
  const isComponent = (v) => typeof v === "function" || (v && typeof v === "object" && typeof v.$$typeof === "symbol");
  process.stdout.write(JSON.stringify(CONTENT_DEFAULTS, (_k, v) => (isComponent(v) ? undefined : v), 2));
`;
const result = spawnSync(path.join(adminDir, "node_modules/.bin/tsx"), ["--eval", program], {
  cwd: frontendDir,
  encoding: "utf8",
  env: {
    ...process.env,
    NEXT_PUBLIC_CONTACT_EMAIL: "",
    NEXT_PUBLIC_CONTACT_PHONE: "",
    NEXT_PUBLIC_WHATSAPP_NUMBER: "",
  },
  maxBuffer: 20 * 1024 * 1024,
});
if (result.status !== 0) {
  console.error(result.stderr || result.error);
  process.exit(1);
}
writeFileSync(out, `${result.stdout}\n`);
console.log(`Wrote ${path.relative(adminDir, out)} (${Object.keys(JSON.parse(result.stdout)).join(", ")})`);
