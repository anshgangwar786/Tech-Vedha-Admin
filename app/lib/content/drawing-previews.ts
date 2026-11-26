// Previews of the website's built-in drawings. Several image fields have no default picture: when they are empty,
// Tech-Vedha-frontend draws an illustration in code instead (service scenes, security and process visuals, the
// contact map, deliverable drawings). The admin shows a snapshot of that drawing so editors see what is there.
//
// The snapshots live in the Hostinger media folder (<media>/drawing-previews/). Re-take and upload them after
// changing a drawing on the website (with the website running on http://localhost:3002):
//   node scripts/snap-drawings.mjs && npm run upload:drawing-previews

type Path = (string | number)[];

/** Public address of the Hostinger media folder (HOSTINGER_MEDIA_URL; NEXT_PUBLIC_ so the browser can use it). */
const MEDIA_URL = (
  process.env.NEXT_PUBLIC_HOSTINGER_MEDIA_URL || "https://navajowhite-octopus-630288.hostingersite.com/tech-vedha/media"
).replace(/\/+$/, "");
const DIR = `${MEDIA_URL}/drawing-previews`;
const SERVICE_SCENES = ["marketing", "apps", "cad", "software"];
/** Drawings that exist as snapshots (DeliverableVisualArt on the website). */
const DELIVERABLE_VISUALS = [
  "app-screens",
  "release-checklist",
  "campaign-dashboard",
  "campaign-checklist",
  "search-rankings",
  "monthly-report",
];

/**
 * Snapshot of the drawing the website shows when this image field is empty, or undefined when there is none
 * (added service cards, deliverable checklists). `getSibling` reads a field next to the image (e.g. "visual").
 */
export function drawingPreviewFor(
  pagePath: string,
  path: Path,
  getSibling: (name: string) => unknown,
): string | undefined {
  const [section, key, third] = path;

  if (pagePath === "/") {
    // services.<card>.image: the four designed cards (added cards draw their own title, so no snapshot).
    if (section === "services" && typeof key === "string" && SERVICE_SCENES.includes(key) && third === "image") {
      return `${DIR}/home-services-${key}.png`;
    }
    // Drawings by position; added items reuse them in turn, as on the website.
    if (section === "security" && key === "layers" && typeof third === "number") {
      return `${DIR}/home-security-${third % 4}.png`;
    }
    if (section === "process" && key === "steps" && typeof third === "number") {
      return `${DIR}/home-process-${third % 6}.png`;
    }
    if (section === "pillars" && key === "secure") return `${DIR}/home-pillars-secure.png`;
    return undefined;
  }

  if (pagePath === "/contact" && path[path.length - 1] === "mapImage") return `${DIR}/contact-map.png`;

  if (section === "deliverables" && key === "cards") {
    const visual = getSibling("visual");
    if (typeof visual === "string" && DELIVERABLE_VISUALS.includes(visual)) return `${DIR}/deliverable-${visual}.png`;
  }
  return undefined;
}
