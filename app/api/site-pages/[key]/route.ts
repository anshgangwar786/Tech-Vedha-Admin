import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/app/lib/config/db";
import { syncSavedSitePage } from "@/app/lib/server/previewStore";
import { hasPermission, requirePermission } from "@/app/lib/utils/authorization";
import { PUBLISH_DENIED_MESSAGE, samePublishedPages } from "@/app/lib/server/servicePublishing";
import { PERMISSIONS, CONTENT_PERMISSIONS } from "@/app/lib/constants/permissions";
import {
  errorResponse,
  isSitePageKey,
  normalizeSitePage,
  revalidateSitePage,
  staleClientResponse,
} from "@/app/lib/server/jmtSitePages";

// One JMT site page (About, Contact, Join our crew) — dashboard read / save /
// reset. The page always exists on the website: without a saved document it
// shows the bundled copy, which is also what GET returns then.

type Context = { params: Promise<{ key: string }> };

const unknownPage = () => NextResponse.json({ success: false, message: "Unknown page" }, { status: 404 });

export async function GET(req: NextRequest, { params }: Context) {
  const auth = await requirePermission(req, CONTENT_PERMISSIONS);
  if (auth instanceof NextResponse) return auth;
  const { key } = await params;
  if (!isSitePageKey(key)) return unknownPage();
  const stale = staleClientResponse();
  if (stale) return stale;

  try {
    const row = await prisma.jmtSitePage.findUnique({ where: { key } });
    return NextResponse.json({
      success: true,
      exists: Boolean(row),
      updatedAt: row?.updatedAt ?? null,
      content: normalizeSitePage(key, row?.content ?? null),
    });
  } catch (error) {
    return errorResponse(`Loading the "${key}" page`, error);
  }
}

// PUT — save. Body: { content }.
export async function PUT(req: NextRequest, { params }: Context) {
  const auth = await requirePermission(req, PERMISSIONS.CONTENT_EDIT);
  if (auth instanceof NextResponse) return auth;
  const { key } = await params;
  if (!isSitePageKey(key)) return unknownPage();
  const stale = staleClientResponse();
  if (stale) return stale;

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.content !== "object" || body.content === null || Array.isArray(body.content)) {
      return NextResponse.json({ success: false, message: "content must be a JSON object" }, { status: 400 });
    }
    // Never trust the client shape: unknown keys dropped, bad values and unsafe image URLs reverted.
    const content = normalizeSitePage(key, body.content) as Prisma.InputJsonValue;
    // Publishing a new service page (or taking a live one offline / renaming it) needs the publish permission.
    if (key === "services" && !hasPermission(auth, PERMISSIONS.PAGES_PUBLISH)) {
      const current = await prisma.jmtSitePage.findUnique({ where: { key }, select: { content: true } });
      if (!samePublishedPages(normalizeSitePage(key, current?.content ?? null), content)) {
        return NextResponse.json({ success: false, message: PUBLISH_DENIED_MESSAGE }, { status: 403 });
      }
    }
    const row = await prisma.jmtSitePage.upsert({
      where: { key },
      create: { key, content },
      update: { content },
    });
    syncSavedSitePage(key, row.content);
    await revalidateSitePage(key);
    return NextResponse.json({
      success: true,
      message: "Page saved",
      exists: true,
      updatedAt: row.updatedAt,
      content: normalizeSitePage(key, row.content),
    });
  } catch (error) {
    return errorResponse(`Saving the "${key}" page`, error);
  }
}

// DELETE — reset to the bundled copy.
export async function DELETE(req: NextRequest, { params }: Context) {
  const auth = await requirePermission(req, PERMISSIONS.CONTENT_EDIT);
  if (auth instanceof NextResponse) return auth;
  const { key } = await params;
  if (!isSitePageKey(key)) return unknownPage();
  const stale = staleClientResponse();
  if (stale) return stale;

  try {
    // Resetting the catalogue would take every added service page offline.
    if (key === "services" && !hasPermission(auth, PERMISSIONS.PAGES_PUBLISH)) {
      const current = await prisma.jmtSitePage.findUnique({ where: { key }, select: { content: true } });
      if (!samePublishedPages(normalizeSitePage(key, current?.content ?? null), normalizeSitePage(key, null))) {
        return NextResponse.json({ success: false, message: PUBLISH_DENIED_MESSAGE }, { status: 403 });
      }
    }
    await prisma.jmtSitePage.deleteMany({ where: { key } });
    syncSavedSitePage(key, null);
    await revalidateSitePage(key);
    return NextResponse.json({
      success: true,
      message: "Page reset to the default copy",
      exists: false,
      updatedAt: null,
      content: normalizeSitePage(key, null),
    });
  } catch (error) {
    return errorResponse(`Resetting the "${key}" page`, error);
  }
}
