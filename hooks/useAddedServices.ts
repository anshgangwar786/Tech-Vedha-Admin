"use client";

// The services added in the Service catalogue (site page "services" → added), for the sidebar's page links and the
// page editors' names. Slugs are resolved exactly as the website does (lib/sitePages/serviceSlugs.ts). One request is
// shared by every component; refreshAddedServices() reloads it (called after the catalogue is saved).

import { useEffect, useState } from "react";
import { addedServiceSlugs } from "@/lib/sitePages/serviceSlugs";

export interface AddedServiceLink {
  title: string;
  slug: string;
  /** "Has its own page" is on: the page is live at /services/<slug>. */
  page: boolean;
}

const EVENT = "tv:added-services-changed";
let request: Promise<AddedServiceLink[]> | null = null;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown) => (typeof v === "string" ? v : "");

async function load(): Promise<AddedServiceLink[]> {
  try {
    const res = await fetch("/api/site-pages/services", { credentials: "include" });
    if (!res.ok) return [];
    const body: unknown = await res.json();
    const content = isObject(body) && isObject(body.content) ? body.content : {};
    const items = Array.isArray(content.items) ? content.items.filter(isObject) : [];
    const added = Array.isArray(content.added) ? content.added.filter(isObject) : [];
    const slugs = addedServiceSlugs(
      items.flatMap((item) => [str(item.id), str(item.slug)]),
      added.map((item) => ({ title: str(item.title), slug: str(item.slug) })),
    );
    return added.flatMap((item, index) => {
      const slug = slugs[index];
      return slug ? [{ title: str(item.title).trim(), slug, page: item.page === true }] : [];
    });
  } catch {
    return [];
  }
}

/** Reloads the list everywhere it is shown (e.g. after the Service catalogue is saved). */
export function refreshAddedServices() {
  request = null;
  window.dispatchEvent(new Event(EVENT));
}

/** The added services, in catalogue order. `enabled: false` skips the request (and returns an empty list). */
export function useAddedServices(enabled = true) {
  const [state, setState] = useState<{ services: AddedServiceLink[]; loaded: boolean }>({ services: [], loaded: false });

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = () => {
      request ??= load();
      request.then((services) => alive && setState({ services, loaded: true }));
    };
    run();
    window.addEventListener(EVENT, run);
    return () => {
      alive = false;
      window.removeEventListener(EVENT, run);
    };
  }, [enabled]);

  return state;
}
