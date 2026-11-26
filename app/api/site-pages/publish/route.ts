import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/config/db";
import { requirePermission } from "@/app/lib/utils/authorization";
import { PERMISSIONS } from "@/app/lib/constants/permissions";
import { errorResponse, normalizeSitePage, revalidateSitePage, staleClientResponse } from "@/app/lib/server/jmtSitePages";
import { syncSavedSitePage } from "@/app/lib/server/previewStore";
import { withPagePublished } from "@/app/lib/server/servicePublishing";
import { addedServicePageKey } from "@/lib/sitePages/serviceSlugs";

// POST /api/site-pages/publish — { slug, publish } puts a new service's page live (true) or back to draft (false).
// Only for users holding "Publish new service pages" (PERMISSIONS.PAGES_PUBLISH): the Super Admin by default.
export async function POST(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.PAGES_PUBLISH);
  if (auth instanceof NextResponse) return auth;
  const stale = staleClientResponse();
  if (stale) return stale;

  try {
    const body = await req.json().catch(() => null);
    const slug = typeof body?.slug === "string" ? body.slug : "";
    const publish = body?.publish === true;
    const row = await prisma.jmtSitePage.findUnique({ where: { key: "services" }, select: { content: true } });
    const next = withPagePublished(normalizeSitePage("services", row?.content ?? null), slug, publish);
    if (!next) {
      return NextResponse.json({ success: false, message: "No service in the Service catalogue uses this address." }, { status: 404 });
    }
    const content = normalizeSitePage("services", next) as Prisma.InputJsonValue;
    const saved = await prisma.jmtSitePage.upsert({
      where: { key: "services" },
      create: { key: "services", content },
      update: { content },
    });
    syncSavedSitePage("services", saved.content);
    await Promise.all([revalidateSitePage("services"), revalidateSitePage(addedServicePageKey(slug) as `service-${string}`)]);
    return NextResponse.json({
      success: true,
      message: publish ? "Page published — it is live on the website" : "Page taken offline — it is a draft again",
      published: publish,
    });
  } catch (error) {
    return errorResponse("Publishing the service page", error);
  }
}
