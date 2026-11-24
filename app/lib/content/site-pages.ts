// Registry of the Tech Vedha site content edited at /dashboard/site-pages/<key>
// and stored in the `jmt_site_pages` table (one JSON document per key).
//
// data/siteContentDefaults.json is each page's schema and fallback. It is generated from
// Tech-Vedha-frontend/lib/content/registry.ts by `npm run sync:defaults`, so the editor always matches
// what the website renders. The editor renders one field per value, and saved content is merged over
// the defaults (lib/sitePages/mergeContent.ts) here and again on the frontend.
//
// KEEP IN SYNC with Tech-Vedha-frontend/lib/content/registry.ts: same keys and `locked` paths.

import DEFAULTS from "@/data/siteContentDefaults.json";
import type { PlainObject } from "@/lib/sitePages/mergeContent";

export interface SitePageSection {
  title: string;
  hint?: string;
}

export interface SitePageDefinition {
  /** Dashboard name. */
  title: string;
  /** Short description for the dashboard. */
  description: string;
  /** Public path on Tech-Vedha-frontend ("View live" and the SEO page list). */
  path: string;
  /** Bundled content (the frontend's copy). */
  defaults: PlainObject;
  /** One card per top-level key, in this order. Keys not listed come last. */
  sections: Record<string, SitePageSection>;
  /** Dropdown choices, keyed by path pattern ("[]" for list items). */
  options?: Record<string, readonly string[]>;
  /** Paths that always keep the bundled value (not shown in the editor). Must match the frontend. */
  locked?: readonly string[];
  /** Field hints, keyed by path pattern. */
  hints?: Record<string, string>;
}

const SEO: SitePageSection = { title: "SEO", hint: "Browser tab title, search result description and keywords" };

const IMAGE_HINT =
  "A path on the website (e.g. /home/avatars/clinic.jpg) or a Media Library URL. Other addresses are ignored.";

/** Icons, illustrations and logos are tied to the website's code: they keep their bundled value. */
const SERVICE_PAGE_LOCKED = [
  "id",
  "coverage.items[].icon",
  "whyUs.icon",
  "deliverables.cards[].visual",
  "deliverables.cards[].href",
  "useCases.items[].icon",
  "process.tracks[].id",
  "techStack.groups[].tools",
] as const;

const SERVICE_PAGE_SECTIONS: Record<string, SitePageSection> = {
  seo: SEO,
  hero: { title: "Hero", hint: "Headline, highlighted words, intro and platform chips" },
  coverage: { title: "What we cover", hint: "Service cards. Icons are fixed per card." },
  whyUs: { title: "Why us", hint: "Points beside the illustration" },
  deliverables: { title: "What you get", hint: "Cards (illustrations are fixed) and the ownership panel" },
  useCases: { title: "Who it's for", hint: "Use-case cards. Icons are fixed per card." },
  process: { title: "How it works", hint: "Process tracks and their steps" },
  techStack: { title: "Tech stack", hint: "Heading, highlights and group titles. Tool logos are fixed." },
  faq: { title: "FAQ" },
};

const SERVICE_PAGE_HINTS: Record<string, string> = {
  "coverage.title": "One line per entry on desktop.",
  "deliverables.title": "One line per entry on desktop.",
  "useCases.title": "One line per entry on desktop.",
  "whyUs.title": "One line per entry on desktop.",
  "process.title": "One line per entry on desktop.",
};

