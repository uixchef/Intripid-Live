import { chromium } from "playwright";
const [route, name, w = "1440", h = "1000", extra = ""] = process.argv.slice(2);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: +w, height: +h },
  deviceScaleFactor: 2,
});
const errors = [];
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
page.on("pageerror", (e) => errors.push(String(e)));
await page.goto(`http://localhost:3000${route}`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(2600);
for (const step of extra ? extra.split(",") : []) {
  if (step.startsWith("click:")) {
    await page.getByText(step.slice(6), { exact: false }).first().click({ timeout: 6000 })
      .catch((e) => console.log("  ? click failed", step, String(e).split("\n")[0].slice(0, 80)));
  }
  await page.waitForTimeout(800);
}
await page.waitForTimeout(600);
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
await page.screenshot({ path: `qa/screenshots/${name}.png`, fullPage: true });
console.log(`${name} [${w}x${h}] overflow=${overflow} errors=${errors.length}`);
errors.slice(0, 4).forEach((e) => console.log("  !", e.slice(0, 150)));
await browser.close();
