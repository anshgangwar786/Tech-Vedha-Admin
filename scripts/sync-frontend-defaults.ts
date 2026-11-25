// Regenerates, from the frontend, so the admin's editors and validation always match what the website renders:
//   data/siteContentDefaults.json  — the bundled copy of every Tech Vedha site page (lib/content/registry.ts);
//   data/siteContentTemplates.json — the item shape of lists that start empty (e.g. "Added services");
//   data/customServicePage.json    — starter copy, list templates and icon names of the pages written for services
//                                    added in the admin (data/custom-service-pages.ts).
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
const templatesOut = path.join(adminDir, "data/siteContentTemplates.json");
const customPageOut = path.join(adminDir, "data/customServicePage.json");
const customPage = path.join(frontendDir, "data/custom-service-pages.ts");

if (!existsSync(registry)) {
  console.error(`Frontend registry not found at ${registry}. Set FRONTEND_DIR.`);
  process.exit(1);
}

// Evaluated inside the frontend folder so its "@/..." paths and packages resolve. Env placeholders are cleared so the
// defaults never capture a developer's local values.
const program = `
  import { CONTENT_DEFAULTS, CONTENT_TEMPLATES } from ${JSON.stringify(registry)};
  import { CUSTOM_SERVICE_PAGE_DEFAULTS, CUSTOM_SERVICE_PAGE_TEMPLATES, SERVICE_ICON_NAMES } from ${JSON.stringify(customPage)};
  const isComponent = (v) => typeof v === "function" || (v && typeof v === "object" && typeof v.$$typeof === "symbol");
  const plain = (_k, v) => (isComponent(v) ? undefined : v);
  const custom = { defaults: CUSTOM_SERVICE_PAGE_DEFAULTS, templates: CUSTOM_SERVICE_PAGE_TEMPLATES, icons: SERVICE_ICON_NAMES };
  process.stdout.write(JSON.stringify({ defaults: CONTENT_DEFAULTS, templates: CONTENT_TEMPLATES ?? {}, custom }, plain));
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
const { defaults, templates, custom } = JSON.parse(result.stdout);
writeFileSync(out, `${JSON.stringify(defaults, null, 2)}\n`);
writeFileSync(templatesOut, `${JSON.stringify(templates, null, 2)}\n`);
console.log(`Wrote ${path.relative(adminDir, out)} (${Object.keys(defaults).join(", ")})`);
console.log(`Wrote ${path.relative(adminDir, templatesOut)} (${Object.keys(templates).join(", ") || "none"})`);
writeFileSync(customPageOut, `${JSON.stringify(custom, null, 2)}\n`);
console.log(`Wrote ${path.relative(adminDir, customPageOut)} (${custom.icons.length} icons)`);
