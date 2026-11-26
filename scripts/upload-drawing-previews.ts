// Uploads the snapshots of the website's built-in drawings to the Hostinger media folder
// (<HOSTINGER_MEDIA_PATH>/drawing-previews/<name>.png), where the admin's image previews load them from
// (app/lib/content/drawing-previews.ts). Fixed names: re-running replaces the files, the addresses stay the same.
// They are editor previews, not content, so they are not added to the Media Library.
//
//   npm i --no-save puppeteer-core@24
//   node scripts/snap-drawings.mjs                 # website running on http://localhost:3002 → snapshots in a temp folder
//   npm run upload:drawing-previews [-- <folder>]  # default folder: the one snap-drawings.mjs printed

import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import os from "os";
import path from "path";
import { matchesMagicBytes, mediaFolder, uploadToFolder } from "@/app/lib/utils/hostingerFtp";

const DIR = process.argv[2] ?? path.join(os.tmpdir(), "tech-vedha-drawing-previews");

async function main() {
  const baseUrl = (process.env.HOSTINGER_MEDIA_URL || "").replace(/\/$/, "");
  if (!baseUrl) throw new Error("HOSTINGER_MEDIA_URL is not set");

  const names = (await readdir(DIR)).filter((name) => /^[a-z0-9-]+\.png$/.test(name)).sort();
  if (names.length === 0) throw new Error(`No snapshots in ${DIR}. Run node scripts/snap-drawings.mjs first.`);

  const files = [];
  for (const name of names) {
    const buffer = await readFile(path.join(DIR, name));
    if (!matchesMagicBytes(buffer, "image/png")) throw new Error(`${name} is not a PNG`);
    files.push({ buffer, filename: name });
  }
  await uploadToFolder(`${mediaFolder()}/drawing-previews`, files);
  for (const { filename } of files) console.log(`uploaded ${baseUrl}/drawing-previews/${filename}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
