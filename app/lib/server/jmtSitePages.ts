// Shared helpers for the JMT site page API routes (app/api/site-pages).

import { NextResponse } from "next/server";
import prisma from "@/app/lib/config/db";
import { mergeContent, upgradeLegacyHome } from "@/lib/sitePages/mergeContent";
import { addedServiceSlugs } from "@/lib/sitePages/serviceSlugs";
import { getSitePageDefinition, isSitePageKey, type SitePageKey } from "@/app/lib/content/site-pages";
import { jmtSitePageTags, revalidateFrontendTags } from "@/app/lib/utils/revalidateFrontend";

export { isSitePageKey };

/** Saved document merged over the bundled copy (unknown keys dropped, bad values reverted). */
export function normalizeSitePage(key: SitePageKey, raw: unknown) {
  const page = getSitePageDefinition(key);
  // Homepage documents saved before it was grouped by section keep their lists.
  if (key === "home") raw = upgradeLegacyHome(raw);
  return mergeContent(raw, page.defaults, page.locked ?? [], page.templates ?? {});
}

/**
 * The services added in the Service catalogue that have their own page ("Page" on), with the slug the website uses.
 * Empty when nothing is saved or the database can't be read.
 */
export async function liveAddedServicePages(): Promise<{ slug: string; title: string }[]> {
  try {
    const row = await prisma.jmtSitePage.findUnique({ where: { key: "services" } });
    const content = normalizeSitePage("services", row?.content ?? null) as {
      items: { id: string; slug: string }[];
      added: { title: string; slug: string; page: boolean }[];
    };
    const slugs = addedServiceSlugs(
      content.items.flatMap((item) => [item.id, item.slug]),
      content.added,
    );
    return content.added.flatMap((item, i) => {
      const slug = slugs[i];
      return slug && item.page ? [{ slug, title: item.title.trim() }] : [];
    });
  } catch (error) {
    console.error("[site-pages] reading the added services failed:", error);
    return [];
  }
}

/**
 * A server started before `prisma generate` has no `jmtSitePage` model.
 * Tell the admin to restart instead of failing with a vague TypeError.
 */
export function staleClientResponse(): NextResponse | null {
  const delegate = (prisma as Partial<typeof prisma>).jmtSitePage;
  if (delegate && typeof delegate.findFirst === "function") return null;
  return NextResponse.json(
    {
      success: false,
      message:
        "The server is running an out-of-date database client. Run `npx prisma db push`, restart the server and try again.",
    },
    { status: 503 },
  );
}

export function errorResponse(action: string, error: unknown) {
  console.error(`[site-pages] ${action} failed:`, error);
  const detail = error instanceof Error ? error.message.split("\n")[0] : "";
  const message =
    process.env.NODE_ENV === "development" && detail ? `${action} failed: ${detail}` : `Internal Server Error - ${action}`;
  return NextResponse.json({ success: false, message }, { status: 500 });
}

/** Expires the page on jmt-frontend (best effort, never throws). */
export const revalidateSitePage = (key: SitePageKey) => revalidateFrontendTags(jmtSitePageTags(key));
