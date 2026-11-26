// Shared types and helpers of the page definitions (one file per page in this folder).

import type { ListTemplates, PlainObject } from "@/lib/sitePages/mergeContent";
import type { ContactFormat } from "@/lib/sitePages/contactFormats";

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
  /**
   * Email / phone / WhatsApp fields, keyed by path pattern: checked as you type and on save (editor and API),
   * see lib/sitePages/contactFormats.ts.
   */
  formats?: Record<string, ContactFormat>;
  /** Field hints, keyed by path pattern. */
  hints?: Record<string, string>;
  /**
   * Item shape of lists that are empty by default (data/siteContentTemplates.json, from the frontend's
   * CONTENT_TEMPLATES), so saved items are kept and "Add" can create the first one.
   */
  templates?: ListTemplates;
  /**
   * Fields whose older saved text may still say "{count}", keyed by path pattern: the list whose length is shown in
   * its place (in words), so the editor shows the text exactly as the website does. `list` counts the items of a list
   * that have a title; `cards` counts single cards (objects) that have a title and aren't switched off (`show`).
   */
  counts?: Record<string, { list?: string; cards?: string[]; lowercase?: boolean }>;
  /** Field names shown in the editor, keyed by path pattern (default: made from the key, e.g. "titleLead"). */
  labels?: Record<string, string>;
  /**
   * Fields shown only when a sibling field has one of the given values, keyed by path pattern, e.g.
   * { "stories.items[].stat": { field: "kind", is: ["stat"] } }: a story's big number shows only on "stat" cards.
   */
  showWhen?: Record<string, { field: string; is: readonly string[] }>;
  /** Fields only users holding a permission may change (path pattern → permission key); others see them greyed out. */
  requires?: Record<string, { permission: string; note: string }>;
  /** Extra fields (path patterns) folded under "Advanced" besides the usual ones (a11y, error messages…). */
  advanced?: readonly string[];
  /** Keys whose values make an item's title in its list, keyed by list pattern (joined with " — "). */
  itemTitle?: Record<string, readonly string[]>;
  /** Names shown in a dropdown instead of the stored value, keyed by path pattern then value. */
  optionLabels?: Record<string, Record<string, string>>;
  /** "Add" button text per list, keyed by path pattern (default "Add item" / "Add line"). */
  addLabels?: Record<string, string>;
}

export const SEO: SitePageSection = { title: "SEO", hint: "Browser tab title, search result description and keywords" };

export const IMAGE_HINT =
  "Click Upload to add a picture from your computer — it is stored in your Hostinger media folder and appears in the Media Library — or pick one you uploaded before with Media Library.";

/** Shared label for the screen-reader-only texts of a section. */
export const A11Y_HINT = "Read aloud by screen readers; not shown on screen.";

// ── Client stories (homepage and service pages) ─────────────────────────────

const STORY_KINDS = ["quote", "stat", "photo", "featured"] as const;
const STORY_COLUMNS = ["auto", "left", "middle", "right"] as const;

/**
 * Editor setup of a "Client stories" section at `prefix`: add, delete and reorder story cards, pick each card's type
 * (the form then shows only the fields that type uses) and its desktop column. Spread into a page definition with
 * withStoriesEditor(). KEEP IN SYNC with Tech-Vedha-frontend/data/stories.ts (Story, STORY_TEMPLATE).
 */
function storiesEditor(prefix: string): Partial<SitePageDefinition> {
  const item = `${prefix}.items[]`;
  return {
    options: { [`${item}.kind`]: STORY_KINDS, [`${item}.column`]: STORY_COLUMNS },
    optionLabels: {
      [`${item}.kind`]: {
        quote: "Quote (text with a small photo)",
        stat: "Stat (big number, then the quote)",
        photo: "Photo (large photo, then the quote)",
        featured: "Featured (large quote on the brand colour)",
      },
      [`${item}.column`]: {
        auto: "Automatic (shortest column)",
        left: "Left column",
        middle: "Middle column",
        right: "Right column",
      },
    },
    showWhen: {
      [`${item}.photo`]: { field: "kind", is: ["photo"] },
      [`${item}.photoAlt`]: { field: "kind", is: ["photo"] },
      [`${item}.stat`]: { field: "kind", is: ["stat"] },
      [`${item}.statLabel`]: { field: "kind", is: ["stat"] },
      [`${item}.avatar`]: { field: "kind", is: ["quote", "stat", "featured"] },
    },
    itemTitle: { [`${prefix}.items`]: ["company", "role"] },
    labels: {
      [`${prefix}.items`]: "Story cards",
      [`${item}.kind`]: "Card type",
      [`${item}.column`]: "Column on desktop",
      [`${item}.photo`]: "Large photo",
      [`${item}.photoAlt`]: "Photo description (for screen readers)",
      [`${item}.stat`]: "Big number",
      [`${item}.statLabel`]: "Text under the number",
      [`${item}.avatar`]: "Small round photo",
      [`${item}.category`]: "Category (matches a filter button)",
    },
    hints: {
      [`${prefix}.items`]:
        "One card per story. “Add story” adds a card; the bin deletes one; the arrows change the order. Pick a card type and the form shows just the fields it needs. A card without a quote is hidden.",
      [`${item}.column`]: "Automatic places the card in the shortest column, so the wall stays even as you add or remove stories.",
      [`${item}.photo`]: IMAGE_HINT,
      [`${item}.avatar`]: `Optional. ${IMAGE_HINT}`,
      [`${item}.stat`]: "Short, e.g. “4 → 1” or “3 stores”.",
      [`${item}.category`]: "Write it exactly like one of the filter buttons above (e.g. Apps) so the card shows under that filter.",
      [`${prefix}.filters`]: "Filter buttons. The first one shows every story; the others show the stories whose category matches exactly.",
    },
    addLabels: { [`${prefix}.items`]: "Add story" },
  };
}

/** A page definition with the "Client stories" editor setup merged in (see storiesEditor). */
export function withStoriesEditor<T extends SitePageDefinition>(page: T, prefix = "stories"): T {
  const extra = storiesEditor(prefix);
  return {
    ...page,
    options: { ...page.options, ...extra.options },
    optionLabels: { ...page.optionLabels, ...extra.optionLabels },
    showWhen: { ...page.showWhen, ...extra.showWhen },
    itemTitle: { ...page.itemTitle, ...extra.itemTitle },
    labels: { ...page.labels, ...extra.labels },
    hints: { ...page.hints, ...extra.hints },
    addLabels: { ...page.addLabels, ...extra.addLabels },
  };
}
