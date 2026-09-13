import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dest = join(root, "public/features/now/end-to-end-day.jpg");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

mkdirSync(dirname(dest), { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("http://localhost:3000/trip/nyc-spring", { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /Continue as Sarthak Goyal/i }).click({ timeout: 4000 }).catch(() => {});
  await page.getByRole("button", { name: /Add an activity/i }).waitFor({ timeout: 25000 });
  await wait(700);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page
    .getByRole("radiogroup", { name: "Calendar view" })
    .getByRole("radio", { name: /^Day$/ })
    .click();
  await wait(900);
  await page.screenshot({ path: dest, type: "jpeg", quality: 90 });
  console.log("wrote", dest);
} catch (err) {
  console.error(err);
  process.exitCode = 1;
} finally {
  await browser.close();
}
