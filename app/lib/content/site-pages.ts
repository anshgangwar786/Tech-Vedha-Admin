// Registry of the Tech Vedha site content edited at /dashboard/site-pages/<key>
// and stored in the `jmt_site_pages` table (one JSON document per key).
//
// data/siteContentDefaults.json is each page's schema and fallback. It is generated from
// Tech-Vedha-frontend/lib/content/registry.ts by `npm run sync:defaults`, so the editor always matches
// what the website renders. The editor renders one field per value, and saved content is merged over
// the defaults (lib/sitePages/mergeContent.ts) here and again on the frontend.
//
// KEEP IN SYNC with Tech-Vedha-frontend/lib/content/registry.ts: same keys and `locked` paths.

import { ABOUT_PAGE } from "./site-page-defs/about";
import { CONTACT_PAGE } from "./site-page-defs/contact";
import { HOME_PAGE } from "./site-page-defs/home";
import { SERVICES_PAGE } from "./site-page-defs/services";
import {
  SERVICE_APPS_PAGE,
  SERVICE_MARKETING_PAGE,
  customServicePageDefinition,
} from "./site-page-defs/service-pages";
import { SITE_PAGE } from "./site-page-defs/site";
import type { SitePageDefinition } from "./site-page-defs/shared";
import { addedServicePageKey, isAddedServicePageKey } from "@/lib/sitePages/serviceSlugs";

export type { SitePageDefinition, SitePageSection } from "./site-page-defs/shared";
export { customServicePageDefinition } from "./site-page-defs/service-pages";

/** Every page with a fixed key, in sidebar order. Each definition lives in ./site-page-defs/<page>.ts. */
export const SITE_PAGES = {
  site: SITE_PAGE,
  home: HOME_PAGE,
  about: ABOUT_PAGE,
  contact: CONTACT_PAGE,
  services: SERVICES_PAGE,
  "service-apps": SERVICE_APPS_PAGE,
  "service-marketing": SERVICE_MARKETING_PAGE,
} satisfies Record<string, SitePageDefinition>;

/** The pages above, with fixed keys. */
export type StaticSitePageKey = keyof typeof SITE_PAGES;
/** A fixed page, or the page of a service added in the Service catalogue ("service-<slug>"). */
export type SitePageKey = StaticSitePageKey | `service-${string}`;

export const SITE_PAGE_KEYS = Object.keys(SITE_PAGES) as StaticSitePageKey[];

/** Built-in service page editors, listed under Services in the sidebar (added services' pages follow them). */
export const SERVICE_PAGE_KEYS = SITE_PAGE_KEYS.filter((key) => key.startsWith("service-"));

const isStaticSitePageKey = (value: string): value is StaticSitePageKey =>
  Object.prototype.hasOwnProperty.call(SITE_PAGES, value);

/** True for a fixed page key, or a "service-<slug>" key that can hold an added service's page. */
export function isSitePageKey(value: unknown): value is SitePageKey {
  return typeof value === "string" && (isStaticSitePageKey(value) || isAddedServicePageKey(value));
}

/** The slug of an added service's page key ("service-cloud" → "cloud"), or null for a fixed page. */
export function addedServiceSlugOf(key: SitePageKey): string | null {
  return isStaticSitePageKey(key) ? null : key.slice(addedServicePageKey("").length);
}

export function getSitePageDefinition(key: SitePageKey, title?: string): SitePageDefinition {
  return isStaticSitePageKey(key) ? SITE_PAGES[key] : customServicePageDefinition(key.slice("service-".length), title);
}
