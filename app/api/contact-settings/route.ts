import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/app/lib/utils/authorization";
import { PERMISSIONS } from "@/app/lib/constants/permissions";
import { errorResponse, staleClientResponse } from "@/app/lib/server/jmtSitePages";
import { readContactSettings, saveContactSettings, validateContactSettings } from "@/app/lib/server/contactSettingsSync";

// The site-wide contact details (email, phone, WhatsApp number) — edited from the dashboard home.
// They are stored in the "site" page (Site & Menus), which every page of the website reads: header, phone menu,
// footer, Contact page, WhatsApp buttons, the enquiry pop-up and structured data all update together.

export async function GET(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.CONTENT_EDIT);
  if (auth instanceof NextResponse) return auth;
  try {
    return NextResponse.json({ success: true, settings: await readContactSettings() });
  } catch (error) {
    return errorResponse("Loading the contact details", error);
  }
}

// PUT — body: { email, phone, whatsappNumber }.
export async function PUT(req: NextRequest) {
  const auth = await requirePermission(req, PERMISSIONS.CONTENT_EDIT);
  if (auth instanceof NextResponse) return auth;
  const stale = staleClientResponse();
  if (stale) return stale;
  try {
    const body = await req.json().catch(() => null);
    const result = validateContactSettings(body);
    if ("error" in result) return NextResponse.json({ success: false, message: result.error }, { status: 400 });
    const settings = await saveContactSettings(result.settings);
    return NextResponse.json({ success: true, message: "Contact details updated across the website", settings });
  } catch (error) {
    return errorResponse("Saving the contact details", error);
  }
}
