"use client";

// Image input for CMS editors: preview, pick from the Media Library, upload,
// or paste a URL; plus alt text and crop focus. An empty `src` means "use the
// default image" (shown greyed in the preview when `defaultSrc` is given).
// Paths such as /home/avatars/clinic.jpg are files of the website, so the preview loads them from there.
// Fields whose empty state is a drawing coded on the website show a snapshot of it (`drawingSrc`).

import { useRef, useState } from "react";
import { ImageIcon, Images, Loader2, Moon, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import MediaPickerDialog from "@/components/common/MediaPickerDialog";
import { uploadFileToMedia } from "@/app/lib/utils/media";
import { FRONTEND_URL } from "@/lib/frontendUrl";
import {
  IMAGE_FOCUS_OPTIONS,
  isSafeImageSrc,
  type HomeImageValue,
} from "@/app/lib/content/home-content";

const inputCls =
  "w-full rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-ring";
const btnCls = "";

interface ImageFieldProps {
  label: string;
  value: HomeImageValue;
  onChange: (value: HomeImageValue) => void;
  /** Image used when `src` is empty. Without it, empty means "no image". */
  defaultSrc?: string;
  hint?: string;
  /** Hide the alt text and focus controls (for fields that store only the image path). */
  srcOnly?: boolean;
  /**
   * Snapshot of the drawing the website shows when the field is empty (full URL in the Hostinger media folder).
   * Used when there is no `defaultSrc`.
   */
  drawingSrc?: string;
  /** Also offer a dark-mode version of the picture (`value.darkSrc`), shown on the website in dark mode. */
  darkMode?: boolean;
}

/** Site paths (/home/…) are files of the website, so the preview loads them from there. */
const previewUrl = (src: string) => (src.startsWith("/") && !src.startsWith("//") ? `${FRONTEND_URL}${src}` : src);

export default function ImageField({
  label,
  value,
  onChange,
  defaultSrc,
  hint,
  srcOnly = false,
  drawingSrc,
  darkMode = false,
}: ImageFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const usingDefault = !value.src && Boolean(defaultSrc);
  const usingDrawing = !value.src && !defaultSrc && Boolean(drawingSrc);
  const rawPreview = value.src || defaultSrc || "";
  const previewSrc = usingDrawing ? drawingSrc! : previewUrl(rawPreview);
  const urlInvalid = Boolean(value.src) && !isSafeImageSrc(value.src);
  // Remembers which address failed, so a new image is tried again.
  const [failedSrc, setFailedSrc] = useState("");
  // Only a real address can fail; an empty field simply has no image yet.
  const previewFailed = Boolean(previewSrc) && failedSrc === previewSrc;

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    const url = await uploadImage(file, setUploading);
    if (url) onChange({ ...value, src: url });
  };

  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-foreground">{label}</span>
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-muted/40 p-3 sm:flex-row">
        <div className="relative flex h-32 w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted sm:w-48">
          {previewSrc && !urlInvalid && !previewFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewSrc}
              alt={value.alt}
              className={usingDrawing ? "h-full w-full object-contain" : "h-full w-full object-cover"}
              onError={() => setFailedSrc(previewSrc)}
              style={{ objectPosition: value.focus === "upper" ? "center 20%" : value.focus }}
            />
          ) : (
            <div className="flex flex-col items-center gap-1 px-2 text-center">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <span className="text-[11px] text-muted-foreground">
                {previewFailed ? "Preview unavailable" : urlInvalid ? "Invalid address" : "No image yet — upload one"}
              </span>
            </div>
          )}
          {(usingDefault || usingDrawing) && !previewFailed && (
            <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
              {usingDrawing ? "Built-in drawing" : "Default"}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className={btnCls} onClick={() => setPickerOpen(true)}>
              <Images className="mr-1.5 h-4 w-4" /> Media Library
            </Button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleUpload} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={btnCls}
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
              Upload
            </Button>
            {value.src && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:bg-accent hover:text-foreground"
                onClick={() => onChange({ ...value, src: "" })}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> {defaultSrc ? "Use default" : "Remove"}
              </Button>
            )}
          </div>
          <input
            className={inputCls}
            value={value.src}
            placeholder={
              defaultSrc
                ? "Using the default image — or paste an image URL"
                : drawingSrc
                  ? "Using the built-in drawing — or paste an image URL"
                  : "https://… image URL"
            }
            onChange={(e) => onChange({ ...value, src: e.target.value })}
          />
          {urlInvalid && (
            <p className="text-xs text-destructive">Use a full https:// URL or a path starting with “/”.</p>
          )}
          {!srcOnly && (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
              <input
                className={inputCls}
                value={value.alt}
                placeholder="Alt text — describe the photo for screen readers"
                onChange={(e) => onChange({ ...value, alt: e.target.value })}
              />
              <select
                className="rounded-md border border-input bg-transparent dark:bg-input/30 px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-ring"
                value={value.focus}
                title="Which part of the photo stays visible when it is cropped"
                onChange={(e) => onChange({ ...value, focus: e.target.value as HomeImageValue["focus"] })}
              >
                {IMAGE_FOCUS_OPTIONS.map((focus) => (
                  <option key={focus} value={focus}>
                    Focus: {focus}
                  </option>
                ))}
              </select>
            </div>
          )}
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </div>

      {darkMode && (
        <DarkImageRow
          darkSrc={value.darkSrc ?? ""}
          hasImage={Boolean(value.src || defaultSrc)}
          alt={value.alt}
          onChange={(darkSrc) => onChange({ ...value, darkSrc })}
        />
      )}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={({ url }) => onChange({ ...value, src: url })}
      />
    </div>
  );
}

