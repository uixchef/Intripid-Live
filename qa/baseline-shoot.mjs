/**
 * Baseline capture for the surfaces the dashboard work must NOT change.
 * Written to qa/baseline/ so a later re-run can be compared byte-for-byte.
 *
 *   node qa/baseline-shoot.mjs [outDir]
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const OUT = process.argv[2] ?? "qa/baseline";
const SHOTS = [
  { name: "guest-landing-1440", url: "/", w: 1440, h: 900 },
  { name: "guest-landing-390", url: "/", w: 390, h: 844 },
  { name: "discovery-1440", url: "/discover", w: 1440, h: 900 },
  { name: "planner-1440", url: "/trip/nyc-spring", w: 1440, h: 900 },
  { name: "planner-390", url: "/trip/nyc-spring", w: 390, h: 844 },
];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
for (const shot of SHOTS) {
  const page = await browser.newPage({
    viewport: { width: shot.w, height: shot.h },
    deviceScaleFactor: 2,
  });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 120));
  });
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  await page.goto(`http://localhost:3000${shot.url}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(3400);
  await page.screenshot({ path: `${OUT}/${shot.name}.png` });
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  console.log(
    `${shot.name} [${shot.w}x${shot.h}] overflow=${overflow} errors=${errors.length}`,
  );
  errors.slice(0, 3).forEach((e) => console.log("   !", e));
  await page.close();
}
await browser.close();
