// Editor definition of the "contact" page (/dashboard/site-pages/contact). Sections in page order, top to bottom,
// written for someone who has never edited a website: plain names, one-line explanations, add / delete everywhere.
// KEEP IN SYNC with Tech-Vedha-frontend/data/contact.ts (CONTACT_CONTENT, CONTACT_LOCKED, CONTACT_TEMPLATES).

import DEFAULTS from "@/data/siteContentDefaults.json";
import TEMPLATES from "@/data/siteContentTemplates.json";
import { A11Y_HINT, IMAGE_HINT, SEO } from "./shared";
import type { SitePageDefinition } from "./shared";

/** Icons an editor can pick on this page. Must match CONTACT_ICONS in the frontend. */
const ICONS = ["mail", "chat", "phone", "user", "building", "pin", "calendar", "file", "shield", "clock", "globe", "layers"];

const ICON_NAMES: Record<string, string> = {
  mail: "Envelope (email)",
  chat: "Speech bubble (WhatsApp)",
  phone: "Phone",
  user: "Person",
  building: "Building",
  pin: "Map pin",
  calendar: "Calendar",
  file: "Document",
  shield: "Shield",
  clock: "Clock",
  globe: "Globe",
  layers: "Layers",
};

const SETTINGS_ICON_NOTE =
  "Rows with the Envelope, Speech bubble or Phone icon show your email, WhatsApp or phone number and link to it (email app, WhatsApp chat, call). Changing the email or number here also changes it in Site & Menus, so the whole website uses it.";

