// Uploads every image in Tech-Vedha-frontend/public to the Hostinger media folder and adds it to the
// Media Library (media_assets), exactly like an upload from /dashboard/media.
//
//   npm run upload:frontend-media             # upload
//   npm run upload:frontend-media -- --dry    # list what would be uploaded
//
// Safe to re-run: a file already in the library under the same name and size is skipped.
// The website keeps using its bundled copies until an editor picks the uploaded ones.

import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import path from "path";
import prisma from "@/app/lib/config/db";
import { buildStoredFilename, matchesMagicBytes, mediaFolder, uploadToFolder } from "@/app/lib/utils/hostingerFtp";

const PUBLIC_DIR = path.resolve(__dirname, "../../Tech-Vedha-frontend/public");
const TYPES: Record<string, { mime: string; ext: string }> = {
  ".jpg": { mime: "image/jpeg", ext: "jpg" },
  ".jpeg": { mime: "image/jpeg", ext: "jpg" },
  ".png": { mime: "image/png", ext: "png" },
  ".webp": { mime: "image/webp", ext: "webp" },
  ".gif": { mime: "image/gif", ext: "gif" },
  ".svg": { mime: "image/svg+xml", ext: "svg" },
};
const dryRun = process.argv.includes("--dry");

async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((e) => (e.isDirectory() ? listFiles(path.join(dir, e.name)) : [path.join(dir, e.name)])),
  );
  return nested.flat();
}

/** Same rules as the media API: no script, embedded documents or event handlers in an SVG. */
function unsafeSvg(text: string): boolean {
  return (
    /<!DOCTYPE|<!ENTITY/i.test(text) ||
    /<\s*(?:[^\s<>/:="']+:)?(?:script|foreignObject|iframe|embed|object)[\s/>]/i.test(text) ||
    /[\s"'/]on[a-z]+\s*=/i.test(text) ||
    /javascript:/i.test(text)
  );
}

async function main() {
  const baseUrl = (process.env.HOSTINGER_MEDIA_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("HOSTINGER_MEDIA_URL is not set");

  const files = (await listFiles(PUBLIC_DIR)).filter((f) => TYPES[path.extname(f).toLowerCase()]).sort();
  let uploaded = 0;
  let skipped = 0;

  for (const file of files) {
    // Library name = the path on the website, e.g. "home/avatars/clinic.jpg" (searchable in the picker).
    const name = path.relative(PUBLIC_DIR, file).split(path.sep).join("/");
    const { mime, ext } = TYPES[path.extname(file).toLowerCase()];
    const buffer = await readFile(file);

    const existing = await prisma.mediaAsset.findFirst({ where: { filename: name, bytes: buffer.length } });
    if (existing) {
      console.log(`skip     ${name}  (already in library: ${existing.url})`);
      skipped++;
      continue;
    }
    if (mime === "image/svg+xml" ? unsafeSvg(buffer.toString("utf8")) : !matchesMagicBytes(buffer, mime)) {
      console.warn(`REJECT   ${name}  (failed the media safety check)`);
      continue;
    }

    const key = buildStoredFilename(path.basename(name), ext);
    const url = `${baseUrl}/${key}`;
    if (dryRun) {
      console.log(`would    ${name}  →  ${url}`);
      continue;
    }
    await uploadToFolder(mediaFolder(), [{ buffer, filename: key }]);
    await prisma.mediaAsset.create({
      data: { key, filename: name, format: ext, resourceType: "image", bytes: buffer.length, url },
    });
    console.log(`uploaded ${name}  →  ${url}`);
    uploaded++;
  }

  console.log(`\n${dryRun ? "Dry run. " : ""}${uploaded} uploaded, ${skipped} already there, ${files.length} images found.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
