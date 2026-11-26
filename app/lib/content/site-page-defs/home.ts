// Editor definition of the "home" page (/dashboard/site-pages/home). Sections in page order, top to bottom.
// Every word and image on the homepage is a field here; nothing comes from another page.
// Written for a non-technical editor: plain names, one-line explanations, clear item titles, "Add …" buttons.
// KEEP IN SYNC with Tech-Vedha-frontend/data/home.ts (HOME_CONTENT, HOME_LOCKED, HOME_TEMPLATES).

import DEFAULTS from "@/data/siteContentDefaults.json";
import TEMPLATES from "@/data/siteContentTemplates.json";
import { A11Y_HINT, IMAGE_HINT } from "./shared";
import { withStoriesEditor, type SitePageDefinition } from "./shared";

const ONE_LINE_PER_ENTRY = "Each row is one line of the heading on a computer screen.";
const COUNT_HINT = "Write the number in words (e.g. Four). If you add or remove cards, change it here too.";
const SERVICE_CARDS = ["services.marketing", "services.apps", "services.cad", "services.software"];
const SERVICE_CARD_PATHS = [...SERVICE_CARDS, "services.extraCards[]"];

/** The same plain names and explanations for every service card (the four built-in ones and added ones). */
function serviceCardFields() {
  const labels: Record<string, string> = {};
  const hints: Record<string, string> = {};
  for (const card of SERVICE_CARD_PATHS) {
    labels[`${card}.show`] = "Show this card";
    labels[`${card}.number`] = "Big number";
    labels[`${card}.label`] = "Small label above the title";
    labels[`${card}.summary`] = "Short description";
    labels[`${card}.image`] = "Picture for the big panel on the left";
    labels[`${card}.buttonLink`] = "Where the “Explore” button goes";
    hints[`${card}.show`] = "Untick to hide this card on the homepage.";
    hints[`${card}.summary`] = "One sentence under the title.";
    hints[`${card}.image`] = `Shown in the big panel on the left while this card is selected. Leave empty to keep the built-in drawing. ${IMAGE_HINT}`;
    hints[`${card}.buttonLink`] = "A page such as /services/app-development. Leave empty to hide the button.";
  }
  return { labels, hints };
}
const SERVICE_CARD_FIELDS = serviceCardFields();

const DIRECTION_LABELS = { "right-to-left": "Right to left ←", "left-to-right": "Left to right →" };

