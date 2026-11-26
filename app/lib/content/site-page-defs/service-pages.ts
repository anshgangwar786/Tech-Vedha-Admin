// Editor definitions of the service pages: the built-in ones (service-apps, service-marketing) and the pages of
// services added in the Service catalogue ("service-<slug>"). Both use the same plain content shape and the same
// editor: sections in page order, plain names, icon and drawing dropdowns, and every list addable and deletable.
// KEEP IN SYNC with Tech-Vedha-frontend/data/service-pages.ts (SERVICE_PAGE_LOCKED, DELIVERABLE_VISUALS),
// data/custom-service-pages.ts (CUSTOM_SERVICE_PAGE_LOCKED) and data/service-icons.ts (SERVICE_ICON_LABELS).

import DEFAULTS from "@/data/siteContentDefaults.json";
import TEMPLATES from "@/data/siteContentTemplates.json";
import CUSTOM_SERVICE_PAGE from "@/data/customServicePage.json";
import type { ListTemplates, PlainObject } from "@/lib/sitePages/mergeContent";
import { IMAGE_HINT, withStoriesEditor, type SitePageDefinition, type SitePageSection } from "./shared";

/** Only the page's id is tied to code (it is not shown in the editor). */
const SERVICE_PAGE_LOCKED = ["id"] as const;
/** Must match CUSTOM_SERVICE_PAGE_LOCKED in Tech-Vedha-frontend/data/custom-service-pages.ts (the id is hidden). */
const CUSTOM_SERVICE_PAGE_LOCKED = ["id"] as const;

// ── Dropdowns ────────────────────────────────────────────────────────────────

/** Icon names (synced from the website) and their plain names (Tech-Vedha-frontend/data/service-icons.ts). */
const ICON_NAMES: string[] = CUSTOM_SERVICE_PAGE.icons;
const ICON_LABELS: Record<string, string> = {
  sparkles: "Sparkles",
  check: "Tick in a circle",
  checklist: "Checklist",
  layers: "Layers",
  rocket: "Rocket",
  target: "Target",
  lightbulb: "Light bulb",
  zap: "Lightning",
  workflow: "Workflow",
  settings: "Settings gear",
  wrench: "Wrench",
  code: "Code",
  bot: "Robot",
  cpu: "Chip",
  server: "Server",
  cloud: "Cloud",
  database: "Database",
  monitor: "Computer screen",
  smartphone: "Phone",
  tablet: "Tablet",
  screens: "App screens",
  layout: "Dashboard layout",
  grid: "Grid of tiles",
  globe: "Globe",
  shield: "Shield",
  "shield-check": "Shield with tick",
  lock: "Padlock",
  "chart-column": "Bar chart",
  "chart-line": "Line chart",
  "trending-up": "Arrow going up",
  megaphone: "Megaphone",
  search: "Magnifying glass",
  mail: "Envelope",
  message: "Chat bubble",
  video: "Video camera",
  play: "Play button",
  camera: "Camera",
  palette: "Paint palette",
  "pen-tool": "Pen",
  ruler: "Ruler",
  "file-text": "Document",
  users: "People",
  handshake: "Handshake",
  headphones: "Headphones",
  briefcase: "Briefcase",
  store: "Shop",
  "shopping-cart": "Shopping cart",
  "shopping-bag": "Shopping bag",
  wallet: "Wallet",
  package: "Parcel",
  truck: "Delivery truck",
  building: "Office building",
  house: "House",
  factory: "Factory",
  "graduation-cap": "Graduation cap",
  heart: "Heart",
  "heart-pulse": "Heart with pulse",
  calendar: "Calendar",
  clock: "Clock",
  "map-pin": "Map pin",
  utensils: "Knife and fork",
};
const iconLabels = Object.fromEntries(ICON_NAMES.map((name) => [name, ICON_LABELS[name] ?? name.replace(/-/g, " ")]));

/** Drawings a "What you get" card can show when it has no image (Tech-Vedha-frontend → DELIVERABLE_VISUALS). */
const DRAWINGS = [
  "checklist",
  "app-screens",
  "release-checklist",
  "campaign-dashboard",
  "campaign-checklist",
  "search-rankings",
  "monthly-report",
] as const;
const DRAWING_LABELS: Record<string, string> = {
  checklist: "Checklist made from the lines below",
  "app-screens": "Drawing: two phone screens of a shop app",
  "release-checklist": "Drawing: app release checklist",
  "campaign-dashboard": "Drawing: marketing campaign dashboard",
  "campaign-checklist": "Drawing: campaign launch checklist",
  "search-rankings": "Drawing: Google search rankings",
  "monthly-report": "Drawing: monthly marketing report",
};

// ── Sections, names and help ─────────────────────────────────────────────────

