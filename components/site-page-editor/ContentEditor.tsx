"use client";

// Generic editor for the JMT site pages (About, Contact, Join our crew).
//
// The form is generated from the page's bundled content (the registry's
// `defaults`): one card per top-level section, and inside it one field per
// value — text inputs, "phone version" pairs, orange-accent headings, images
// (Media Library), icon dropdowns, switches and repeatable lists. Adding a
// field to the bundled copy in jmt-frontend/data (and its copy here) makes it
// editable with no change to this file.

import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, FileText, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import ImageField from "@/components/common/ImageField";
import {
  AddButton,
  Field,
  SectionCard,
  SubHeading,
  TextField,
  inputCls,
  itemCardCls,
  selectCls,
} from "@/components/homepage-editor/fields";
import type { HomeImageValue } from "@/app/lib/content/home-content";
import type { ImageFocus } from "@/types/homepage";
import {
  MAX_LIST_LENGTH,
  blankLike,
  isCopyValue,
  isImageValue,
  isPlainObject,
  patternOf,
  type PlainObject,
} from "@/lib/sitePages/mergeContent";
import type { SitePageDefinition } from "@/app/lib/content/site-pages";
import SeoScriptsNote from "@/components/seo-editor/SeoScriptsNote";
import { drawingPreviewFor } from "@/app/lib/content/drawing-previews";
import { countWord, friendlyText, type FriendlyText } from "./placeholders";

type Path = (string | number)[];

// ── Labels ───────────────────────────────────────────────────────────────────

// Plain-English names for the keys used across pages. A page can name any field itself (`labels` in its definition).
const LABELS: Record<string, string> = {
  meta: "Google & link previews",
  seo: "Google & link previews",
  keywords: "Search keywords",
  title: "Title",
  description: "Description",
  detail: "Text",
  summary: "Short description",
  text: "Text",
  short: "Shorter text for phones (optional)",
  desktop: "On computers",
  mobile: "On phones",
  long: "Full text",
  lead: "Heading start",
  accent: "Highlighted words (orange)",
  tail: "Heading end",
  eyebrow: "Small label above the heading",
  intro: "Text under the heading",
  introShort: "Text under the heading on phones",
  pill: "Label pill",
  heading: "Heading",
  subtitle: "Subtitle",
  primaryCta: "Main button",
  secondaryCta: "Second button",
  whatsappCta: "WhatsApp button",
  cta: "Button",
  applyCta: "Apply button",
  crumbHome: "Breadcrumb: home link",
  crumb: "Breadcrumb: this page",
  breadcrumb: "Breadcrumb (the small “Home / …” trail at the top)",
  homeLabel: "Text of the “Home” link",
  homeHref: "Where “Home” goes",
  currentLabel: "Name of this page",
  live: "Live (off = “Coming soon”)",
  alt: "Picture description (for blind visitors)",
  src: "Image",
  icon: "Icon",
  copy: "Section heading",
  placeholders: "Placeholders",
  labels: "Labels",
  messages: "Messages",
  whatsapp: "WhatsApp line",
  titleLead: "Heading — first line",
  titleAccent: "Heading — second line (coloured)",
  highlight: "Coloured words of the heading",
  href: "Link (where it goes)",
  link: "Link",
  label: "Text",
  ctaLabel: "Button text",
  ctaHref: "Button link",
  submitLabel: "Send button text",
  note: "Small note",
  stepCounter: "Step counter",
  stepLabel: "Step label",
  stepTab: "Step label on the ring",
  items: "Items",
  points: "Bullet points",
  tags: "Tags",
  number: "Number",
  question: "Question",
  answer: "Answer",
  faq: "Questions & answers",
  form: "Enquiry form",
  sent: "“Enquiry sent” pop-up",
  validation: "Error messages under the form fields",
  status: "Messages under the send button",
  a11y: "Labels read aloud for blind visitors",
  dark: "Dark theme version",
  light: "Light theme version",
  background: "Background image",
  logo: "Logo",
  image: "Image",
  photo: "Photo",
  avatar: "Small round photo",
  show: "Show this on the website",
  width: "Width (px)",
  height: "Height (px)",
};

/**
 * Keys holding things an editor rarely needs (screen-reader labels, error messages, email wording): shown folded
 * away under "Advanced", so the main form stays short. A page can add its own (`advanced` in its definition).
 */
