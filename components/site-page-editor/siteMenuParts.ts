// Dashboard → Menus → Header Menu / Footer Menu (/dashboard/menus/<part>): the parts of the "site" page
// (app/lib/content/site-page-defs/site.ts) that make up the website's header and footer, split into cards.
// Both edit the same "site" document as Site settings, which shows every other section.

import type { ElementType } from "react";
import {
  Columns3,
  Copyright,
  Image as ImageIcon,
  ListStart,
  Mail,
  MousePointerClick,
  PanelBottom,
  PanelTop,
  PanelsTopLeft,
  Text,
  ClipboardList,
} from "lucide-react";
import type { EditorCard } from "./ContentEditor";

export type SiteMenuPart = "header" | "footer";

export const isSiteMenuPart = (value: unknown): value is SiteMenuPart => value === "header" || value === "footer";

export const SITE_MENU_PARTS: Record<
  SiteMenuPart,
  { title: string; description: string; icon: ElementType; cards: EditorCard[] }
> = {
  header: {
    title: "Header Menu",
    description: "The bar at the top of every page of the website. Save to publish.",
    icon: PanelTop,
    cards: [
      { id: "brand", key: "logo", title: "Brand", hint: "Logo for the dark and the light look", icon: ImageIcon },
      {
        id: "services",
        key: "header",
        fields: ["servicesLabel", "menuServices", "servicesNote", "servicesLinkLabel", "servicesLinkHref"],
        title: "Services drop-down",
        hint: "The “Services” button and the columns it opens",
        icon: PanelsTopLeft,
      },
      {
        id: "links",
        key: "header",
        fields: ["links"],
        title: "Menu items",
        hint: "Links next to “Services”, in navbar order",
        icon: ListStart,
      },
      {
        id: "buttons",
        key: "header",
        fields: ["ctaLabel", "ctaHref", "whatsappLabel", "emailLabel", "a11y"],
        title: "Buttons",
        hint: "“Start a project”, WhatsApp and email buttons",
        icon: MousePointerClick,
      },
      {
        id: "projectForm",
        key: "projectForm",
        title: "“Start a project” pop-up",
        hint: "The form that opens from every “Start a project” button",
        icon: ClipboardList,
      },
    ],
  },
  footer: {
    title: "Footer Menu",
    description: "The footer at the bottom of every page of the website. Save to publish.",
    icon: PanelBottom,
    cards: [
      {
        id: "brand",
        key: "footer",
        before: ["tagline"],
        fields: ["text"],
        title: "Brand",
        hint: "Slogan and the line under the footer logo",
        icon: Text,
      },
      {
        id: "columns",
        key: "footer",
        fields: ["servicesTitle", "serviceLinks", "companyTitle", "companyLinks"],
        title: "Link columns",
        hint: "Columns of links, in footer order",
        icon: Columns3,
      },
      {
        id: "contact",
        key: "footer",
        fields: ["contactTitle", "callLabel", "whatsappLabel"],
        title: "Contact column",
        hint: "Email, call and WhatsApp links (the email and numbers themselves are in Site settings)",
        icon: Mail,
      },
      {
        id: "bottom",
        key: "footer",
        fields: ["copyright", "legalLinks", "a11y"],
        title: "Bottom row",
        hint: "Copyright line and small links (Privacy, Terms…)",
        icon: Copyright,
      },
    ],
  },
};

/** Top-level sections of the "site" page edited under Menus, so Site settings leaves them out. */
export const MENU_SECTION_KEYS: readonly string[] = [
  ...new Set(
    Object.values(SITE_MENU_PARTS).flatMap((part) => part.cards.flatMap((card) => [card.key, ...(card.before ?? [])])),
  ),
];