/** Same order as the page, top to bottom (app/services/[slug]/page.tsx on the website). */
const sections = (custom: boolean): Record<string, SitePageSection> => ({
  seo: {
    title: "Google & link previews",
    hint: custom
      ? "Not shown on the page: the title and description Google and WhatsApp/Facebook previews show. Empty = the service's name and summary from the Service catalogue."
      : "Not shown on the page: the title and description Google and WhatsApp/Facebook previews show.",
  },
  hero: {
    title: "Top of the page",
    hint: custom
      ? "The small trail at the very top, the big heading, the text under it, the two buttons and the small chips. An empty heading or text uses the service's name and summary."
      : "The small trail at the very top, the big heading, the text under it, the two buttons and the small chips.",
  },
  coverage: {
    title: "What we cover — service cards",
    hint: "The cards with an icon each, then the blue “Not sure where to start?” card. Add, delete or reorder cards. Hidden when there are no cards.",
  },
  whyUs: {
    title: "Why us — points around the icon",
    hint: "Exactly four points sit around the big icon on computers; any other number is shown as simple cards. Hidden when there are no points.",
  },
  deliverables: {
    title: "What you get — picture cards",
    hint: "Each card has a picture on top: upload an image, or pick a drawing (or a checklist drawn from its own lines). Then the “You own everything” strip.",
  },
  useCases: {
    title: "Who it's for",
    hint: "Cards with an icon each. Add, delete or reorder them. Hidden when there are no cards.",
  },
  process: {
    title: "How it works — steps",
    hint: "Tabs (for example “New app” / “Existing app”), each with its own steps, then the “Ready for step one?” banner. Hidden until a tab has a step.",
  },
  techStack: {
    title: "Tools we use",
    hint: "Groups of tools. Type each tool's name: well-known ones (AWS, Figma, Docker, Google Ads…) show their logo automatically, others show their first letters.",
  },
  stories: {
    title: "Client stories",
    hint: "This page's own testimonial wall: add, delete or reorder story cards and pick each card's type. Hidden when it has no stories.",
  },
  faq: { title: "Questions & answers", hint: "The questions on this page. Add, delete or reorder them. Hidden when empty." },
  contact: {
    title: "Contact form at the bottom",
    hint: "The “Let's talk” block and its form (the email address and WhatsApp number themselves are set in Site & Menus).",
  },
});

const LABELS: Record<string, string> = {
  "seo.title": "Title in Google",
  "seo.description": "Description in Google",
  "hero.breadcrumb": "Small trail at the very top (Home / Services / this page)",
  "hero.breadcrumb.homeLabel": "First link text",
  "hero.breadcrumb.homeHref": "First link goes to",
  "hero.breadcrumb.servicesLabel": "Second link text",
  "hero.breadcrumb.servicesHref": "Second link goes to",
  "hero.breadcrumb.currentLabel": "This page's name",
  "hero.eyebrow": "Small label above the big heading",
  "hero.title": "Big heading — first line",
  "hero.highlight": "Big heading — second line (blue)",
  "hero.intro": "Text under the big heading",
  "hero.primaryCta": "Main button",
  "hero.secondaryCta": "Second button",
  "hero.platforms": "Small chips at the bottom (e.g. Android, iOS)",
  "coverage.eyebrow": "Small label above the heading",
  "coverage.title": "Heading (one line per row)",
  "coverage.items": "Service cards",
  "coverage.items[].title": "Card title",
  "coverage.items[].detail": "Card text",
  "coverage.itemCta": "Link at the bottom of every card",
  "coverage.helpTitle": "Blue card — heading",
  "coverage.helpText": "Blue card — text",
  "coverage.helpCta": "Blue card — button",
  "whyUs.eyebrow": "Small label above the heading",
  "whyUs.title": "Heading (one line per row)",
  "whyUs.icon": "Big icon in the middle",
  "whyUs.points": "Points",
  "whyUs.points[].title": "Point title",
  "whyUs.points[].detail": "Point text",
  "deliverables.eyebrow": "Small label above the heading",
  "deliverables.title": "Heading (one line per row)",
  "deliverables.cards": "Picture cards",
  "deliverables.cards[].image": "Image (replaces the drawing)",
  "deliverables.cards[].visual": "Drawing (used when there is no image)",
  "deliverables.cards[].checklist": "Checklist lines",
  "deliverables.cards[].title": "Card title",
  "deliverables.cards[].detail": "Card text",
  "deliverables.cards[].href": "Card button goes to",
  "deliverables.ctaLabel": "Button text on the cards",
  "deliverables.ownership": "“You own everything” strip",
  "deliverables.ownership.items": "Things the client keeps",
  "useCases.eyebrow": "Small label above the heading",
  "useCases.title": "Heading (one line per row)",
  "useCases.items": "Cards",
  "useCases.items[].title": "Card title",
  "useCases.items[].detail": "Card text",
  "process.eyebrow": "Small label above the heading",
  "process.title": "Heading (one line per row)",
  "process.tracks": "Tabs",
  "process.tracks[].label": "Tab name",
  "process.tracks[].steps": "Steps",
  "process.tracks[].steps[].title": "Step name",
  "process.tracks[].steps[].summary": "Step text",
  "process.tracks[].steps[].deliverables": "Chips under the step",
  "process.banner": "“Ready for step one?” banner",
  "techStack.eyebrow": "Small label above the heading",
  "techStack.title": "Heading — first part",
  "techStack.highlight": "Heading — coloured part",
  "techStack.intro": "Text beside the heading",
  "techStack.highlights": "Short points under the heading",
  "techStack.groups": "Tool groups",
  "techStack.groups[].title": "Group name",
  "techStack.groups[].tagline": "Group text",
  "techStack.groups[].tools": "Tools (one name per line)",
  "techStack.toolsWord": "Word after the number of tools (“4 tools”)",
  "stories.initialFilter": "Filter selected when the page opens",
  "faq.eyebrow": "Small label above the heading",
  "faq.title": "Heading",
  "faq.helpTitle": "Box under the heading — title",
  "faq.helpText": "Box under the heading — WhatsApp link text",
  "faq.items": "Questions",
  "contact.eyebrow": "Small label above the heading",
  "contact.heading": "Heading",
  "contact.intro": "Text under the heading",
  "contact.emailLabel": "Email row — label",
  "contact.whatsappLabel": "WhatsApp row — label",
  "contact.whatsappValue": "WhatsApp row — text",
};

