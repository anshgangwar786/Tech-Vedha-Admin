// Snapshots the website's built-in drawings for the admin's image previews (app/lib/content/drawing-previews.ts).
// Needs the website running (Tech-Vedha-frontend: npm run dev → http://localhost:3002), Google Chrome and
// puppeteer-core:  npm i --no-save puppeteer-core@24 && node scripts/snap-drawings.mjs [site-url] [out-folder]
// Then upload them to Hostinger: npm run upload:drawing-previews
import puppeteer from "puppeteer-core";
import { mkdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.argv[2] ?? "http://localhost:3002";
const OUT = process.argv[3] ?? path.join(os.tmpdir(), "tech-vedha-drawing-previews");
mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: true,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(path) {
  await page.goto(BASE + path, { waitUntil: "networkidle0", timeout: 120000 });
  // Reveal everything that animates in on scroll.
  await page.addStyleTag({ content: ".reveal,[data-reveal],[data-reveal-stagger]>*{opacity:1!important;transform:none!important} .defer-render{content-visibility:visible!important}" });
  await wait(800);
}
async function shot(el, name) {
  if (!el) throw new Error(`missing element for ${name}`);
  await el.scrollIntoView();
  await page.mouse.move(2, 2);
  await wait(700);
  await el.screenshot({ path: `${OUT}/${name}.png` });
  console.log("saved", name);
}

// Homepage: service scenes
await open("/");
const anchors = ["marketing", "apps", "cad", "software"];
for (const anchor of anchors) {
  const tab = await page.$(`#service-${anchor}`);
  await tab.scrollIntoView();
  await tab.click();
  await page.mouse.move(2, 2);
  await wait(900);
  await shot(await page.$("#services [role=tabpanel]"), `home-services-${anchor}`);
}

// Homepage: security cards
const security = await page.$$("#security article > div:first-child");
for (let i = 0; i < Math.min(4, security.length); i++) await shot(security[i], `home-security-${i}`);

// Homepage: process steps
const steps = await page.$$("#process ol > li");
for (let i = 0; i < steps.length && i < 6; i++) {
  const button = await steps[i].$(":scope > button");
  if (button && i > 0) {
    await button.scrollIntoView();
    await button.click();
    await page.mouse.move(2, 2);
    await wait(1200);
  }
  await shot(await steps[i].$("article div.rounded-\\[18px\\]"), `home-process-${i}`);
}

// Homepage: pillars lock
await shot(await page.$("#why article .size-\\[116px\\]"), "home-pillars-secure");

// Contact map
await open("/contact");
await shot(await page.$("[data-reveal=left]"), "contact-map");

// Service pages: deliverable drawings, named by their `visual`
for (const [path, visuals] of [
  ["/services/app-development", ["app-screens", "release-checklist"]],
  ["/services/digital-marketing", ["campaign-dashboard", "campaign-checklist", "search-rankings", "monthly-report"]],
]) {
  await open(path);
  const boxes = await page.$$("section[aria-labelledby=deliverables-title] article > div:first-child");
  for (let i = 0; i < visuals.length && i < boxes.length; i++) await shot(boxes[i], `deliverable-${visuals[i]}`);
}

await browser.close();
console.log(`\nSnapshots in ${OUT}. Upload them with: npm run upload:drawing-previews`);