/** Groups (objects) under these keys. "summary"/"status" are plain card text elsewhere, so only groups count. */
const ADVANCED_GROUPS = new Set(["a11y", "validation", "summary", "status"]);
/** Single fields under these keys. */
const ADVANCED_FIELDS = new Set(["formLabel", "emailSubject", "emailNoService", "errorMessage", "phonePrefill"]);

const ITEM_LABEL_KEYS = ["title", "name", "label", "question", "heading", "topic", "company", "statement", "text", "when", "value", "tag", "quote"];

function humanize(key: string): string {
  if (LABELS[key]) return LABELS[key];
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function textOf(value: unknown): string {
  if (typeof value === "string") return value;
  if (isPlainObject(value)) {
    for (const key of ITEM_LABEL_KEYS) {
      const text = textOf(value[key]);
      if (text) return text;
    }
    if (typeof value.lead === "string") return `${value.lead} ${value.accent ?? ""}`.trim();
  }
  return "";
}

function itemLabel(value: unknown, index: number, keys?: readonly string[]): string {
  const named = keys && isPlainObject(value)
    ? keys.map((key) => (typeof value[key] === "string" ? (value[key] as string).trim() : "")).filter(Boolean).join(" — ")
    : "";
  const text = named || textOf(value).trim();
  const short = text.length > 60 ? `${text.slice(0, 57)}…` : text;
  return short ? `${index + 1}. ${short}` : `Item ${index + 1}`;
}

// ── Immutable update ─────────────────────────────────────────────────────────

export function setIn(root: unknown, path: Path, value: unknown): unknown {
  if (path.length === 0) return value;
  const [head, ...rest] = path;
  if (Array.isArray(root)) {
    const copy = [...root];
    copy[head as number] = setIn(copy[head as number], rest, value);
    return copy;
  }
  const obj = isPlainObject(root) ? root : {};
  return { ...obj, [head]: setIn(obj[head as string], rest, value) };
}

function getIn(root: unknown, path: Path): unknown {
  let node = root;
  for (const part of path) {
    if (Array.isArray(node)) node = node[part as number];
    else if (isPlainObject(node)) node = node[part as string];
    else return undefined;
  }
  return node;
}

// ── Shape helpers ────────────────────────────────────────────────────────────

const isAccentHeading = (v: unknown): v is PlainObject =>
  isPlainObject(v) && typeof v.lead === "string" && typeof v.accent === "string";

const isResponsivePair = (v: unknown): v is PlainObject =>
  isPlainObject(v) &&
  Object.keys(v).length === 2 &&
  ((typeof v.desktop === "string" && typeof v.mobile === "string") ||
    (typeof v.long === "string" && typeof v.short === "string"));

const multiline = (key: string, def: unknown) =>
  ["text", "intro", "subtitle", "description", "address"].includes(key) || (typeof def === "string" && def.length > 90);

const IMAGE_KEYS = new Set(["avatar", "photo", "image", "logo", "thumbnail", "cover", "picture"]);
const IMAGE_FILE = /^(\/(?!\/)|https:\/\/)\S*\.(jpe?g|png|webp|gif|avif|svg)(\?\S*)?$/i;

/** A string field that holds an image path or URL: an image key name, or an image file as its default. */
const isImagePathField = (key: string, def: string) => IMAGE_KEYS.has(key) || IMAGE_FILE.test(def);

/** Reads the natural size of an image URL (keeps next/image's aspect ratio right after a swap). */
function measureImage(src: string): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => resolve(img.naturalWidth ? { width: img.naturalWidth, height: img.naturalHeight } : null);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// ── Editor ───────────────────────────────────────────────────────────────────

interface Ctx {
  page: SitePageDefinition;
  root: PlainObject;
  onChange: (path: Path, value: unknown) => void;
  /** "Images" view: only image fields (and the groups that hold them) are shown. */
  imagesOnly?: boolean;
  /** Whether the signed-in user holds a permission (fields in the page's `requires` are greyed out otherwise). */
  can: (permission: string) => boolean;
}

/** True when a value of this shape is an image field (image object, or an image path string). */
function isImageField(name: string, def: unknown): boolean {
  return isImageValue(def) || (typeof def === "string" && isImagePathField(name, def));
}

/** True when the value (or anything inside it) is an image field. Lists are checked through their item shape. */
function containsImage(ctx: Ctx, path: Path, name: string, def: unknown): boolean {
  if (isLocked(ctx, path)) return false;
  if (isImageField(name, def)) return true;
  if (Array.isArray(def)) {
    const template = def.length ? def[0] : ctx.page.templates?.[patternOf(path)];
    return def.some((item, i) => containsImage(ctx, [...path, i], name, item)) ||
      (template !== undefined && containsImage(ctx, [...path, 0], name, template));
  }
  if (isPlainObject(def)) return Object.keys(def).some((key) => containsImage(ctx, [...path, key], key, def[key]));
  return false;
}

interface NodeProps {
  ctx: Ctx;
  path: Path;
  name: string;
  value: unknown;
  def: unknown;
}

function isLocked(ctx: Ctx, path: Path) {
  return (ctx.page.locked ?? []).includes(patternOf(path));
}

/** A list whose items have locked fields keeps its length (items line up with fixed values). */
function isFixedList(ctx: Ctx, path: Path) {
  const prefix = `${patternOf(path)}[]`;
  return (ctx.page.locked ?? []).some((p) => p.startsWith(prefix));
}

/** True for a field that belongs under "Advanced" (by key name, or listed by the page). */
function isAdvanced(ctx: Ctx, path: Path, def: unknown) {
  const key = path[path.length - 1];
  if (ctx.imagesOnly) return false;
  if (typeof key === "string" && ADVANCED_GROUPS.has(key) && isPlainObject(def)) return true;
  if (typeof key === "string" && ADVANCED_FIELDS.has(key) && typeof def === "string") return true;
  return (ctx.page.advanced ?? []).includes(patternOf(path));
}

/** The fields of one object: the everyday ones first, then the rarely needed ones folded under "Advanced". */
function Fields({ ctx, path, keys, render, def }: {
  ctx: Ctx;
  path: Path;
  keys: string[];
  render: (key: string) => ReactNode;
  def: PlainObject;
}) {
  const advanced = keys.filter((key) => isAdvanced(ctx, [...path, key], def[key]));
  const normal = keys.filter((key) => !advanced.includes(key));
  return (
    <>
      {normal.map(render)}
      {advanced.length > 0 && (
        <details className="group rounded-md border border-dashed border-border/70 px-3 py-2">
          <summary className="cursor-pointer select-none text-xs font-medium text-muted-foreground">
            Advanced (rarely needed — you can leave these as they are)
          </summary>
          <div className="mt-3 space-y-3">{advanced.map(render)}</div>
        </details>
      )}
    </>
  );
}

/** The page's own name for a field, or one made from its key. */
function labelFor(ctx: Ctx, path: Path, name: string) {
  return ctx.page.labels?.[patternOf(path)] ?? humanize(name);
}

const LINK_HINT =
  "Where it goes: a page such as /contact or /about, a part of a page such as /#services, or a full web address (https://…).";

function hintFor(ctx: Ctx, path: Path) {
  const own = ctx.page.hints?.[patternOf(path)];
  if (own) return own;
  const key = path[path.length - 1];
  return typeof key === "string" && (key === "href" || /Href$/.test(key) || key === "buttonLink") ? LINK_HINT : undefined;
}

/** Placeholders shown as plain words (see ./placeholders). */
function friendlyFor(ctx: Ctx, path: Path, def: unknown, value: unknown): FriendlyText {
  const field = String([...path].reverse().find((part) => typeof part === "string") ?? "");
  const spec = ctx.page.counts?.[patternOf(path)];
  let count: string | undefined;
  if (spec) {
    const valueAt = (dotted: string) => {
      const parts = dotted.split(".");
      const saved = getIn(ctx.root, parts);
      return saved === undefined ? getIn(ctx.page.defaults, parts) : saved;
    };
    const counted = (item: unknown) =>
      !isPlainObject(item) || (item.show !== false && (typeof item.title !== "string" || item.title.trim() !== ""));
    const list = spec.list ? valueAt(spec.list) : [];
    const items = Array.isArray(list) ? list.filter(counted) : [];
    const cards = (spec.cards ?? []).map(valueAt).filter((card) => isPlainObject(card) && counted(card));
    count = countWord(items.length + cards.length);
    if (spec.lowercase) count = count.toLowerCase();
  }
  return friendlyText(field, [def, value].flat(), count);
}

const joinHints = (...hints: (string | undefined)[]) => hints.filter(Boolean).join(" ") || undefined;

function Node({ ctx, path, name, value, def }: NodeProps): ReactNode {
  if (isLocked(ctx, path)) return null;
  if (ctx.imagesOnly && !containsImage(ctx, path, name, def)) return null;
  // Fields that only apply to some variants (e.g. a story's photo only on "photo" cards).
  const condition = ctx.page.showWhen?.[patternOf(path)];
  if (condition) {
    const sibling = getIn(ctx.root, [...path.slice(0, -1), condition.field]);
    if (!condition.is.includes(typeof sibling === "string" ? sibling : "")) return null;
  }
  const set = (v: unknown) => ctx.onChange(path, v);
  const label = labelFor(ctx, path, name);
  const hint = hintFor(ctx, path);

  // Dropdown (icons)
  const options = ctx.page.options?.[patternOf(path)];
  if (options && typeof def === "string") {
    const current = typeof value === "string" ? value : def;
    return (
      <Field label={label} hint={hint}>
        <select className={selectCls} value={current} onChange={(e) => set(e.target.value)}>
          {!options.includes(current) && <option value={current}>{current}</option>}
          {options.map((o) => (
            <option key={o} value={o}>
              {ctx.page.optionLabels?.[patternOf(path)]?.[o] ?? (o.startsWith("/") ? o.split("/").pop()?.replace(/\.\w+$/, "") : o)}
            </option>
          ))}
        </select>
      </Field>
    );
  }

  if (name === "introShort") {
    const mode = value === null ? "hidden" : value ? "custom" : "same";
    return (
      <Field label={label} hint="Phones can show a shorter intro, the same one, or none.">
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className={`${selectCls} sm:w-56`}
            value={mode}
            onChange={(e) =>
              set(
                e.target.value === "hidden"
                  ? null
                  : e.target.value === "same"
                    ? ""
                    : textOf(getIn(ctx.root, [...path.slice(0, -1), "intro"])),
              )
            }
          >
            <option value="same">Same as intro</option>
            <option value="custom">Shorter text</option>
            <option value="hidden">Not shown on phones</option>
          </select>
          {mode === "custom" && (
            <input
              className={inputCls}
              value={String(value)}
              placeholder="Empty = same as intro"
              onChange={(e) => set(e.target.value)}
            />
          )}
        </div>
      </Field>
    );
  }

  // A plain image path (story avatars and photos…): same picker as image objects, without alt/focus.
  if (typeof def === "string" && isImagePathField(name, def)) {
    const current = typeof value === "string" ? value : def;
    return (
      <ImageField
        label={label}
        hint={hint}
        srcOnly
        value={{ src: current === def ? "" : current, alt: "", focus: "center" }}
        defaultSrc={def || undefined}
        onChange={(next) => set(next.src || def)}
      />
    );
  }

  if (typeof def === "string" || def === null) {
    const friendly = friendlyFor(ctx, path, def, value);
    return (
      <TextField
        label={label}
        hint={joinHints(hint, friendly.note)}
        value={friendly.toView(typeof value === "string" ? value : "")}
        multiline={multiline(name, def)}
        onChange={(text) => set(friendly.fromView(text))}
      />
    );
  }

  if (typeof def === "number") {
    return (
      <Field label={label} hint={hint}>
        <input
          type="number"
          className={inputCls}
          value={typeof value === "number" ? value : def}
          onChange={(e) => set(Number(e.target.value) || 0)}
        />
      </Field>
    );
  }

  const required = ctx.page.requires?.[patternOf(path)];
  if (typeof def === "boolean" && required && !ctx.can(required.permission)) {
    return (
      <div className="space-y-1">
        <label className="flex cursor-not-allowed items-center gap-2 text-sm text-muted-foreground">
          <input type="checkbox" className="h-4 w-4" checked={value === true} disabled readOnly />
          {label}
        </label>
        <p className="text-xs text-muted-foreground">{required.note}</p>
      </div>
    );
  }

  if (typeof def === "boolean") {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
        <input type="checkbox" className="h-4 w-4" checked={value === true} onChange={(e) => set(e.target.checked)} />
        {name === "lead" ? "Highlight (brown dot)" : label}
      </label>
    );
  }

  if (isImageValue(def)) {
    const img = isImageValue(value) ? value : def;
    const imageValue: HomeImageValue = {
      src: img.src === def.src ? "" : String(img.src),
      alt: String(img.alt),
      focus: (typeof img.focus === "string" ? img.focus : "center") as ImageFocus,
    };
    return (
      <ImageField
        label={label}
        hint={hint}
        value={imageValue}
        defaultSrc={String(def.src)}
        drawingSrc={drawingPreviewFor(ctx.page.path, path, (field) => getIn(ctx.root, [...path.slice(0, -1), field]))}
        onChange={async (next) => {
          const src = next.src || String(def.src);
          const base = { ...img, src, alt: next.alt, focus: next.focus };
          if (src === img.src) return set(base);
          if (src === def.src) return set({ ...base, width: def.width, height: def.height });
          set(base);
          const size = await measureImage(src);
          if (size) ctx.onChange(path, { ...base, ...size });
        }}
      />
    );
  }

  if (Array.isArray(def)) return <ListNode ctx={ctx} path={path} name={name} value={value} def={def} />;

  if (isPlainObject(def)) {
    const obj = isPlainObject(value) ? value : def;
    const keys = Object.keys(def);
    const child = (key: string) => (
      <Node key={key} ctx={ctx} path={[...path, key]} name={key} value={obj[key]} def={def[key]} />
    );

    // Compact layouts for the common small shapes.
    if (isCopyValue(def) || isResponsivePair(def)) {
      return (
        <Field label={label} hint={hint}>
          <div className="grid grid-cols-1 gap-3 rounded-md border border-border/60 p-3 sm:grid-cols-2">{keys.map(child)}</div>
        </Field>
      );
    }
    if (isAccentHeading(def)) {
      return (
        <Field label={label} hint={hint}>
          <div className="space-y-2 rounded-md border border-border/60 p-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{keys.map(child)}</div>
            <p className="text-xs text-muted-foreground">
              Preview: {String(obj.lead ?? "")} <span className="font-semibold text-orange-500">{String(obj.accent ?? "")}</span>
              {String(obj.tail ?? "")}
            </p>
          </div>
        </Field>
      );
    }

    return (
      <div className="space-y-3 rounded-md border border-border/60 p-3 sm:p-4">
        <SubHeading>{label}</SubHeading>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        <Fields ctx={ctx} path={path} keys={keys} render={child} def={def} />
      </div>
    );
  }

  return null;
}