const WHATSAPP_LINK = "Leave empty to open a WhatsApp chat with you (your number is set in Site & Menus).";
const HIDE = "Leave empty to hide it.";

const hints = (custom: boolean): Record<string, string> => ({
  "seo.title": custom ? "Empty = the service's name." : "About 60 characters.",
  "seo.description": custom ? "Empty = the service's summary." : "About 150 characters.",
  "seo.keywords": "Words people might search for. One per line.",
  "hero.breadcrumb": "Leave a link text empty to leave that link out.",
  "hero.breadcrumb.currentLabel": custom ? "Empty = the service's name." : "Shown last, not a link.",
  "hero.eyebrow": `For example “02 · Front doors”. ${HIDE}`,
  "hero.title": custom ? "Keep it short (one line on computers). Empty = the service's name." : "Keep it short (one line on computers).",
  "hero.intro": custom ? "Empty = the service's summary." : "",
  "hero.primaryCta.href": "#contact (or /contact) opens the “Start a project” form.",
  "hero.secondaryCta.href": WHATSAPP_LINK,
  "hero.platforms": `${HIDE} One chip per line.`,
  "coverage.title": "Each line starts a new row on computers.",
  "coverage.items": "Add as many cards as you like; they wrap into rows of three.",
  "coverage.items[].icon": "Pick the picture shown at the top of the card.",
  "coverage.itemCta": `Same link on every card. ${HIDE}`,
  "coverage.itemCta.href": "#contact jumps to the form at the bottom of this page.",
  "coverage.helpTitle": HIDE,
  "coverage.helpCta": "Leave the button text empty to hide the button.",
  "coverage.a11y.itemCtaSuffix": "{title} is replaced by the card's title.",
  "whyUs.title": "Each line starts a new row on computers.",
  "whyUs.icon": "Pick the picture in the middle (shown when there are exactly four points).",
  "whyUs.points": "Four points look best (they sit around the icon). Any other number shows as simple cards.",
  "deliverables.title": "Each line starts a new row on computers.",
  "deliverables.cards": "Add as many cards as you like; they sit two per row.",
  "deliverables.cards[].image": `Fills the picture box at the top of the card. Empty = the drawing chosen below. ${IMAGE_HINT}`,
  "deliverables.cards[].visual": "Shown only when the card has no image. Pick a ready-made drawing, or a checklist made from the lines below.",
  "deliverables.cards[].checklist": "Up to six lines. All are ticked except the last one (still in review).",
  "deliverables.cards[].href": "For example #what-we-cover or #how-it-works to jump down this page. Leave empty to hide the button.",
  "deliverables.ctaLabel": "Shown on every card that has a button link.",
  "deliverables.ownership.items": "Leave the list empty to hide the strip.",
  "useCases.title": "Each line starts a new row on computers.",
  "useCases.items[].icon": "Pick the picture shown beside the card's title.",
  "process.title": "Each line starts a new row on computers.",
  "process.tracks": "Visitors pick a tab, then see its steps. One tab is fine too.",
  "process.tracks[].steps[].deliverables": "Small chips under the step text. One per line.",
  "process.banner": "Leave its text empty to hide the banner.",
  "process.banner.primaryCta.href": "#contact (or /contact) opens the “Start a project” form.",
  "process.banner.secondaryCta.href": WHATSAPP_LINK,
  "techStack.highlights": "Up to three short points. One per line.",
  "techStack.groups[].tools": "One tool name per line. Known names show their logo; others show their first letters.",
  "techStack.toolsWord": "Shown after the number of tools in each group.",
  "stories.initialFilter": "Type one of the filter buttons (e.g. Apps). Empty = the first one.",
  "stories.title": "Each line starts a new row on computers.",
  "stories.note": HIDE,
  "faq.helpText": "Clicking it opens a WhatsApp chat with you.",
  "contact.whatsappValue": "Text on the WhatsApp row (the number itself is set in Site & Menus).",
  "contact.form.serviceOptions": "The choices in the “Service” drop-down of this form.",
  "contact.form.phonePrefill": "Already typed in the phone box when the form opens.",
  "contact.form.sent.icon": IMAGE_HINT,
});

