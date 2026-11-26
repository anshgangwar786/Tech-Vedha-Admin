// Publishing of the service pages added in the Service catalogue ("services" → added[].page).
//
// A new service's page starts as a DRAFT: anyone who may edit pages can build it and check it with Preview, but only
// a user holding PERMISSIONS.PAGES_PUBLISH (the Super Admin, or a role they ticked it for) can put it live, take it
// offline, or change the address / remove a page that is live. Enforced here on the server, not only in the editor.

import { addedServiceSlugs } from "@/lib/sitePages/serviceSlugs";

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

/** The addresses (slugs) of the added services whose page is live, from a (normalized) catalogue document. */
export function publishedServiceSlugs(content: unknown): Set<string> {
  const doc = isObject(content) ? content : {};
  const items = Array.isArray(doc.items) ? doc.items.filter(isObject) : [];
  const added = Array.isArray(doc.added) ? doc.added.filter(isObject) : [];
  const slugs = addedServiceSlugs(
    items.flatMap((item) => [str(item.id), str(item.slug)]),
    added.map((item) => ({ title: str(item.title), slug: str(item.slug) })),
  );
  return new Set(added.flatMap((item, i) => (item.page === true && slugs[i] ? [slugs[i] as string] : [])));
}

/** True when the two catalogue versions have exactly the same live service pages. */
export function samePublishedPages(before: unknown, after: unknown): boolean {
  const a = publishedServiceSlugs(before);
  const b = publishedServiceSlugs(after);
  return a.size === b.size && [...a].every((slug) => b.has(slug));
}

export const PUBLISH_DENIED_MESSAGE =
  "Only the Super Admin (or someone they allow) can publish a new service page, take one offline, or rename or remove a live one. Undo that change (your other edits are fine) and save again — or ask the Super Admin to publish it.";

/**
 * The catalogue with one added service's page switched live (`publish: true`) or back to draft. Null when no added
 * service has that address.
 */
export function withPagePublished(content: unknown, slug: string, publish: boolean): Record<string, unknown> | null {
  const doc = isObject(content) ? content : {};
  const items = Array.isArray(doc.items) ? doc.items.filter(isObject) : [];
  const added = Array.isArray(doc.added) ? doc.added.filter(isObject) : [];
  const slugs = addedServiceSlugs(
    items.flatMap((item) => [str(item.id), str(item.slug)]),
    added.map((item) => ({ title: str(item.title), slug: str(item.slug) })),
  );
  const index = slugs.indexOf(slug);
  if (index === -1) return null;
  return { ...doc, added: added.map((item, i) => (i === index ? { ...item, page: publish } : item)) };
}