export const SITE_PAGES = {
  site: {
    title: "Site & menus",
    description: "Brand, contact details, header and footer links",
    path: "/",
    defaults: DEFAULTS.site,
    sections: {},
    hints: {
      name: "Brand name used in page titles and structured data.",
      tagline: "Shown on share images and in structured data.",
      description: "Default search result description for the site.",
      email: "Shown in the header menu, footer, contact page and forms.",
      phone: "International format, e.g. +91 98765 43210. While it is the placeholder number, the Contact page shows “number to add”.",
      whatsappNumber: "Digits only with country code, e.g. 919876543210. Empty = same as the phone.",
      navLinks: "Footer links.",
      headerLinks: "Header and mobile menu links (beside Services).",
      "navLinks[].href": "A page path such as /about or /#work.",
      "headerLinks[].href": "A page path such as /about or /#work.",
    },
  },

  home: {
    title: "Homepage",
    description: "Security layers, process, quality gates, client stories, FAQ and promises",
    path: "/",
    defaults: DEFAULTS.home,
    sections: {
      securityLayers: { title: "Security", hint: "Four layers (illustrations are fixed by position)" },
      processSteps: { title: "How we work", hint: "Six steps, also used on service pages without their own process" },
      qualityGates: { title: "Quality gates", hint: "Checks listed in the “Built to last” section" },
      stories: { title: "Client stories", hint: "Testimonial wall. Card type and order are fixed." },
      faqs: { title: "FAQ", hint: "Homepage and About page questions" },
      promises: { title: "Promises", hint: "Scrolling words in “Why Tech Vedha”" },
    },
    locked: ["processSteps[].id", "stories[].id", "stories[].kind"],
    options: {
      "stories[].category": ["Marketing", "Apps", "CAD", "Software"],
    },
    hints: {
      "stories[].column": "Desktop column: 0, 1 or 2.",
      "stories[].avatar": IMAGE_HINT,
      "stories[].photo": IMAGE_HINT,
    },
  },

  about: {
    title: "About us",
    description: "Hero facts, why we exist, audiences, the service loop, principles, mission and vision",
    path: "/about",
    defaults: DEFAULTS.about,
    sections: {
      seo: SEO,
      wingTags: { title: "Hero: service tags", hint: "Tags on each service card in the hero panel" },
      heroFacts: { title: "Hero: quick facts" },
      vendorComparison: { title: "Why we exist", hint: "Four vendors compared with one team" },
      audiences: { title: "Who we work with", hint: "Icons are fixed per card" },
      loopSteps: { title: "How it connects", hint: "The four-step loop. Each step is tied to a service." },
      loopExampleDetail: { title: "How it connects: example note" },
      principles: { title: "How we work" },
      mission: { title: "Mission" },
      vision: { title: "Vision" },
    },
    locked: ["audiences[].icon", "loopSteps[].service"],
  },

  contact: {
    title: "Contact",
    description: "Company details, contact cards, form timeframes and next steps",
    path: "/contact",
    defaults: DEFAULTS.contact,
    sections: {
      seo: SEO,
      company: { title: "Company details", hint: "Office, hours and registration numbers" },
      phonePlaceholder: { title: "Phone placeholder" },
      quickContacts: { title: "Hero: contact rows", hint: "Email and phone values come from Site & menus" },
      promises: { title: "Hero: promises" },
      timeframes: { title: "Form: start timeframes", hint: "Choices in “When do you want to start?”" },
      channels: { title: "Other ways to reach us", hint: "Email and call values come from Site & menus" },
      nextSteps: { title: "What happens next" },
    },
    locked: ["quickContacts[].icon", "channels[].icon"],
    hints: {
      phonePlaceholder: "Shown instead of the phone number while Site & menus still has the placeholder number.",
      "company.mapsQuery": "What “Get directions” searches for on Google Maps — the full street address once confirmed.",
      "company.registration[].value": "Leave empty to show “To add”.",
      "quickContacts[].value": "Ignored for Email and Phone (they come from Site & menus).",
      "channels[].value": "Ignored for Email and Call (they come from Site & menus).",
    },
  },

  services: {
    title: "Service catalogue",
    description: "The four services: names, summaries and offerings used across the site",
    path: "/#services",
    defaults: DEFAULTS.services,
    sections: {
      items: { title: "Services", hint: "Shown in the header menu, homepage, footer and forms. Order and links are fixed." },
    },
    locked: ["items[].id", "items[].slug"],
    hints: {
      "items[].short": "Words in the scrolling marquee.",
      "items[].wing": "Small label on the About page cards.",
    },
  },

  "service-apps": {
    title: "App Development page",
    description: "Everything on /services/app-development",
    path: "/services/app-development",
    defaults: DEFAULTS["service-apps"],
    sections: SERVICE_PAGE_SECTIONS,
    locked: SERVICE_PAGE_LOCKED,
    hints: SERVICE_PAGE_HINTS,
  },

  "service-marketing": {
    title: "Digital Marketing page",
    description: "Everything on /services/digital-marketing",
    path: "/services/digital-marketing",
    defaults: DEFAULTS["service-marketing"],
    sections: SERVICE_PAGE_SECTIONS,
    locked: SERVICE_PAGE_LOCKED,
    hints: SERVICE_PAGE_HINTS,
  },
} satisfies Record<string, SitePageDefinition>;

export type SitePageKey = keyof typeof SITE_PAGES;

export const SITE_PAGE_KEYS = Object.keys(SITE_PAGES) as SitePageKey[];

/** Service page editors, listed under Services in the sidebar. */
export const SERVICE_PAGE_KEYS = SITE_PAGE_KEYS.filter((key) => key.startsWith("service-"));

export function isSitePageKey(value: unknown): value is SitePageKey {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(SITE_PAGES, value);
}

export function getSitePageDefinition(key: SitePageKey): SitePageDefinition {
  return SITE_PAGES[key];
}
