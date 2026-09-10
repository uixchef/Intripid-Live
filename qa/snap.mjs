/**
 * Single-shot screenshot helper for iterating on one surface.
 *   node qa/snap.mjs /plan planner-current 1440 900 [select]
 * The full walker lives in qa/shoot.mjs; this is for tight visual loops.
 */
import { chromium } from "playwright";

const [route, name, w = "1440", h = "900", extra = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: Number(w), height: Number(h) },
  deviceScaleFactor: 2,
});
const errors = [];
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded" });
if (extra) {
  // Let the client hydrate: a click before that lands on inert markup.
  await page.waitForTimeout(2600);
  for (const step of extra.split(",")) {
    if (step === "select") {
      await page
        .locator("[data-event-card]")
        .first()
        .click({ timeout: 5000 })
        .catch(() => {});
    } else if (step.startsWith("click:")) {
      // Role-agnostic: tabs, buttons and links all answer to their text.
      await page
        .getByText(step.slice(6), { exact: false })
        .first()
        .click({ timeout: 5000 })
        .catch((e) =>
          console.log("  ? click failed", step, String(e).split("\n")[0].slice(0, 90)),
        );
    }
    await page.waitForTimeout(700);
  }
}
await page.waitForTimeout(2200);
const overflow = await page.evaluate(
  () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
);
await page.screenshot({ path: `qa/screenshots/${name}.png` });
console.log(`${name} · overflow=${overflow} · errors=${errors.length}`);
errors.slice(0, 4).forEach((e) => console.log("  !", e.slice(0, 160)));
await browser.close();
