"use client";

// Editor for one Tech Vedha site page (components/site-page-editor/SitePageEditorView.tsx).

import { useParams } from "next/navigation";
import SitePageEditorView from "@/components/site-page-editor/SitePageEditorView";

export default function SitePageEditor() {
  const { key } = useParams<{ key: string }>();
  return <SitePageEditorView key={key} pageKey={key} />;
}
