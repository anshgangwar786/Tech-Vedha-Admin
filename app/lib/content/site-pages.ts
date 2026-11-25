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
import TEMPLATES from "@/data/siteContentTemplates.json";
import CUSTOM_SERVICE_PAGE from "@/data/customServicePage.json";
import type { ListTemplates, PlainObject } from "@/lib/sitePages/mergeContent";
import { addedServicePageKey, isAddedServicePageKey } from "@/lib/sitePages/serviceSlugs";

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
  /**
   * Item shape of lists that are empty by default (data/siteContentTemplates.json, from the frontend's
   * CONTENT_TEMPLATES), so saved items are kept and "Add" can create the first one.
   */
  templates?: ListTemplates;
  /** "Add" button text per list, keyed by path pattern (default "Add item" / "Add line"). */
  addLabels?: Record<string, string>;
}

const SEO: SitePageSection = { title: "SEO", hint: "Browser tab title, search result description and keywords" };

const IMAGE_HINT =
  "Upload a photo or pick one from the Media Library (uploads are saved there too). Pasted addresses must be a path on the website (e.g. /home/avatars/clinic.jpg) or a Media Library URL; others are ignored.";

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
  labels: { title: "Section labels and buttons", hint: "Small labels above each section heading and short button texts on this page" },
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
  "labels.toolsWord": "After the number of tools in a tech stack group, e.g. “6 tools”.",
  "process.ctaDetail": "Line in the “Ready for step one?” banner under the steps (the heading and button come from Homepage → How we work). Leave empty to hide the banner.",
};