const ADD_LABELS: Record<string, string> = {
  "seo.keywords": "Add keyword",
  "hero.platforms": "Add chip",
  "coverage.title": "Add line",
  "coverage.items": "Add card",
  "whyUs.title": "Add line",
  "whyUs.points": "Add point",
  "deliverables.title": "Add line",
  "deliverables.cards": "Add card",
  "deliverables.cards[].checklist": "Add line",
  "deliverables.ownership.items": "Add thing",
  "useCases.title": "Add line",
  "useCases.items": "Add card",
  "process.title": "Add line",
  "process.tracks": "Add tab",
  "process.tracks[].steps": "Add step",
  "process.tracks[].steps[].deliverables": "Add chip",
  "techStack.highlights": "Add point",
  "techStack.groups": "Add group",
  "techStack.groups[].tools": "Add tool",
  "faq.items": "Add question",
  "stories.filters": "Add filter",
  "contact.form.serviceOptions": "Add choice",
};

/** The shared editor setup of both page types; `custom` only changes a few hints and where defaults come from. */
const editor = (custom: boolean) => ({
  sections: sections(custom),
  labels: LABELS,
  hints: Object.fromEntries(Object.entries(hints(custom)).filter(([, hint]) => hint)),
  options: {
    "coverage.items[].icon": ICON_NAMES,
    "useCases.items[].icon": ICON_NAMES,
    "whyUs.icon": ICON_NAMES,
    "deliverables.cards[].visual": DRAWINGS,
  },
  optionLabels: {
    "coverage.items[].icon": iconLabels,
    "useCases.items[].icon": iconLabels,
    "whyUs.icon": iconLabels,
    "deliverables.cards[].visual": DRAWING_LABELS,
  },
  showWhen: { "deliverables.cards[].checklist": { field: "visual", is: ["checklist"] } },
  itemTitle: {
    "coverage.items": ["title"],
    "whyUs.points": ["title"],
    "deliverables.cards": ["title"],
    "useCases.items": ["title"],
    "process.tracks": ["label"],
    "process.tracks[].steps": ["title"],
    "techStack.groups": ["title"],
    "faq.items": ["question"],
  },
  addLabels: ADD_LABELS,
});

export const SERVICE_APPS_PAGE = withStoriesEditor({
  title: "App Development page",
  description: "Everything on /services/app-development",
  path: "/services/app-development",
  defaults: DEFAULTS["service-apps"],
  templates: TEMPLATES["service-apps"],
  locked: SERVICE_PAGE_LOCKED,
  ...editor(false),
} satisfies SitePageDefinition);

export const SERVICE_MARKETING_PAGE = withStoriesEditor({
  title: "Digital Marketing page",
  description: "Everything on /services/digital-marketing",
  path: "/services/digital-marketing",
  defaults: DEFAULTS["service-marketing"],
  templates: TEMPLATES["service-marketing"],
  locked: SERVICE_PAGE_LOCKED,
  ...editor(false),
} satisfies SitePageDefinition);

// ── Pages of services added in the Service catalogue ─────────────────────────
// Their starter copy comes from the frontend (data/custom-service-pages.ts, synced into data/customServicePage.json).

const CUSTOM_EDITOR = editor(true);

/** Editor definition of an added service's page ("service-<slug>"). `title` is the service's title, when known. */
export function customServicePageDefinition(slug: string, title?: string): SitePageDefinition {
  const name = title?.trim() || slug.replace(/-/g, " ").replace(/^./, (c) => c.toUpperCase());
  return withStoriesEditor({
    title: `${name} page`,
    description: `Everything on /services/${slug}`,
    path: `/services/${slug}`,
    defaults: CUSTOM_SERVICE_PAGE.defaults as PlainObject,
    templates: CUSTOM_SERVICE_PAGE.templates as ListTemplates,
    locked: CUSTOM_SERVICE_PAGE_LOCKED,
    ...CUSTOM_EDITOR,
  });
}
