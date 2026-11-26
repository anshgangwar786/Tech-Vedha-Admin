"use client";

// Dashboard → Menus → Header Menu / Footer Menu: the header and footer parts of the
// "site" page (components/site-page-editor/siteMenuParts.ts).

import { notFound, useParams } from "next/navigation";
import SitePageEditorView from "@/components/site-page-editor/SitePageEditorView";
import { isSiteMenuPart } from "@/components/site-page-editor/siteMenuParts";

export default function SiteMenuPartPage() {
  const { part } = useParams<{ part: string }>();
  if (!isSiteMenuPart(part)) notFound();
  return <SitePageEditorView key={part} pageKey="site" part={part} />;
}
