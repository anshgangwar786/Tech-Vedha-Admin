"use client";

// Editor for one site page (/dashboard/site-pages/<key>), or for one part of the "site" page
// (/dashboard/menus/header and /dashboard/menus/footer: only that part's sections).
// The form is generated from the page's bundled copy (app/lib/content/site-pages.ts);
// saving stores it in `jmt_site_pages` and refreshes the website at once.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { RevalidateButton } from "@/components/common/RevalidateButton";
import { jmtSitePageTags } from "@/app/lib/utils/cacheTags";
import { ExternalLink, Eye, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContentEditor from "@/components/site-page-editor/ContentEditor";
import { addedServiceSlugOf, getSitePageDefinition, isSitePageKey } from "@/app/lib/content/site-pages";
import { refreshAddedServices, useAddedServices } from "@/hooks/useAddedServices";
import type { PlainObject } from "@/lib/sitePages/mergeContent";
import { liveSiteUrl, useDraftPreview } from "@/hooks/useDraftPreview";
import { usePermissions } from "@/components/common/PermissionsProvider";
import { PERMISSIONS } from "@/app/lib/constants/permissions";
import { findFormatProblems } from "@/lib/sitePages/contactFormats";
import { MENU_SECTION_KEYS, SITE_MENU_PARTS, type SiteMenuPart } from "@/components/site-page-editor/siteMenuParts";

interface ServerDoc {
  success?: boolean;
  message?: string;
  exists?: boolean;
  updatedAt?: string | null;
  content?: PlainObject;
}

export default function SitePageEditorView({ pageKey: key, part }: { pageKey: string; part?: SiteMenuPart }) {
  const partConfig = part ? SITE_MENU_PARTS[part] : null;
  // Pages of services added in the Service catalogue ("service-<slug>") take their name and status from it.
  const addedSlug = isSitePageKey(key) ? addedServiceSlugOf(key) : null;
  const { services: addedServices, loaded: addedLoaded } = useAddedServices(addedSlug !== null);
  const addedService = addedSlug ? addedServices.find((service) => service.slug === addedSlug) : undefined;
  const page = useMemo(
    () => (isSitePageKey(key) ? getSitePageDefinition(key, addedService?.title) : null),
    [key, addedService?.title],
  );

  const { can } = usePermissions();
  const canPublish = can(PERMISSIONS.PAGES_PUBLISH);
  const [publishing, setPublishing] = useState(false);
  const [content, setContent] = useState<PlainObject | null>(null);
  const [saved, setSaved] = useState("");
  const [exists, setExists] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  /** "content": every field, section by section; "images": only the page's images (upload / Media Library). */
  const [view, setView] = useState<"content" | "images">("content");

  const dirty = content !== null && JSON.stringify(content) !== saved;

  // Preview: the page with these unsaved edits, in a new tab (hooks/useDraftPreview.ts).
  const previewPayload = useMemo(
    () => (page && content && !loadError ? { kind: "site-page" as const, key, content } : null),
    [page, content, loadError, key],
  );
  const { openPreview, opening: previewOpening } = useDraftPreview({
    payload: previewPayload,
    path: page?.path ?? "/",
    windowName: `jmt-preview-page-${part ?? key}`,
  });

  const apply = useCallback((doc: ServerDoc) => {
    const next = doc.content ?? {};
    setContent(next);
    setSaved(JSON.stringify(next));
    setExists(Boolean(doc.exists));
    setUpdatedAt(doc.updatedAt ?? null);
  }, []);

  useEffect(() => {
    if (!page) return;
    (async () => {
      try {
        const res = await fetch(`/api/site-pages/${key}`, { credentials: "include" });
        const data: ServerDoc = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Failed to load the page");
        apply(data);
      } catch (error) {
        const message = (error as Error).message || "Failed to load the page";
        setLoadError(message);
        toast.error(message, { closeButton: true });
      }
    })();
  }, [key, page, apply]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const send = async (method: "PUT" | "DELETE", pending: string, done: string) => {
    // Saving after a failed load would overwrite the real content with defaults.
    if (loadError) return;
    setBusy(true);
    const toastId = toast.loading(pending);
    try {
      const res = await fetch(`/api/site-pages/${key}`, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: method === "PUT" ? JSON.stringify({ content }) : undefined,
      });
      const data: ServerDoc = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Request failed");
      apply(data);
      // The sidebar lists the added services' pages: show new names and pages at once.
      if (key === "services") refreshAddedServices();
      toast.success(done, { id: toastId, closeButton: true });
    } catch (error) {
      toast.error((error as Error).message || "Request failed", { id: toastId, closeButton: true });
    } finally {
      setBusy(false);
    }
  };

  /** Puts this added service's page live, or back to draft (publishers only; the server checks too). */
  const setPublished = async (publish: boolean) => {
    if (!addedSlug) return;
    const question = publish
      ? "Publish this page? It goes live on the website straight away."
      : "Take this page offline? It becomes a draft again and visitors get “page not found”.";
    if (!window.confirm(question)) return;
    setPublishing(true);
    const toastId = toast.loading(publish ? "Publishing..." : "Taking offline...");
    try {
      const res = await fetch("/api/site-pages/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug: addedSlug, publish }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || "Could not change the page");
      refreshAddedServices();
      toast.success(data.message, { id: toastId, closeButton: true });
    } catch (error) {
      toast.error((error as Error).message, { id: toastId, closeButton: true });
    } finally {
      setPublishing(false);
    }
  };

  if (!page) {
    return (
      <div className="space-y-2 p-6">
        <p className="text-foreground">Unknown page.</p>
        <Link href="/dashboard" className="text-sm text-brand-link underline">
          Back to the dashboard
        </Link>
      </div>
    );
  }

  const title = partConfig?.title ?? page.title;
  const Icon = partConfig?.icon;
  // Header / Footer show only their sections; the "site" page itself shows everything else.
  const only = partConfig
    ? undefined
    : key === "site"
      ? Object.keys(page.defaults).filter((k) => !MENU_SECTION_KEYS.includes(k))
      : undefined;
  const liveUrl = liveSiteUrl(page.path);
  // Wrong email / phone / WhatsApp fields shown here (Header / Footer pages don't show the contact settings).
  const allProblems = content ? findFormatProblems(page.formats, content) : [];
  const problems = partConfig
    ? allProblems.filter(({ path }) =>
        partConfig.cards.some((c) => c.key === path[0] && (!c.fields || c.fields.includes(String(path[1])))),
      )
    : only
      ? allProblems.filter(({ path }) => only.includes(String(path[0])))
      : allProblems;
  const save = () => {
    const [first] = problems;
    if (first) {
      // Open the card holding the first wrong field, so its red message is in view.
      const cardId = partConfig
        ? partConfig.cards.find((c) => c.key === first.path[0] && (!c.fields || c.fields.includes(String(first.path[1]))))?.id
        : String(first.path[0]);
      if (cardId) setOpen((prev) => ({ ...prev, [cardId]: true }));
      setView("content");
      toast.error(
        problems.length === 1 ? "Fix the field marked in red before saving" : `Fix the ${problems.length} fields marked in red before saving`,
        { description: first.message, closeButton: true },
      );
      return;
    }
    send("PUT", "Saving...", `${title} saved — the website is updated`);
  };
  const saveDisabled = busy || Boolean(loadError) || content === null || (!dirty && exists);
  const saveLabel = busy ? "Saving..." : exists ? "Save changes" : "Publish page";
  const sectionKeys = partConfig ? partConfig.cards.map((c) => c.id) : (only ?? Object.keys(page.defaults));
  const allOpen = sectionKeys.every((k) => open[k]);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">
        {/* Header — sticky so Save is always reachable on this long form */}
        <div className="sticky top-14 z-20 -mx-4 mb-2 flex flex-col gap-2 border-b border-border bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4 md:top-0">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 truncate text-xl font-bold text-foreground sm:text-2xl">
              {Icon && <Icon className="h-5 w-5 shrink-0 text-muted-foreground sm:h-6 sm:w-6" />}
              {title}
            </h1>
            <p className="truncate text-xs text-muted-foreground sm:text-sm">
              {dirty ? (
                <span className="text-warning">Unsaved changes</span>
              ) : partConfig ? (
                partConfig.description
              ) : exists && updatedAt ? (
                `Last saved ${new Date(updatedAt).toLocaleString()}`
              ) : (
                page.path
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 max-sm:[&>*]:h-8 max-sm:[&>*]:px-3">
            <Button
              variant="ghost"
              onClick={() => setOpen(Object.fromEntries(sectionKeys.map((k) => [k, !allOpen])))}
              className="text-foreground-light hover:bg-muted/50 hover:text-foreground"
            >
              {allOpen ? "Collapse all" : "Expand all"}
            </Button>
            {/* The page with the unsaved edits — nothing is published until Save */}
            <Button
              variant="outline"
              onClick={openPreview}
              disabled={previewOpening || content === null || Boolean(loadError)}
              aria-label="Preview unsaved changes"
              title="Open this page with your unsaved changes (not published)"
            >
              <Eye className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">{previewOpening ? "Opening..." : "Preview"}</span>
            </Button>
            <Button asChild variant="outline">
              <a href={liveUrl} target="_blank" rel="noopener noreferrer" aria-label="View live">
                <ExternalLink className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">View live</span>
              </a>
            </Button>
            {dirty && (
              <Button
                variant="outline"
                onClick={() => {
                  if (window.confirm("Discard your unsaved changes?")) setContent(JSON.parse(saved));
                }}
              >
                Discard
              </Button>
            )}
            <RevalidateButton label={title} tags={jmtSitePageTags(key)} />
            <Button onClick={save} disabled={saveDisabled} className="ml-auto px-6 sm:ml-0">
              {saveLabel}
            </Button>
          </div>
        </div>

        {loadError && (
          <div className="flex flex-col gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive sm:flex-row sm:items-center sm:justify-between">
            <p>
              <strong>Could not load the page, so saving is disabled.</strong> {loadError}
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="shrink-0">
              Retry
            </Button>
          </div>
        )}

        {addedSlug !== null && addedLoaded && (
          <div
            className={
              addedService?.page
                ? "rounded-lg border border-success/40 bg-success/10 p-4 text-sm text-foreground"
                : "rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
            }
          >
            {!addedService ? (
              <p>
                <strong>No service in the Service catalogue uses /services/{addedSlug}.</strong> This text is kept, but
                it isn&apos;t shown anywhere. Check the service&apos;s slug in the{" "}
                <Link href="/dashboard/site-pages/services" className="underline">
                  Service catalogue
                </Link>
                .
              </p>
            ) : addedService.page ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <strong>Live</strong> at {page.path}. Changes you save appear on the website straight away.
                </p>
                {canPublish && (
                  <Button variant="outline" disabled={publishing} onClick={() => setPublished(false)} className="shrink-0">
                    Take offline
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <strong>Draft — not on the website yet.</strong> Build the page, save, and check it with Preview.{" "}
                  {canPublish
                    ? "When it's ready, publish it."
                    : "When it's ready, ask the Super Admin to publish it."}
                </p>
                {canPublish && (
                  <Button disabled={publishing || dirty} onClick={() => setPublished(true)} className="shrink-0" title={dirty ? "Save your changes first" : undefined}>
                    Publish this page
                  </Button>
                )}
              </div>
            )}
          </div>
        )}

        {content === null && !loadError && <p className="text-foreground-light">Loading...</p>}

        {content && (
          <>
            <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
              <div role="tablist" aria-label="Editor view" className="inline-flex w-fit rounded-lg border border-border bg-muted/40 p-1">
                {(
                  [
                    ["content", "Page content"],
                    ["images", "Images"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="tab"
                    aria-selected={view === value}
                    onClick={() => setView(value)}
                    className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                      view === value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <h2 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {view === "images"
                  ? "Every image on this page — upload or pick from the Media Library, section by section"
                  : "Page sections — same order as the website, top to bottom"}
              </h2>
            </div>
            <ContentEditor
              can={(permission) => can(permission as Parameters<typeof can>[0])}
              imagesOnly={view === "images"}
              page={page}
              only={only}
              cards={partConfig?.cards}
              content={content}
              onChange={(update) => setContent((prev) => (prev ? update(prev) : prev))}
              open={open}
              onToggle={(k) => setOpen((prev) => ({ ...prev, [k]: !prev[k] }))}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 pb-10">
              {/* A part edits only some sections of the shared "site" document: no whole-page reset there. */}
              {exists && !partConfig ? (
                <Button
                  variant="ghost"
                  disabled={busy}
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    const question = `Reset the whole "${page.title}" page to the built-in copy? Your saved edits will be deleted.`;
                    if (window.confirm(question)) send("DELETE", "Resetting...", `${page.title} reset to the default copy`);
                  }}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset page to default
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={save} disabled={saveDisabled} className="px-8">
                {saveLabel}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