function ListNode({ ctx, path, name, value, def }: NodeProps & { def: unknown[] }) {
  const items = Array.isArray(value) ? value : def;
  // The Images view never adds, removes or reorders items: that stays on the page view.
  const fixed = isFixedList(ctx, path) || Boolean(ctx.imagesOnly);
  const friendly = friendlyFor(ctx, path, def, items);
  const hint = joinHints(hintFor(ctx, path), friendly.note);
  const set = (next: unknown[]) => ctx.onChange(path, next);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    set(next);
  };
  // Lists that start empty (e.g. "Added services") take their item shape from the page's templates.
  const template = def.length ? def[0] : ctx.page.templates?.[patternOf(path)];
  const simple = typeof template === "string";
  const addLabel = ctx.page.addLabels?.[patternOf(path)] ?? `Add ${simple ? "line" : "item"}`;

  const controls = (i: number) => (
    <div className="flex shrink-0 items-center gap-1">
      <Button type="button" variant="ghost" size="sm" title="Move up" className="h-8 w-8 p-0" disabled={i === 0} onClick={() => move(i, i - 1)}>
        <ArrowUp className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="sm" title="Move down" className="h-8 w-8 p-0" disabled={i === items.length - 1} onClick={() => move(i, i + 1)}>
        <ArrowDown className="h-4 w-4" />
      </Button>
      {!fixed && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Remove"
          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => set(items.filter((_, j) => j !== i))}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      <SubHeading>{labelFor(ctx, path, name)}</SubHeading>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {items.map((item, i) =>
        simple && !ctx.imagesOnly ? (
          <div key={i} className="flex items-center gap-2">
            <input
              className={inputCls}
              value={friendly.toView(typeof item === "string" ? item : "")}
              onChange={(e) => set(items.map((it, j) => (j === i ? friendly.fromView(e.target.value) : it)))}
            />
            {controls(i)}
          </div>
        ) : (
          <div key={i} className={itemCardCls}>
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium text-foreground-light">
                {itemLabel(item, i, ctx.page.itemTitle?.[patternOf(path)])}
              </span>
              {!ctx.imagesOnly && controls(i)}
            </div>
            {Array.isArray(template) ? (
              <ListNode ctx={ctx} path={[...path, i]} name={`Row ${i + 1}`} value={item} def={(def[i] ?? template) as unknown[]} />
            ) : isPlainObject(template) && !isImageValue(template) ? (
              <Fields
                ctx={ctx}
                path={[...path, i]}
                keys={Object.keys(template)}
                def={(def[i] ?? template) as PlainObject}
                render={(key) => (
                  <Node
                    key={key}
                    ctx={ctx}
                    path={[...path, i, key]}
                    name={key}
                    value={isPlainObject(item) ? item[key] : undefined}
                    def={((def[i] ?? template) as PlainObject)[key]}
                  />
                )}
              />
            ) : (
              <Node ctx={ctx} path={[...path, i]} name={`Item ${i + 1}`} value={item} def={def[i] ?? template} />
            )}
          </div>
        ),
      )}
      {!fixed && !ctx.imagesOnly && template !== undefined && (
        <div className="flex items-center gap-3">
          <AddButton
            label={addLabel}
            disabled={items.length >= MAX_LIST_LENGTH}
            // The page's template for this list, when it has one (e.g. a blank story set to "Quote"), else an empty copy.
            onClick={() => {
              const pageTemplate = ctx.page.templates?.[patternOf(path)];
              set([...items, pageTemplate !== undefined ? structuredClone(pageTemplate) : blankLike(template)]);
            }}
          />
          <span className="text-xs text-muted-foreground">{items.length} items</span>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ContentEditor({
  page,
  content,
  onChange,
  open,
  onToggle,
  imagesOnly = false,
  can = () => true,
}: {
  /** Whether the signed-in user holds a permission (see `requires` in the page definition). */
  can?: (permission: string) => boolean;
  /** Show only the page's images (the "Images" tab), section by section in page order. */
  imagesOnly?: boolean;
  page: SitePageDefinition;
  content: PlainObject;
  /** Receives an updater, so async edits (image size lookups) never overwrite newer ones. */
  onChange: (update: (prev: PlainObject) => PlainObject) => void;
  open: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const ctx: Ctx = {
    page,
    root: content,
    onChange: (path, value) => onChange((prev) => setIn(prev, path, value) as PlainObject),
    imagesOnly,
    can,
  };
  const listed = Object.keys(page.sections).filter((k) => k in page.defaults);
  const allKeys = [...listed, ...Object.keys(page.defaults).filter((k) => !listed.includes(k))].filter(
    // A locked top-level value (e.g. a service page's id) has nothing to edit: no empty card for it.
    (k) => !isLocked(ctx, [k]),
  );
  const keys = imagesOnly ? allKeys.filter((key) => containsImage(ctx, [key], key, page.defaults[key])) : allKeys;

  if (imagesOnly && keys.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        This page has no images. Every other part of it is under “Page content”.
      </p>
    );
  }

  return (
    <>
      {keys.map((key) => {
        const section = page.sections[key] ?? { title: humanize(key) };
        const def = page.defaults[key];
        const value = content[key];
        const fields = isPlainObject(def) && !isImageValue(def) && !isCopyValue(def) && !isAccentHeading(def)
          ? (
              <Fields
                ctx={ctx}
                path={[key]}
                keys={Object.keys(def)}
                def={def}
                render={(k) => (
                  <Node key={k} ctx={ctx} path={[key, k]} name={k} value={isPlainObject(value) ? value[k] : undefined} def={def[k]} />
                )}
              />
            )
          : <Node ctx={ctx} path={[key]} name={key} value={value} def={def} />;
        return (
          <SectionCard
            key={key}
            icon={FileText}
            title={section.title}
            hint={section.hint}
            open={!!open[key]}
            onToggle={() => onToggle(key)}
          >
            {!imagesOnly && (key === "meta" || key === "seo") && (
              <>
                <p className="text-xs text-warning/80">
                  Not shown on the page — browser tab title, Google results and link previews only.
                </p>
                <SeoScriptsNote path={page.path} />
              </>
            )}
            {fields}
            <div className={imagesOnly ? "hidden" : "flex justify-end pt-2"}>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (window.confirm(`Reset “${section.title}” to the default copy? (Not saved until you click Save.)`)) {
                    ctx.onChange([key], structuredClone(def));
                  }
                }}
              >
                <RotateCcw className="mr-1 h-4 w-4" /> Reset section to default
              </Button>
            </div>
          </SectionCard>
        );
      })}
    </>
  );
}
