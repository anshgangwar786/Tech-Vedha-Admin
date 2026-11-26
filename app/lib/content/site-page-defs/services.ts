// Editor definition of the Service catalogue (/dashboard/site-pages/services).
// The catalogue only decides which service pages exist, at which address, and the name and summary search engines
// see. Nothing a visitor reads comes from here: every page keeps its own copy of the service names it shows.
// KEEP IN SYNC with Tech-Vedha-frontend/data/services.ts (SERVICES_CONTENT, SERVICES_LOCKED, SERVICES_TEMPLATES).

import DEFAULTS from "@/data/siteContentDefaults.json";
import TEMPLATES from "@/data/siteContentTemplates.json";
import { PERMISSIONS } from "@/app/lib/constants/permissions";
import type { SitePageDefinition } from "./shared";

const WHERE_SHOWN =
  "To show a service on the website, add it where you want it, each page on its own: Site & Menus (header menu, footer, “Start a project” pop-up), Homepage (blueprint, services, marquee, form), About Us, Contact (form choices) and the Sitemap page.";

export const SERVICES_PAGE = {
  title: "Service catalogue",
  description: "Which service pages exist, their web addresses, and the names search engines see",
  path: "/",
  defaults: DEFAULTS.services,
  sections: {
    items: {
      title: "Built-in services",
      hint: `The four built-in services. Their addresses are fixed. Title and summary are used by search engines (structured data) only. ${WHERE_SHOWN}`,
    },
    added: {
      title: "Added services",
      hint: `New services. Each new service page starts as a draft and goes live when it is published (Super Admin). ${WHERE_SHOWN}`,
    },
  },
  locked: ["items[].id", "items[].slug"],
  templates: TEMPLATES.services,
  addLabels: { added: "Add service" },
  labels: { "added[].page": "Published (live on the website)" },
  itemTitle: { added: ["title"], items: ["title"] },
  requires: {
    "added[].page": {
      permission: PERMISSIONS.PAGES_PUBLISH,
      note: "Only the Super Admin (or someone they allow) can publish. Build the page as a draft; they publish it when it's ready.",
    },
  },
  hints: {
    "items[].title": "Name search engines see for this service.",
    "items[].summary": "One sentence search engines see for this service.",
    added:
      "A service without a title is not used, so you can save a half-finished one. Its page is written under Services → <title> in the sidebar.",
    "added[].title": "Required. Names the service's page in the sidebar and for search engines.",
    "added[].slug":
      "Its web address (/services/<slug>): lowercase letters, numbers and dashes. Leave empty to make it from the title. Changing it later breaks old links, and its page is then edited under the new name (the old page's text stays saved under the old slug).",
    "added[].summary": "One sentence search engines see for this service.",
    "added[].page":
      "Off = draft: the page is not on the website yet, but you can build it under Services → <title> in the sidebar and check it with Preview. On = live at /services/<address>. Then link to it from the menus and pages you want.",
  },
} satisfies SitePageDefinition;