export const CONTACT_PAGE = {
  title: "Contact",
  description: "Everything on the Contact page, top to bottom",
  path: "/contact",
  defaults: DEFAULTS.contact,
  sections: {
    seo: SEO,
    hero: { title: "Top of the page", hint: "The small trail at the very top, the label, the big two-line heading and the text under it" },
    brandCard: {
      title: "Contact card (left of the form)",
      hint: "The card with the blue top: its words, the contact rows, the little promise tags and the working hours",
    },
    form: {
      title: "Enquiry form",
      hint: "Everything the “Send an enquiry” form says, including the choices people can tick and pick. (The “Start a project” pop-up on other pages has its own copy under Site & Menus.)",
    },
    channels: { title: "Other ways to reach us", hint: "The heading and the cards for email, WhatsApp, calls — add or delete cards as you like" },
    nextSteps: { title: "What happens next", hint: "The strip of numbered steps under those cards" },
    company: {
      title: "Office and company details",
      hint: "Heading, the map box, your office address and hours, and the registration details for big companies",
    },
    exploreBand: { title: "Strip at the very bottom", hint: "The thin line of text just above the footer" },
  },
  locked: [],
  templates: TEMPLATES.contact,
  options: {
    "brandCard.quickContacts[].icon": ICONS,
    "channels.cards[].icon": ICONS,
    "channels.cards[].tag.icon": ICONS,
  },
  optionLabels: {
    "brandCard.quickContacts[].icon": ICON_NAMES,
    "channels.cards[].icon": ICON_NAMES,
    "channels.cards[].tag.icon": ICON_NAMES,
  },
  itemTitle: {
    "brandCard.quickContacts": ["label"],
    "channels.cards": ["title"],
    "nextSteps.steps": ["title"],
    "company.registration": ["label"],
  },
  addLabels: {
    "seo.keywords": "Add keyword",
    "brandCard.quickContacts": "Add contact row",
    "brandCard.promises": "Add promise",
    "form.serviceOptions": "Add choice",
    "form.timeframes": "Add choice",
    "channels.cards": "Add card",
    "nextSteps.steps": "Add step",
    "company.registration": "Add detail",
  },
  labels: {
    "hero.eyebrow": "Small label above the heading",
    "hero.titleLead": "Big heading — first line",
    "hero.titleAccent": "Big heading — second line (blue)",
    "hero.intro": "Text under the heading",

    "brandCard.wordmarkLead": "Name on the card — first word",
    "brandCard.wordmarkAccent": "Name on the card — second word (light blue)",
    "brandCard.title": "Big line on the blue part",
    "brandCard.text": "Small text on the blue part",
    "brandCard.quickContacts": "Contact rows",
    "brandCard.quickContacts[].icon": "Icon",
    "brandCard.quickContacts[].label": "Small label (e.g. Email)",
    "brandCard.quickContacts[].value": "What it says",
    "brandCard.quickContacts[].link": "Link (optional)",
    "brandCard.quickContacts[].highlight": "Show the text in blue",
    "brandCard.phonePlaceholder": "Text shown while no phone number is set",
    "brandCard.promises": "Promise tags",
    "brandCard.hours": "Working hours",
    "brandCard.regionLabel": "Where you work (next to the hours)",

    "form.title": "Form heading",
    "form.requiredNote": "Note about required fields",
    "form.step1": "Phone-only label above part 1",
    "form.servicesLabel": "Question above the service choices",
    "form.serviceOptions": "Service choices people can tick",
    "form.otherServiceLabel": "Name of the last “something else” choice",
    "form.otherServicePlaceholder": "Example text in the “something else” box",
    "form.step2": "Phone-only label above part 2",
    "form.step3": "Phone-only label above part 3",
    "form.timeframeLabel": "Question above the start-time choices",
    "form.timeframePlaceholder": "Text before a start time is picked",
    "form.timeframes": "Start-time choices",
    "form.submitLabel": "Send button text",
    "form.whatsappLabel": "WhatsApp button text",
    "form.whatsappShortLabel": "WhatsApp button text on phones",
    "form.note": "Reassuring line under the buttons",

    "channels.eyebrow": "Small label above the heading",
    "channels.title": "Heading — first part",
    "channels.highlight": "Heading — last part (blue)",
    "channels.intro": "Text beside the heading",
    "channels.cards": "Cards",
    "channels.cards[].icon": "Big icon",
    "channels.cards[].title": "Card title",
    "channels.cards[].description": "What it's good for",
    "channels.cards[].value": "Blue line (e.g. your email)",
    "channels.cards[].link": "Link (optional)",
    "channels.cards[].tag": "Small tag on the card",
    "channels.cards[].tag.icon": "Tag icon",
    "channels.cards[].tag.label": "Tag text",
    "channels.cards[].cta": "Text at the bottom of the card",

    "nextSteps.eyebrow": "Small label above the heading",
    "nextSteps.title": "Heading",
    "nextSteps.stepLabel": "Small label on each step",
    "nextSteps.steps": "Steps",
    "nextSteps.steps[].title": "Step title",
    "nextSteps.steps[].detail": "Step text",

    "company.eyebrow": "Small label above the heading",
    "company.title": "Heading — first part",
    "company.highlight": "Heading — last part (blue)",
    "company.intro": "Text beside the heading",
    "company.mapImage": "Map picture (replaces the drawn map)",
    "company.mapPinBadge": "Letters on the map pin",
    "company.mapPinTitle": "Name on the map pin",
    "company.addressShort": "Short address on the map pin",
    "company.directionsLabel": "“Get directions” button text",
    "company.mapsQuery": "Address Google Maps should open",
    "company.officeLabel": "Small label above the city",
    "company.city": "City",
    "company.address": "Full address",
    "company.hours": "Office hours",
    "company.whatsappLink": "WhatsApp link text",
    "company.procurementTitle": "Heading of the registration box",
    "company.registration": "Registration details",
    "company.registration[].label": "Name (e.g. GSTIN)",
    "company.registration[].value": "Number or text",
    "company.missingValue": "Text shown when a number is left empty",

    "exploreBand.text": "Text",
    "exploreBand.linkLabel": "Link text",
    "exploreBand.linkHref": "Where the link goes",
  },
  hints: {
    "hero.breadcrumb": "The small “Home / Contact” trail at the top-left.",
    "hero.titleAccent": "Shown in a blue gradient under the first line.",
    "hero.a11y": A11Y_HINT,

    "brandCard.quickContacts": `One row per way to reach you. Add, delete or reorder rows. ${SETTINGS_ICON_NOTE}`,
    "brandCard.quickContacts[].value": "Envelope row: your email. Phone row: your phone number. Speech-bubble row: a WhatsApp number, or text such as “Chat with our team” (then it opens the WhatsApp number from Site & Menus). Changed email or numbers are saved to Site & Menus too.",
    "brandCard.quickContacts[].link": "Only for rows with another icon: where a click on the row goes. Leave empty for no link.",
    "brandCard.phonePlaceholder": "Only shown if no phone number is set in Site & Menus.",
    "brandCard.promises": "Small tags under the contact rows. Add or delete as you like.",
    "brandCard.a11y": A11Y_HINT,

    "form.step1": "On phones the form is split into three short parts, each with a small numbered label.",
    "form.serviceOptions":
      "The boxes people tick under “What do you need?”. One choice per row — add, delete or reorder. A last “something else” choice is always added after these.",
    "form.otherServiceLabel": "Ticking it opens a box where people type the service they need.",
    "form.timeframes": "The choices in the “When do you want to start?” drop-down. One per row — add, delete or reorder.",
    "form.whatsappShortLabel": "Phones have less room, so a shorter text is used there.",
    "form.note": "While the form is sending, short messages appear in its place.",

    "channels.cards": `Add, delete or reorder cards. Three sit side by side; more wrap onto a new row. ${SETTINGS_ICON_NOTE}`,
    "channels.cards[].value": "Envelope card: your email. Phone card: your phone number. Speech-bubble card: a WhatsApp number (or empty). Changed email or numbers are saved to Site & Menus too, so every link on the website uses them.",
    "channels.cards[].link":
      "Only for cards with another icon: where a click on the card goes. Leave empty and the card has no link.",
    "channels.cards[].tag": "Leave the tag text empty to hide the tag.",

    "nextSteps.stepLabel": "{n} is replaced by the step's number, e.g. “Step {n}” → “Step 2”.",
    "nextSteps.steps": "Add, delete or reorder steps. They sit side by side (up to four per row).",

    "company.mapImage": `Optional. Upload a picture of your location (e.g. a map screenshot). Empty = the drawn street map. ${IMAGE_HINT}`,
    "company.mapPinBadge": "Two letters on the pin. Leave empty to use the first letters of the name below.",
    "company.mapPinTitle": "Leave empty to hide the pin.",
    "company.mapsQuery": "What opens in Google Maps when someone clicks “Get directions” — write the full street address.",
    "company.registration": "Rows in the registration box. Add, delete or reorder. A row without a name is hidden.",
    "company.registration[].value": "Leave empty to show the “missing” text below.",

    "exploreBand.linkLabel": "Leave empty to hide the link.",
  },
} satisfies SitePageDefinition;
