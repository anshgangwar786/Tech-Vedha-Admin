// Keeps the Contact page's email / phone / WhatsApp rows and the site-wide contact settings (Site & Menus) in step.
//
// The website links every Envelope, Phone and Speech-bubble row to the contact settings (mailto:, tel:, wa.me),
// so a value typed into one of those rows on the Contact page is saved to the settings too — otherwise the
// page would keep showing (and linking to) the old address or number.

import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/config/db";
import { syncSavedSitePage } from "@/app/lib/server/previewStore";
import { normalizeSitePage, revalidateSitePage } from "@/app/lib/server/jmtSitePages";
import { emailError, phoneError } from "@/lib/sitePages/contactFormats";

type Row = { icon?: unknown; value?: unknown };
type Settings = { email: string; phone: string; whatsappNumber: string };
type Doc = Record<string, unknown>;

const digitsOnly = (value: string) => value.replace(/\D/g, "");
const isEmail = (value: string) => emailError(value) === null;
/** A phone number as people type it: digits with optional +, spaces, dashes, dots or brackets. */
export const isPhoneNumber = (value: string) => /^\+?[\d\s().-]+$/.test(value) && digitsOnly(value).length >= 7;

const asDoc = (value: unknown): Doc => (value && typeof value === "object" && !Array.isArray(value) ? (value as Doc) : {});
const asRows = (value: unknown): Row[] => (Array.isArray(value) ? (value as Row[]) : []);
const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/** The Contact page's rows and cards that carry contact settings: brand-card rows first, then the channel cards. */
function settingRows(contact: Doc): Row[] {
  return [...asRows(asDoc(contact.brandCard).quickContacts), ...asRows(asDoc(contact.channels).cards)];
}

function currentSettings(site: Doc): Settings {
  return { email: text(site.email), phone: text(site.phone), whatsappNumber: text(site.whatsappNumber) };
}

/** WhatsApp number in effect: its own setting, or the phone number when that is empty. */
const effectiveWhatsApp = (settings: Settings) => digitsOnly(settings.whatsappNumber || settings.phone);

/**
 * Settings changed on the Contact page. When rows disagree, the one that differs from the current setting wins
 * (that is the one the editor just changed).
 */
function changedSettings(contact: Doc, current: Settings): Partial<Settings> {
  const changes: Partial<Settings> = {};
  for (const row of settingRows(contact)) {
    const value = text(row.value);
    if (!value) continue;
    if (row.icon === "mail" && isEmail(value) && value.toLowerCase() !== current.email.toLowerCase()) {
      changes.email ??= value;
    } else if (row.icon === "phone" && isPhoneNumber(value) && digitsOnly(value) !== digitsOnly(current.phone)) {
      changes.phone ??= value;
    } else if (row.icon === "chat" && isPhoneNumber(value) && digitsOnly(value) !== effectiveWhatsApp(current)) {
      changes.whatsappNumber ??= digitsOnly(value);
    }
  }
  return changes;
}

/**
 * After the Contact page is saved: copies any changed email / phone / WhatsApp number into Site & Menus and
 * refreshes the website. Returns the fields that were updated (empty when nothing changed).
 */
export async function pushContactSettings(contact: unknown): Promise<(keyof Settings)[]> {
  const row = await prisma.jmtSitePage.findUnique({ where: { key: "site" }, select: { content: true } });
  const site = asDoc(normalizeSitePage("site", row?.content ?? null));
  const changes = changedSettings(asDoc(contact), currentSettings(site));
  const fields = Object.keys(changes) as (keyof Settings)[];
  if (!fields.length) return [];
  await writeSiteSettings(row?.content, changes);
  return fields;
}

/** Saves settings into the "site" document (everything else saved there is kept) and refreshes the website. */
async function writeSiteSettings(saved: unknown, changes: Partial<Settings>): Promise<Settings> {
  const content = normalizeSitePage("site", { ...asDoc(saved), ...changes }) as Prisma.InputJsonValue;
  const row = await prisma.jmtSitePage.upsert({
    where: { key: "site" },
    create: { key: "site", content },
    update: { content },
  });
  syncSavedSitePage("site", row.content);
  // Header, footer, Contact page, WhatsApp buttons… all read the "site" document, so this one tag covers them.
  await revalidateSitePage("site");
  return currentSettings(asDoc(normalizeSitePage("site", row.content)));
}

/** The contact settings the website uses now (saved values, or the bundled defaults). */
export async function readContactSettings(): Promise<Settings> {
  const row = await prisma.jmtSitePage.findUnique({ where: { key: "site" }, select: { content: true } });
  return currentSettings(asDoc(normalizeSitePage("site", row?.content ?? null)));
}

/** Checks the dashboard's contact form. WhatsApp may be empty (= use the phone number); it is stored as digits. */
export function validateContactSettings(body: unknown): { settings: Settings } | { error: string } {
  const doc = asDoc(body);
  const email = text(doc.email);
  const phone = text(doc.phone);
  const whatsapp = text(doc.whatsappNumber);
  // Same rules as the site page editors (lib/sitePages/contactFormats.ts).
  const error = emailError(email) ?? phoneError(phone) ?? (whatsapp ? phoneError(whatsapp, "WhatsApp number") : null);
  if (error) return { error };
  return { settings: { email, phone, whatsappNumber: digitsOnly(whatsapp) } };
}

/** Saves the dashboard's contact form to Site & Menus; returns what is now in effect. */
export async function saveContactSettings(settings: Settings): Promise<Settings> {
  const row = await prisma.jmtSitePage.findUnique({ where: { key: "site" }, select: { content: true } });
  return writeSiteSettings(row?.content, settings);
}

/**
 * Before the Contact page reaches the editor: Envelope and Phone rows show the current settings, and a
 * Speech-bubble row that holds a number shows the current WhatsApp number, so the editor always sees (and edits)
 * what the website uses.
 */
export async function withContactSettings<T>(contact: T): Promise<T> {
  const row = await prisma.jmtSitePage.findUnique({ where: { key: "site" }, select: { content: true } });
  const settings = currentSettings(asDoc(normalizeSitePage("site", row?.content ?? null)));
  const whatsapp = effectiveWhatsApp(settings);
  const fill = (item: Row): Row => {
    if (item.icon === "mail" && settings.email) return { ...item, value: settings.email };
    if (item.icon === "phone" && settings.phone) return { ...item, value: settings.phone };
    if (item.icon === "chat" && whatsapp && isPhoneNumber(text(item.value))) return { ...item, value: `+${whatsapp}` };
    return item;
  };
  const doc = asDoc(contact);
  const brandCard = asDoc(doc.brandCard);
  const channels = asDoc(doc.channels);
  return {
    ...doc,
    brandCard: { ...brandCard, quickContacts: asRows(brandCard.quickContacts).map(fill) },
    channels: { ...channels, cards: asRows(channels.cards).map(fill) },
  } as T;
}