export const SITE_PAGES = {
  site: {
    title: "Site & menus",
    description: "Brand, contact details, header and footer links",
    path: "/",
    defaults: DEFAULTS.site,
    sections: {
      name: { title: "Brand name" },
      tagline: { title: "Tagline" },
      description: { title: "Site description" },
      email: { title: "Email address" },
      phone: { title: "Phone number" },
      whatsappNumber: { title: "WhatsApp number" },
      headerLinks: { title: "Header menu links" },
      header: { title: "Header and Services menu", hint: "“Start a project” button, the Services drop-down and the phone menu" },
      navLinks: { title: "Footer links" },
      footer: { title: "Footer", hint: "Line under the logo and the column titles" },
      whatsappButtonLabel: { title: "WhatsApp button", hint: "Text of the second button beside “Start a project” where a page doesn't set its own" },
      enquirySent: { title: "“Enquiry sent” pop-up", hint: "Shown after any enquiry form on the site is sent" },
      notFound: { title: "Page not found (404)", hint: "Shown when someone opens a broken or old link" },
      sitemapPage: { title: "Sitemap page", hint: "The /site-map page. Page addresses are fixed; titles and descriptions can be changed." },
    },
    locked: ["sitemapPage.pages[].path", "sitemapPage.homeSections[].href"],
    hints: {
      "header.servicesNote": "{count} = number of services in words (e.g. four).",
      "header.servicesLinkHref": "A page path such as /#why or /about.",
      "footer.text": "Leave empty to hide it.",
      "notFound.primaryCta.href": "A page path such as /contact.",
      "notFound.secondaryCta.href": "A page path such as /.",
      "sitemapPage.comingSoon": "Added after the summary of a service that doesn't have its own page yet.",
      "sitemapPage.homeSections": "Homepage sections listed on the sitemap and on the “page not found” screen. Leave a title empty to hide it.",
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
    description: "Every homepage section, top to bottom: hero, blueprint, services, why us, security, process, pillars, stories, FAQ and contact",
    path: "/",
    defaults: DEFAULTS.home,
    // Same order as the website, top to bottom (app/page.tsx in Tech-Vedha-frontend).
    sections: {
      hero: { title: "Hero", hint: "Top of the page: label, headline, intro, buttons, bottom strip and rotating badge" },
      blueprint: { title: "Digital blueprint", hint: "Heading beside the stacked service slabs. Slab labels come from the Service Catalogue." },
      services: { title: "Services", hint: "Heading above the service switcher. Cards come from the Service Catalogue." },
      why: { title: "Why Tech Vedha (marquee)", hint: "Heading, buttons and the scrolling promise words" },
      security: { title: "Security", hint: "Heading and the security layer cards (illustrations are fixed by position)" },
      process: { title: "How we work", hint: "Six steps and the “Ready for step one?” banner. Also used on service pages without their own process." },
      pillars: { title: "Four pillars of trust", hint: "The four pillar cards, including the quality gates" },
      stories: { title: "Client stories", hint: "Testimonial wall. Card type and order are fixed." },
      faq: { title: "FAQ", hint: "Homepage and About page questions" },
      contact: { title: "Contact", hint: "“Let's talk” block above the enquiry form (also shown on About and service pages)" },
    },
    locked: ["process.steps[].id", "stories.items[].id", "stories.items[].kind"],
    options: {
      "stories.items[].category": ["Marketing", "Apps", "CAD", "Software"],
    },
    hints: {
      "hero.titleLead": "First line of the big headline.",
      "hero.titleAccent": "Second line, shown in the brand colour.",
      "hero.strip": "Small line at the bottom of the hero.",
      "hero.ringText": "Text around the rotating badge (keep it short; end with a separator).",
      "hero.primaryCta.href": "A page path such as /#contact or /about.",
      "hero.secondaryCta.href": "A page path such as /#services or /about.",
      "blueprint.title": "One line per entry on desktop. {count} = number of services in words (e.g. Four).",
      "blueprint.intro": "{count} = number of services in words (e.g. Four).",
      "blueprint.tagline": "Small uppercase line under the intro.",
      "services.title": "One line per entry on desktop. {count} = number of services in words (e.g. Four).",
      "services.intro": "{count} = number of services in words (e.g. Four).",
      "services.exploreLabel": "Button text before the service name, e.g. “Explore” → “Explore App Development”.",
      "why.promises": "Big scrolling words under the buttons.",
      "why.primaryCta.href": "A page path such as /#contact.",
      "why.secondaryCta.href": "A page path such as /#process.",
      "security.title": "One line per entry on desktop.",
      "process.title": "One line per entry on desktop.",
      "process.exampleLabel": "Small label above each step's example illustration.",
      "pillars.title": "One line per entry on desktop.",
      "pillars.clientCentric.brief": "Words in [square brackets] are underlined in the brand colour.",
      "pillars.clientCentric.features": "What the brief becomes (list beside the quote).",
      "pillars.quality.gates": "Release checks, top to bottom. The first one is highlighted.",
      "pillars.quality.badge": "Pill under the checks.",
      "pillars.scalable.stages": "Growth stages, left to right. The last one is highlighted.",
      "stories.title": "One line per entry on desktop.",
      "stories.note": "Small note under the wall. Leave empty to hide it.",
      "stories.items[].column": "Desktop column: 0, 1 or 2.",
      "stories.items[].avatar": IMAGE_HINT,
      "stories.items[].photo": IMAGE_HINT,
      "faq.title": "One line per entry on desktop. Service pages use their own title.",
      "faq.helpText": "Link text to WhatsApp under the heading.",
      "contact.whatsappValue": "Text on the WhatsApp row (the number comes from Site & menus).",
      "contact.form": "Labels, example text and the button of the enquiry form beside “Let's talk”.",
      "process.nextLabel": "Button under the step card on phones and tablets.",
      "process.restartLabel": "Same button on the last step.",
      "process.stepCounter": "{n} = step number, {total} = number of steps.",
    },
  },

  about: {
    title: "About us",
    description: "Hero facts, why we exist, audiences, the service loop, principles, mission and vision",
    path: "/about",
    defaults: DEFAULTS.about,
    sections: {
      seo: SEO,
      hero: { title: "Hero", hint: "Top of the page: label, headline, intro, buttons and the labels on the “What we do” panel" },
      wingTags: { title: "Hero: service tags", hint: "Tags on each service card in the hero panel" },
      heroFacts: { title: "Hero: quick facts" },
      whyWeExist: { title: "Why we exist: heading", hint: "Section heading and the table's column titles" },
      vendorComparison: { title: "Why we exist: table rows", hint: "Four vendors compared with one team" },
      whoWeWorkWith: { title: "Who we work with: heading" },
      audiences: { title: "Who we work with: cards", hint: "Icons are fixed per card" },
      howItConnects: { title: "How it connects: heading and labels", hint: "Section heading, the two view buttons and the text in the middle of the ring" },
      loopSteps: { title: "How it connects: steps", hint: "The four-step loop. Each step is tied to a service." },
      loopExampleDetail: { title: "How it connects: example note" },
      howWeWork: { title: "How we work: heading" },
      principles: { title: "How we work: points" },
      missionVision: { title: "Mission and vision: heading", hint: "Section heading and the two card labels" },
      mission: { title: "Mission" },
      vision: { title: "Vision" },
    },
    locked: ["audiences[].icon", "loopSteps[].service"],
    hints: {
      "hero.titleLead": "First line of the big headline.",
      "hero.titleAccent": "Second line, shown in the blue gradient.",
      "hero.primaryCta.href": "A page path such as /#contact.",
      "hero.secondaryCta.href": "A page path, or #how-it-connects to jump down this page.",
      "hero.panelLabel": "{count} = number of services in words (e.g. four).",
      "hero.panelBadge": "Small pill at the top right of the panel. Leave empty to hide it.",
      "whyWeExist.title": "One line per entry on desktop.",
      "whoWeWorkWith.title": "One line per entry on desktop.",
      "howItConnects.title": "One line per entry on desktop.",
      "howItConnects.exampleShortLabel": "Shorter version of the example button, used on small phones.",
      "howItConnects.centerLabel": "Words in the middle of the ring, one per line.",
      "howItConnects.stepTab": "{n} = step number.",
      "howItConnects.stepCounter": "{n} = step number, {total} = number of steps.",
      "howWeWork.title": "One line per entry on desktop.",
      "missionVision.title": "One line per entry on desktop.",
      "vision.regions": "Pills under the vision statement.",
    },
  },

  contact: {
    title: "Contact",
    description: "Company details, contact cards, form timeframes and next steps",
    path: "/contact",
    defaults: DEFAULTS.contact,
    sections: {
      seo: SEO,
      hero: { title: "Hero", hint: "Label, headline and intro at the top of the page" },
      brandCard: { title: "Hero: blue card", hint: "Text on the blue card beside the form" },
      form: { title: "Enquiry form", hint: "Every label, example text and button on the “Send an enquiry” form (also used in the “Start a project” pop-up on every page)" },
      channelsSection: { title: "Other ways to reach us: heading" },
      nextStepsSection: { title: "What happens next: heading" },
      companySection: { title: "Office and company details: heading and labels" },
      exploreBand: { title: "Bottom band", hint: "Thin strip above the footer" },
      company: { title: "Company details", hint: "Office, hours and registration numbers" },
      phonePlaceholder: { title: "Phone placeholder" },
      quickContacts: { title: "Hero: contact rows", hint: "Email and phone values come from Site & menus" },
      promises: { title: "Hero: promises" },
      timeframes: { title: "Form: start timeframes", hint: "Choices in “When do you want to start?”" },
      channels: { title: "Other ways to reach us", hint: "Email and call values come from Site & menus" },
      nextSteps: { title: "What happens next" },
    },
    locked: ["quickContacts[].icon", "channels[].icon"],
    options: {
      "channels[].tag.icon": ["file", "clock", "user", "mail", "chat", "phone", "building", "pin", "calendar", "shield", "globe", "layers"],
    },
    hints: {
      phonePlaceholder: "Shown instead of the phone number while Site & menus still has the placeholder number.",
      "hero.titleLead": "First line of the big headline.",
      "hero.titleAccent": "Second line, shown in the blue gradient.",
      "form.step1": "Small numbered label shown on phones above the first part of the form.",
      "form.step2": "Small numbered label shown on phones above the second part.",
      "form.step3": "Small numbered label shown on phones above the third part.",
      "form.otherServiceLabel": "The last choice in “What do you need?”; ticking it opens a box to type the service.",
      "form.whatsappShortLabel": "Shorter WhatsApp button text, used on phones.",
      "form.note": "Reassurance line under the buttons.",
      "nextStepsSection.stepLabel": "{n} = step number.",
      "companySection.mapPinTitle": "Name on the map pin. Its first letters make the small badge (e.g. Tech Vedha office → TV).",
      "companySection.missingValue": "Shown for a registration number that is still empty.",
      "exploreBand.linkHref": "A page path such as /#services.",
      "company.mapsQuery": "What “Get directions” searches for on Google Maps — the full street address once confirmed.",
      "company.registration[].value": "Leave empty to show “To add”.",
      "quickContacts[].value": "Ignored for Email and Phone (they come from Site & menus).",
      "channels[].value": "Ignored for Email and Call (they come from Site & menus).",
      "channels[].tag.icon": "Small icon in the pill on the card.",
    },
  },

  services: {
    title: "Service catalogue",
    description: "The built-in services and any you add: names, summaries and offerings used across the site",
    path: "/#services",
    defaults: DEFAULTS.services,
    sections: {
      items: {
        title: "Services",
        hint: "The four built-in services. Shown in the header menu, homepage, footer and forms. Order and links are fixed.",
      },
      added: {
        title: "Added services",
        hint: "New services, shown after the four above in the header menu, homepage, About page, footer and enquiry forms. Each can have its own page.",
      },
    },
    locked: ["items[].id", "items[].slug"],
    templates: TEMPLATES.services,
    addLabels: { added: "Add service", "added[].short": "Add word", "added[].offerings": "Add offering" },
    hints: {
      "items[].short": "Words in the scrolling marquee.",
      "items[].wing": "Small label on the About page cards.",
      added:
        "Each one links to its own page when “Page” is on, otherwise to its card in the homepage Services section (/#service-<slug>). A service without a title is not shown, so you can save a half-finished one.",
      "added[].title": "Required. Shown everywhere the service appears.",
      "added[].slug":
        "Its web address (/services/<slug>, and its homepage card /#service-<slug>): lowercase letters, numbers and dashes. Leave empty to make it from the title. Changing it later breaks old links, and its page is then edited under the new name (the old page's text stays saved under the old slug).",
      "added[].wing": "Small label above the title (e.g. “Growth”). Shows “New service” when empty.",
      "added[].summary": "One sentence, shown on the homepage card.",
      "added[].short": "Words in the scrolling marquee. Uses the title when empty.",
      "added[].offerings": "What's included: shown in the header menu, the homepage illustration and the About page card.",
      "added[].page":
        "Gives the service its own page at /services/<slug>, and every Services link points there. Write the page first under Services → <title> in the sidebar (Preview shows it before it's live), then switch this on.",
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

// ── Pages of services added in the Service catalogue ─────────────────────────
// Their schema and starter copy come from the frontend (data/custom-service-pages.ts, synced into
// data/customServicePage.json). Icons are picked by name; nothing is locked.

const ICON_NAMES = CUSTOM_SERVICE_PAGE.icons;

const CUSTOM_SERVICE_PAGE_SECTIONS: Record<string, SitePageSection> = {
  seo: { title: "SEO", hint: "Browser tab title, search result description and keywords. Empty fields use the service's title and summary." },
  hero: { title: "Hero", hint: "Headline, intro and platform chips. Empty fields use the service's title and summary from the Service catalogue." },
  labels: { title: "Section labels and buttons", hint: "Small labels above each section heading and short button texts. Empty ones use the standard text." },
  coverage: { title: "What we cover", hint: "Service cards with an icon each. Until you add one, the service's offerings from the catalogue are shown." },
  whyUs: { title: "Why us", hint: "Four points sit around the icon on desktop; any other number is shown as a grid. Hidden when empty." },
  deliverables: { title: "What you get", hint: "Each card draws a checklist from its own lines. Hidden until it has a card." },
  useCases: { title: "Who it's for", hint: "Cards with an icon each. Hidden until it has one." },
  process: {
    title: "How it works",
    hint: "Your own steps, in one or more tracks (tabs, e.g. “New project” / “Existing setup”). Without any, the page shows the standard six-step process.",
  },
  techStack: { title: "Tech stack", hint: "Tools are typed by name; well-known ones (e.g. AWS, Figma, Docker, Google Ads) show their logo. Hidden until a group has tools." },
  faq: { title: "FAQ", hint: "Hidden when empty." },
};

const CUSTOM_SERVICE_PAGE_HINTS: Record<string, string> = {
  "hero.title": "First line of the headline: keep it short (one line on desktop). The service's title when empty.",
  "hero.highlight": "Second line, in the brand gradient. “from one partner.” when empty.",
  "hero.platforms": "Small chips at the bottom of the hero (e.g. “AWS”, “Azure”). None shown when empty.",
  "coverage.title": "One line per entry on desktop.",
  "deliverables.title": "One line per entry on desktop.",
  "useCases.title": "One line per entry on desktop.",
  "whyUs.title": "One line per entry on desktop.",
  "process.title": "One line per entry on desktop.",
  "deliverables.cards[].checklist": "Up to six lines, all ticked except the last (still to do).",
  "deliverables.ownership.items": "What the client keeps. The strip is hidden when empty.",
  "techStack.groups[].tools": "One tool per line.",
  "process.ctaDetail": "Line in the “Ready for step one?” banner under the steps. Leave empty to hide the banner.",
};

/** Editor definition of an added service's page ("service-<slug>"). `title` is the service's title, when known. */
export function customServicePageDefinition(slug: string, title?: string): SitePageDefinition {
  const name = title?.trim() || slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return {
    title: `${name} page`,
    description: `Everything on /services/${slug}`,
    path: `/services/${slug}`,
    defaults: CUSTOM_SERVICE_PAGE.defaults as PlainObject,
    sections: CUSTOM_SERVICE_PAGE_SECTIONS,
    templates: CUSTOM_SERVICE_PAGE.templates as ListTemplates,
    options: { "coverage.items[].icon": ICON_NAMES, "useCases.items[].icon": ICON_NAMES, "whyUs.icon": ICON_NAMES },
    addLabels: {
      "coverage.items": "Add card",
      "useCases.items": "Add card",
      "deliverables.cards": "Add card",
      "process.tracks": "Add track",
      "process.tracks[].steps": "Add step",
      "techStack.groups": "Add group",
      "techStack.groups[].tools": "Add tool",
      "faq.items": "Add question",
    },
    hints: CUSTOM_SERVICE_PAGE_HINTS,
  };
}

/** The slug of an added service's page key ("service-cloud" → "cloud"), or null for a fixed page. */
export function addedServiceSlugOf(key: SitePageKey): string | null {
  return isStaticSitePageKey(key) ? null : key.slice(addedServicePageKey("").length);
}

export function getSitePageDefinition(key: SitePageKey, title?: string): SitePageDefinition {
  return isStaticSitePageKey(key) ? SITE_PAGES[key] : customServicePageDefinition(key.slice("service-".length), title);
}