/** Uploads a picked file to the Media Library (Hostinger media folder); returns its URL, or null. */
async function uploadImage(file: File | undefined, setUploading: (busy: boolean) => void): Promise<string | null> {
  if (!file) return null;
  if (!file.type.startsWith("image/")) {
    toast.error("Please choose an image file");
    return null;
  }
  setUploading(true);
  const toastId = toast.loading("Uploading image...");
  try {
    const { url } = await uploadFileToMedia(file);
    toast.success("Image uploaded", { id: toastId });
    return url;
  } catch (error) {
    toast.error((error as Error).message || "Upload failed", { id: toastId });
    return null;
  } finally {
    setUploading(false);
  }
}

/**
 * Optional dark-mode version of the picture: the website shows it instead when a visitor uses the dark theme.
 * Only used together with the picture above (a card showing its built-in drawing has nothing to swap).
 */
function DarkImageRow({
  darkSrc,
  hasImage,
  alt,
  onChange,
}: {
  darkSrc: string;
  hasImage: boolean;
  alt: string;
  onChange: (darkSrc: string) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [failedSrc, setFailedSrc] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const invalid = Boolean(darkSrc) && !isSafeImageSrc(darkSrc);
  const preview = darkSrc && !invalid && failedSrc !== darkSrc ? previewUrl(darkSrc) : "";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-3 sm:flex-row sm:items-start">
      <div className="relative flex h-20 w-full shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-900 sm:w-48">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={alt} className="h-full w-full object-cover" onError={() => setFailedSrc(darkSrc)} />
        ) : (
          <span className="px-2 text-center text-[11px] text-zinc-400">
            {invalid ? "Invalid address" : failedSrc && failedSrc === darkSrc ? "Preview unavailable" : "Same picture in dark mode"}
          </span>
        )}
        <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-[11px] text-white">
          <Moon className="h-3 w-3" /> Dark mode
        </span>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <span className="block text-sm font-medium text-foreground">Dark mode image (optional)</span>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!hasImage} onClick={() => setPickerOpen(true)}>
            <Images className="mr-1.5 h-4 w-4" /> Media Library
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              const url = await uploadImage(file, setUploading);
              if (url) onChange(url);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!hasImage || uploading}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Upload className="mr-1.5 h-4 w-4" />}
            Upload
          </Button>
          {darkSrc && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => onChange("")}
            >
              <RotateCcw className="mr-1.5 h-4 w-4" /> Remove
            </Button>
          )}
        </div>
        <input
          className={inputCls}
          value={darkSrc}
          disabled={!hasImage}
          placeholder={hasImage ? "Empty = the picture above in both themes — or paste an image URL" : "Add the picture above first"}
          onChange={(e) => onChange(e.target.value)}
        />
        {invalid && <p className="text-xs text-destructive">Use a full https:// URL or a path starting with “/”.</p>}
        <p className="text-xs text-muted-foreground">
          Shown instead of the picture above when a visitor uses the dark theme. Use the same size and framing.
        </p>
      </div>
      <MediaPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} onSelect={({ url }) => onChange(url)} />
    </div>
  );
}