export const HOME_PAGE = withStoriesEditor({
  title: "Homepage",
  description: "Everything on the homepage, top to bottom",
  path: "/",
  defaults: DEFAULTS.home,
  // Same order as the website, top to bottom (app/page.tsx in Tech-Vedha-frontend).
  sections: {
    seo: {
      title: "Google & link previews",
      hint: "Not shown on the page. The title and description Google shows, and what appears when the link is shared on WhatsApp or social media.",
    },
    hero: {
      title: "Top of the page",
      hint: "The first thing visitors see: small label, big headline, text, two buttons, the line at the bottom and the spinning badge.",
    },
    blueprint: {
      title: "Blueprint (stacked layers)",
      hint: "Heading on the left and the glowing stacked layers on the right.",
    },
    services: {
      title: "Services (cards with the big picture)",
      hint: "Heading, then one block per service card, top to bottom. Each card can have its own picture for the big panel on the left. Only changes the homepage.",
    },
    why: {
      title: "Why Tech Vedha (scrolling words)",
      hint: "The big scrolling line of words, the heading and text in the middle, two buttons and the second scrolling line.",
    },
    security: {
      title: "Security cards",
      hint: "Heading and the security cards. Each card can have its own picture at the top.",
    },
    process: {
      title: "How we work (steps)",
      hint: "Heading, the steps (each can have its own picture) and the “Ready for step one?” box under them.",
    },
    pillars: {
      title: "Four pillars (trust cards)",
      hint: "Heading and the four cards: the example request, the checklist, the growth steps and the blue card.",
    },
    stories: {
      title: "Client stories",
      hint: "Heading, filter buttons and the story cards. Add, delete or reorder cards and pick how each card looks.",
    },
    faq: {
      title: "Questions & answers",
      hint: "Heading, the WhatsApp box on the left and the questions on the right.",
    },
    contact: {
      title: "Contact form at the bottom (“Let's talk”)",
      hint: "Heading, your email and WhatsApp rows, and the enquiry form with its “Enquiry sent” pop-up.",
    },
  },
  counts: {
    "blueprint.title": { list: "blueprint.slabs" },
    "blueprint.intro": { list: "blueprint.slabs" },
    "services.title": { cards: SERVICE_CARDS, list: "services.extraCards" },
    "services.intro": { cards: SERVICE_CARDS, list: "services.extraCards" },
  },
  labels: {
    // Top of the page
    "hero.background": "Background wave (one picture per theme)",
    "hero.eyebrow": "Small label in the pill above the headline",
    "hero.titleLead": "Big headline — first line",
    "hero.titleAccent": "Big headline — second line",
    "hero.intro": "Text under the headline",
    "hero.strip": "Line at the bottom of the top area",
    "hero.ringText": "Text running round the spinning badge",
    // Blueprint
    "blueprint.title": "Heading",
    "blueprint.tagline": "Small blue line under the text",
    "blueprint.slabs": "Stacked layers",
    "blueprint.slabs[].wing": "Small label",
    // Services
    "services.title": "Heading",
    "services.intro": "Text under the heading",
    "services.exploreLabel": "“Explore” button text",
    "services.marketing": "Card 01 · Digital Marketing",
    "services.apps": "Card 02 · App Development",
    "services.cad": "Card 03 · CAD Design and Planning",
    "services.software": "Card 04 · Software and Cybersecurity",
    "services.extraCards": "More service cards",
    ...SERVICE_CARD_FIELDS.labels,
    // Why Tech Vedha
    "why.eyebrow": "Small label at the top",
    "why.marqueeWords": "Top scrolling line — outlined words",
    "why.marqueeDirection": "Top line: scroll direction",
    "why.text": "Text under the heading",
    "why.promises": "Bottom scrolling line — blue words",
    "why.promisesDirection": "Bottom line: scroll direction",
    // Security
    "security.title": "Heading",
    "security.layers": "Security cards",
    "security.layers[].image": "Picture at the top of the card",
    "security.layers[].number": "Big number",
    "security.layers[].summary": "Short description",
    "security.layers[].points": "Ticked lines",
    // How we work
    "process.title": "Heading",
    "process.exampleLabel": "Small label above each step's picture",
    "process.steps": "Steps",
    "process.steps[].image": "Step picture",
    "process.steps[].number": "Big number",
    "process.steps[].summary": "Text",
    "process.steps[].deliverables": "Small chips under the text",
    "process.stepCounter": "Step counter",
    "process.nextLabel": "Phone button: next step",
    "process.restartLabel": "Phone button on the last step",
    "process.banner": "“Ready for step one?” box under the steps",
    // Four pillars
    "pillars.title": "Heading",
    "pillars.clientCentric": "Card 01 · Client-centric (example request)",
    "pillars.clientCentric.number": "Big number",
    "pillars.clientCentric.brief": "Example request (in quotes)",
    "pillars.clientCentric.briefCredit": "Line under the request",
    "pillars.clientCentric.exampleLabel": "Small label above the list",
    "pillars.clientCentric.features": "List on the right",
    "pillars.quality": "Card 02 · Quality (checklist)",
    "pillars.quality.number": "Big number",
    "pillars.quality.gates": "Checklist",
    "pillars.quality.badge": "Blue pill under the checklist",
    "pillars.scalable": "Card 03 · Scalable (growth steps)",
    "pillars.scalable.number": "Big number",
    "pillars.scalable.stages": "Growth steps (left to right)",
    "pillars.secure": "Card 04 · Secure (blue card)",
    "pillars.secure.number": "Big number",
    "pillars.secure.image": "Picture in the circle",
    // Questions & answers
    "faq.title": "Heading",
    "faq.helpTitle": "WhatsApp box — first line",
    "faq.helpText": "WhatsApp box — second line",
    "faq.items": "Questions",
    // Contact form
    "contact.heading": "Big heading",
    "contact.intro": "Text under the heading",
    "contact.emailLabel": "Label above your email address",
    "contact.whatsappLabel": "Label above the WhatsApp row",
    "contact.whatsappValue": "Text on the WhatsApp row",
    "contact.form.nameLabel": "Name box — label",
    "contact.form.phoneLabel": "Phone box — label",
    "contact.form.phonePrefill": "Phone box — text already typed in",
    "contact.form.phonePlaceholder": "Phone box — grey example text",
    "contact.form.emailLabel": "Email box — label",
    "contact.form.serviceLabel": "Service list — label",
    "contact.form.servicePlaceholder": "Service list — text before choosing",
    "contact.form.serviceOptions": "Service list — choices",
    "contact.form.messageLabel": "Message box — label",
    "contact.form.messagePlaceholder": "Message box — grey example text",
    "contact.form.errorMessage": "Message when sending fails",
    "contact.form.submitLabel": "Send button text",
    "contact.form.sent.icon": "Tick picture",
    "contact.form.sent.title": "Heading",
    "contact.form.sent.text": "Text",
    "contact.form.sent.homeLabel": "Left button text",
    "contact.form.sent.homeHref": "Where the left button goes",
    "contact.form.sent.closeLabel": "Close button text",
    "contact.form.emailSubject": "Email subject (when the visitor's email app opens instead)",
    "contact.form.emailNoService": "Written when no service was chosen",
    "contact.form.formLabel": "Name of the form (read aloud for blind visitors)",
  },
  locked: [],
  // Starting values of a new item in a list (frontend HOME_TEMPLATES).
  templates: TEMPLATES.home,
  itemTitle: {
    "blueprint.slabs": ["title"],
    "services.extraCards": ["title"],
    "security.layers": ["title"],
    "process.steps": ["title"],
    "faq.items": ["question"],
  },
  options: {
    "why.marqueeDirection": ["right-to-left", "left-to-right"],
    "why.promisesDirection": ["right-to-left", "left-to-right"],
  },
  optionLabels: {
    "why.marqueeDirection": DIRECTION_LABELS,
    "why.promisesDirection": DIRECTION_LABELS,
  },
  addLabels: {
    "seo.keywords": "Add keyword",
    "blueprint.title": "Add line",
    "blueprint.slabs": "Add layer",
    "services.title": "Add line",
    "services.extraCards": "Add service card",
    "why.marqueeWords": "Add word",
    "why.promises": "Add word",
    "security.title": "Add line",
    "security.layers": "Add security card",
    "security.layers[].points": "Add line",
    "process.title": "Add line",
    "process.steps": "Add step",
    "process.steps[].deliverables": "Add chip",
    "pillars.title": "Add line",
    "pillars.clientCentric.features": "Add line",
    "pillars.quality.gates": "Add check",
    "pillars.scalable.stages": "Add step",
    "stories.title": "Add line",
    "stories.filters": "Add filter button",
    "faq.title": "Add line",
    "faq.items": "Add question",
    "contact.form.serviceOptions": "Add choice",
  },
  hints: {
    // Google & link previews
    "seo.title": "The page title in Google and on the browser tab.",
    "seo.description": "One or two sentences Google shows under the title.",
    "seo.keywords": "Words people might search for. Optional.",
    // Top of the page
    "hero.background": `Soft light wave behind the top area: one picture for the dark look, one for the light look. ${IMAGE_HINT}`,
    "hero.titleAccent": "Shown in the brand colour.",
    "hero.strip": "Also used on the picture shown when the homepage link is shared.",
    "hero.ringText": "Keep it short, and end it with a separator such as “•” so the circle joins up nicely.",
    "hero.primaryCta.href": "/#contact or /contact opens the “Start a project” form. Any other page address goes to that page.",
    // Blueprint
    "blueprint.title": ONE_LINE_PER_ENTRY,
    "blueprint.intro": "Write the number in words (e.g. Four). If you add or remove layers, change it here too.",
    "blueprint.slabs": "The glowing layers, top to bottom. Add or delete layers; the stack adjusts itself. A layer without a title is hidden.",
    // Services
    "services.title": `${ONE_LINE_PER_ENTRY} ${COUNT_HINT}`,
    "services.intro": COUNT_HINT,
    "services.exploreLabel": "Shown before the card's title on the button, e.g. “Explore” → “Explore App Development”.",
    ...SERVICE_CARD_FIELDS.hints,
    "services.extraCards":
      "Extra cards after the four above. “Add service card” adds one with its own picture upload. A card without a title is hidden.",
    "services.a11y": A11Y_HINT,
    // Why Tech Vedha
    "why.marqueeWords": "The big outlined words scrolling above the heading. One word or phrase per row.",
    "why.promises": "The big blue words scrolling under the buttons. One word or phrase per row.",
    "why.promisesDirection": "Opposite to the top line looks best.",
    "why.a11y": A11Y_HINT,
    // Security
    "security.title": ONE_LINE_PER_ENTRY,
    "security.layers": "The cards, left to right. “Add security card” adds one with its own picture. A card without a title is hidden.",
    "security.layers[].image": `Shown at the top of the card. Leave empty to keep the built-in drawing (extra cards reuse the four drawings in turn). ${IMAGE_HINT}`,
    // How we work
    "process.title": ONE_LINE_PER_ENTRY,
    "process.steps": "The steps, in order. “Add step” adds one with its own picture. A step without a title is hidden.",
    "process.steps[].image": `Shown in the step's example box. Leave empty to keep the built-in drawing (added steps reuse the six drawings in turn). ${IMAGE_HINT}`,
    "process.stepCounter": "Small text on the open step. {n} becomes the step's number and {total} the number of steps.",
    "process.nextLabel": "Only on phones and tablets.",
    "process.banner.primaryCta.href": "/#contact opens the “Start a project” form.",
    "process.banner.secondaryCta.href": "Leave empty to open WhatsApp (your number from Site & Menus).",
    "process.a11y": A11Y_HINT,
    // Four pillars
    "pillars.title": ONE_LINE_PER_ENTRY,
    "pillars.clientCentric.brief": "Put words in [square brackets] to underline them in the brand colour.",
    "pillars.clientCentric.features": "What the request turns into. One item per row.",
    "pillars.quality.gates": "Top to bottom. The first one is highlighted.",
    "pillars.scalable.stages": "Left to right. The last one is highlighted.",
    "pillars.secure.image": `Shown in the circle in place of the lock. Leave empty to keep the lock. ${IMAGE_HINT}`,
    "pillars.a11y": A11Y_HINT,
    // Client stories
    "stories.title": ONE_LINE_PER_ENTRY,
    "stories.note": "Small note under the stories. Leave empty to hide it.",
    "stories.a11y": A11Y_HINT,
    // Questions & answers
    "faq.title": ONE_LINE_PER_ENTRY,
    "faq.helpText": "Clicking the box opens WhatsApp (your number from Site & Menus).",
    "faq.items": "One question and its answer per card. The first one is open when the page loads. Google also reads these.",
    // Contact form
    "contact.whatsappValue": "The WhatsApp number itself comes from Site & Menus.",
    "contact.form.serviceOptions": "One choice per row.",
    "contact.form.sent.icon": IMAGE_HINT,
    "contact.form.validation": "Shown under a box that was filled in wrong.",
  },
} satisfies SitePageDefinition);
